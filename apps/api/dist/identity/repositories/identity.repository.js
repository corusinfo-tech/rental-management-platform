"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdentityRepository = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../database/prisma.service");
let IdentityRepository = class IdentityRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async withTransaction(callback) {
        return this.prisma.$transaction(callback, { isolationLevel: client_1.Prisma.TransactionIsolationLevel.ReadCommitted });
    }
    async createUser(input, client = this.prisma) {
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
    async findUserByEmail(email, client = this.prisma) {
        return client.user.findUnique({ where: { email }, include: { person: true } });
    }
    async findUserByMobile(mobile, client = this.prisma) {
        return client.user.findUnique({ where: { mobile } });
    }
    async findUserByIdentifier(identifier) {
        return this.prisma.user.findFirst({ where: { deletedAt: null, OR: [identifier.email ? { email: identifier.email } : undefined, identifier.mobile ? { mobile: identifier.mobile } : undefined].filter(Boolean) }, include: { person: true } });
    }
    async updatePasswordHash(userId, passwordHash, client) {
        return client.user.update({ where: { id: userId }, data: { passwordHash } });
    }
    async findDefaultMembershipForUser(userId, client = this.prisma) {
        return client.organizationMembership.findFirst({ where: { person: { user: { id: userId } }, status: client_1.MembershipStatus.ACTIVE, deletedAt: null }, orderBy: { createdAt: 'asc' } });
    }
    async createRegistrationOrganization(input, client) {
        return client.organization.create({ data: input });
    }
    async findSystemRoleByCode(code, client) {
        return client.role.findFirst({ where: { code, organizationId: null, isSystem: true, deletedAt: null } });
    }
    async createActiveMembership(input, client) {
        return client.organizationMembership.create({
            data: { ...input, status: client_1.MembershipStatus.ACTIVE, joinedAt: new Date() },
        });
    }
    async assignRoleToMembership(input, client) {
        return client.membershipRole.create({ data: input });
    }
    async createEmailVerification(input, client) {
        return client.verification.create({
            data: {
                ...input,
                channel: client_1.VerificationChannel.EMAIL,
                purpose: client_1.VerificationPurpose.EMAIL_VERIFICATION,
            },
        });
    }
    async createVerification(input, client) {
        return client.verification.create({ data: input });
    }
    async findActiveVerification(userId, channel, purpose, client) {
        return client.verification.findFirst({
            where: { userId, channel, purpose, status: client_1.VerificationStatus.PENDING, expiresAt: { gt: new Date() } },
            orderBy: { createdAt: 'desc' },
        });
    }
    async expirePendingVerifications(userId, channel, purpose, client) {
        return client.verification.updateMany({
            where: { userId, channel, purpose, status: client_1.VerificationStatus.PENDING, expiresAt: { lte: new Date() } },
            data: { status: client_1.VerificationStatus.EXPIRED },
        });
    }
    async findExpiredPendingVerifications(userId, channel, purpose, client) {
        return client.verification.findMany({ where: { userId, channel, purpose, status: client_1.VerificationStatus.PENDING, expiresAt: { lte: new Date() } }, select: { id: true, userId: true } });
    }
    async createVerificationDeliveryEnvelope(input, client) {
        // Prisma's PostgreSQL bytea input requires ArrayBuffer-backed typed arrays.
        const binary = (value) => new Uint8Array(value);
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
    async destroyVerificationDeliveryEnvelope(verificationId, client) {
        return client.verificationDeliveryEnvelope.updateMany({
            where: { verificationId, status: 'PENDING' },
            data: { ciphertext: null, nonce: null, authenticationTag: null, aad: null, status: 'DESTROYED', destroyedAt: new Date() },
        });
    }
    async expireVerificationDeliveryEnvelopes(userId, client) {
        return client.verificationDeliveryEnvelope.updateMany({
            where: { verification: { userId }, status: 'PENDING', expiresAt: { lte: new Date() } },
            data: { ciphertext: null, nonce: null, authenticationTag: null, aad: null, status: 'EXPIRED', destroyedAt: new Date() },
        });
    }
    async findEmailVerification(id, client) {
        return client.verification.findUnique({ where: { id }, include: { user: true } });
    }
    async findActiveEmailVerification(userId, client) {
        return client.verification.findFirst({
            where: { userId, channel: client_1.VerificationChannel.EMAIL, purpose: client_1.VerificationPurpose.EMAIL_VERIFICATION, status: client_1.VerificationStatus.PENDING, expiresAt: { gt: new Date() } },
            orderBy: { createdAt: 'desc' },
        });
    }
    async expirePendingEmailVerifications(userId, client) {
        return client.verification.updateMany({
            where: { userId, channel: client_1.VerificationChannel.EMAIL, purpose: client_1.VerificationPurpose.EMAIL_VERIFICATION, status: client_1.VerificationStatus.PENDING, expiresAt: { lte: new Date() } },
            data: { status: client_1.VerificationStatus.EXPIRED },
        });
    }
    async revokeVerification(id, client) {
        return client.verification.updateMany({ where: { id, status: client_1.VerificationStatus.PENDING }, data: { status: client_1.VerificationStatus.REVOKED, revokedAt: new Date() } });
    }
    async verifyVerification(id, client) {
        return client.verification.updateMany({
            where: { id, status: client_1.VerificationStatus.PENDING, expiresAt: { gt: new Date() } },
            data: { status: client_1.VerificationStatus.VERIFIED, consumedAt: new Date(), lastAttemptAt: new Date(), attempts: { increment: 1 } },
        });
    }
    async recordVerificationFailure(id, maxAttempts, client) {
        const updated = await client.verification.updateMany({
            where: { id, status: client_1.VerificationStatus.PENDING, expiresAt: { gt: new Date() }, attempts: { lt: maxAttempts } },
            data: { attempts: { increment: 1 }, lastAttemptAt: new Date() },
        });
        return updated;
    }
    async revokeVerificationAtAttemptLimit(id, maxAttempts, client) {
        return client.verification.updateMany({
            where: { id, status: client_1.VerificationStatus.PENDING, attempts: { gte: maxAttempts } },
            data: { status: client_1.VerificationStatus.REVOKED, revokedAt: new Date() },
        });
    }
    async findOrganizationIdForUser(userId, client) {
        const membership = await client.organizationMembership.findFirst({
            where: { person: { user: { id: userId } }, deletedAt: null, status: client_1.MembershipStatus.ACTIVE },
            select: { organizationId: true },
        });
        return membership?.organizationId;
    }
    async transitionEmailVerifiedUser(userId, status, client) {
        const nextStatus = status === client_1.UserStatus.PENDING_EMAIL ? client_1.UserStatus.ACTIVE : client_1.UserStatus.PENDING_REVIEW;
        return client.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date(), status: nextStatus } });
    }
    async createAuditEvent(input, client = this.prisma) {
        return client.identityAuditEvent.create({ data: input });
    }
    async createOutboxEvent(input, client) {
        return client.outboxEvent.create({ data: input });
    }
    async createSession(input, client) {
        return (client ?? this.prisma).session.create({ data: { ...input, lastUsedAt: new Date() } });
    }
    async findSession(id, client = this.prisma) {
        return client.session.findUnique({ where: { id } });
    }
    async findActiveSessionForAccess(id) {
        return this.prisma.session.findFirst({ where: { id, revokedAt: null, expiresAt: { gt: new Date() }, user: { deletedAt: null, status: client_1.UserStatus.ACTIVE } }, select: { id: true, userId: true } });
    }
    async listActiveSessions(userId) { return this.prisma.session.findMany({ where: { userId, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { lastUsedAt: 'desc' } }); }
    async revokeSessionForUser(sessionId, userId, reason, client = this.prisma) { return client.session.updateMany({ where: { id: sessionId, userId, revokedAt: null }, data: { revokedAt: new Date(), revokedReason: reason } }); }
    async revokeAllSessionsForUser(userId, reason, client = this.prisma) { return client.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date(), revokedReason: reason } }); }
    async revokeActiveSession(id, client) {
        return client.session.updateMany({
            where: { id, revokedAt: null, expiresAt: { gt: new Date() } },
            data: { revokedAt: new Date(), revokedReason: 'ROTATED' },
        });
    }
    async revokeSessionFamily(familyId, reason, client) {
        return client.session.updateMany({
            where: { familyId, revokedAt: null },
            data: { revokedAt: new Date(), revokedReason: reason },
        });
    }
    async findActiveMembershipForUser(userId, organizationId) {
        return this.prisma.organizationMembership.findFirst({
            where: {
                organizationId,
                status: client_1.MembershipStatus.ACTIVE,
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
    async activateUser(id, client = this.prisma) {
        return client.user.update({ where: { id }, data: { status: client_1.UserStatus.ACTIVE, emailVerifiedAt: new Date() } });
    }
};
exports.IdentityRepository = IdentityRepository;
exports.IdentityRepository = IdentityRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], IdentityRepository);
