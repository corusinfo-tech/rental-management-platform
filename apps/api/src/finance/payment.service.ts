import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceLineType, InvoiceStatus, PaymentMethod, PaymentPurpose, PaymentStatus, Prisma, SecurityDepositStatus } from '@prisma/client';
import { ApplyAdvanceDto, CreatePaymentDto, CreateRefundDto, PaymentQueryDto } from './dto/payment.dto';
import { PaymentRepository } from './payment.repository';

@Injectable()
export class PaymentService {
  constructor(private readonly repository: PaymentRepository) {}

  async create(actorUserId: string, organizationId: string, input: CreatePaymentDto) {
    await this.assertManager(actorUserId, organizationId);
    const purpose = input.purpose ?? PaymentPurpose.INVOICE;
    const invoiceIds = input.allocations.map((allocation) => allocation.invoiceId);
    if (new Set(invoiceIds).size !== invoiceIds.length) throw new BadRequestException('Each invoice may be allocated only once per payment');
    if (input.method === PaymentMethod.ONLINE_PAYMENT_GATEWAY && !input.externalReference?.trim()) throw new BadRequestException('Online gateway payments require an external reference');
    const paymentAmount = new Prisma.Decimal(input.amount).toDecimalPlaces(2);
    const allocations = input.allocations.map((allocation) => ({ invoiceId: allocation.invoiceId, amount: new Prisma.Decimal(allocation.amount).toDecimalPlaces(2) }));
    const allocatedAmount = allocations.reduce((sum, allocation) => sum.add(allocation.amount), new Prisma.Decimal(0));
    if (allocatedAmount.greaterThan(paymentAmount)) throw new ConflictException('Allocated amount exceeds the payment amount');
    if (purpose !== PaymentPurpose.ADVANCE && !allocatedAmount.equals(paymentAmount)) throw new BadRequestException('Only advance payments may contain an unapplied balance');
    const unappliedAmount = paymentAmount.sub(allocatedAmount);

    return this.serializable(async (tx) => {
      const payableStatuses: InvoiceStatus[] = [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE];
      const invoices = await tx.invoice.findMany({
        where: { id: { in: invoiceIds }, organizationId, deletedAt: null, status: { in: payableStatuses } },
        include: { lines: true, rentSchedule: { include: { calendar: { include: { securityDeposit: true } } } } },
      });
      if (invoices.length !== invoiceIds.length) throw new ConflictException('One or more invoices are missing, ineligible, or outside the organization');
      const currencies = new Set(invoices.map((invoice) => invoice.currency));
      if (currencies.size !== 1) throw new BadRequestException('One payment cannot allocate across multiple currencies');
      const invoiceById = new Map(invoices.map((invoice) => [invoice.id, invoice]));

      for (const allocation of allocations) {
        const invoice = invoiceById.get(allocation.invoiceId)!;
        if (allocation.amount.greaterThan(invoice.outstandingBalance)) throw new ConflictException(`Allocation exceeds outstanding balance for invoice ${invoice.invoiceNumber}`);
        if (purpose === PaymentPurpose.SECURITY_DEPOSIT) await this.validateSecurityDepositAllocation(invoice, allocation.amount, tx);
      }

      const sequence = await tx.organizationReceiptSequence.upsert({ where: { organizationId }, create: { organizationId, nextValue: 2 }, update: { nextValue: { increment: 1 } } });
      const sequenceValue = sequence.nextValue - 1;
      const paymentNumber = `PAY-${String(sequenceValue).padStart(8, '0')}`;
      const receiptNumber = `${sequence.prefix}-${String(sequenceValue).padStart(8, '0')}`;
      const payment = await tx.payment.create({
        data: { organizationId, paymentNumber, method: input.method, purpose, currency: invoices[0].currency, amount: paymentAmount, allocatedAmount, unappliedAmount, externalReference: input.externalReference?.trim(), notes: input.notes?.trim(), paidAt: input.paidAt ? new Date(input.paidAt) : new Date() },
      });

      for (const allocation of allocations) {
        const changed = await tx.invoice.updateMany({ where: { id: allocation.invoiceId, organizationId, deletedAt: null, status: { in: payableStatuses }, outstandingBalance: { gte: allocation.amount } }, data: { outstandingBalance: { decrement: allocation.amount } } });
        if (changed.count !== 1) throw new ConflictException('Concurrent allocation changed an invoice balance; retry the payment');
        await tx.paymentAllocation.create({ data: { paymentId: payment.id, invoiceId: allocation.invoiceId, amount: allocation.amount } });
        const updatedInvoice = await tx.invoice.findUniqueOrThrow({ where: { id: allocation.invoiceId }, select: { outstandingBalance: true } });
        await tx.invoice.update({ where: { id: allocation.invoiceId }, data: { status: new Prisma.Decimal(updatedInvoice.outstandingBalance).isZero() ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID } });
        if (purpose === PaymentPurpose.SECURITY_DEPOSIT) await this.applySecurityDepositAllocation(invoiceById.get(allocation.invoiceId)!, allocation.amount, tx);
      }

      const receipt = await tx.receipt.create({ data: { organizationId, paymentId: payment.id, receiptNumber, amount: paymentAmount, currency: invoices[0].currency } });
      await this.repository.audit(actorUserId, organizationId, payment.id, 'payment.created', { paymentId: payment.id, paymentNumber, purpose, amount: paymentAmount.toFixed(2) }, tx);
      await this.repository.audit(actorUserId, organizationId, payment.id, 'payment.allocated', { paymentId: payment.id, invoiceIds, allocatedAmount: allocatedAmount.toFixed(2), unappliedAmount: unappliedAmount.toFixed(2) }, tx);
      await this.repository.audit(actorUserId, organizationId, payment.id, 'receipt.created', { paymentId: payment.id, receiptId: receipt.id, receiptNumber }, tx);
      return tx.payment.findUniqueOrThrow({ where: { id: payment.id }, include: { allocations: { include: { invoice: true } }, receipt: true } });
    });
  }

