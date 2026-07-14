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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdentityController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const auth_dto_1 = require("../dto/auth.dto");
const public_registration_service_1 = require("../registration/public-registration.service");
const registration_throttle_service_1 = require("../registration/registration-throttle.service");
const email_verification_service_1 = require("../verification/email-verification.service");
const email_verification_throttle_service_1 = require("../verification/email-verification-throttle.service");
const identity_service_1 = require("../services/identity.service");
const access_token_guard_1 = require("../authorization/access-token.guard");
const password_reset_service_1 = require("../password-reset/password-reset.service");
const sms_verification_service_1 = require("../sms-verification/sms-verification.service");
const whatsapp_verification_service_1 = require("../whatsapp-verification/whatsapp-verification.service");
const authentication_throttle_service_1 = require("../security/authentication-throttle.service");
let IdentityController = class IdentityController {
    registration;
    throttle;
    emailVerification;
    emailVerificationThrottle;
    identity;
    passwordReset;
    smsVerification;
    whatsappVerification;
    authenticationThrottle;
    constructor(registration, throttle, emailVerification, emailVerificationThrottle, identity, passwordReset, smsVerification, whatsappVerification, authenticationThrottle) {
        this.registration = registration;
        this.throttle = throttle;
        this.emailVerification = emailVerification;
        this.emailVerificationThrottle = emailVerificationThrottle;
        this.identity = identity;
        this.passwordReset = passwordReset;
        this.smsVerification = smsVerification;
        this.whatsappVerification = whatsappVerification;
        this.authenticationThrottle = authenticationThrottle;
    }
    async register(dto, request) {
        await this.throttle.enforce(dto, request);
        return this.registration.register(dto);
    }
    async registerEmailVerificationRequest(dto, request) {
        await this.emailVerificationThrottle.enforce(dto.email, request);
        return this.emailVerification.request(dto.email, request.correlationId);
    }
    confirmEmailVerification(dto, request) {
        return this.emailVerification.confirm(dto.token, request.correlationId);
    }
    async login(dto, request) { await this.authenticationThrottle.enforce('login', dto.identifier, request); return this.identity.login({ identifier: dto.identifier, password: dto.password, deviceId: request.header('x-device-id') ?? undefined, userAgent: request.header('user-agent') ?? undefined, ipAddress: request.ip }); }
    async refresh(dto, request) { await this.authenticationThrottle.enforce('refresh', dto.refreshToken, request); return this.identity.refresh(dto.refreshToken); }
    async logout(request) { await this.identity.logout(request.identity.sub, request.identity.sid); return { accepted: true }; }
    async logoutAll(request) { await this.identity.logoutAll(request.identity.sub); return { accepted: true }; }
    sessions(request) { return this.identity.sessions(request.identity.sub); }
    async revokeSession(sessionId, request) { await this.identity.revokeSession(request.identity.sub, sessionId); return { accepted: true }; }
    async passwordResetRequest(dto, request) { await this.authenticationThrottle.enforce('password-reset', dto.identifier, request); return this.passwordReset.request(dto.identifier, request.correlationId); }
    passwordResetConfirm(dto, request) { return this.passwordReset.confirm(dto.token, dto.newPassword, request.correlationId); }
    async smsVerificationRequest(dto, request) { await this.authenticationThrottle.enforce('sms-verification', dto.mobile, request); return this.smsVerification.request(dto.mobile, request.correlationId); }
    smsVerificationConfirm(dto, request) { return this.smsVerification.confirm(dto.token, request.correlationId); }
    async whatsappVerificationRequest(dto, request) { await this.authenticationThrottle.enforce('whatsapp-verification', dto.mobile, request); return this.whatsappVerification.request(dto.mobile, request.correlationId); }
    whatsappVerificationConfirm(dto, request) { return this.whatsappVerification.confirm(dto.token, request.correlationId); }
};
exports.IdentityController = IdentityController;
__decorate([
    (0, common_1.Post)('register'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    (0, swagger_1.ApiOperation)({ summary: 'Submit a public tenant or landlord registration' }),
    (0, swagger_1.ApiAcceptedResponse)({ type: auth_dto_1.RegistrationSuccessEnvelopeDto, description: 'Consistent accepted response; no session or token is issued.' }),
    (0, swagger_1.ApiBadRequestResponse)({ type: auth_dto_1.ErrorEnvelopeDto, description: 'Validation error.', examples: { validation: { summary: 'Validation error', value: { success: false, error: { statusCode: 400, message: ['firstName must not be empty'] }, meta: { correlationId: '…', requestId: '…' } } } } }),
    (0, swagger_1.ApiConflictResponse)({ type: auth_dto_1.ErrorEnvelopeDto, description: 'Reserved for non-idempotent integrity conflicts; duplicate identities still receive 202.' }),
    (0, swagger_1.ApiTooManyRequestsResponse)({ type: auth_dto_1.ErrorEnvelopeDto, description: 'Registration throttle exceeded.', examples: { throttled: { summary: 'Throttle exceeded', value: { success: false, error: { statusCode: 429, message: 'Too many registration attempts. Please try again later.' }, meta: { correlationId: '…', requestId: '…' } } } } }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.RegisterDto, Object]),
    __metadata("design:returntype", Promise)
], IdentityController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('email-verification/request'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    (0, swagger_1.ApiOperation)({ summary: 'Request an email verification through the reusable verification engine without revealing account state' }),
    (0, swagger_1.ApiAcceptedResponse)({ type: auth_dto_1.GenericSuccessEnvelopeDto, description: 'Always returns the same accepted response.' }),
    (0, swagger_1.ApiBadRequestResponse)({ type: auth_dto_1.ErrorEnvelopeDto, description: 'Validation error.' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.EmailVerificationRequestDto, Object]),
    __metadata("design:returntype", Promise)
], IdentityController.prototype, "registerEmailVerificationRequest", null);
__decorate([
    (0, common_1.Post)('email-verification/confirm'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Confirm an opaque email-verification token through the reusable verification engine' }),
    (0, swagger_1.ApiOkResponse)({ type: auth_dto_1.GenericSuccessEnvelopeDto, description: 'Generic response for valid, invalid, expired, and replayed tokens.' }),
    (0, swagger_1.ApiBadRequestResponse)({ type: auth_dto_1.ErrorEnvelopeDto, description: 'Token format validation error.' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.EmailVerificationConfirmDto, Object]),
    __metadata("design:returntype", Promise)
], IdentityController.prototype, "confirmEmailVerification", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Authenticate with email or mobile and password' }),
    (0, swagger_1.ApiOkResponse)({ type: auth_dto_1.TokenPairDto, description: 'Generic authentication failure is returned for all rejected credentials.' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.LoginDto, Object]),
    __metadata("design:returntype", Promise)
], IdentityController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Rotate a refresh token and issue a replacement token pair' }),
    (0, swagger_1.ApiOkResponse)({ type: auth_dto_1.TokenPairDto }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.RefreshDto, Object]),
    __metadata("design:returntype", Promise)
], IdentityController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.UseGuards)(access_token_guard_1.AccessTokenGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Revoke the current session' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], IdentityController.prototype, "logout", null);
__decorate([
    (0, common_1.Post)('logout-all'),
    (0, common_1.UseGuards)(access_token_guard_1.AccessTokenGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Revoke all sessions for the current user' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], IdentityController.prototype, "logoutAll", null);
__decorate([
    (0, common_1.Get)('sessions'),
    (0, common_1.UseGuards)(access_token_guard_1.AccessTokenGuard),
    (0, swagger_1.ApiOperation)({ summary: 'List active sessions for the current user' }),
    (0, swagger_1.ApiOkResponse)({ type: auth_dto_1.SessionDto, isArray: true }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], IdentityController.prototype, "sessions", null);
__decorate([
    (0, common_1.Delete)('sessions/:sessionId'),
    (0, common_1.UseGuards)(access_token_guard_1.AccessTokenGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Revoke one of the current user’s sessions' }),
    __param(0, (0, common_1.Param)('sessionId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], IdentityController.prototype, "revokeSession", null);
__decorate([
    (0, common_1.Post)('password-reset/request'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    (0, swagger_1.ApiOperation)({ summary: 'Request a password reset without revealing account state' }),
    (0, swagger_1.ApiAcceptedResponse)({ type: auth_dto_1.GenericSuccessEnvelopeDto }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.PasswordResetRequestDto, Object]),
    __metadata("design:returntype", Promise)
], IdentityController.prototype, "passwordResetRequest", null);
__decorate([
    (0, common_1.Post)('password-reset/confirm'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Confirm a password reset and revoke all sessions' }),
    (0, swagger_1.ApiOkResponse)({ type: auth_dto_1.GenericSuccessEnvelopeDto }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.PasswordResetConfirmDto, Object]),
    __metadata("design:returntype", void 0)
], IdentityController.prototype, "passwordResetConfirm", null);
__decorate([
    (0, common_1.Post)('sms-verification/request'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    (0, swagger_1.ApiOperation)({ summary: 'Request an SMS OTP without revealing account state' }),
    (0, swagger_1.ApiAcceptedResponse)({ type: auth_dto_1.GenericSuccessEnvelopeDto }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.SmsVerificationRequestDto, Object]),
    __metadata("design:returntype", Promise)
], IdentityController.prototype, "smsVerificationRequest", null);
__decorate([
    (0, common_1.Post)('sms-verification/confirm'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Confirm an opaque SMS OTP verification token' }),
    (0, swagger_1.ApiOkResponse)({ type: auth_dto_1.GenericSuccessEnvelopeDto }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.SmsVerificationConfirmDto, Object]),
    __metadata("design:returntype", void 0)
], IdentityController.prototype, "smsVerificationConfirm", null);
__decorate([
    (0, common_1.Post)('whatsapp-verification/request'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    (0, swagger_1.ApiOperation)({ summary: 'Request a WhatsApp OTP without revealing account state' }),
    (0, swagger_1.ApiAcceptedResponse)({ type: auth_dto_1.GenericSuccessEnvelopeDto }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.WhatsAppVerificationRequestDto, Object]),
    __metadata("design:returntype", Promise)
], IdentityController.prototype, "whatsappVerificationRequest", null);
__decorate([
    (0, common_1.Post)('whatsapp-verification/confirm'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Confirm an opaque WhatsApp OTP verification token' }),
    (0, swagger_1.ApiOkResponse)({ type: auth_dto_1.GenericSuccessEnvelopeDto }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.WhatsAppVerificationConfirmDto, Object]),
    __metadata("design:returntype", void 0)
], IdentityController.prototype, "whatsappVerificationConfirm", null);
exports.IdentityController = IdentityController = __decorate([
    (0, swagger_1.ApiTags)('Identity'),
    (0, common_1.Controller)({ path: 'auth', version: '1' }),
    __metadata("design:paramtypes", [public_registration_service_1.PublicRegistrationService,
        registration_throttle_service_1.RegistrationThrottleService,
        email_verification_service_1.EmailVerificationService,
        email_verification_throttle_service_1.EmailVerificationThrottleService,
        identity_service_1.IdentityService,
        password_reset_service_1.PasswordResetService,
        sms_verification_service_1.SmsVerificationService,
        whatsapp_verification_service_1.WhatsAppVerificationService,
        authentication_throttle_service_1.AuthenticationThrottleService])
], IdentityController);
