import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export enum ComplianceStatusDto { COMPLIANT = 'COMPLIANT', NON_COMPLIANT = 'NON_COMPLIANT', UNDER_REVIEW = 'UNDER_REVIEW' }
export enum RiskLevelDto { LOW = 'LOW', MEDIUM = 'MEDIUM', HIGH = 'HIGH' }

export class UpdateOrganizationComplianceDto {
  @ApiProperty({ description: 'Current resource version. A stale version returns HTTP 409.' }) @IsInt() @Min(1) expectedVersion!: number;
  @ApiPropertyOptional({ enum: ComplianceStatusDto }) @IsOptional() @IsEnum(ComplianceStatusDto) complianceStatus?: ComplianceStatusDto;
  @ApiPropertyOptional({ description: 'Informational provider-agnostic KYC status.' }) @IsOptional() @IsString() @MaxLength(64) kycStatus?: string;
  @ApiPropertyOptional({ description: 'Informational provider-agnostic GST verification status.' }) @IsOptional() @IsString() @MaxLength(64) gstVerificationStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() lastReviewAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() nextReviewAt?: string;
  @ApiPropertyOptional({ enum: RiskLevelDto }) @IsOptional() @IsEnum(RiskLevelDto) riskLevel?: RiskLevelDto;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(5000) notes?: string;
}

export class OrganizationComplianceResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() organizationId!: string;
  @ApiProperty({ enum: ComplianceStatusDto }) complianceStatus!: string;
  @ApiProperty() kycStatus!: string;
  @ApiProperty() gstVerificationStatus!: string;
  @ApiPropertyOptional() lastReviewAt?: Date | null;
  @ApiPropertyOptional() nextReviewAt?: Date | null;
  @ApiProperty({ enum: RiskLevelDto }) riskLevel!: string;
  @ApiPropertyOptional() notes?: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiProperty() version!: number;
}
