import { Injectable } from '@nestjs/common';
import { MembershipStatus, OrganizationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class OrganizationLifecycleRepository {
  constructor(private readonly prisma: PrismaService) {}
  transaction<T>(callback: (transaction: Prisma.TransactionClient) => Promise<T>) { return this.prisma.$transaction(callback, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted }); }
  find(id: string, transaction: Prisma.TransactionClient) { return transaction.organization.findUnique({ where: { id } }); }
  transition(id: string, from: OrganizationStatus, to: OrganizationStatus, transaction: Prisma.TransactionClient) { return transaction.organization.updateMany({ where: { id, status: from }, data: { status: to, ...(to === OrganizationStatus.ARCHIVED ? { deletedAt: new Date() } : to === OrganizationStatus.ACTIVE ? { deletedAt: null } : {}) } }); }
  ownerMembership(userId: string, organizationId: string, transaction: Prisma.TransactionClient) { return transaction.organizationMembership.findFirst({ where: { organizationId, isOwner: true, status: MembershipStatus.ACTIVE, deletedAt: null, person: { user: { id: userId, deletedAt: null } } } }); }
  platformSuperAdmin(userId: string, transaction: Prisma.TransactionClient) { return transaction.platformPrincipal.findFirst({ where: { userId, role: 'SUPER_ADMIN', status: 'ACTIVE', deletedAt: null, user: { deletedAt: null } } }); }
  audit(actorUserId: string, action: string, metadata: Prisma.InputJsonValue, transaction: Prisma.TransactionClient) { const context = metadata as { organizationId: string }; return transaction.identityAuditEvent.create({ data: { actorUserId, organizationId: context.organizationId, aggregateId: context.organizationId, action, metadata } }); }
  outbox(eventType: string, organizationId: string, payload: Prisma.InputJsonValue, transaction: Prisma.TransactionClient) { return transaction.outboxEvent.create({ data: { eventType, aggregateType: 'Organization', aggregateId: organizationId, organizationId, payload } }); }
}
