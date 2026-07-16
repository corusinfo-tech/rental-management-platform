import { Injectable } from '@nestjs/common';
import { MembershipStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class BillingRepository {
  constructor(private readonly prisma: PrismaService) {}
  transaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) { return this.prisma.$transaction(callback); }
  managerMembership(userId: string, organizationId: string) { return this.prisma.organizationMembership.findFirst({ where: { organizationId, status: MembershipStatus.ACTIVE, deletedAt: null, person: { user: { id: userId, deletedAt: null } }, OR: [{ isOwner: true }, { roles: { some: { role: { code: { in: ['OWNER', 'ADMIN', 'PROPERTY_MANAGER'] }, deletedAt: null } } } }] } }); }
  findLease(organizationId: string, leaseId: string) { return this.prisma.lease.findFirst({ where: { id: leaseId, organizationId, deletedAt: null }, include: { terms: true, billingCalendar: { include: { escalationRules: { orderBy: { effectiveAt: 'asc' } }, lateFeeRule: true, securityDeposit: true } } } }); }
  findCalendar(organizationId: string, leaseId: string) { return this.prisma.leaseBillingCalendar.findFirst({ where: { lease: { id: leaseId, organizationId, deletedAt: null }, deletedAt: null }, include: { escalationRules: { orderBy: { effectiveAt: 'asc' } }, lateFeeRule: true, securityDeposit: true } }); }
  listSchedules(calendarId: string) { return this.prisma.leaseRentSchedule.findMany({ where: { calendarId }, orderBy: { sequence: 'asc' } }); }
  lastSchedule(calendarId: string) { return this.prisma.leaseRentSchedule.findFirst({ where: { calendarId }, orderBy: { sequence: 'desc' } }); }
  audit(actorUserId: string, organizationId: string, aggregateId: string, action: string, metadata: Prisma.InputJsonObject, tx: Prisma.TransactionClient) { return tx.identityAuditEvent.create({ data: { actorUserId, organizationId, aggregateId, action, metadata } }); }
}
