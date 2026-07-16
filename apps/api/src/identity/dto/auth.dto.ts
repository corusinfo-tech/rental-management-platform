import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export enum PublicRegistrationType {
  TENANT = 'TENANT',
  LANDLORD = 'LANDLORD',
}

export class RegisterDto {
  @ApiProperty({ example: 'Ada', minLength: 1, maxLength: 100 })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @IsNotEmpty() @MinLength(1) @MaxLength(100) @Matches(/^.*\S.*$/u) @Matches(/^[^\p{Cc}]+$/u)
  firstName!: string;
  @ApiProperty({ example: 'Lovelace', minLength: 1, maxLength: 100 })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @IsNotEmpty() @MinLength(1) @MaxLength(100) @Matches(/^.*\S.*$/u) @Matches(/^[^\p{Cc}]+$/u)
  lastName!: string;
  @ApiProperty({ example: 'ada@example.com', maxLength: 320 })
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail() @MaxLength(320) email!: string;
  @ApiProperty({ minLength: 12, format: 'password' }) @IsString() @MinLength(12) @MaxLength(128) password!: string;
  @ApiProperty({ example: '+1', description: 'E.164 country calling code' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @Matches(/^\+[1-9]\d{0,2}$/) countryCode!: string;
  @ApiProperty({ example: '4155550100', description: 'National mobile number. Common punctuation is removed before E.164 validation.' })
  @Transform(({ value }) => typeof value === 'string' ? value.replace(/\D/g, '') : value)
  @IsString() @Matches(/^\d{4,14}$/) mobile!: string;
  @ApiProperty({ enum: PublicRegistrationType, example: PublicRegistrationType.TENANT })
  @IsEnum(PublicRegistrationType) registrationType!: PublicRegistrationType;
}

export class RegistrationAcceptedDto {
  @ApiProperty({ example: true }) accepted!: true;
}

export class ResponseMetaDto {
  @ApiProperty({ example: 'b54c361e-9ec0-41eb-92f4-6010b1a146f5' }) correlationId!: string;
  @ApiProperty({ example: 'a873b886-2dd0-450c-8b5b-503d7f3c0c60' }) requestId!: string;
}

export class RegistrationSuccessEnvelopeDto {
  @ApiProperty({ example: true }) success!: true;
  @ApiProperty({ type: RegistrationAcceptedDto }) data!: RegistrationAcceptedDto;
  @ApiProperty({ type: ResponseMetaDto }) meta!: ResponseMetaDto;
}

export class ErrorDetailDto {
  @ApiProperty({ example: 400 }) statusCode!: number;
  @ApiProperty({ example: 'Validation failed' }) message!: string | string[];
}

export class ErrorEnvelopeDto {
  @ApiProperty({ example: false }) success!: false;
  @ApiProperty({ type: ErrorDetailDto }) error!: ErrorDetailDto;
  @ApiProperty({ type: ResponseMetaDto }) meta!: ResponseMetaDto;
}

export class EmailVerificationRequestDto {
  @ApiProperty({ example: 'ada@example.com', maxLength: 320 })
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail() @MaxLength(320) email!: string;
}

export class EmailVerificationConfirmDto {
  @ApiProperty({ description: 'Opaque verification token from the email link.', minLength: 20, maxLength: 512 })
  @IsString() @MinLength(20) @MaxLength(512) token!: string;
}

export class GenericAcceptedDto {
  @ApiProperty({ example: true }) accepted!: true;
}

export class GenericSuccessEnvelopeDto {
  @ApiProperty({ example: true }) success!: true;
  @ApiProperty({ type: GenericAcceptedDto }) data!: GenericAcceptedDto;
  @ApiProperty({ type: ResponseMetaDto }) meta!: ResponseMetaDto;
}

export class LoginDto {
  @ApiProperty({ example: 'ada@example.com', description: 'Normalized email or E.164 mobile number.' }) @IsString() @IsNotEmpty() @MaxLength(320) identifier!: string;
  @ApiProperty({ format: 'password' }) @IsString() @MinLength(12) @MaxLength(128) password!: string;
}

export class TokenPairDto { @ApiProperty() sessionId!: string; @ApiProperty() accessToken!: string; @ApiProperty() refreshToken!: string; @ApiProperty() expiresIn!: number; }
export class SessionDto {
  @ApiProperty() id!: string;
  @ApiProperty({ required: false }) membershipId?: string;
  @ApiProperty({ required: false }) organizationId?: string;
  @ApiProperty({ required: false }) deviceId?: string;
  @ApiProperty({ required: false }) deviceName?: string;
  @ApiProperty({ required: false }) userAgent?: string;
  @ApiProperty({ required: false }) ipAddress?: string;
  @ApiProperty({ required: false }) lastUsedAt?: Date;
  @ApiProperty() expiresAt!: Date;
  @ApiProperty() createdAt!: Date;
}
export class PasswordResetRequestDto { @ApiProperty({ example: 'ada@example.com', description: 'Email or E.164 mobile number.' }) @IsString() @IsNotEmpty() @MaxLength(320) identifier!: string; }
export class PasswordResetConfirmDto { @ApiProperty({ description: 'Opaque password-reset verification token.' }) @IsString() @MinLength(20) @MaxLength(512) token!: string; @ApiProperty({ format: 'password', minLength: 12 }) @IsString() @MinLength(12) @MaxLength(128) newPassword!: string; }
export class SmsVerificationRequestDto { @ApiProperty({ example: '+14155550100', description: 'E.164 mobile number.' }) @IsString() @Matches(/^\+[1-9]\d{7,14}$/) mobile!: string; }
export class SmsVerificationConfirmDto { @ApiProperty({ description: 'Opaque SMS verification token.' }) @IsString() @MinLength(20) @MaxLength(512) token!: string; }
export class WhatsAppVerificationRequestDto { @ApiProperty({ example: '+14155550100', description: 'E.164 mobile number.' }) @IsString() @Matches(/^\+[1-9]\d{7,14}$/) mobile!: string; }
export class WhatsAppVerificationConfirmDto { @ApiProperty({ description: 'Opaque WhatsApp verification token.' }) @IsString() @MinLength(20) @MaxLength(512) token!: string; }

export class RefreshDto {
  @ApiProperty() @IsString() refreshToken!: string;
}

export class VerifyDto {
  @ApiProperty() @IsString() token!: string;
}
