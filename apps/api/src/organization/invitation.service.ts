import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InvitationStatus, Prisma, VerificationChannel, VerificationPurpose, VerificationSubjectType } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { VerificationEngine } from '../identity/verification-engine/verification-engine.service';
import { CreateOrganizationInvitationDto, InvitationResponseDto, OrganizationMemberResponseDto } from './dto/invitation.dto';
import { InvitationRepository } from './invitation.repository';
import { OrganizationEvent } from './organization-events';

const ACCEPTED = { accepted: true };

@Injectable()
export class InvitationService {
  constructor(
    private readonly repository: InvitationRepository,
    private readonly verificationEngine: VerificationEngine,
  ) {}

  async invite(actorUserId: string, organizationId: string, input: CreateOrganizationInvitationDto, correlationId?: string): Promise<InvitationResponseDto> {
    const email = input.email.trim().toLowerCase();
    try {
      return await this.repository.transaction(async (transaction) => {
        await this.assertOwner(actorUserId, organizationId, transaction);
        if (!(await this.repository.organizationIsActive(organizationId, transaction))) throw new ConflictException('Suspended or inactive organizations cannot invite members');
        const role = await this.repository.findInvitableRole(organizationId, input.roleId, transaction);
        if (!role) throw new BadRequestException('Role is not available for this organization');
        await this.repository.expirePending(organizationId, email, transaction);
        if (await this.repository.findPending(organizationId, email, transaction)) throw new ConflictException('A pending invitation already exists');

        const invitationId = randomUUID();
        const verificationId = randomUUID();
        const verification = await this.verificationEngine.createVerification({
          verificationId,
          subjectType: VerificationSubjectType.INVITATION,
          subjectReferenceId: invitationId,
          organizationId,
          channel: VerificationChannel.EMAIL,
          purpose: VerificationPurpose.INVITATION,
          correlationId,
          transaction,
        });
        const invitation = await this.repository.create({ id: invitationId, organizationId, email, roleId: role.id, invitedByUserId: actorUserId, verificationId: verification.id, expiresAt: verification.expiresAt }, transaction);
        const payload = { invitationId, organizationId, verificationId: verification.id, roleId: role.id, correlationId: correlationId ?? null };
        await this.repository.audit(actorUserId, undefined, 'organization.invitation.created', payload, transaction);
        await this.repository.outbox(OrganizationEvent.InvitationCreated, 'OrganizationInvitation', invitationId, organizationId, payload, transaction);
        return this.response(invitation);
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) throw new ConflictException('A pending invitation already exists');
      throw error;
    }
  }

  async accept(verificationId: string, token: string, expectedVersion: number, correlationId?: string) {
    const secret = this.secretFor(verificationId, token);
    if (!secret) throw new BadRequestException('Invitation token is invalid');
    const verified = await this.verificationEngine.verify({
      verificationId,
      secret,
      expectedPurpose: VerificationPurpose.INVITATION,
      correlationId,
      afterVerified: async (verification, transaction) => {
        if (verification.subjectType !== VerificationSubjectType.INVITATION) throw new ConflictException('Invitation verification subject is invalid');
        const invitation = await this.repository.findByVerificationId(verification.id, transaction);
        if (!invitation || invitation.id !== verification.subjectReferenceId) throw new ConflictException('Invitation is unavailable');
        if (!(await this.repository.organizationIsActive(invitation.organizationId, transaction))) throw new ConflictException('Suspended or inactive organizations cannot accept member invitations');
        if (invitation.version !== expectedVersion || (await this.repository.accept(invitation.id, expectedVersion, transaction)).count !== 1) throw new ConflictException('Invitation is unavailable');

        const payload = { invitationId: invitation.id, organizationId: invitation.organizationId, verificationId: invitation.verificationId, correlationId: correlationId ?? null };
        const user = await this.repository.findActiveUserByEmail(invitation.email, transaction);
        if (user) {
          const existing = await this.repository.findMembership(invitation.organizationId, user.personId, transaction);
          const membership = existing
            ? await this.repository.activateMembership(existing.id, transaction)
            : await this.repository.createMembership(invitation.organizationId, user.personId, transaction);
          await this.repository.assignRole(membership.id, invitation.roleId, transaction);
          const eventType = existing ? OrganizationEvent.MembershipUpdated : OrganizationEvent.MembershipCreated;
          await this.repository.audit(undefined, user.id, existing ? 'organization.membership.updated' : 'organization.membership.created', { ...payload, membershipId: membership.id }, transaction);
          await this.repository.outbox(eventType, 'OrganizationMembership', membership.id, invitation.organizationId, { ...payload, membershipId: membership.id, userId: user.id }, transaction);
        }
        await this.repository.audit(undefined, user?.id, 'organization.invitation.accepted', payload, transaction);
        await this.repository.outbox(OrganizationEvent.InvitationAccepted, 'OrganizationInvitation', invitation.id, invitation.organizationId, payload, transaction);
      },
    });
    if (!verified) await this.repository.expireIfNeeded(verificationId);
    return ACCEPTED;
  }

  async decline(verificationId: string, token: string, expectedVersion: number, correlationId?: string) {
    const secret = this.secretFor(verificationId, token);
    if (!secret) throw new BadRequestException('Invitation token is invalid');
    const verified = await this.verificationEngine.verify({
      verificationId,
      secret,
      expectedPurpose: VerificationPurpose.INVITATION,
      correlationId,
      afterVerified: async (verification, transaction) => {
        if (verification.subjectType !== VerificationSubjectType.INVITATION) throw new ConflictException('Invitation verification subject is invalid');
        const invitation = await this.repository.findByVerificationId(verification.id, transaction);
        if (!invitation || invitation.id !== verification.subjectReferenceId || invitation.version !== expectedVersion || (await this.repository.decline(invitation.id, expectedVersion, transaction)).count !== 1) throw new ConflictException('Invitation is unavailable');
        const payload = { invitationId: invitation.id, organizationId: invitation.organizationId, verificationId: invitation.verificationId, correlationId: correlationId ?? null };
        await this.repository.audit(undefined, undefined, 'organization.invitation.declined', payload, transaction);
        await this.repository.outbox(OrganizationEvent.InvitationDeclined, 'OrganizationInvitation', invitation.id, invitation.organizationId, payload, transaction);
      },
    });
    if (!verified) await this.repository.expireIfNeeded(verificationId);
    return ACCEPTED;
  }

  async revoke(actorUserId: string, invitationId: string, expectedVersion: number, correlationId?: string) {
    return this.repository.transaction(async (transaction) => {
      const invitation = await this.repository.findById(invitationId, transaction);
      if (!invitation) throw new NotFoundException();
      await this.assertOwner(actorUserId, invitation.organizationId, transaction);
      if (invitation.version !== expectedVersion || (await this.repository.revoke(invitationId, invitation.organizationId, expectedVersion, transaction)).count !== 1) throw new ConflictException('Invitation is no longer pending');
      await this.verificationEngine.revoke(invitation.verificationId, transaction);
      const payload = { invitationId, organizationId: invitation.organizationId, verificationId: invitation.verificationId, correlationId: correlationId ?? null };
      await this.repository.audit(actorUserId, undefined, 'organization.invitation.revoked', payload, transaction);
      await this.repository.outbox(OrganizationEvent.InvitationRevoked, 'OrganizationInvitation', invitationId, invitation.organizationId, payload, transaction);
      return ACCEPTED;
    });
  }

  async members(actorUserId: string, organizationId: string): Promise<OrganizationMemberResponseDto[]> {
    await this.repository.transaction((transaction) => this.assertOwner(actorUserId, organizationId, transaction));
    return (await this.repository.listMembers(organizationId)).flatMap((membership) => {
      const user = membership.person.user;
      if (!user || user.deletedAt) return [];
      return [{ membershipId: membership.id, userId: user.id, firstName: membership.person.firstName, lastName: membership.person.lastName, email: user.email, status: membership.status, isOwner: membership.isOwner, joinedAt: membership.joinedAt, roleCodes: membership.roles.filter((entry) => !entry.role.deletedAt).map((entry) => entry.role.code) }];
    });
  }

  private async assertOwner(userId: string, organizationId: string, transaction: Prisma.TransactionClient) {
    if (!(await this.repository.ownerMembership(userId, organizationId, transaction))) throw new ForbiddenException('Only organization owners may manage invitations');
  }

  private secretFor(verificationId: string, token: string): string | undefined {
    const separator = token.indexOf('.');
    if (separator < 1 || token.slice(0, separator) !== verificationId) return undefined;
    const secret = token.slice(separator + 1);
    return /^[A-Za-z0-9_-]{32,}$/.test(secret) ? secret : undefined;
  }

  private response(invitation: { id: string; organizationId: string; email: string; roleId: string; verificationId: string; status: InvitationStatus; expiresAt: Date; acceptedAt: Date | null; declinedAt: Date | null; revokedAt: Date | null; createdAt: Date; updatedAt: Date; version: number }): InvitationResponseDto {
    return { id: invitation.id, organizationId: invitation.organizationId, email: invitation.email, roleId: invitation.roleId, verificationId: invitation.verificationId, status: invitation.status, expiresAt: invitation.expiresAt, acceptedAt: invitation.acceptedAt, declinedAt: invitation.declinedAt, revokedAt: invitation.revokedAt, createdAt: invitation.createdAt, updatedAt: invitation.updatedAt, version: invitation.version };
  }

  private isUniqueViolation(error: unknown) { return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002'; }
}
