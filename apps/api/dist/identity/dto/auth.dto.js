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
exports.VerifyDto = exports.RefreshDto = exports.WhatsAppVerificationConfirmDto = exports.WhatsAppVerificationRequestDto = exports.SmsVerificationConfirmDto = exports.SmsVerificationRequestDto = exports.PasswordResetConfirmDto = exports.PasswordResetRequestDto = exports.SessionDto = exports.TokenPairDto = exports.LoginDto = exports.GenericSuccessEnvelopeDto = exports.GenericAcceptedDto = exports.EmailVerificationConfirmDto = exports.EmailVerificationRequestDto = exports.ErrorEnvelopeDto = exports.ErrorDetailDto = exports.RegistrationSuccessEnvelopeDto = exports.ResponseMetaDto = exports.RegistrationAcceptedDto = exports.RegisterDto = exports.PublicRegistrationType = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
var PublicRegistrationType;
(function (PublicRegistrationType) {
    PublicRegistrationType["TENANT"] = "TENANT";
    PublicRegistrationType["LANDLORD"] = "LANDLORD";
})(PublicRegistrationType || (exports.PublicRegistrationType = PublicRegistrationType = {}));
class RegisterDto {
    firstName;
    lastName;
    email;
    password;
    countryCode;
    mobile;
    registrationType;
}
exports.RegisterDto = RegisterDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Ada', minLength: 1, maxLength: 100 }),
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? value.trim() : value),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(100),
    (0, class_validator_1.Matches)(/^.*\S.*$/u),
    (0, class_validator_1.Matches)(/^[^\p{Cc}]+$/u),
    __metadata("design:type", String)
], RegisterDto.prototype, "firstName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Lovelace', minLength: 1, maxLength: 100 }),
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? value.trim() : value),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MinLength)(1),
    (0, class_validator_1.MaxLength)(100),
    (0, class_validator_1.Matches)(/^.*\S.*$/u),
    (0, class_validator_1.Matches)(/^[^\p{Cc}]+$/u),
    __metadata("design:type", String)
], RegisterDto.prototype, "lastName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'ada@example.com', maxLength: 320 }),
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.MaxLength)(320),
    __metadata("design:type", String)
], RegisterDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ minLength: 12, format: 'password' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(12),
    (0, class_validator_1.MaxLength)(128),
    __metadata("design:type", String)
], RegisterDto.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '+1', description: 'E.164 country calling code' }),
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? value.trim() : value),
    (0, class_validator_1.Matches)(/^\+[1-9]\d{0,2}$/),
    __metadata("design:type", String)
], RegisterDto.prototype, "countryCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '4155550100', description: 'National mobile number. Common punctuation is removed before E.164 validation.' }),
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? value.replace(/\D/g, '') : value),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{4,14}$/),
    __metadata("design:type", String)
], RegisterDto.prototype, "mobile", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: PublicRegistrationType, example: PublicRegistrationType.TENANT }),
    (0, class_validator_1.IsEnum)(PublicRegistrationType),
    __metadata("design:type", String)
], RegisterDto.prototype, "registrationType", void 0);
class RegistrationAcceptedDto {
    accepted;
}
exports.RegistrationAcceptedDto = RegistrationAcceptedDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    __metadata("design:type", Boolean)
], RegistrationAcceptedDto.prototype, "accepted", void 0);
class ResponseMetaDto {
    correlationId;
    requestId;
}
exports.ResponseMetaDto = ResponseMetaDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'b54c361e-9ec0-41eb-92f4-6010b1a146f5' }),
    __metadata("design:type", String)
], ResponseMetaDto.prototype, "correlationId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'a873b886-2dd0-450c-8b5b-503d7f3c0c60' }),
    __metadata("design:type", String)
], ResponseMetaDto.prototype, "requestId", void 0);
class RegistrationSuccessEnvelopeDto {
    success;
    data;
    meta;
}
exports.RegistrationSuccessEnvelopeDto = RegistrationSuccessEnvelopeDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    __metadata("design:type", Boolean)
], RegistrationSuccessEnvelopeDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: RegistrationAcceptedDto }),
    __metadata("design:type", RegistrationAcceptedDto)
], RegistrationSuccessEnvelopeDto.prototype, "data", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: ResponseMetaDto }),
    __metadata("design:type", ResponseMetaDto)
], RegistrationSuccessEnvelopeDto.prototype, "meta", void 0);
class ErrorDetailDto {
    statusCode;
    message;
}
exports.ErrorDetailDto = ErrorDetailDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 400 }),
    __metadata("design:type", Number)
], ErrorDetailDto.prototype, "statusCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Validation failed' }),
    __metadata("design:type", Object)
], ErrorDetailDto.prototype, "message", void 0);
class ErrorEnvelopeDto {
    success;
    error;
    meta;
}
exports.ErrorEnvelopeDto = ErrorEnvelopeDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: false }),
    __metadata("design:type", Boolean)
], ErrorEnvelopeDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: ErrorDetailDto }),
    __metadata("design:type", ErrorDetailDto)
], ErrorEnvelopeDto.prototype, "error", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: ResponseMetaDto }),
    __metadata("design:type", ResponseMetaDto)
], ErrorEnvelopeDto.prototype, "meta", void 0);
class EmailVerificationRequestDto {
    email;
}
exports.EmailVerificationRequestDto = EmailVerificationRequestDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'ada@example.com', maxLength: 320 }),
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value),
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.MaxLength)(320),
    __metadata("design:type", String)
], EmailVerificationRequestDto.prototype, "email", void 0);
class EmailVerificationConfirmDto {
    token;
}
exports.EmailVerificationConfirmDto = EmailVerificationConfirmDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Opaque verification token from the email link.', minLength: 20, maxLength: 512 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(20),
    (0, class_validator_1.MaxLength)(512),
    __metadata("design:type", String)
], EmailVerificationConfirmDto.prototype, "token", void 0);
class GenericAcceptedDto {
    accepted;
}
exports.GenericAcceptedDto = GenericAcceptedDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    __metadata("design:type", Boolean)
], GenericAcceptedDto.prototype, "accepted", void 0);
class GenericSuccessEnvelopeDto {
    success;
    data;
    meta;
}
exports.GenericSuccessEnvelopeDto = GenericSuccessEnvelopeDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    __metadata("design:type", Boolean)
], GenericSuccessEnvelopeDto.prototype, "success", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: GenericAcceptedDto }),
    __metadata("design:type", GenericAcceptedDto)
], GenericSuccessEnvelopeDto.prototype, "data", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: ResponseMetaDto }),
    __metadata("design:type", ResponseMetaDto)
], GenericSuccessEnvelopeDto.prototype, "meta", void 0);
class LoginDto {
    identifier;
    password;
}
exports.LoginDto = LoginDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'ada@example.com', description: 'Normalized email or E.164 mobile number.' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(320),
    __metadata("design:type", String)
], LoginDto.prototype, "identifier", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'password' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(12),
    (0, class_validator_1.MaxLength)(128),
    __metadata("design:type", String)
], LoginDto.prototype, "password", void 0);
class TokenPairDto {
    accessToken;
    refreshToken;
    expiresIn;
}
exports.TokenPairDto = TokenPairDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], TokenPairDto.prototype, "accessToken", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], TokenPairDto.prototype, "refreshToken", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Number)
], TokenPairDto.prototype, "expiresIn", void 0);
class SessionDto {
    id;
    deviceId;
    userAgent;
    ipAddress;
    lastUsedAt;
    expiresAt;
}
exports.SessionDto = SessionDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SessionDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SessionDto.prototype, "deviceId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SessionDto.prototype, "userAgent", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", String)
], SessionDto.prototype, "ipAddress", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], SessionDto.prototype, "lastUsedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    __metadata("design:type", Date)
], SessionDto.prototype, "expiresAt", void 0);
class PasswordResetRequestDto {
    identifier;
}
exports.PasswordResetRequestDto = PasswordResetRequestDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'ada@example.com', description: 'Email or E.164 mobile number.' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.MaxLength)(320),
    __metadata("design:type", String)
], PasswordResetRequestDto.prototype, "identifier", void 0);
class PasswordResetConfirmDto {
    token;
    newPassword;
}
exports.PasswordResetConfirmDto = PasswordResetConfirmDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Opaque password-reset verification token.' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(20),
    (0, class_validator_1.MaxLength)(512),
    __metadata("design:type", String)
], PasswordResetConfirmDto.prototype, "token", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ format: 'password', minLength: 12 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(12),
    (0, class_validator_1.MaxLength)(128),
    __metadata("design:type", String)
], PasswordResetConfirmDto.prototype, "newPassword", void 0);
class SmsVerificationRequestDto {
    mobile;
}
exports.SmsVerificationRequestDto = SmsVerificationRequestDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '+14155550100', description: 'E.164 mobile number.' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\+[1-9]\d{7,14}$/),
    __metadata("design:type", String)
], SmsVerificationRequestDto.prototype, "mobile", void 0);
class SmsVerificationConfirmDto {
    token;
}
exports.SmsVerificationConfirmDto = SmsVerificationConfirmDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Opaque SMS verification token.' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(20),
    (0, class_validator_1.MaxLength)(512),
    __metadata("design:type", String)
], SmsVerificationConfirmDto.prototype, "token", void 0);
class WhatsAppVerificationRequestDto {
    mobile;
}
exports.WhatsAppVerificationRequestDto = WhatsAppVerificationRequestDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '+14155550100', description: 'E.164 mobile number.' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\+[1-9]\d{7,14}$/),
    __metadata("design:type", String)
], WhatsAppVerificationRequestDto.prototype, "mobile", void 0);
class WhatsAppVerificationConfirmDto {
    token;
}
exports.WhatsAppVerificationConfirmDto = WhatsAppVerificationConfirmDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Opaque WhatsApp verification token.' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(20),
    (0, class_validator_1.MaxLength)(512),
    __metadata("design:type", String)
], WhatsAppVerificationConfirmDto.prototype, "token", void 0);
class RefreshDto {
    refreshToken;
}
exports.RefreshDto = RefreshDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RefreshDto.prototype, "refreshToken", void 0);
class VerifyDto {
    token;
}
exports.VerifyDto = VerifyDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VerifyDto.prototype, "token", void 0);
