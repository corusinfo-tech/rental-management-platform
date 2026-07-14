import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class ApprovalVersionDto {
  @ApiProperty({ description: 'Current approval version. A stale version returns HTTP 409.' }) @IsInt() @Min(1) expectedVersion!: number;
}

export class RejectOrganizationDto extends ApprovalVersionDto {
  @ApiProperty({ description: 'Administrative rejection reason.' }) @IsString() @MinLength(1) @MaxLength(2000) reason!: string;
}

export class ReopenOrganizationReviewDto extends ApprovalVersionDto {
  @ApiPropertyOptional({ description: 'Optional administrative review note.' }) @IsOptional() @IsString() @MaxLength(2000) reason?: string;
}

export class OrganizationApprovalResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() organizationId!: string;
  @ApiProperty({ enum: ['PENDING', 'APPROVED', 'REJECTED'] }) status!: string;
  @ApiPropertyOptional() reviewedByUserId?: string | null;
  @ApiPropertyOptional() reviewedAt?: Date | null;
  @ApiPropertyOptional() reason?: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiProperty() version!: number;
  @ApiProperty() organizationName!: string;
}
