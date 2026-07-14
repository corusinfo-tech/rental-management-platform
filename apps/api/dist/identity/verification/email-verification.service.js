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
exports.EmailVerificationService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const identity_repository_1 = require("../repositories/identity.repository");
const normalization_1 = require("../registration/normalization");
const verification_engine_service_1 = require("../verification-engine/verification-engine.service");
const ACCEPTED = { accepted: true };
/** Public email adapter. All verification persistence and security behavior belongs to VerificationEngine. */
let EmailVerificationService = class EmailVerificationService {
    repository;
    engine;
    constructor(repository, engine) {
        this.repository = repository;
        this.engine = engine;
    }
    async request(emailInput, correlationId) {
        const user = await this.repository.findUserByEmail((0, normalization_1.normalizeEmail)(emailInput));
        if (!user || !this.isEligible(user))
            return ACCEPTED;
        const organizationId = await this.repository.withTransaction((transaction) => this.repository.findOrganizationIdForUser(user.id, transaction));
        await this.engine.resendVerification({ userId: user.id, organizationId: organizationId ?? null, channel: client_1.VerificationChannel.EMAIL, purpose: client_1.VerificationPurpose.EMAIL_VERIFICATION, correlationId });
        return ACCEPTED;
    }
    async confirm(token, correlationId) {
        const parsed = this.parse(token);
        if (!parsed)
            return ACCEPTED;
        const verification = await this.engine.verify({ ...parsed, correlationId, afterVerified: async (verified, transaction) => {
                const user = await this.repository.transitionEmailVerifiedUser(verified.userId, verified.user.status, transaction);
                const organizationId = await this.repository.findOrganizationIdForUser(user.id, transaction);
                await this.repository.createAuditEvent({ subjectUserId: user.id, action: 'identity.email_verification.succeeded', metadata: { verificationId: verified.id, organizationId: organizationId ?? null, correlationId: correlationId ?? null } }, transaction);
                await this.repository.createOutboxEvent({ eventType: 'EmailVerified', aggregateType: 'User', aggregateId: user.id, organizationId, payload: { verificationId: verified.id, organizationId: organizationId ?? null, userId: user.id, correlationId: correlationId ?? null } }, transaction);
            } });
        if (!verification || !this.isEligible(verification.user))
            return ACCEPTED;
        return ACCEPTED;
    }
    parse(token) {
        const separator = token.indexOf('.');
        if (separator < 1 || separator === token.length - 1)
            return undefined;
        const verificationId = token.slice(0, separator);
        const secret = token.slice(separator + 1);
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(verificationId) && /^[A-Za-z0-9_-]{32,}$/.test(secret) ? { verificationId, secret } : undefined;
    }
    isEligible(user) { return Boolean(user && !user.deletedAt && !user.emailVerifiedAt && (user.status === client_1.UserStatus.PENDING_EMAIL || user.status === client_1.UserStatus.PENDING_REVIEW)); }
};
exports.EmailVerificationService = EmailVerificationService;
exports.EmailVerificationService = EmailVerificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [identity_repository_1.IdentityRepository, verification_engine_service_1.VerificationEngine])
], EmailVerificationService);
