import { Injectable } from '@nestjs/common';
import { MembershipStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}
  transaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) { return this.prisma.$transaction(callback, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
  managerMembership(userId: string, organizationId: string) { return this.prisma.organizationMembership.findFirst({ where: { organizationId, status: MembershipStatus.ACTIVE, deletedAt: null, person: { user: { id: userId, deletedAt: null } }, OR: [{ isOwner: true }, { roles: { some: { role: { code: { in: ['OWNER', 'ADMIN', 'PROPERTY_MANAGER'] }, deletedAt: null } } } }] } }); }
  findPayment(organizationId: string, paymentId: string) { return this.prisma.payment.findFirst({ where: { id: paymentId, organizationId }, include: { allocations: { include: { invoice: { select: { id: true, invoiceNumber: true, status: true, outstandingBalance: true } } } }, receipt: true, refunds: { orderBy: { requestedAt: 'desc' } } } }); }
  list(where: Prisma.PaymentWhereInput, skip: number, take: number) { return this.prisma.payment.findMany({ where, skip, take, orderBy: { paidAt: 'desc' }, include: { receipt: true, allocations: { include: { invoice: { select: { id: true, invoiceNumber: true } } } }, _count: { select: { refunds: true } } } }); }
  count(where: Prisma.PaymentWhereInput) { return this.prisma.payment.count({ where }); }
  audit(actorUserId: string, organizationId: string, aggregateId: string, action: string, metadata: Prisma.InputJsonObject, tx: Prisma.TransactionClient) { return tx.identityAuditEvent.create({ data: { actorUserId, organizationId, aggregateId, action, metadata } }); }
}
