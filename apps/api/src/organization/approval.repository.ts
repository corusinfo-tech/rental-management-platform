import { Injectable } from '@nestjs/common';
import { ApprovalStatus, MembershipStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class OrganizationApprovalRepository {
  constructor(private readonly prisma: PrismaService) {}
  transaction<T>(callback: (transaction: Prisma.TransactionClient) => Promise<T>) { return this.prisma.$transaction(callback, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted }); }
  pending(transaction: Prisma.TransactionClient) { return transaction.organizationApproval.findMany({ where: { status: ApprovalStatus.PENDING, organization: { deletedAt: null } }, include: { organization: true }, orderBy: { createdAt: 'asc' } }); }
  find(organizationId: string, transaction: Prisma.TransactionClient) { return transaction.organizationApproval.findUnique({ where: { organizationId }, include: { organization: true } }); }
  approve(organizationId: string, reviewerId: string, expectedVersion: number, transaction: Prisma.TransactionClient) { return transaction.organizationApproval.updateMany({ where: { organizationId, status: ApprovalStatus.PENDING, version: expectedVersion }, data: { status: ApprovalStatus.APPROVED, reviewedByUserId: reviewerId, reviewedAt: new Date(), reason: null, version: { increment: 1 } } }); }
  reject(organizationId: string, reviewerId: string, reason: string, expectedVersion: number, transaction: Prisma.TransactionClient) { return transaction.organizationApproval.updateMany({ where: { organizationId, status: ApprovalStatus.PENDING, version: expectedVersion }, data: { status: ApprovalStatus.REJECTED, reviewedByUserId: reviewerId, reviewedAt: new Date(), reason, version: { increment: 1 } } }); }
  reopen(organizationId: string, reviewerId: string, reason: string | undefined, expectedVersion: number, transaction: Prisma.TransactionClient) { return transaction.organizationApproval.updateMany({ where: { organizationId, status: ApprovalStatus.REJECTED, version: expectedVersion }, data: { status: ApprovalStatus.PENDING, reviewedByUserId: reviewerId, reviewedAt: new Date(), reason: reason ?? null, version: { increment: 1 } } }); }
  platformSuperAdmin(userId: string, transaction: Prisma.TransactionClient) { return transaction.organizationMembership.findFirst({ where: { status: MembershipStatus.ACTIVE, deletedAt: null, person: { user: { id: userId, deletedAt: null } }, roles: { some: { role: { code: 'SUPER_ADMIN', organizationId: null, isSystem: true, deletedAt: null } } } } }); }
  audit(actorUserId: string, action: string, metadata: Prisma.InputJsonValue, transaction: Prisma.TransactionClient) { const context = metadata as { organizationId: string; approvalId?: string }; return transaction.identityAuditEvent.create({ data: { actorUserId, organizationId: context.organizationId, aggregateId: context.approvalId ?? context.organizationId, action, metadata } }); }
  outbox(eventType: string, organizationId: string, payload: Prisma.InputJsonValue, transaction: Prisma.TransactionClient) { return transaction.outboxEvent.create({ data: { eventType, aggregateType: 'OrganizationApproval', aggregateId: organizationId, organizationId, payload } }); }
}
