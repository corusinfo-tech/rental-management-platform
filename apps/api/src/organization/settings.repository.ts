import { Injectable } from '@nestjs/common';
import { MembershipStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class OrganizationSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}
  transaction<T>(callback: (transaction: Prisma.TransactionClient) => Promise<T>) { return this.prisma.$transaction(callback, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted }); }
  find(organizationId: string) { return this.prisma.organizationSettings.findUnique({ where: { organizationId } }); }
  findForUpdate(organizationId: string, transaction: Prisma.TransactionClient) { return transaction.organizationSettings.findUnique({ where: { organizationId } }); }
  async findOrCreateDefaults(organizationId: string, transaction: Prisma.TransactionClient) {
    const organization = await transaction.organization.findFirst({ where: { id: organizationId, deletedAt: null }, select: { id: true, timezone: true, currency: true, country: true } });
    if (!organization) return null;
    return transaction.organizationSettings.upsert({
      where: { organizationId },
      create: { organizationId, timezone: organization.timezone, currency: organization.currency, country: organization.country },
      update: {},
    });
  }
  update(organizationId: string, expectedVersion: number, data: Prisma.OrganizationSettingsUpdateInput, transaction: Prisma.TransactionClient) { return transaction.organizationSettings.updateMany({ where: { organizationId, version: expectedVersion }, data: { ...data, version: { increment: 1 } } }); }
  settingsAccess(userId: string, organizationId: string, permissionCode: string, transaction: Prisma.TransactionClient) {
    return transaction.organizationMembership.findFirst({
      where: { organizationId, status: MembershipStatus.ACTIVE, deletedAt: null, organization: { deletedAt: null }, person: { user: { id: userId, deletedAt: null } }, roles: { some: { role: { code: { not: 'SUPER_ADMIN' }, deletedAt: null, permissions: { some: { permission: { code: permissionCode, deletedAt: null } } } } } } },
    });
  }
  audit(actorUserId: string, action: string, metadata: Prisma.InputJsonValue, transaction: Prisma.TransactionClient) { const context = metadata as { organizationId: string; settingsId: string }; return transaction.identityAuditEvent.create({ data: { actorUserId, organizationId: context.organizationId, aggregateId: context.settingsId, action, metadata } }); }
  outbox(eventType: string, aggregateId: string, organizationId: string, payload: Prisma.InputJsonValue, transaction: Prisma.TransactionClient) { return transaction.outboxEvent.create({ data: { eventType, aggregateType: 'OrganizationSettings', aggregateId, organizationId, payload } }); }
}
