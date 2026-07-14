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
exports.SmsVerificationService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const identity_repository_1 = require("../repositories/identity.repository");
const verification_engine_service_1 = require("../verification-engine/verification-engine.service");
const ACCEPTED = { accepted: true };
let SmsVerificationService = class SmsVerificationService {
    repository;
    verificationEngine;
    constructor(repository, verificationEngine) {
        this.repository = repository;
        this.verificationEngine = verificationEngine;
    }
    async request(mobile, correlationId) {
        const user = await this.repository.findUserByIdentifier({ mobile });
        if (!user || user.deletedAt)
            return ACCEPTED;
        const organizationId = await this.repository.withTransaction((transaction) => this.repository.findOrganizationIdForUser(user.id, transaction));
        await this.verificationEngine.resendVerification({ userId: user.id, organizationId: organizationId ?? null, channel: client_1.VerificationChannel.SMS, purpose: client_1.VerificationPurpose.SMS_OTP, correlationId });
        return ACCEPTED;
    }
    async confirm(token, correlationId) {
        const parsed = this.parse(token);
        if (!parsed)
            return ACCEPTED;
        await this.verificationEngine.verify({
            ...parsed, expectedPurpose: client_1.VerificationPurpose.SMS_OTP, correlationId,
            afterVerified: async (verification, transaction) => {
                await this.repository.createAuditEvent({ subjectUserId: verification.userId, action: 'identity.sms_verification.verified', metadata: { verificationId: verification.id, correlationId: correlationId ?? null } }, transaction);
                await this.repository.createOutboxEvent({ eventType: 'SmsVerified', aggregateType: 'Verification', aggregateId: verification.id, payload: { verificationId: verification.id, organizationId: null, userId: verification.userId, correlationId: correlationId ?? null } }, transaction);
            },
        });
        return ACCEPTED;
    }
    parse(token) { const dot = token.indexOf('.'); if (dot < 1 || dot === token.length - 1)
        return undefined; const verificationId = token.slice(0, dot); const secret = token.slice(dot + 1); return /^[0-9a-f-]{36}$/i.test(verificationId) && /^\d{6}$/.test(secret) ? { verificationId, secret } : undefined; }
};
exports.SmsVerificationService = SmsVerificationService;
exports.SmsVerificationService = SmsVerificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [identity_repository_1.IdentityRepository, verification_engine_service_1.VerificationEngine])
], SmsVerificationService);