  async list(actorUserId: string, organizationId: string, query: PaymentQueryDto) {
    await this.assertManager(actorUserId, organizationId);
    const where: Prisma.PaymentWhereInput = { organizationId, ...(query.status ? { status: query.status } : {}), ...(query.method ? { method: query.method } : {}), ...(query.purpose ? { purpose: query.purpose } : {}), ...(query.search ? { OR: [{ paymentNumber: { contains: query.search.trim(), mode: 'insensitive' } }, { externalReference: { contains: query.search.trim(), mode: 'insensitive' } }] } : {}) };
    const [items, total] = await Promise.all([this.repository.list(where, (query.page - 1) * query.limit, query.limit), this.repository.count(where)]);
    return { items, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
  }

  async find(actorUserId: string, organizationId: string, paymentId: string) {
    await this.assertManager(actorUserId, organizationId);
    const payment = await this.repository.findPayment(organizationId, paymentId);
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async requestRefund(actorUserId: string, organizationId: string, paymentId: string, input: CreateRefundDto) {
    await this.assertManager(actorUserId, organizationId);
    const amount = new Prisma.Decimal(input.amount).toDecimalPlaces(2);
    return this.serializable(async (tx) => {
      const payment = await tx.payment.findFirst({ where: { id: paymentId, organizationId, status: PaymentStatus.COMPLETED } });
      if (!payment) throw new NotFoundException('Completed payment not found');
      const refundable = new Prisma.Decimal(payment.amount).sub(payment.refundedAmount).sub(payment.refundReservedAmount);
      if (amount.greaterThan(refundable)) throw new ConflictException('Refund amount exceeds the unreserved refundable balance');
      await tx.payment.update({ where: { id: paymentId }, data: { refundReservedAmount: { increment: amount } } });
      const refund = await tx.refund.create({ data: { organizationId, paymentId, amount, reason: input.reason.trim() } });
      await this.repository.audit(actorUserId, organizationId, paymentId, 'payment.refund.requested', { paymentId, refundId: refund.id, amount: amount.toFixed(2) }, tx);
      return refund;
    });
  }

  async allocateAdvance(actorUserId: string, organizationId: string, paymentId: string, input: ApplyAdvanceDto) {
    await this.assertManager(actorUserId, organizationId);
    const amount = new Prisma.Decimal(input.amount).toDecimalPlaces(2);
    return this.serializable(async (tx) => {
      const payment = await tx.payment.findFirst({ where: { id: paymentId, organizationId, status: PaymentStatus.COMPLETED, purpose: PaymentPurpose.ADVANCE } });
      if (!payment) throw new NotFoundException('Advance payment not found');
      if (amount.greaterThan(payment.unappliedAmount)) throw new ConflictException('Allocation exceeds the unapplied advance balance');
      const payableStatuses: InvoiceStatus[] = [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE];
      const invoice = await tx.invoice.findFirst({ where: { id: input.invoiceId, organizationId, deletedAt: null, status: { in: payableStatuses } } });
      if (!invoice) throw new NotFoundException('Eligible invoice not found');
      if (invoice.currency !== payment.currency) throw new BadRequestException('Advance payment and invoice currencies do not match');
      const changed = await tx.invoice.updateMany({ where: { id: invoice.id, organizationId, deletedAt: null, status: { in: payableStatuses }, outstandingBalance: { gte: amount } }, data: { outstandingBalance: { decrement: amount } } });
      if (changed.count !== 1) throw new ConflictException('Allocation exceeds the current invoice outstanding balance');
      await tx.payment.update({ where: { id: paymentId }, data: { allocatedAmount: { increment: amount }, unappliedAmount: { decrement: amount } } });
      await tx.paymentAllocation.upsert({ where: { paymentId_invoiceId: { paymentId, invoiceId: invoice.id } }, create: { paymentId, invoiceId: invoice.id, amount }, update: { amount: { increment: amount } } });
      const updatedInvoice = await tx.invoice.findUniqueOrThrow({ where: { id: invoice.id }, select: { outstandingBalance: true } });
      await tx.invoice.update({ where: { id: invoice.id }, data: { status: new Prisma.Decimal(updatedInvoice.outstandingBalance).isZero() ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID } });
      await this.repository.audit(actorUserId, organizationId, paymentId, 'payment.advance.allocated', { paymentId, invoiceId: invoice.id, amount: amount.toFixed(2) }, tx);
      return tx.payment.findUniqueOrThrow({ where: { id: paymentId }, include: { allocations: { include: { invoice: true } }, receipt: true } });
    });
  }

  async recalculateInvoice(actorUserId: string, organizationId: string, invoiceId: string) {
    await this.assertManager(actorUserId, organizationId);
    return this.serializable(async (tx) => {
      const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, organizationId, deletedAt: null } });
      if (!invoice) throw new NotFoundException('Invoice not found');
      const nonRecalculableStatuses: InvoiceStatus[] = [InvoiceStatus.DRAFT, InvoiceStatus.VOID, InvoiceStatus.ARCHIVED];
      if (nonRecalculableStatuses.includes(invoice.status)) throw new ConflictException('This invoice status cannot be recalculated');
      const aggregate = await tx.paymentAllocation.aggregate({ where: { invoiceId, payment: { status: PaymentStatus.COMPLETED } }, _sum: { amount: true } });
      const applied = new Prisma.Decimal(aggregate._sum.amount ?? 0);
      const netTotal = new Prisma.Decimal(invoice.total).sub(invoice.creditTotal);
      if (applied.greaterThan(netTotal)) throw new ConflictException('Stored allocations exceed the invoice net total');
      const outstandingBalance = netTotal.sub(applied).toDecimalPlaces(2);
      const status = outstandingBalance.isZero() ? InvoiceStatus.PAID : applied.greaterThan(0) ? InvoiceStatus.PARTIALLY_PAID : invoice.status === InvoiceStatus.OVERDUE ? InvoiceStatus.OVERDUE : InvoiceStatus.ISSUED;
      const updated = await tx.invoice.update({ where: { id: invoiceId }, data: { outstandingBalance, status } });
      await this.repository.audit(actorUserId, organizationId, invoiceId, 'invoice.outstanding.recalculated', { invoiceId, outstandingBalance: outstandingBalance.toFixed(2), status }, tx);
      return updated;
    });
  }

  private async validateSecurityDepositAllocation(invoice: any, amount: Prisma.Decimal, tx: Prisma.TransactionClient) {
    const lineTotal = invoice.lines.filter((line: any) => line.type === InvoiceLineType.SECURITY_DEPOSIT).reduce((sum: Prisma.Decimal, line: any) => sum.add(line.lineTotal), new Prisma.Decimal(0));
    if (lineTotal.isZero()) throw new ConflictException(`Invoice ${invoice.invoiceNumber} has no security-deposit line`);
    const previous = await tx.paymentAllocation.aggregate({ where: { invoiceId: invoice.id, payment: { status: PaymentStatus.COMPLETED, purpose: PaymentPurpose.SECURITY_DEPOSIT } }, _sum: { amount: true } });
    if (amount.greaterThan(lineTotal.sub(previous._sum.amount ?? 0))) throw new ConflictException(`Security-deposit allocation exceeds the available deposit line on invoice ${invoice.invoiceNumber}`);
  }

  private async applySecurityDepositAllocation(invoice: any, amount: Prisma.Decimal, tx: Prisma.TransactionClient) {
    const calendarId = invoice.rentSchedule.calendar.id;
    const lineTotal = invoice.lines.filter((line: any) => line.type === InvoiceLineType.SECURITY_DEPOSIT).reduce((sum: Prisma.Decimal, line: any) => sum.add(line.lineTotal), new Prisma.Decimal(0));
    const current = await tx.leaseSecurityDeposit.findUnique({ where: { calendarId } });
    const required = new Prisma.Decimal(current?.requiredAmount ?? lineTotal);
    const held = new Prisma.Decimal(current?.heldAmount ?? 0).add(amount);
    if (held.greaterThan(required)) throw new ConflictException('Security-deposit payment exceeds the required deposit');
    const status = held.equals(required) ? SecurityDepositStatus.HELD : SecurityDepositStatus.PENDING;
    await tx.leaseSecurityDeposit.upsert({ where: { calendarId }, create: { calendarId, requiredAmount: required, heldAmount: held, status }, update: { heldAmount: held, status } });
  }

  private async serializable<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) {
    try { return await this.repository.transaction(callback); }
    catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') throw new ConflictException('Concurrent finance update detected; retry the request'); throw error; }
  }
  private async assertManager(userId: string, organizationId: string) { if (!(await this.repository.managerMembership(userId, organizationId))) throw new ForbiddenException('Payment management permission is required'); }
}
