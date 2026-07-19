import assert from 'node:assert/strict';
import test from 'node:test';
import { InvoiceService } from '../dist/finance/invoice.service.js';

const access = { scope: async () => ({ organizationWide: true, propertyIds: [] }), assertSchedule: async () => 'property-1', assertInvoice: async () => 'property-1', invoiceWhere: () => ({}) };
const service = (repo) => new InvoiceService(repo, access);

const schedule = {
  id: 'schedule-1', totalDue: 25000, dueAt: new Date('2026-08-05T00:00:00.000Z'),
  periodStartsAt: new Date('2026-08-01T00:00:00.000Z'), periodEndsAt: new Date('2026-09-01T00:00:00.000Z'),
  calendar: { leaseId: 'lease-1', currency: 'INR', lease: { id: 'lease-1' } }, invoice: null,
};

const invoice = {
  id: 'invoice-1', invoiceNumber: 'INV-00000001', organizationId: 'organization-1', leaseId: 'lease-1',
  status: 'ISSUED', archivedFromStatus: null, issuedAt: new Date(), dueAt: schedule.dueAt,
  total: 26000, creditTotal: 0, outstandingBalance: 26000, deletedAt: null,
};

function repository(overrides = {}) {
  const calls = [];
  return {
    calls,
    managerMembership: async () => ({ id: 'membership-1' }),
    findSchedule: async () => schedule,
    findInvoice: async () => invoice,
    transaction: async (callback) => callback({
      organizationInvoiceSequence: { upsert: async () => ({ prefix: 'INV', nextValue: 2 }) },
      invoice: {
        create: async ({ data }) => ({ id: 'invoice-1', ...data, lines: data.lines.create }),
        update: async ({ data }) => ({ ...invoice, ...data, nextCreditNoteValue: 2 }),
      },
      creditNote: { create: async ({ data }) => ({ id: 'credit-1', ...data }) },
    }),
    audit: async (...args) => calls.push(args),
    ...overrides,
  };
}

test('generates the mandatory rent line from a rent schedule', async () => {
  const repo = repository();
  const result = await service(repo).create('actor-1', 'organization-1', { rentScheduleId: 'schedule-1', additionalLines: [{ type: 'PARKING', description: 'Parking', unitAmount: 1000 }] });
  assert.equal(result.invoiceNumber, 'INV-00000001');
  assert.equal(result.rentScheduleId, 'schedule-1');
  assert.equal(result.lines[0].type, 'RENT');
  assert.equal(Number(result.lines[0].lineTotal), 25000);
  assert.equal(Number(result.total), 26000);
  assert.equal(repo.calls[0][3], 'invoice.created');
});

test('rejects duplicate invoice generation for the same rent schedule', async () => {
  const repo = repository({ findSchedule: async () => ({ ...schedule, invoice: { id: 'invoice-existing' } }) });
  await assert.rejects(() => service(repo).create('actor-1', 'organization-1', { rentScheduleId: 'schedule-1' }));
});

test('issued credit note reduces outstanding balance in the same transaction', async () => {
  const repo = repository();
  const result = await service(repo).createCreditNote('actor-1', 'organization-1', 'invoice-1', { status: 'ISSUED', amount: 1000, reason: 'Rent adjustment' });
  assert.equal(result.creditNoteNumber, 'CN-INV-00000001-001');
  assert.equal(result.status, 'ISSUED');
  assert.equal(repo.calls[0][3], 'invoice.credit_note.created');
});

test('rejects an issued credit note above the outstanding balance', async () => {
  await assert.rejects(() => service(repository()).createCreditNote('actor-1', 'organization-1', 'invoice-1', { status: 'ISSUED', amount: 26001, reason: 'Invalid' }));
});

test('archives an invoice while retaining its prior status', async () => {
  const result = await service(repository()).archive('actor-1', 'organization-1', 'invoice-1');
  assert.equal(result.status, 'ARCHIVED');
  assert.equal(result.archivedFromStatus, 'ISSUED');
  assert.ok(result.deletedAt instanceof Date);
});
