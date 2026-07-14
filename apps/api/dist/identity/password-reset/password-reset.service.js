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
exports.PasswordResetService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const argon2 = __importStar(require("argon2"));
const identity_repository_1 = require("../repositories/identity.repository");
const verification_engine_service_1 = require("../verification-engine/verification-engine.service");
const ACCEPTED = { accepted: true };
/** Password reset is an adapter over VerificationEngine, never a separate token implementation. */
let PasswordResetService = class PasswordResetService {
    repository;
    verificationEngine;
    constructor(repository, verificationEngine) {
        this.repository = repository;
        this.verificationEngine = verificationEngine;
    }
    async request(identifierInput, correlationId) {
        const identifier = this.normalizeIdentifier(identifierInput);
        const user = await this.repository.findUserByIdentifier(identifier.includes('@') ? { email: identifier } : { mobile: identifier });
        if (!user || user.deletedAt)
            return ACCEPTED;
        const organizationId = await this.repository.withTransaction((transaction) => this.repository.findOrganizationIdForUser(user.id, transaction));
        await this.verificationEngine.resendVerification({ userId: user.id, organizationId: organizationId ?? null, channel: client_1.VerificationChannel.EMAIL, purpose: client_1.VerificationPurpose.PASSWORD_RESET, correlationId });
        return ACCEPTED;
    }
    async confirm(token, newPassword, correlationId) {
        const parsed = this.parse(token);
        if (!parsed)
            return ACCEPTED;
        const passwordHash = await argon2.hash(newPassword);
        await this.verificationEngine.verify({
            ...parsed, expectedPurpose: client_1.VerificationPurpose.PASSWORD_RESET, correlationId,
            afterVerified: async (verification, transaction) => {
                await this.repository.updatePasswordHash(verification.userId, passwordHash, transaction);
                const revoked = await this.repository.revokeAllSessionsForUser(verification.userId, 'PASSWORD_RESET', transaction);
                await this.repository.createAuditEvent({ subjectUserId: verification.userId, action: 'identity.password_reset.completed', metadata: { verificationId: verification.id, revokedSessionCount: revoked.count, correlationId: correlationId ?? null } }, transaction);
                await this.repository.createOutboxEvent({ eventType: 'PasswordResetCompleted', aggregateType: 'User', aggregateId: verification.userId, payload: { verificationId: verification.id, organizationId: null, userId: verification.userId, correlationId: correlationId ?? null } }, transaction);
            },
        });
        return ACCEPTED;
    }
    normalizeIdentifier(value) { const identifier = value.trim(); return identifier.includes('@') ? identifier.toLowerCase() : identifier.replace(/[\s()-]/g, ''); }
    parse(token) { const dot = token.indexOf('.'); if (dot < 1 || dot === token.length - 1)
        return undefined; const verificationId = token.slice(0, dot); const secret = token.slice(dot + 1); return /^[0-9a-f-]{36}$/i.test(verificationId) && /^[A-Za-z0-9_-]{32,}$/.test(secret) ? { verificationId, secret } : undefined; }
};
exports.PasswordResetService = PasswordResetService;
exports.PasswordResetService = PasswordResetService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [identity_repository_1.IdentityRepository, verification_engine_service_1.VerificationEngine])
], PasswordResetService);
