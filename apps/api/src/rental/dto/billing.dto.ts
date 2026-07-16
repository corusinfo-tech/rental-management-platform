import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillingCycle, LateFeeType, LeaseBillingStatus, ProrationMethod, RentEscalationType, SecurityDepositStatus } from '@prisma/client';
import { IsArray, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, Max, Min, ValidateIf, ValidateNested } from 'class-validator';

export class RentEscalationRuleDto {
  @ApiProperty() @IsDateString() effectiveAt!: string;
  @ApiProperty({ enum: RentEscalationType }) @IsEnum(RentEscalationType) type!: RentEscalationType;
  @ApiProperty({ example: 5 }) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) amount!: number;
  @ApiPropertyOptional({ example: 12 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) intervalMonths?: number;
}

export class LateFeeRuleDto {
  @ApiProperty({ enum: LateFeeType }) @IsEnum(LateFeeType) type!: LateFeeType;
  @ApiProperty() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) amount!: number;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @Type(() => Number) @IsInt() @Min(0) gracePeriodDays?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) maximumAmount?: number;
}

export class SecurityDepositDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) requiredAmount?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) heldAmount?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) refundedAmount?: number;
  @ApiPropertyOptional({ enum: SecurityDepositStatus }) @IsOptional() @IsEnum(SecurityDepositStatus) status?: SecurityDepositStatus;
}

export class CreateLeaseBillingDto {
  @ApiProperty({ enum: BillingCycle }) @IsEnum(BillingCycle) billingCycle!: BillingCycle;
  @ApiPropertyOptional({ description: 'Required only for CUSTOM billing cycles.' }) @ValidateIf((dto: CreateLeaseBillingDto) => dto.billingCycle === BillingCycle.CUSTOM) @Type(() => Number) @IsInt() @Min(1) customIntervalDays?: number;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @Type(() => Number) @IsInt() @Min(0) dueDaysAfterPeriodStart?: number;
  @ApiPropertyOptional({ enum: ProrationMethod, default: ProrationMethod.DAILY }) @IsOptional() @IsEnum(ProrationMethod) prorationMethod?: ProrationMethod;
  @ApiPropertyOptional({ enum: LeaseBillingStatus, default: LeaseBillingStatus.DRAFT }) @IsOptional() @IsEnum(LeaseBillingStatus) status?: LeaseBillingStatus;
  @ApiPropertyOptional({ type: [RentEscalationRuleDto] }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => RentEscalationRuleDto) escalationRules?: RentEscalationRuleDto[];
  @ApiPropertyOptional({ type: LateFeeRuleDto }) @IsOptional() @ValidateNested() @Type(() => LateFeeRuleDto) lateFeeRule?: LateFeeRuleDto;
  @ApiPropertyOptional({ type: SecurityDepositDto }) @IsOptional() @ValidateNested() @Type(() => SecurityDepositDto) securityDeposit?: SecurityDepositDto;
}

export class UpdateLeaseBillingDto {
  @ApiPropertyOptional({ enum: LeaseBillingStatus }) @IsOptional() @IsEnum(LeaseBillingStatus) status?: LeaseBillingStatus;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @Type(() => Number) @IsInt() @Min(0) dueDaysAfterPeriodStart?: number;
  @ApiPropertyOptional({ enum: ProrationMethod }) @IsOptional() @IsEnum(ProrationMethod) prorationMethod?: ProrationMethod;
  @ApiPropertyOptional({ type: LateFeeRuleDto }) @IsOptional() @ValidateNested() @Type(() => LateFeeRuleDto) lateFeeRule?: LateFeeRuleDto;
}

export class GenerateRentScheduleDto {
  @ApiProperty({ description: 'Generate schedule rows through this date, inclusive of the final period.' }) @IsDateString() throughAt!: string;
}
