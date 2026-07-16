import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PaymentPurpose, PaymentStatus } from '@prisma/client';
import { ArrayMinSize, IsArray, IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, Min, ValidateNested } from 'class-validator';

export class PaymentAllocationDto {
  @ApiProperty() @IsUUID() invoiceId!: string;
  @ApiProperty({ example: 10000 }) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) amount!: number;
}

export class CreatePaymentDto {
  @ApiProperty({ enum: PaymentMethod }) @IsEnum(PaymentMethod) method!: PaymentMethod;
  @ApiPropertyOptional({ enum: PaymentPurpose, default: PaymentPurpose.INVOICE }) @IsOptional() @IsEnum(PaymentPurpose) purpose?: PaymentPurpose;
  @ApiProperty({ example: 10000 }) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) amount!: number;
  @ApiProperty({ type: [PaymentAllocationDto] }) @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => PaymentAllocationDto) allocations!: PaymentAllocationDto[];
  @ApiPropertyOptional() @IsOptional() @IsString() externalReference?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() paidAt?: string;
}

export class CreateRefundDto {
  @ApiProperty({ example: 1000 }) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) amount!: number;
  @ApiProperty() @IsString() @IsNotEmpty() reason!: string;
}

export class ApplyAdvanceDto {
  @ApiProperty() @IsUUID() invoiceId!: string;
  @ApiProperty({ example: 5000 }) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) amount!: number;
}

export class PaymentQueryDto {
  @ApiPropertyOptional({ enum: PaymentStatus }) @IsOptional() @IsEnum(PaymentStatus) status?: PaymentStatus;
  @ApiPropertyOptional({ enum: PaymentMethod }) @IsOptional() @IsEnum(PaymentMethod) method?: PaymentMethod;
  @ApiPropertyOptional({ enum: PaymentPurpose }) @IsOptional() @IsEnum(PaymentPurpose) purpose?: PaymentPurpose;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ default: 20, maximum: 100 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}
