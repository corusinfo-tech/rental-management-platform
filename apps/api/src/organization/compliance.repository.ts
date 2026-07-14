import { Injectable } from '@nestjs/common';
import { MembershipStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class OrganizationComplianceRepository {
  constructor(private readonly prisma: PrismaService) {}
  transaction<T>(callback: (transaction: Prisma.TransactionClient) => Promise<T>) { return this.prisma.$transaction(callback, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted }); }
  find(organizationId: string, transaction: Prisma.TransactionClient) { return transaction.organizationCompliance.findUnique({ where: { organizationId } }); }
  update(organizationId: string, expectedVersion: number, data: Prisma.OrganizationComplianceUpdateInput, transaction: Prisma.TransactionClient) { return transaction.organizationCompliance.updateMany({ where: { organizationId, version: expectedVersion }, data: { ...data, version: { increment: 1 } } }); }
  platformSuperAdmin(userId: string, transaction: Prisma.TransactionClient) { return transaction.organizationMembership.findFirst({ where: { status: MembershipStatus.ACTIVE, deletedAt: null, person: { user: { id: userId, deletedAt: null } }, roles: { some: { role: { code: 'SUPER_ADMIN', organizationId: null, isSystem: true, deletedAt: null } } } } }); }
  audit(actorUserId: string, action: string, metadata: Prisma.InputJsonValue, transaction: Prisma.TransactionClient) { const context = metadata as { organizationId: string; complianceId: string }; return transaction.identityAuditEvent.create({ data: { actorUserId, organizationId: context.organizationId, aggregateId: context.complianceId, action, metadata } }); }
  outbox(eventType: string, complianceId: string, organizationId: string, payload: Prisma.InputJsonValue, transaction: Prisma.TransactionClient) { return transaction.outboxEvent.create({ data: { eventType, aggregateType: 'OrganizationCompliance', aggregateId: complianceId, organizationId, payload } }); }
}
