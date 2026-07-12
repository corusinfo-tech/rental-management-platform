import { AgreementStatus } from '@prisma/client'; import { IsBoolean, IsDateString, IsDecimal, IsOptional, IsString, IsUUID } from 'class-validator';
export class CreateAgreementDto { @IsUUID() unitId!: string; @IsUUID() landlordId!: string; @IsOptional() @IsUUID() tenantUserId?: string; @IsDecimal() rentAmount!: string; @IsDecimal() gstRate!: string; @IsDateString() startsOn!: string; @IsDateString() endsOn!: string; @IsOptional() @IsBoolean() autoInvoiceEnabled?: boolean; }
export class UpdateAgreementStatusDto { @IsString() status!: AgreementStatus; }
