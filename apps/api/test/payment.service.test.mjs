import assert from 'node:assert/strict';
import test from 'node:test';
import { PaymentService } from '../dist/finance/payment.service.js';

function invoice(id, outstanding = 10000, lines = [{ type: 'RENT', lineTotal: 10000 }]) {
  return { id, organizationId: 'organization-1', invoiceNumber: `INV-${id}`, status: 'ISSUED', currency: 'INR', total: outstanding, creditTotal: 0, outstandingBalance: outstanding, deletedAt: null, lines, rentSchedule: { calendar: { id: `calendar-${id}`, securityDeposit: null } } };
}

function repository(sourceInvoices = [invoice('invoice-1')], overrides = {}) {
  const invoices = new Map(sourceInvoices.map((item) => [item.id, { ...item }]));
  const allocations = [];
  const audits = [];
  let savedPayment;
  let savedReceipt;
  const tx = {
    invoice: {
      findMany: async ({ where }) => where.id.in.map((id) => invoices.get(id)).filter(Boolean),
      findFirst: async ({ where }) => invoices.get(where.id) ?? null,
      updateMany: async ({ where, data }) => {
        const item = invoices.get(where.id); const decrement = Number(data.outstandingBalance.decrement);
        if (!item || Number(item.outstandingBalance) < decrement) return { count: 0 };
        item.outstandingBalance = Number(item.outstandingBalance) - decrement; return { count: 1 };
      },
      findUniqueOrThrow: async ({ where }) => invoices.get(where.id),
      update: async ({ where, data }) => { const item = invoices.get(where.id); Object.assign(item, data); return item; },
    },
    organizationReceiptSequence: { upsert: async () => ({ prefix: 'RCT', nextValue: 2 }) },
    payment: {
      create: async ({ data }) => { savedPayment = { id: 'payment-1', status: 'COMPLETED', ...data }; return savedPayment; },
      findUniqueOrThrow: async () => ({ ...savedPayment, allocations, receipt: savedReceipt }),
      findFirst: async () => savedPayment ?? ({ id: 'payment-1', organizationId: 'organization-1', status: 'COMPLETED', purpose: 'ADVANCE', currency: 'INR', amount: 10000, allocatedAmount: 0, unappliedAmount: 10000, refundedAmount: 0, refundReservedAmount: 0 }),
      update: async ({ data }) => {
        savedPayment ??= { id: 'payment-1', organizationId: 'organization-1', status: 'COMPLETED', purpose: 'ADVANCE', currency: 'INR', amount: 10000, allocatedAmount: 0, unappliedAmount: 10000, refundedAmount: 0, refundReservedAmount: 0 };
        if (data.allocatedAmount?.increment) savedPayment.allocatedAmount = Number(savedPayment.allocatedAmount) + Number(data.allocatedAmount.increment);
        if (data.unappliedAmount?.decrement) savedPayment.unappliedAmount = Number(savedPayment.unappliedAmount) - Number(data.unappliedAmount.decrement);
        if (data.refundReservedAmount?.increment) savedPayment.refundReservedAmount = Number(savedPayment.refundReservedAmount) + Number(data.refundReservedAmount.increment);
        return savedPayment;
      },
    },
    paymentAllocation: {
      create: async ({ data }) => { const row = { id: `allocation-${allocations.length + 1}`, ...data }; allocations.push(row); return row; },
      upsert: async ({ where, create, update }) => { const existing = allocations.find((row) => row.paymentId === where.paymentId_invoiceId.paymentId && row.invoiceId === where.paymentId_invoiceId.invoiceId); if (existing) { existing.amount = Number(existing.amount) + Number(update.amount.increment); return existing; } const row = { id: `allocation-${allocations.length + 1}`, ...create }; allocations.push(row); return row; },
      aggregate: async () => ({ _sum: { amount: overrides.appliedAmount ?? 0 } }),
    },
    receipt: { create: async ({ data }) => { savedReceipt = { id: 'receipt-1', ...data }; return savedReceipt; } },
    refund: { create: async ({ data }) => ({ id: 'refund-1', status: 'PENDING', ...data }) },
    leaseSecurityDeposit: { findUnique: async () => null, upsert: async ({ create }) => create },
  };
  return {
    audits, invoices,
    managerMembership: async () => ({ id: 'membership-1' }),
    transaction: async (callback) => callback(tx),
    audit: async (...args) => audits.push(args),
    findPayment: async () => savedPayment,
    list: async () => [], count: async () => 0,
  };
}

