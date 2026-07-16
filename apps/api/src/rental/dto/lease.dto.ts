import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeaseDocumentType, LeasePartyRole, LeaseStatus } from '@prisma/client';
import { IsArray, IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, Min, ValidateNested } from 'class-validator';

export class LeaseTermsDto {
  @ApiProperty({ example: 25000 }) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) rentAmount!: number;
  @ApiPropertyOptional({ example: 50000 }) @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) securityDeposit?: number;
  @ApiPropertyOptional({ example: 5 }) @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) escalationRate?: number;
  @ApiPropertyOptional({ example: 12 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) escalationMonths?: number;
  @ApiPropertyOptional({ example: 5 }) @IsOptional() @Type(() => Number) @IsInt() @Min(0) gracePeriodDays?: number;
  @ApiPropertyOptional({ example: 30 }) @IsOptional() @Type(() => Number) @IsInt() @Min(0) noticePeriodDays?: number;
  @ApiPropertyOptional({ example: 500 }) @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) lateFeeAmount?: number;
  @ApiPropertyOptional({ example: 'INR' }) @IsOptional() @IsString() @IsNotEmpty() currency?: string;
}

export class LeasePartyDto {
  @ApiProperty({ enum: LeasePartyRole }) @IsEnum(LeasePartyRole) role!: LeasePartyRole;
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiProperty() @IsString() @IsNotEmpty() mobile!: string;
}

export class CreateLeaseDto {
  @ApiProperty() @IsUUID() unitId!: string;
  @ApiProperty({ example: 'LEASE-2026-0001' }) @IsString() @IsNotEmpty() code!: string;
  @ApiProperty({ example: '2026-08-01T00:00:00.000Z' }) @IsDateString() startsAt!: string;
  @ApiProperty({ example: '2027-07-31T23:59:59.999Z' }) @IsDateString() endsAt!: string;
  @ApiProperty({ type: LeaseTermsDto }) @ValidateNested() @Type(() => LeaseTermsDto) terms!: LeaseTermsDto;
  @ApiPropertyOptional({ type: [LeasePartyDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => LeasePartyDto) parties?: LeasePartyDto[];
}

export class UpdateLeaseDto {
  @ApiPropertyOptional({ enum: LeaseStatus }) @IsOptional() @IsEnum(LeaseStatus) status?: LeaseStatus;
  @ApiPropertyOptional({ type: LeaseTermsDto }) @IsOptional() @ValidateNested() @Type(() => LeaseTermsDto) terms?: LeaseTermsDto;
}

export class CreateLeaseDocumentDto {
  @ApiProperty({ enum: LeaseDocumentType }) @IsEnum(LeaseDocumentType) type!: LeaseDocumentType;
  @ApiProperty() @IsString() @IsNotEmpty() name!: string;
  @ApiProperty({ description: 'Object storage key; binary upload is intentionally outside this sprint.' }) @IsString() @IsNotEmpty() storageKey!: string;
  @ApiProperty() @IsString() @IsNotEmpty() mimeType!: string;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(0) sizeBytes!: number;
}

export class RenewLeaseDto {
  @ApiProperty({ example: '2028-07-31T23:59:59.999Z' }) @IsDateString() endsAt!: string;
  @ApiPropertyOptional({ example: 27000 }) @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) rentAmount?: number;
}

export class TerminateLeaseDto {
  @ApiProperty({ example: 'Mutual termination' }) @IsString() @IsNotEmpty() reason!: string;
  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.999Z' }) @IsOptional() @IsDateString() terminatedAt?: string;
}

export class LeaseQueryDto {
  @ApiPropertyOptional({ enum: LeaseStatus }) @IsOptional() @IsEnum(LeaseStatus) status?: LeaseStatus;
  @ApiPropertyOptional() @IsOptional() @IsUUID() unitId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ default: 20, maximum: 100 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}
