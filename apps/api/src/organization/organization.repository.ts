import { Injectable } from '@nestjs/common';
import { MembershipStatus, OrganizationStatus, OrganizationType, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class OrganizationRepository {
  constructor(private readonly prisma: PrismaService) {}
  transaction<T>(callback: (transaction: Prisma.TransactionClient) => Promise<T>) { return this.prisma.$transaction(callback); }
  create(input: Prisma.OrganizationCreateInput, transaction: Prisma.TransactionClient) { return transaction.organization.create({ data: input }); }
  createSettings(input: { organizationId: string; timezone?: string; currency?: string; country?: string }, transaction: Prisma.TransactionClient) { return transaction.organizationSettings.create({ data: input }); }
  createApproval(organizationId: string, transaction: Prisma.TransactionClient) { return transaction.organizationApproval.create({ data: { organizationId } }); }
  createCompliance(organizationId: string, transaction: Prisma.TransactionClient) { return transaction.organizationCompliance.create({ data: { organizationId } }); }
  findById(id: string) { return this.prisma.organization.findFirst({ where: { id, deletedAt: null } }); }
  update(id: string, data: Prisma.OrganizationUpdateInput, transaction: Prisma.TransactionClient) { return transaction.organization.update({ where: { id }, data }); }
  ownerMembership(userId: string, organizationId: string) { return this.prisma.organizationMembership.findFirst({ where: { organizationId, isOwner: true, status: MembershipStatus.ACTIVE, deletedAt: null, person: { user: { id: userId, deletedAt: null } } } }); }
  createOwnerMembership(organizationId: string, personId: string, transaction: Prisma.TransactionClient) { return transaction.organizationMembership.create({ data: { organizationId, personId, isOwner: true, status: MembershipStatus.ACTIVE, joinedAt: new Date() } }); }
  findSystemRole(code: string, transaction: Prisma.TransactionClient) { return transaction.role.findFirst({ where: { code, organizationId: null, isSystem: true, deletedAt: null } }); }
  assignRole(membershipId: string, roleId: string, assignedByUserId: string, transaction: Prisma.TransactionClient) { return transaction.membershipRole.create({ data: { membershipId, roleId, assignedByUserId } }); }
  findUserPerson(userId: string, transaction: Prisma.TransactionClient) { return transaction.user.findFirst({ where: { id: userId, deletedAt: null }, select: { personId: true } }); }
  audit(userId: string, action: string, metadata: Prisma.InputJsonValue, transaction: Prisma.TransactionClient) { const context = metadata as { organizationId: string }; return transaction.identityAuditEvent.create({ data: { actorUserId: userId, organizationId: context.organizationId, aggregateId: context.organizationId, action, metadata } }); }
  outbox(eventType: string, organizationId: string, payload: Prisma.InputJsonValue, transaction: Prisma.TransactionClient) { return transaction.outboxEvent.create({ data: { eventType, aggregateType: 'Organization', aggregateId: organizationId, organizationId, payload } }); }
}
