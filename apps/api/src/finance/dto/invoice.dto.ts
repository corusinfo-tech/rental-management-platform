import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreditNoteStatus, InvoiceLineType, InvoiceStatus } from '@prisma/client';
import { IsArray, IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, Min, ValidateNested } from 'class-validator';

export class CreateInvoiceLineDto {
  @ApiProperty({ enum: InvoiceLineType }) @IsEnum(InvoiceLineType) type!: InvoiceLineType;
  @ApiProperty() @IsString() @IsNotEmpty() description!: string;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.001) quantity?: number;
  @ApiProperty() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) unitAmount!: number;
}

export class CreateInvoiceDto {
  @ApiProperty({ description: 'Existing LeaseRentSchedule identifier.' }) @IsUUID() rentScheduleId!: string;
  @ApiPropertyOptional({ enum: [InvoiceStatus.DRAFT, InvoiceStatus.ISSUED], default: InvoiceStatus.DRAFT }) @IsOptional() @IsEnum(InvoiceStatus) status?: InvoiceStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional({ type: [CreateInvoiceLineDto], description: 'Additional non-rent lines. Rent is always derived from the schedule.' }) @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CreateInvoiceLineDto) additionalLines?: CreateInvoiceLineDto[];
}

export class UpdateInvoiceDto {
  @ApiPropertyOptional({ enum: InvoiceStatus }) @IsOptional() @IsEnum(InvoiceStatus) status?: InvoiceStatus;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class CreateCreditNoteDto {
  @ApiProperty() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) amount!: number;
  @ApiProperty() @IsString() @IsNotEmpty() reason!: string;
  @ApiPropertyOptional({ enum: [CreditNoteStatus.DRAFT, CreditNoteStatus.ISSUED], default: CreditNoteStatus.DRAFT }) @IsOptional() @IsEnum(CreditNoteStatus) status?: CreditNoteStatus;
}

export class InvoiceQueryDto {
  @ApiPropertyOptional({ enum: InvoiceStatus }) @IsOptional() @IsEnum(InvoiceStatus) status?: InvoiceStatus;
  @ApiPropertyOptional() @IsOptional() @IsUUID() leaseId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dueTo?: string;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ default: 20, maximum: 100 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}
