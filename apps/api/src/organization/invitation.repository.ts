import { Injectable } from '@nestjs/common';
import { InvitationStatus, MembershipStatus, OrganizationStatus, Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class InvitationRepository {
  constructor(private readonly prisma: PrismaService) {}

  transaction<T>(callback: (transaction: Prisma.TransactionClient) => Promise<T>) {
    return this.prisma.$transaction(callback, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  membershipWithPermission(userId: string, organizationId: string, permissionCode: string, transaction: Prisma.TransactionClient) {
    return transaction.organizationMembership.findFirst({
      where: { organizationId, status: MembershipStatus.ACTIVE, deletedAt: null, person: { user: { id: userId, deletedAt: null } }, roles: { some: { role: { code: { notIn: ['SUPER_ADMIN', 'OWNER', 'LANDLORD'] }, deletedAt: null, permissions: { some: { permission: { code: permissionCode, deletedAt: null } } } } } } },
    });
  }

  organizationIsActive(organizationId: string, transaction: Prisma.TransactionClient) {
    return transaction.organization.findFirst({ where: { id: organizationId, status: OrganizationStatus.ACTIVE, deletedAt: null }, select: { id: true } });
  }

  findInvitableRole(organizationId: string, roleId: string, transaction: Prisma.TransactionClient) {
    return transaction.role.findFirst({ where: { id: roleId, deletedAt: null, OR: [{ organizationId }, { organizationId: null, isSystem: true }] } });
  }

  findPending(organizationId: string, email: string, transaction: Prisma.TransactionClient) {
    return transaction.organizationInvitation.findFirst({ where: { organizationId, email, status: InvitationStatus.PENDING, expiresAt: { gt: new Date() } } });
  }

  expirePending(organizationId: string, email: string, transaction: Prisma.TransactionClient) {
    return transaction.organizationInvitation.updateMany({ where: { organizationId, email, status: InvitationStatus.PENDING, expiresAt: { lte: new Date() } }, data: { status: InvitationStatus.EXPIRED } });
  }

  create(input: { id: string; organizationId: string; email: string; roleId: string; invitedByUserId: string; verificationId: string; leasePartyId?: string; expiresAt: Date }, transaction: Prisma.TransactionClient) {
    return transaction.organizationInvitation.create({ data: input });
  }

  findLinkableLeaseParty(organizationId: string, leasePartyId: string, transaction: Prisma.TransactionClient) {
    return transaction.leaseParty.findFirst({
      where: { id: leasePartyId, role: { in: ['TENANT', 'CO_TENANT'] }, lease: { organizationId, deletedAt: null } },
      select: { id: true, email: true, personId: true },
    });
  }

  linkLeaseParty(organizationId: string, leasePartyId: string, personId: string, verificationId: string, transaction: Prisma.TransactionClient) {
    return transaction.leaseParty.updateMany({
      where: { id: leasePartyId, lease: { organizationId, deletedAt: null }, OR: [{ personId: null }, { personId }] },
      data: { personId, linkedAt: new Date(), linkVerificationId: verificationId },
    });
  }

  findByIdForOrganization(id: string, organizationId: string, transaction: Prisma.TransactionClient) {
    return transaction.organizationInvitation.findFirst({ where: { id, organizationId }, include: { role: true } });
  }

  findById(id: string, transaction: Prisma.TransactionClient) {
    return transaction.organizationInvitation.findUnique({ where: { id }, include: { role: true } });
  }

  findByVerificationId(verificationId: string, transaction: Prisma.TransactionClient) {
    return transaction.organizationInvitation.findUnique({ where: { verificationId }, include: { role: true, leaseParty: true } });
  }

  accept(id: string, expectedVersion: number, transaction: Prisma.TransactionClient) {
    return transaction.organizationInvitation.updateMany({ where: { id, version: expectedVersion, status: InvitationStatus.PENDING, expiresAt: { gt: new Date() } }, data: { status: InvitationStatus.ACCEPTED, acceptedAt: new Date(), version: { increment: 1 } } });
  }

  decline(id: string, expectedVersion: number, transaction: Prisma.TransactionClient) {
    return transaction.organizationInvitation.updateMany({ where: { id, version: expectedVersion, status: InvitationStatus.PENDING, expiresAt: { gt: new Date() } }, data: { status: InvitationStatus.DECLINED, declinedAt: new Date(), version: { increment: 1 } } });
  }

  revoke(id: string, organizationId: string, expectedVersion: number, transaction: Prisma.TransactionClient) {
    return transaction.organizationInvitation.updateMany({ where: { id, organizationId, version: expectedVersion, status: InvitationStatus.PENDING }, data: { status: InvitationStatus.REVOKED, revokedAt: new Date(), version: { increment: 1 } } });
  }

  expireIfNeeded(verificationId: string) {
    return this.prisma.organizationInvitation.updateMany({ where: { verificationId, status: InvitationStatus.PENDING, expiresAt: { lte: new Date() } }, data: { status: InvitationStatus.EXPIRED } });
  }

  findActiveUserByEmail(email: string, transaction: Prisma.TransactionClient) {
    return transaction.user.findFirst({ where: { email, deletedAt: null, status: { notIn: [UserStatus.LOCKED, UserStatus.SUSPENDED, UserStatus.ARCHIVED] } }, select: { id: true, personId: true } });
  }

  findMembership(organizationId: string, personId: string, transaction: Prisma.TransactionClient) {
    return transaction.organizationMembership.findUnique({ where: { organizationId_personId: { organizationId, personId } } });
  }

  createMembership(organizationId: string, personId: string, transaction: Prisma.TransactionClient) {
    return transaction.organizationMembership.create({ data: { organizationId, personId, status: MembershipStatus.ACTIVE, joinedAt: new Date() } });
  }

  activateMembership(id: string, transaction: Prisma.TransactionClient) {
    return transaction.organizationMembership.update({ where: { id }, data: { status: MembershipStatus.ACTIVE, deletedAt: null, joinedAt: new Date() } });
  }

  assignRole(membershipId: string, roleId: string, transaction: Prisma.TransactionClient) {
    return transaction.membershipRole.createMany({ data: [{ membershipId, roleId }], skipDuplicates: true });
  }

  listMembers(organizationId: string) {
    return this.prisma.organizationMembership.findMany({
      where: { organizationId, deletedAt: null },
      include: { person: { include: { user: true } }, roles: { include: { role: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  audit(actorUserId: string | undefined, subjectUserId: string | undefined, action: string, metadata: Prisma.InputJsonValue, transaction: Prisma.TransactionClient) {
    const context = metadata as { organizationId: string; invitationId: string; membershipId?: string };
    return transaction.identityAuditEvent.create({ data: { actorUserId, subjectUserId, organizationId: context.organizationId, aggregateId: context.membershipId ?? context.invitationId, action, metadata } });
  }

  outbox(eventType: string, aggregateType: string, aggregateId: string, organizationId: string, payload: Prisma.InputJsonValue, transaction: Prisma.TransactionClient) {
    return transaction.outboxEvent.create({ data: { eventType, aggregateType, aggregateId, organizationId, payload } });
  }
}
