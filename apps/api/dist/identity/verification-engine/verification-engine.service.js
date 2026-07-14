"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationEngine = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const argon2 = __importStar(require("argon2"));
const identity_repository_1 = require("../repositories/identity.repository");
const verification_envelope_service_1 = require("../verification/verification-envelope.service");
const verification_channel_1 = require("./verification-channel");
const identity_events_1 = require("../events/identity-events");
let VerificationEngine = class VerificationEngine {
    repository;
    config;
    envelopes;
    email = new verification_channel_1.EmailChannel();
    sms = new verification_channel_1.SmsChannel();
    whatsapp = new verification_channel_1.WhatsAppChannel();
    constructor(repository, config, envelopes) {
        this.repository = repository;
        this.config = config;
        this.envelopes = envelopes;
    }
    async createVerification(input) {
        if (input.transaction)
            return this.create(input, input.transaction);
        return this.repository.withTransaction((transaction) => this.create(input, transaction));
    }
    async resendVerification(input) {
        return this.repository.withTransaction(async (transaction) => {
            const channel = this.channel(input.channel);
            await this.repository.expirePendingVerifications(input.userId, input.channel, input.purpose, transaction);
            await this.repository.expireVerificationDeliveryEnvelopes(input.userId, transaction);
            const active = await this.repository.findActiveVerification(input.userId, input.channel, input.purpose, transaction);
            if (active) {
                const cooldown = this.settings.cooldownSeconds * 1000;
                if (active.createdAt.getTime() + cooldown > Date.now() || active.resendCount >= this.settings.maximumResends)
                    return undefined;
                await this.repository.revokeVerification(active.id, transaction);
                await this.repository.destroyVerificationDeliveryEnvelope(active.id, transaction);
                channel.destroy();
                await this.audit(input.userId, 'identity.verification.revoked', { verificationId: active.id, correlationId: input.correlationId ?? null }, transaction);
                await this.event(identity_events_1.IdentityEventType.VerificationRevoked, active.id, input.organizationId, { verificationId: active.id, organizationId: input.organizationId, userId: input.userId, correlationId: input.correlationId ?? null }, transaction);
                return this.create({ ...input, resendCount: active.resendCount + 1 }, transaction, identity_events_1.IdentityEventType.VerificationResent);
            }
            return this.create(input, transaction);
        });
    }
    async verify(input) {
        return this.repository.withTransaction(async (transaction) => {
            const verification = await this.repository.findEmailVerification(input.verificationId, transaction);
            if (!verification)
                return undefined;
            if (input.expectedPurpose && verification.purpose !== input.expectedPurpose)
                return undefined;
            const channel = this.channel(verification.channel);
            const metadata = { verificationId: verification.id, correlationId: input.correlationId ?? null };
            if (verification.status !== client_1.VerificationStatus.PENDING) {
                await this.audit(verification.userId, 'identity.verification.replay', metadata, transaction);
                return undefined;
            }
            if (verification.expiresAt <= new Date()) {
                await this.repository.expirePendingVerifications(verification.userId, verification.channel, verification.purpose, transaction);
                await this.repository.destroyVerificationDeliveryEnvelope(verification.id, transaction);
                channel.expire();
                await this.audit(verification.userId, 'identity.verification.expired', metadata, transaction);
                await this.event(identity_events_1.IdentityEventType.VerificationExpired, verification.id, null, { ...metadata, userId: verification.userId, organizationId: null }, transaction);
                return undefined;
            }
            if (!channel.validate(input.secret) || !(await argon2.verify(verification.secretHash, input.secret))) {
                await this.repository.recordVerificationFailure(verification.id, verification.maxAttempts, transaction);
                const current = await this.repository.findEmailVerification(verification.id, transaction);
                if (current && current.attempts >= current.maxAttempts) {
                    await transaction.verification.update({ where: { id: current.id }, data: { status: client_1.VerificationStatus.ATTEMPTS_EXCEEDED, revokedAt: new Date() } });
                    await this.repository.destroyVerificationDeliveryEnvelope(current.id, transaction);
                    await this.audit(current.userId, 'identity.verification.failure', metadata, transaction);
                    await this.event(identity_events_1.IdentityEventType.VerificationAttemptsExceeded, current.id, null, { ...metadata, userId: current.userId, organizationId: null }, transaction);
                }
                return undefined;
            }
            const consumed = await this.repository.verifyVerification(verification.id, transaction);
            if (consumed.count !== 1) {
                await this.audit(verification.userId, 'identity.verification.replay', metadata, transaction);
                return undefined;
            }
            await this.repository.destroyVerificationDeliveryEnvelope(verification.id, transaction);
            await this.audit(verification.userId, 'identity.verification.verified', metadata, transaction);
            await this.event(identity_events_1.IdentityEventType.VerificationVerified, verification.id, null, { ...metadata, userId: verification.userId, organizationId: null }, transaction);
            if (input.afterVerified)
                await input.afterVerified(verification, transaction);
            return verification;
        });
    }
    async revoke(verificationId) { return this.repository.withTransaction(async (transaction) => { await this.repository.revokeVerification(verificationId, transaction); return this.repository.destroyVerificationDeliveryEnvelope(verificationId, transaction); }); }
    async expire(userId, channel, purpose) {
        return this.repository.withTransaction(async (transaction) => {
            const expired = await this.repository.findExpiredPendingVerifications(userId, channel, purpose, transaction);
            if (!expired.length)
                return 0;
            await this.repository.expirePendingVerifications(userId, channel, purpose, transaction);
            for (const verification of expired) {
                await this.repository.destroyVerificationDeliveryEnvelope(verification.id, transaction);
                const payload = { verificationId: verification.id, organizationId: null, userId: verification.userId, correlationId: null };
                await this.audit(verification.userId, 'identity.verification.expired', payload, transaction);
                await this.event(identity_events_1.IdentityEventType.VerificationExpired, verification.id, null, payload, transaction);
            }
            return expired.length;
        });
    }
    async cleanup(userId) { return this.repository.withTransaction(async (transaction) => { const changed = await this.repository.expireVerificationDeliveryEnvelopes(userId, transaction); return changed.count; }); }
    async create(input, transaction, eventType = identity_events_1.IdentityEventType.VerificationCreated) {
        const channel = this.channel(input.channel);
        const secret = channel.generate();
        const expiresAt = new Date(Date.now() + this.settings.expirySeconds * 1000);
        const verification = await this.repository.createVerification({ userId: input.userId, channel: input.channel, purpose: input.purpose, secretHash: await argon2.hash(secret), expiresAt, maxAttempts: this.settings.maximumAttempts, resendCount: input.resendCount ?? 0 }, transaction);
        const prepared = channel.prepareDelivery(verification.id, secret);
        const envelope = this.envelopes.encrypt(prepared.token, { verificationId: verification.id, organizationId: input.organizationId, userId: input.userId, correlationId: input.correlationId ?? null });
        await this.repository.createVerificationDeliveryEnvelope({ ...envelope, verificationId: verification.id, expiresAt }, transaction);
        const payload = { verificationId: verification.id, organizationId: input.organizationId, userId: input.userId, correlationId: input.correlationId ?? null };
        await this.audit(input.userId, 'identity.verification.requested', payload, transaction);
        await this.audit(input.userId, 'identity.verification_envelope.created', payload, transaction);
        await this.event(eventType, verification.id, input.organizationId, payload, transaction);
        return verification;
    }
    get settings() { return this.config.getOrThrow('verification').email; }
    channel(channel) { if (channel === client_1.VerificationChannel.EMAIL)
        return this.email; if (channel === client_1.VerificationChannel.SMS)
        return this.sms; if (channel === client_1.VerificationChannel.WHATSAPP)
        return this.whatsapp; throw new Error(`Verification channel ${channel} is not implemented`); }
    audit(userId, action, metadata, transaction) { return this.repository.createAuditEvent({ subjectUserId: userId, action, metadata }, transaction); }
    event(eventType, aggregateId, organizationId, payload, transaction) { return this.repository.createOutboxEvent({ eventType, aggregateType: 'Verification', aggregateId, organizationId: organizationId ?? undefined, payload }, transaction); }
};
exports.VerificationEngine = VerificationEngine;
exports.VerificationEngine = VerificationEngine = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [identity_repository_1.IdentityRepository,
        config_1.ConfigService,
        verification_envelope_service_1.VerificationEnvelopeService])
], VerificationEngine);
