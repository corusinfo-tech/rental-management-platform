import { IsDateString, IsUUID } from 'class-validator'; export class GenerateInvoiceDto { @IsUUID() agreementId!: string; @IsDateString() issueDate!: string; @IsDateString() dueDate!: string; }
