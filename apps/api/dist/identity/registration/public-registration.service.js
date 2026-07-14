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
exports.PublicRegistrationService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const argon2 = __importStar(require("argon2"));
const node_crypto_1 = require("node:crypto");
const auth_dto_1 = require("../dto/auth.dto");
const identity_repository_1 = require("../repositories/identity.repository");
const normalization_1 = require("./normalization");
const verification_engine_service_1 = require("../verification-engine/verification-engine.service");
const REGISTRATION_RULES = {
    [auth_dto_1.PublicRegistrationType.TENANT]: { status: client_1.UserStatus.PENDING_EMAIL, roleCode: 'TENANT' },
    [auth_dto_1.PublicRegistrationType.LANDLORD]: { status: client_1.UserStatus.PENDING_REVIEW, roleCode: 'LANDLORD' },
};
const ACCEPTED_RESPONSE = { accepted: true };
let PublicRegistrationService = class PublicRegistrationService {
    repository;
    verificationEngine;
    constructor(repository, verificationEngine) {
        this.repository = repository;
        this.verificationEngine = verificationEngine;
    }
    async register(input) {
        const email = (0, normalization_1.normalizeEmail)(input.email);
        const mobile = (0, normalization_1.normalizeMobile)(input.countryCode, input.mobile);
        const rule = REGISTRATION_RULES[input.registrationType];
        const passwordHash = await argon2.hash(input.password);
        try {
            await this.repository.withTransaction(async (transaction) => {
                const [emailOwner, mobileOwner, role] = await Promise.all([
                    this.repository.findUserByEmail(email, transaction),
                    this.repository.findUserByMobile(mobile, transaction),
                    input.registrationType === auth_dto_1.PublicRegistrationType.LANDLORD
                        ? this.repository.findSystemRoleByCode(rule.roleCode, transaction)
                        : Promise.resolve(null),
                ]);
                if (emailOwner || mobileOwner) {
                    return;
                }
                if (input.registrationType === auth_dto_1.PublicRegistrationType.LANDLORD && !role) {
                    throw new common_1.InternalServerErrorException('Required registration role is not configured');
                }
                const user = await this.repository.createUser({
                    firstName: input.firstName.trim(),
                    lastName: input.lastName.trim(),
                    email,
                    mobile,
                    passwordHash,
                    status: rule.status,
                }, transaction);
                const organization = input.registrationType === auth_dto_1.PublicRegistrationType.LANDLORD
                    ? await this.repository.createRegistrationOrganization({ code: `landlord-${(0, node_crypto_1.randomUUID)()}`, name: `${input.firstName.trim()} ${input.lastName.trim()}` }, transaction)
                    : undefined;
                if (organization && role) {
                    const membership = await this.repository.createActiveMembership({ organizationId: organization.id, personId: user.personId, isOwner: true }, transaction);
                    await this.repository.assignRoleToMembership({ membershipId: membership.id, roleId: role.id }, transaction);
                }
                const correlationId = undefined;
                const verification = await this.verificationEngine.createVerification({ userId: user.id, organizationId: organization?.id ?? null, channel: client_1.VerificationChannel.EMAIL, purpose: client_1.VerificationPurpose.EMAIL_VERIFICATION, correlationId, transaction });
                await this.repository.createAuditEvent({
                    subjectUserId: user.id,
                    action: 'identity.registration.submitted',
                    metadata: { registrationType: input.registrationType, organizationId: organization?.id ?? null },
                }, transaction);
                await this.repository.createOutboxEvent({
                    eventType: 'UserRegistered', aggregateType: 'User', aggregateId: user.id, organizationId: organization?.id,
                    payload: { userId: user.id, registrationType: input.registrationType, status: user.status },
                }, transaction);
            });
            return ACCEPTED_RESPONSE;
        }
        catch (error) {
            if (this.isUniqueConstraintViolation(error)) {
                return ACCEPTED_RESPONSE;
            }
            throw error;
        }
    }
    isUniqueConstraintViolation(error) {
        return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
    }
};
exports.PublicRegistrationService = PublicRegistrationService;
exports.PublicRegistrationService = PublicRegistrationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [identity_repository_1.IdentityRepository,
        verification_engine_service_1.VerificationEngine])
], PublicRegistrationService);
