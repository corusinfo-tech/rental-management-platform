import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { UserStatus, VerificationChannel, VerificationPurpose } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { PublicRegistrationType, RegisterDto, RegistrationAcceptedDto } from '../dto/auth.dto';
import { IdentityRepository } from '../repositories/identity.repository';
import { normalizeEmail, normalizeMobile } from './normalization';
import { VerificationEngine } from '../verification-engine/verification-engine.service';

const REGISTRATION_RULES = {
  [PublicRegistrationType.TENANT]: { status: UserStatus.PENDING_EMAIL, roleCode: 'TENANT' },
  [PublicRegistrationType.LANDLORD]: { status: UserStatus.PENDING_REVIEW, roleCode: 'ORG_PROPRIETOR' },
} as const;

const ACCEPTED_RESPONSE: RegistrationAcceptedDto = { accepted: true };

@Injectable()
export class PublicRegistrationService {
  constructor(
    private readonly repository: IdentityRepository,
    private readonly verificationEngine: VerificationEngine,
  ) {}

  async register(input: RegisterDto): Promise<RegistrationAcceptedDto> {
    const email = normalizeEmail(input.email);
    const mobile = normalizeMobile(input.countryCode, input.mobile);
    const rule = REGISTRATION_RULES[input.registrationType];
    const passwordHash = await argon2.hash(input.password);

    try {
      await this.repository.withTransaction(async (transaction) => {
        const [emailOwner, mobileOwner, role] = await Promise.all([
          this.repository.findUserByEmail(email, transaction),
          this.repository.findUserByMobile(mobile, transaction),
          input.registrationType === PublicRegistrationType.LANDLORD
            ? this.repository.findSystemRoleByCode(rule.roleCode, transaction)
            : Promise.resolve(null),
        ]);
        if (emailOwner || mobileOwner) {
          return;
        }
        if (input.registrationType === PublicRegistrationType.LANDLORD && !role) {
          throw new InternalServerErrorException('Required registration role is not configured');
        }

        const user = await this.repository.createUser(
          {
            firstName: input.firstName.trim(),
            lastName: input.lastName.trim(),
            email,
            mobile,
            passwordHash,
            status: rule.status,
          },
          transaction,
        );
        const organization = input.registrationType === PublicRegistrationType.LANDLORD
          ? await this.repository.createRegistrationOrganization(
              { code: `landlord-${randomUUID()}`, name: `${input.firstName.trim()} ${input.lastName.trim()}` },
              transaction,
            )
          : undefined;
        if (organization && role) {
          await this.repository.createRegistrationOrganizationSettings(organization.id, transaction);
          const membership = await this.repository.createActiveMembership(
            { organizationId: organization.id, personId: user.personId, isOwner: true },
            transaction,
          );
          await this.repository.assignRoleToMembership({ membershipId: membership.id, roleId: role.id }, transaction);
          const approval = await this.repository.createOrganizationApproval(organization.id, transaction);
          await this.repository.createOrganizationCompliance(organization.id, transaction);
          await this.repository.createAuditEvent({ subjectUserId: user.id, action: 'organization.approval.requested', metadata: { organizationId: organization.id, approvalId: approval.id } }, transaction);
        }
        // An accepted invitation has already proved control of its email via the
        // shared Verification Engine. Registration is the first point at which a
        // new-email invite may receive a real Person/User-backed membership.
        for (const invitation of await this.repository.findAcceptedOrganizationInvitations(email, transaction)) {
          const existing = await this.repository.findMembershipForPerson(invitation.organizationId, user.personId, transaction);
          const membership = existing
            ? await this.repository.activateMembership(existing.id, transaction)
            : await this.repository.createActiveMembership({ organizationId: invitation.organizationId, personId: user.personId }, transaction);
          await this.repository.assignRoleToMembershipIfMissing({ membershipId: membership.id, roleId: invitation.roleId }, transaction);
          if (invitation.leasePartyId && (await this.repository.linkLeasePartyFromVerifiedInvitation(invitation.organizationId, invitation.leasePartyId, user.personId, invitation.verificationId, transaction)).count !== 1) {
            throw new InternalServerErrorException('Verified lease-party invitation cannot be linked safely');
          }
          const payload = { invitationId: invitation.id, verificationId: invitation.verificationId, membershipId: membership.id, userId: user.id, organizationId: invitation.organizationId };
          await this.repository.createAuditEvent({ subjectUserId: user.id, action: existing ? 'organization.membership.updated' : 'organization.membership.created', metadata: payload }, transaction);
          await this.repository.createOutboxEvent({ eventType: existing ? 'MembershipUpdated' : 'MembershipCreated', aggregateType: 'OrganizationMembership', aggregateId: membership.id, organizationId: invitation.organizationId, payload }, transaction);
        }
        const correlationId = undefined;
        const verification = await this.verificationEngine.createVerification({ userId: user.id, organizationId: organization?.id ?? null, channel: VerificationChannel.EMAIL, purpose: VerificationPurpose.EMAIL_VERIFICATION, correlationId, transaction });
        await this.repository.createAuditEvent(
          {
            subjectUserId: user.id,
            action: 'identity.registration.submitted',
            metadata: { registrationType: input.registrationType, organizationId: organization?.id ?? null },
          },
          transaction,
        );
        await this.repository.createOutboxEvent(
          {
            eventType: 'UserRegistered', aggregateType: 'User', aggregateId: user.id, organizationId: organization?.id,
            payload: { userId: user.id, registrationType: input.registrationType, status: user.status },
          },
          transaction,
        );
      });
      return ACCEPTED_RESPONSE;
    } catch (error) {
      if (this.isUniqueConstraintViolation(error)) {
        return ACCEPTED_RESPONSE;
      }
      throw error;
    }
  }

  private isUniqueConstraintViolation(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
