"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdentityModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const access_token_guard_1 = require("./authorization/access-token.guard");
const current_membership_resolver_1 = require("./authorization/current-membership.resolver");
const organization_resolver_1 = require("./authorization/organization.resolver");
const permission_guard_1 = require("./authorization/permission.guard");
const policy_guard_1 = require("./authorization/policy.guard");
const identity_controller_1 = require("./controllers/identity.controller");
const identity_repository_1 = require("./repositories/identity.repository");
const public_registration_service_1 = require("./registration/public-registration.service");
const registration_throttle_service_1 = require("./registration/registration-throttle.service");
const email_verification_service_1 = require("./verification/email-verification.service");
const email_verification_throttle_service_1 = require("./verification/email-verification-throttle.service");
const verification_envelope_service_1 = require("./verification/verification-envelope.service");
const verification_engine_service_1 = require("./verification-engine/verification-engine.service");
const password_reset_service_1 = require("./password-reset/password-reset.service");
const sms_verification_service_1 = require("./sms-verification/sms-verification.service");
const whatsapp_verification_service_1 = require("./whatsapp-verification/whatsapp-verification.service");
const authentication_throttle_service_1 = require("./security/authentication-throttle.service");
const identity_service_1 = require("./services/identity.service");
let IdentityModule = class IdentityModule {
};
exports.IdentityModule = IdentityModule;
exports.IdentityModule = IdentityModule = __decorate([
    (0, common_1.Module)({
        imports: [
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    signOptions: {
                        algorithm: config.getOrThrow('jwt').algorithm,
                        issuer: config.getOrThrow('jwt').issuer,
                        audience: config.getOrThrow('jwt').audience,
                    },
                }),
            }),
        ],
        controllers: [identity_controller_1.IdentityController],
        providers: [
            identity_repository_1.IdentityRepository,
            identity_service_1.IdentityService,
            public_registration_service_1.PublicRegistrationService,
            registration_throttle_service_1.RegistrationThrottleService,
            email_verification_service_1.EmailVerificationService,
            email_verification_throttle_service_1.EmailVerificationThrottleService,
            verification_envelope_service_1.VerificationEnvelopeService,
            verification_engine_service_1.VerificationEngine,
            password_reset_service_1.PasswordResetService,
            sms_verification_service_1.SmsVerificationService,
            whatsapp_verification_service_1.WhatsAppVerificationService,
            authentication_throttle_service_1.AuthenticationThrottleService,
            access_token_guard_1.AccessTokenGuard,
            organization_resolver_1.OrganizationResolver,
            current_membership_resolver_1.CurrentMembershipResolver,
            permission_guard_1.PermissionGuard,
            policy_guard_1.PolicyGuard,
        ],
        exports: [access_token_guard_1.AccessTokenGuard, organization_resolver_1.OrganizationResolver, current_membership_resolver_1.CurrentMembershipResolver, permission_guard_1.PermissionGuard, policy_guard_1.PolicyGuard],
    })
], IdentityModule);
