import { Injectable } from '@nestjs/common';
import { LeaseStatus, MembershipStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class LeaseRepository {
  constructor(private readonly prisma: PrismaService) {}
  transaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) { return this.prisma.$transaction(callback); }
  managerMembership(userId: string, organizationId: string) { return this.prisma.organizationMembership.findFirst({ where: { organizationId, status: MembershipStatus.ACTIVE, deletedAt: null, person: { user: { id: userId, deletedAt: null } }, OR: [{ isOwner: true }, { roles: { some: { role: { code: { in: ['OWNER', 'ADMIN', 'PROPERTY_MANAGER'] }, deletedAt: null } } } }] } }); }
  findActiveUnit(organizationId: string, unitId: string) { return this.prisma.unit.findFirst({ where: { id: unitId, deletedAt: null, floor: { deletedAt: null, building: { deletedAt: null, property: { organizationId, deletedAt: null } } } } }); }
  findLease(organizationId: string, leaseId: string, includeDeleted = false) { return this.prisma.lease.findFirst({ where: { id: leaseId, organizationId, ...(includeDeleted ? {} : { deletedAt: null }) }, include: { terms: true, parties: true, documents: { where: { deletedAt: null } }, unit: { include: { floor: { include: { building: { include: { property: true } } } } } }, renewals: { orderBy: { createdAt: 'desc' } } } }); }
  list(where: Prisma.LeaseWhereInput, skip: number, take: number) { return this.prisma.lease.findMany({ where, skip, take, orderBy: { startsAt: 'desc' }, include: { terms: true, unit: { include: { floor: { include: { building: { include: { property: true } } } } } }, _count: { select: { parties: true, documents: true } } } }); }
  count(where: Prisma.LeaseWhereInput) { return this.prisma.lease.count({ where }); }
  activeLeaseForUnit(unitId: string, excludedLeaseId?: string) { return this.prisma.lease.findFirst({ where: { unitId, deletedAt: null, status: { in: [LeaseStatus.ACTIVE, LeaseStatus.NOTICE_TERMINATED] }, ...(excludedLeaseId ? { id: { not: excludedLeaseId } } : {}) } }); }
  audit(actorUserId: string, organizationId: string, aggregateId: string, action: string, metadata: Prisma.InputJsonObject, tx: Prisma.TransactionClient) { return tx.identityAuditEvent.create({ data: { actorUserId, organizationId, aggregateId, action, metadata } }); }
}
