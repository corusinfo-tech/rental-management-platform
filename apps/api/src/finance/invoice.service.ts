import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreditNoteStatus, InvoiceLineType, InvoiceStatus, Prisma } from '@prisma/client';
import { CreateCreditNoteDto, CreateInvoiceDto, InvoiceQueryDto, UpdateInvoiceDto } from './dto/invoice.dto';
import { InvoiceRepository } from './invoice.repository';

@Injectable()
export class InvoiceService {
  constructor(private readonly repository: InvoiceRepository) {}

  async create(actorUserId: string, organizationId: string, input: CreateInvoiceDto) {
    await this.assertManager(actorUserId, organizationId);
    const schedule = await this.repository.findSchedule(organizationId, input.rentScheduleId);
    if (!schedule) throw new NotFoundException('Rent schedule not found');
    if (schedule.invoice) throw new ConflictException('An invoice already exists for this rent schedule');
    const status = input.status ?? InvoiceStatus.DRAFT;
    const createStatuses: InvoiceStatus[] = [InvoiceStatus.DRAFT, InvoiceStatus.ISSUED];
    if (!createStatuses.includes(status)) throw new BadRequestException('Invoices may only be created as DRAFT or ISSUED');
    const rentTotal = new Prisma.Decimal(schedule.totalDue).toDecimalPlaces(2);
    const additional = (input.additionalLines ?? []).map((line, index) => {
      const quantity = new Prisma.Decimal(line.quantity ?? 1);
      const unitAmount = new Prisma.Decimal(line.unitAmount).toDecimalPlaces(2);
      return { type: line.type, description: line.description.trim(), quantity, unitAmount, lineTotal: quantity.mul(unitAmount).toDecimalPlaces(2), sortOrder: index + 1 };
    });
    const subtotal = additional.reduce((sum, line) => sum.add(line.lineTotal), rentTotal).toDecimalPlaces(2);
    try {
      return await this.repository.transaction(async (tx) => {
        const invoiceNumber = await this.allocateNumber(organizationId, tx);
        const invoice = await tx.invoice.create({
          data: {
            organizationId, leaseId: schedule.calendar.leaseId, rentScheduleId: schedule.id, invoiceNumber, status,
            issuedAt: status === InvoiceStatus.ISSUED ? new Date() : null, dueAt: schedule.dueAt,
            currency: schedule.calendar.currency, subtotal, total: subtotal, outstandingBalance: subtotal,
            notes: input.notes?.trim(),
            lines: { create: [{ type: InvoiceLineType.RENT, description: `Rent ${schedule.periodStartsAt.toISOString()} - ${schedule.periodEndsAt.toISOString()}`, quantity: 1, unitAmount: rentTotal, lineTotal: rentTotal, sortOrder: 0 }, ...additional] },
          },
          include: { lines: { orderBy: { sortOrder: 'asc' } } },
        });
        await this.repository.audit(actorUserId, organizationId, invoice.id, 'invoice.created', { invoiceId: invoice.id, rentScheduleId: schedule.id }, tx);
        return invoice;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('An invoice already exists for this rent schedule');
      throw error;
    }
  }

  async list(actorUserId: string, organizationId: string, query: InvoiceQueryDto) {
    await this.assertManager(actorUserId, organizationId);
    const where: Prisma.InvoiceWhereInput = {
      organizationId, deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.leaseId ? { leaseId: query.leaseId } : {}),
      ...(query.search ? { OR: [{ invoiceNumber: { contains: query.search.trim(), mode: 'insensitive' } }, { lease: { code: { contains: query.search.trim(), mode: 'insensitive' } } }] } : {}),
      ...((query.dueFrom || query.dueTo) ? { dueAt: { ...(query.dueFrom ? { gte: new Date(query.dueFrom) } : {}), ...(query.dueTo ? { lte: new Date(query.dueTo) } : {}) } } : {}),
    };
    const [items, total] = await Promise.all([this.repository.list(where, (query.page - 1) * query.limit, query.limit), this.repository.count(where)]);
    return { items, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
  }

  async find(actorUserId: string, organizationId: string, invoiceId: string) {
    await this.assertManager(actorUserId, organizationId);
    return this.getInvoice(organizationId, invoiceId);
  }

  async update(actorUserId: string, organizationId: string, invoiceId: string, input: UpdateInvoiceDto) {
    await this.assertManager(actorUserId, organizationId);
    const invoice = await this.getInvoice(organizationId, invoiceId);
    const mutableStatuses: InvoiceStatus[] = [InvoiceStatus.DRAFT, InvoiceStatus.ISSUED, InvoiceStatus.OVERDUE, InvoiceStatus.VOID];
    if (input.status && !mutableStatuses.includes(input.status)) throw new BadRequestException('Payment-derived and archived statuses cannot be set through this endpoint');
    if (input.status && input.status !== invoice.status && !this.allowedTransition(invoice.status, input.status)) throw new ConflictException(`Invoice cannot transition from ${invoice.status} to ${input.status}`);
    if (input.dueAt && invoice.status !== InvoiceStatus.DRAFT) throw new ConflictException('Due date may only be changed while an invoice is in DRAFT');
    const outstandingBalance = input.status === InvoiceStatus.VOID ? 0 : undefined;
    return this.repository.transaction(async (tx) => {
      const updated = await tx.invoice.update({ where: { id: invoiceId }, data: { status: input.status, issuedAt: input.status === InvoiceStatus.ISSUED && !invoice.issuedAt ? new Date() : undefined, dueAt: input.dueAt ? new Date(input.dueAt) : undefined, notes: input.notes?.trim(), outstandingBalance } });
      await this.repository.audit(actorUserId, organizationId, invoiceId, 'invoice.updated', { invoiceId, status: input.status ?? invoice.status }, tx);
      return updated;
    });
  }

  async createCreditNote(actorUserId: string, organizationId: string, invoiceId: string, input: CreateCreditNoteDto) {
    await this.assertManager(actorUserId, organizationId);
    const invoice = await this.getInvoice(organizationId, invoiceId);
    const status = input.status ?? CreditNoteStatus.DRAFT;
    const createStatuses: CreditNoteStatus[] = [CreditNoteStatus.DRAFT, CreditNoteStatus.ISSUED];
    if (!createStatuses.includes(status)) throw new BadRequestException('Credit notes may only be created as DRAFT or ISSUED');
    const creditableInvoiceStatuses: InvoiceStatus[] = [InvoiceStatus.ISSUED, InvoiceStatus.OVERDUE];
    if (status === CreditNoteStatus.ISSUED && !creditableInvoiceStatuses.includes(invoice.status)) throw new ConflictException('Credit notes can only be issued against issued or overdue invoices');
    if (status === CreditNoteStatus.ISSUED && input.amount > Number(invoice.outstandingBalance)) throw new ConflictException('Credit note amount exceeds the outstanding balance');
    return this.repository.transaction(async (tx) => {
      const sequenced = await tx.invoice.update({ where: { id: invoiceId }, data: { nextCreditNoteValue: { increment: 1 }, ...(status === CreditNoteStatus.ISSUED ? { creditTotal: { increment: input.amount }, outstandingBalance: { decrement: input.amount } } : {}) } });
      const creditNoteNumber = `CN-${invoice.invoiceNumber}-${String(sequenced.nextCreditNoteValue - 1).padStart(3, '0')}`;
      const creditNote = await tx.creditNote.create({ data: { organizationId, invoiceId, creditNoteNumber, status, amount: input.amount, reason: input.reason.trim(), issuedAt: status === CreditNoteStatus.ISSUED ? new Date() : null } });
      await this.repository.audit(actorUserId, organizationId, invoiceId, 'invoice.credit_note.created', { invoiceId, creditNoteId: creditNote.id, status }, tx);
      return creditNote;
    });
  }

  async archive(actorUserId: string, organizationId: string, invoiceId: string) {
    await this.assertManager(actorUserId, organizationId); const invoice = await this.getInvoice(organizationId, invoiceId);
    return this.repository.transaction(async (tx) => { const archived = await tx.invoice.update({ where: { id: invoiceId }, data: { archivedFromStatus: invoice.status, status: InvoiceStatus.ARCHIVED, deletedAt: new Date() } }); await this.repository.audit(actorUserId, organizationId, invoiceId, 'invoice.archived', { invoiceId }, tx); return archived; });
  }

  async restore(actorUserId: string, organizationId: string, invoiceId: string) {
    await this.assertManager(actorUserId, organizationId); const invoice = await this.repository.findInvoice(organizationId, invoiceId, true);
    if (!invoice || !invoice.deletedAt) throw new NotFoundException('Archived invoice not found');
    return this.repository.transaction(async (tx) => { const restored = await tx.invoice.update({ where: { id: invoiceId }, data: { status: invoice.archivedFromStatus ?? InvoiceStatus.DRAFT, archivedFromStatus: null, deletedAt: null } }); await this.repository.audit(actorUserId, organizationId, invoiceId, 'invoice.restored', { invoiceId }, tx); return restored; });
  }

  private async allocateNumber(organizationId: string, tx: Prisma.TransactionClient) {
    const sequence = await tx.organizationInvoiceSequence.upsert({ where: { organizationId }, create: { organizationId, nextValue: 2 }, update: { nextValue: { increment: 1 } } });
    return `${sequence.prefix}-${String(sequence.nextValue - 1).padStart(8, '0')}`;
  }
  private allowedTransition(current: InvoiceStatus, next: InvoiceStatus) {
    const transitions: Partial<Record<InvoiceStatus, InvoiceStatus[]>> = {
      [InvoiceStatus.DRAFT]: [InvoiceStatus.ISSUED, InvoiceStatus.VOID],
      [InvoiceStatus.ISSUED]: [InvoiceStatus.OVERDUE, InvoiceStatus.VOID],
      [InvoiceStatus.OVERDUE]: [InvoiceStatus.VOID],
    };
    return transitions[current]?.includes(next) ?? false;
  }
  private async assertManager(userId: string, organizationId: string) { if (!(await this.repository.managerMembership(userId, organizationId))) throw new ForbiddenException('Invoice management permission is required'); }
  private async getInvoice(organizationId: string, invoiceId: string) { const invoice = await this.repository.findInvoice(organizationId, invoiceId); if (!invoice) throw new NotFoundException('Invoice not found'); return invoice; }
}
