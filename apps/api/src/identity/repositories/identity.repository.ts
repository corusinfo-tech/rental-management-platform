import { Injectable } from '@nestjs/common';
import { MembershipStatus, Prisma, UserStatus, VerificationChannel, VerificationPurpose, VerificationStatus, VerificationSubjectType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class IdentityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async withTransaction<T>(callback: (transaction: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(callback, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  async createUser(
    input: {
      firstName: string;
      lastName: string;
      email: string;
      mobile?: string;
      passwordHash: string;
      status?: UserStatus;
    },
    client: Prisma.TransactionClient = this.prisma,
  ) {
    return client.user.create({
      data: {
        email: input.email,
        mobile: input.mobile,
        passwordHash: input.passwordHash,
        status: input.status,
        person: { create: { firstName: input.firstName, lastName: input.lastName } },
      },
    });
  }

  async findUserByEmail(email: string, client: Prisma.TransactionClient | PrismaService = this.prisma) {
    return client.user.findUnique({ where: { email }, include: { person: true } });
  }

  async findUserByMobile(mobile: string, client: Prisma.TransactionClient | PrismaService = this.prisma) {
    return client.user.findUnique({ where: { mobile } });
  }

  async findUserByIdentifier(identifier: { email?: string; mobile?: string }) {
    return this.prisma.user.findFirst({ where: { deletedAt: null, OR: [identifier.email ? { email: identifier.email } : undefined, identifier.mobile ? { mobile: identifier.mobile } : undefined].filter(Boolean) as Prisma.UserWhereInput[] }, include: { person: true } });
  }

  async updatePasswordHash(userId: string, passwordHash: string, client: Prisma.TransactionClient) {
    return client.user.update({ where: { id: userId }, data: { passwordHash } });
  }

  async findDefaultMembershipForUser(userId: string, client: Prisma.TransactionClient | PrismaService = this.prisma) {
    return client.organizationMembership.findFirst({ where: { person: { user: { id: userId } }, status: MembershipStatus.ACTIVE, deletedAt: null }, orderBy: { createdAt: 'asc' } });
  }

  async createRegistrationOrganization(input: { code: string; name: string }, client: Prisma.TransactionClient) {
    return client.organization.create({ data: input });
  }

  async createRegistrationOrganizationSettings(organizationId: string, client: Prisma.TransactionClient) {
    return client.organizationSettings.create({ data: { organizationId } });
  }

  async createOrganizationApproval(organizationId: string, client: Prisma.TransactionClient) {
    return client.organizationApproval.create({ data: { organizationId } });
  }

  async createOrganizationCompliance(organizationId: string, client: Prisma.TransactionClient) {
    return client.organizationCompliance.create({ data: { organizationId } });
  }

  async findSystemRoleByCode(code: string, client: Prisma.TransactionClient) {
    return client.role.findFirst({ where: { code, organizationId: null, isSystem: true, deletedAt: null } });
  }

  async createActiveMembership(input: { organizationId: string; personId: string; isOwner?: boolean }, client: Prisma.TransactionClient) {
    return client.organizationMembership.create({
      data: { ...input, status: MembershipStatus.ACTIVE, joinedAt: new Date() },
    });
  }

  async assignRoleToMembership(input: { membershipId: string; roleId: string }, client: Prisma.TransactionClient) {
    return client.membershipRole.create({ data: input });
  }

  async findAcceptedOrganizationInvitations(email: string, client: Prisma.TransactionClient) {
    return client.organizationInvitation.findMany({
      where: { email, status: 'ACCEPTED', role: { deletedAt: null } },
      select: { id: true, organizationId: true, roleId: true, verificationId: true, leasePartyId: true },
    });
  }

  async linkLeasePartyFromVerifiedInvitation(organizationId: string, leasePartyId: string, personId: string, verificationId: string, client: Prisma.TransactionClient) {
    return client.leaseParty.updateMany({
      where: { id: leasePartyId, lease: { organizationId, deletedAt: null }, OR: [{ personId: null }, { personId }] },
      data: { personId, linkedAt: new Date(), linkVerificationId: verificationId },
    });
  }

  async findMembershipForPerson(organizationId: string, personId: string, client: Prisma.TransactionClient) {
    return client.organizationMembership.findUnique({ where: { organizationId_personId: { organizationId, personId } } });
  }

  async activateMembership(id: string, client: Prisma.TransactionClient) {
    return client.organizationMembership.update({ where: { id }, data: { status: MembershipStatus.ACTIVE, deletedAt: null, joinedAt: new Date() } });
  }

  async assignRoleToMembershipIfMissing(input: { membershipId: string; roleId: string }, client: Prisma.TransactionClient) {
    return client.membershipRole.createMany({ data: [input], skipDuplicates: true });
  }

  async createEmailVerification(
    input: { userId: string; secretHash: string; expiresAt: Date; maxAttempts?: number },
    client: Prisma.TransactionClient,
  ) {
    return client.verification.create({
      data: {
        ...input,
        subjectType: VerificationSubjectType.USER,
        subjectReferenceId: input.userId,
        channel: VerificationChannel.EMAIL,
        purpose: VerificationPurpose.EMAIL_VERIFICATION,
      },
    });
  }

  async createVerification(
    input: { id?: string; userId?: string; subjectType: VerificationSubjectType; subjectReferenceId: string; channel: VerificationChannel; purpose: VerificationPurpose; secretHash: string; expiresAt: Date; maxAttempts: number; resendCount: number },
    client: Prisma.TransactionClient,
  ) {
    return client.verification.create({ data: input });
  }

  async findActiveVerification(userId: string, channel: VerificationChannel, purpose: VerificationPurpose, client: Prisma.TransactionClient) {
    return client.verification.findFirst({
      where: { userId, channel, purpose, status: VerificationStatus.PENDING, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findActiveVerificationBySubject(subjectType: VerificationSubjectType, subjectReferenceId: string, channel: VerificationChannel, purpose: VerificationPurpose, client: Prisma.TransactionClient) {
    return client.verification.findFirst({
      where: { subjectType, subjectReferenceId, channel, purpose, status: VerificationStatus.PENDING, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async expirePendingVerifications(userId: string, channel: VerificationChannel, purpose: VerificationPurpose, client: Prisma.TransactionClient) {
    return client.verification.updateMany({
      where: { userId, channel, purpose, status: VerificationStatus.PENDING, expiresAt: { lte: new Date() } },
      data: { status: VerificationStatus.EXPIRED },
    });
  }

  async expirePendingVerificationsBySubject(subjectType: VerificationSubjectType, subjectReferenceId: string, channel: VerificationChannel, purpose: VerificationPurpose, client: Prisma.TransactionClient) {
    return client.verification.updateMany({
      where: { subjectType, subjectReferenceId, channel, purpose, status: VerificationStatus.PENDING, expiresAt: { lte: new Date() } },
      data: { status: VerificationStatus.EXPIRED },
    });
  }

  async findExpiredPendingVerifications(userId: string, channel: VerificationChannel, purpose: VerificationPurpose, client: Prisma.TransactionClient) {
    return client.verification.findMany({ where: { userId, channel, purpose, status: VerificationStatus.PENDING, expiresAt: { lte: new Date() } }, select: { id: true, userId: true } });
  }

  async findExpiredPendingVerificationsBySubject(subjectType: VerificationSubjectType, subjectReferenceId: string, channel: VerificationChannel, purpose: VerificationPurpose, client: Prisma.TransactionClient) {
    return client.verification.findMany({
      where: { subjectType, subjectReferenceId, channel, purpose, status: VerificationStatus.PENDING, expiresAt: { lte: new Date() } },
      select: { id: true, userId: true, subjectType: true, subjectReferenceId: true },
    });
  }

  async createVerificationDeliveryEnvelope(
    input: {
      verificationId: string;
      ciphertext: Buffer;
      nonce: Buffer;
      authenticationTag: Buffer;
      keyVersion: string;
      algorithm: string;
      aad: Buffer;
      expiresAt: Date;
    },
    client: Prisma.TransactionClient,
  ) {
    // Prisma's PostgreSQL bytea input requires ArrayBuffer-backed typed arrays.
    const binary = (value: Buffer): Uint8Array<ArrayBuffer> => new Uint8Array(value);
    return client.verificationDeliveryEnvelope.create({
      data: {
        ...input,
        ciphertext: binary(input.ciphertext),
        nonce: binary(input.nonce),
        authenticationTag: binary(input.authenticationTag),
        aad: binary(input.aad),
      },
    });
  }

  async destroyVerificationDeliveryEnvelope(verificationId: string, client: Prisma.TransactionClient) {
    return client.verificationDeliveryEnvelope.updateMany({
      where: { verificationId, status: 'PENDING' },
      data: { ciphertext: null, nonce: null, authenticationTag: null, aad: null, status: 'DESTROYED', destroyedAt: new Date() },
    });
  }

  async expireVerificationDeliveryEnvelopes(userId: string, client: Prisma.TransactionClient) {
    return client.verificationDeliveryEnvelope.updateMany({
      where: { verification: { userId }, status: 'PENDING', expiresAt: { lte: new Date() } },
      data: { ciphertext: null, nonce: null, authenticationTag: null, aad: null, status: 'EXPIRED', destroyedAt: new Date() },
    });
  }

  async expireVerificationDeliveryEnvelopesBySubject(subjectType: VerificationSubjectType, subjectReferenceId: string, client: Prisma.TransactionClient) {
    return client.verificationDeliveryEnvelope.updateMany({
      where: { verification: { subjectType, subjectReferenceId }, status: 'PENDING', expiresAt: { lte: new Date() } },
      data: { ciphertext: null, nonce: null, authenticationTag: null, aad: null, status: 'EXPIRED', destroyedAt: new Date() },
    });
  }

  async findEmailVerification(id: string, client: Prisma.TransactionClient) {
    return client.verification.findUnique({ where: { id }, include: { user: true } });
  }

  async findActiveEmailVerification(userId: string, client: Prisma.TransactionClient) {
    return client.verification.findFirst({
      where: { userId, channel: VerificationChannel.EMAIL, purpose: VerificationPurpose.EMAIL_VERIFICATION, status: VerificationStatus.PENDING, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async expirePendingEmailVerifications(userId: string, client: Prisma.TransactionClient) {
    return client.verification.updateMany({
      where: { userId, channel: VerificationChannel.EMAIL, purpose: VerificationPurpose.EMAIL_VERIFICATION, status: VerificationStatus.PENDING, expiresAt: { lte: new Date() } },
      data: { status: VerificationStatus.EXPIRED },
    });
  }

  async revokeVerification(id: string, client: Prisma.TransactionClient) {
    return client.verification.updateMany({ where: { id, status: VerificationStatus.PENDING }, data: { status: VerificationStatus.REVOKED, revokedAt: new Date() } });
  }

  async verifyVerification(id: string, client: Prisma.TransactionClient) {
    return client.verification.updateMany({
      where: { id, status: VerificationStatus.PENDING, expiresAt: { gt: new Date() } },
      data: { status: VerificationStatus.VERIFIED, consumedAt: new Date(), lastAttemptAt: new Date(), attempts: { increment: 1 } },
    });
  }

  async recordVerificationFailure(id: string, maxAttempts: number, client: Prisma.TransactionClient) {
    const updated = await client.verification.updateMany({
      where: { id, status: VerificationStatus.PENDING, expiresAt: { gt: new Date() }, attempts: { lt: maxAttempts } },
      data: { attempts: { increment: 1 }, lastAttemptAt: new Date() },
    });
    return updated;
  }

  async revokeVerificationAtAttemptLimit(id: string, maxAttempts: number, client: Prisma.TransactionClient) {
    return client.verification.updateMany({
      where: { id, status: VerificationStatus.PENDING, attempts: { gte: maxAttempts } },
      data: { status: VerificationStatus.REVOKED, revokedAt: new Date() },
    });
  }

  async findOrganizationIdForUser(userId: string, client: Prisma.TransactionClient) {
    const membership = await client.organizationMembership.findFirst({
      where: { person: { user: { id: userId } }, deletedAt: null, status: MembershipStatus.ACTIVE },
      select: { organizationId: true },
    });
    return membership?.organizationId;
  }

  async transitionEmailVerifiedUser(userId: string, status: UserStatus, client: Prisma.TransactionClient) {
    const nextStatus = status === UserStatus.PENDING_EMAIL ? UserStatus.ACTIVE : UserStatus.PENDING_REVIEW;
    return client.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date(), status: nextStatus } });
  }

  async createAuditEvent(input: { subjectUserId?: string; action: string; metadata: Prisma.InputJsonValue }, client: Prisma.TransactionClient | PrismaService = this.prisma) {
    return client.identityAuditEvent.create({ data: input });
  }

  async createOutboxEvent(
    input: {
      eventType: string;
      aggregateType: string;
      aggregateId: string;
      organizationId?: string;
      payload: Prisma.InputJsonValue;
    },
    client: Prisma.TransactionClient,
  ) {
    return client.outboxEvent.create({ data: input });
  }

  async createSession(input: {
    id: string;
    userId: string;
    refreshTokenHash: string;
    familyId: string;
    parentSessionId?: string;
    membershipId?: string;
    organizationId?: string;
    deviceId?: string;
    userAgent?: string;
    ipAddress?: string;
    expiresAt: Date;
  }, client?: Prisma.TransactionClient | PrismaService) {
    return (client ?? this.prisma).session.create({ data: { ...input, lastUsedAt: new Date() } });
  }

  async findSession(id: string, client: Prisma.TransactionClient | PrismaService = this.prisma) {
    return client.session.findUnique({ where: { id } });
  }

  async findActiveSessionForAccess(id: string) {
    return this.prisma.session.findFirst({ where: { id, revokedAt: null, expiresAt: { gt: new Date() }, user: { deletedAt: null, status: UserStatus.ACTIVE } }, select: { id: true, userId: true } });
  }

  async listActiveSessions(userId: string) {
    return this.prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'desc' },
      select: {
        id: true,
        membershipId: true,
        organizationId: true,
        deviceId: true,
        deviceName: true,
        userAgent: true,
        ipAddress: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }
  async revokeSessionForUser(sessionId: string, userId: string, reason: string, client: Prisma.TransactionClient | PrismaService = this.prisma) { return client.session.updateMany({ where: { id: sessionId, userId, revokedAt: null }, data: { revokedAt: new Date(), revokedReason: reason } }); }
  async revokeAllSessionsForUser(userId: string, reason: string, client: Prisma.TransactionClient | PrismaService = this.prisma) { return client.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date(), revokedReason: reason } }); }

  async revokeActiveSession(id: string, client: Prisma.TransactionClient) {
    return client.session.updateMany({
      where: { id, revokedAt: null, expiresAt: { gt: new Date() } },
      data: { revokedAt: new Date(), revokedReason: 'ROTATED' },
    });
  }

  async revokeSessionFamily(familyId: string, reason: string, client: Prisma.TransactionClient) {
    return client.session.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
  }

  async findActiveMembershipForUser(userId: string, organizationId: string) {
    return this.prisma.organizationMembership.findFirst({
      where: {
        organizationId,
        status: MembershipStatus.ACTIVE,
        deletedAt: null,
        person: { user: { id: userId, deletedAt: null } },
      },
      include: {
        roles: {
          where: { role: { deletedAt: null } },
          include: { role: { include: { permissions: { include: { permission: true } } } } },
        },
      },
    });
  }

  async findActivePlatformPrincipal(userId: string) {
    return this.prisma.platformPrincipal.findFirst({
      where: { userId, role: 'SUPER_ADMIN', status: 'ACTIVE', deletedAt: null, user: { deletedAt: null, status: UserStatus.ACTIVE } },
      select: { id: true, userId: true, role: true },
    });
  }

  async activateUser(id: string, client: Prisma.TransactionClient | PrismaService = this.prisma) {
    return client.user.update({ where: { id }, data: { status: UserStatus.ACTIVE, emailVerifiedAt: new Date() } });
  }
}