test('partial payment updates invoice balance, marks PARTIALLY_PAID, and creates a receipt', async () => {
  const repo = repository();
  const result = await new PaymentService(repo).create('actor-1', 'organization-1', { method: 'UPI', amount: 4000, allocations: [{ invoiceId: 'invoice-1', amount: 4000 }] });
  assert.equal(Number(repo.invoices.get('invoice-1').outstandingBalance), 6000);
  assert.equal(repo.invoices.get('invoice-1').status, 'PARTIALLY_PAID');
  assert.equal(result.receipt.receiptNumber, 'RCT-00000001');
  assert.equal(repo.audits.length, 3);
});

test('one payment allocates to multiple invoices and marks both PAID', async () => {
  const repo = repository([invoice('invoice-1', 10000), invoice('invoice-2', 5000)]);
  const result = await new PaymentService(repo).create('actor-1', 'organization-1', { method: 'BANK_TRANSFER', amount: 15000, allocations: [{ invoiceId: 'invoice-1', amount: 10000 }, { invoiceId: 'invoice-2', amount: 5000 }] });
  assert.equal(result.allocations.length, 2);
  assert.equal(repo.invoices.get('invoice-1').status, 'PAID');
  assert.equal(repo.invoices.get('invoice-2').status, 'PAID');
});

test('advance payment preserves only the unallocated remainder', async () => {
  const result = await new PaymentService(repository()).create('actor-1', 'organization-1', { method: 'CASH', purpose: 'ADVANCE', amount: 12000, allocations: [{ invoiceId: 'invoice-1', amount: 10000 }] });
  assert.equal(Number(result.allocatedAmount), 10000);
  assert.equal(Number(result.unappliedAmount), 2000);
});

test('unapplied advance can later be allocated to another invoice', async () => {
  const repo = repository([invoice('invoice-1', 10000), invoice('invoice-2', 5000)]);
  const service = new PaymentService(repo);
  await service.create('actor-1', 'organization-1', { method: 'CASH', purpose: 'ADVANCE', amount: 12000, allocations: [{ invoiceId: 'invoice-1', amount: 10000 }] });
  const result = await service.allocateAdvance('actor-1', 'organization-1', 'payment-1', { invoiceId: 'invoice-2', amount: 2000 });
  assert.equal(Number(result.unappliedAmount), 0);
  assert.equal(repo.invoices.get('invoice-2').outstandingBalance, 3000);
  assert.equal(result.allocations.length, 2);
});

test('overpayment is rejected without changing invoice balance', async () => {
  const repo = repository();
  await assert.rejects(() => new PaymentService(repo).create('actor-1', 'organization-1', { method: 'CASH', amount: 10001, allocations: [{ invoiceId: 'invoice-1', amount: 10001 }] }));
  assert.equal(repo.invoices.get('invoice-1').outstandingBalance, 10000);
});

test('security-deposit payment requires a security-deposit invoice line', async () => {
  await assert.rejects(() => new PaymentService(repository()).create('actor-1', 'organization-1', { method: 'UPI', purpose: 'SECURITY_DEPOSIT', amount: 1000, allocations: [{ invoiceId: 'invoice-1', amount: 1000 }] }));
});

test('refund foundation reserves refundable value and rejects excess requests', async () => {
  const service = new PaymentService(repository());
  const refund = await service.requestRefund('actor-1', 'organization-1', 'payment-1', { amount: 2000, reason: 'Duplicate transfer' });
  assert.equal(refund.status, 'PENDING');
  await assert.rejects(() => service.requestRefund('actor-1', 'organization-1', 'payment-1', { amount: 10001, reason: 'Invalid' }));
});

test('outstanding recalculation uses completed allocations and issued credits', async () => {
  const item = invoice('invoice-1', 10000); item.total = 10000; item.creditTotal = 1000;
  const repo = repository([item], { appliedAmount: 4000 });
  const result = await new PaymentService(repo).recalculateInvoice('actor-1', 'organization-1', 'invoice-1');
  assert.equal(Number(result.outstandingBalance), 5000);
  assert.equal(result.status, 'PARTIALLY_PAID');
});
