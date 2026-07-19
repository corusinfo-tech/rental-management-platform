import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class InvoiceRepository {
  constructor(private readonly prisma: PrismaService) {}
  transaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) { return this.prisma.$transaction(callback); }
  findSchedule(organizationId: string, scheduleId: string) { return this.prisma.leaseRentSchedule.findFirst({ where: { id: scheduleId, calendar: { deletedAt: null, lease: { organizationId, deletedAt: null } } }, include: { calendar: { include: { lease: true } }, invoice: true } }); }
  findInvoice(organizationId: string, invoiceId: string, includeDeleted = false) { return this.prisma.invoice.findFirst({ where: { id: invoiceId, organizationId, ...(includeDeleted ? {} : { deletedAt: null }) }, include: { lines: { orderBy: { sortOrder: 'asc' } }, creditNotes: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } }, lease: true, rentSchedule: true } }); }
  list(where: Prisma.InvoiceWhereInput, skip: number, take: number) { return this.prisma.invoice.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { lease: { select: { id: true, code: true } }, rentSchedule: { select: { id: true, periodStartsAt: true, periodEndsAt: true } }, _count: { select: { lines: true, creditNotes: true } } } }); }
  count(where: Prisma.InvoiceWhereInput) { return this.prisma.invoice.count({ where }); }
  audit(actorUserId: string, organizationId: string, aggregateId: string, action: string, metadata: Prisma.InputJsonObject, tx: Prisma.TransactionClient) { return tx.identityAuditEvent.create({ data: { actorUserId, organizationId, aggregateId, action, metadata } }); }
}
