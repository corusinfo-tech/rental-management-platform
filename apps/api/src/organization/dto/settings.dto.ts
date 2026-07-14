import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class UpdateOrganizationSettingsDto {
  @ApiProperty({ description: 'Current resource version. A stale version returns HTTP 409.' }) @IsInt() @Min(1) expectedVersion!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(128) timezone?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(/^[A-Z]{3}$/) currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(32) dateFormat?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(16) timeFormat?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(16) language?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(/^[A-Z]{2}$/) country?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() gstEnabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() @MaxLength(64) gstNumber?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() @MaxLength(32) invoicePrefix?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(2_147_483_647) invoiceSequence?: number;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() @MaxLength(200) brandName?: string;
  @ApiPropertyOptional({ description: 'External logo URL only; upload is out of scope.' }) @IsOptional() @IsString() @MaxLength(2048) logoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(/^#[0-9A-Fa-f]{6}$/) primaryColor?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(/^#[0-9A-Fa-f]{6}$/) secondaryColor?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() @MaxLength(320) notificationEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() @MaxLength(320) supportEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() @MaxLength(320) maintenanceEmail?: string;
}

export class OrganizationSettingsResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() organizationId!: string;
  @ApiProperty() timezone!: string;
  @ApiProperty() currency!: string;
  @ApiProperty() dateFormat!: string;
  @ApiProperty() timeFormat!: string;
  @ApiProperty() language!: string;
  @ApiProperty() country!: string;
  @ApiProperty() gstEnabled!: boolean;
  @ApiPropertyOptional() gstNumber?: string | null;
  @ApiProperty() invoicePrefix!: string;
  @ApiProperty() invoiceSequence!: number;
  @ApiPropertyOptional() brandName?: string | null;
  @ApiPropertyOptional() logoUrl?: string | null;
  @ApiPropertyOptional() primaryColor?: string | null;
  @ApiPropertyOptional() secondaryColor?: string | null;
  @ApiPropertyOptional() notificationEmail?: string | null;
  @ApiPropertyOptional() supportEmail?: string | null;
  @ApiPropertyOptional() maintenanceEmail?: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiProperty() version!: number;
}
