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
exports.IdentityService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const client_1 = require("@prisma/client");
const argon2 = __importStar(require("argon2"));
const node_crypto_1 = require("node:crypto");
const identity_repository_1 = require("../repositories/identity.repository");
const AUTH_FAILURE = 'Invalid credentials';
let IdentityService = class IdentityService {
    repository;
    jwt;
    config;
    constructor(repository, jwt, config) {
        this.repository = repository;
        this.jwt = jwt;
        this.config = config;
    }
    async login(input) {
        const identifier = this.normalizeIdentifier(input.identifier);
        const user = await this.repository.findUserByIdentifier(identifier.includes('@') ? { email: identifier } : { mobile: identifier });
        if (!user || user.status !== client_1.UserStatus.ACTIVE || !(await argon2.verify(user.passwordHash, input.password))) {
            await this.repository.createAuditEvent({ subjectUserId: user?.id, action: 'identity.login.failed', metadata: { identifierType: identifier.includes('@') ? 'email' : 'mobile' } });
            throw new common_1.UnauthorizedException(AUTH_FAILURE);
        }
        const membership = await this.repository.findDefaultMembershipForUser(user.id);
        const issued = await this.issueTokens(user.id, { membershipId: membership?.id, organizationId: membership?.organizationId, deviceId: input.deviceId, userAgent: input.userAgent, ipAddress: input.ipAddress });
        await this.repository.createAuditEvent({ subjectUserId: user.id, action: 'identity.login.succeeded', metadata: { sessionId: issued.sessionId } });
        return issued;
    }
    async refresh(refreshToken) {
        const payload = await this.verifyRefreshToken(refreshToken);
        try {
            return await this.repository.withTransaction(async (transaction) => {
                const session = await this.repository.findSession(payload.sid, transaction);
                if (!session || session.userId !== payload.sub || !(await argon2.verify(session.refreshTokenHash, refreshToken)) || session.expiresAt <= new Date())
                    throw new Error('invalid');
                if (session.revokedAt) {
                    await this.repository.revokeSessionFamily(session.familyId, 'REUSE_DETECTED', transaction);
                    await this.repository.createAuditEvent({ subjectUserId: session.userId, action: 'identity.refresh.failed', metadata: { sessionId: session.id, reason: 'reuse' } }, transaction);
                    throw new Error('reuse');
                }
                if ((await this.repository.revokeActiveSession(session.id, transaction)).count !== 1) {
                    await this.repository.revokeSessionFamily(session.familyId, 'REUSE_DETECTED', transaction);
                    throw new Error('race');
                }
                const issued = await this.issueTokens(session.userId, { familyId: session.familyId, parentSessionId: session.id, membershipId: session.membershipId ?? undefined, organizationId: session.organizationId ?? undefined, deviceId: session.deviceId ?? undefined, userAgent: session.userAgent ?? undefined, ipAddress: session.ipAddress ?? undefined }, transaction);
                await this.repository.createAuditEvent({ subjectUserId: session.userId, action: 'identity.refresh.succeeded', metadata: { sessionId: issued.sessionId } }, transaction);
                return issued;
            });
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
    }
    async logout(userId, sessionId) { const changed = await this.repository.revokeSessionForUser(sessionId, userId, 'LOGOUT'); if (changed.count)
        await this.repository.createAuditEvent({ subjectUserId: userId, action: 'identity.logout', metadata: { sessionId } }); }
    async logoutAll(userId) { const changed = await this.repository.revokeAllSessionsForUser(userId, 'LOGOUT_ALL'); await this.repository.createAuditEvent({ subjectUserId: userId, action: 'identity.logout_all', metadata: { count: changed.count } }); }
    async sessions(userId) { return this.repository.listActiveSessions(userId); }
    async revokeSession(userId, sessionId) { const changed = await this.repository.revokeSessionForUser(sessionId, userId, 'SESSION_REVOKED'); if (changed.count)
        await this.repository.createAuditEvent({ subjectUserId: userId, action: 'identity.session.revoked', metadata: { sessionId } }); }
    async issueTokens(userId, meta, transaction) {
        const sessionId = (0, node_crypto_1.randomUUID)();
        const refreshToken = await this.signRefreshToken(userId, sessionId);
        await this.repository.createSession({ id: sessionId, userId, familyId: meta.familyId ?? (0, node_crypto_1.randomUUID)(), parentSessionId: meta.parentSessionId, membershipId: meta.membershipId, organizationId: meta.organizationId, deviceId: meta.deviceId, userAgent: meta.userAgent, ipAddress: meta.ipAddress, refreshTokenHash: await argon2.hash(refreshToken), expiresAt: this.refreshExpiry() }, transaction);
        return { sessionId, accessToken: await this.signAccessToken(userId, sessionId), refreshToken, expiresIn: this.config.getOrThrow('jwt').accessTtlSeconds };
    }
    async verifyRefreshToken(token) { try {
        const j = this.config.getOrThrow('jwt');
        return await this.jwt.verifyAsync(token, { secret: j.refreshSecret, algorithms: [j.algorithm], issuer: j.issuer, audience: j.audience });
    }
    catch {
        throw new common_1.UnauthorizedException('Invalid refresh token');
    } }
    async signAccessToken(userId, sessionId) { const j = this.config.getOrThrow('jwt'); return this.jwt.signAsync({ sub: userId, sid: sessionId }, { secret: j.accessSecret, algorithm: j.algorithm, issuer: j.issuer, audience: j.audience, expiresIn: j.accessTtlSeconds }); }
    async signRefreshToken(userId, sessionId) { const j = this.config.getOrThrow('jwt'); return this.jwt.signAsync({ sub: userId, sid: sessionId }, { secret: j.refreshSecret, algorithm: j.algorithm, issuer: j.issuer, audience: j.audience, expiresIn: j.refreshTtlSeconds }); }
    refreshExpiry() { return new Date(Date.now() + this.config.getOrThrow('jwt').refreshTtlSeconds * 1000); }
    normalizeIdentifier(value) { const identifier = value.trim(); return identifier.includes('@') ? identifier.toLowerCase() : identifier.replace(/[\s()-]/g, ''); }
};
exports.IdentityService = IdentityService;
exports.IdentityService = IdentityService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [identity_repository_1.IdentityRepository, jwt_1.JwtService, config_1.ConfigService])
], IdentityService);
