import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export enum OrganizationTypeDto { LANDLORD = 'LANDLORD', PROPERTY_MANAGER = 'PROPERTY_MANAGER', ENTERPRISE = 'ENTERPRISE' }
export class CreateOrganizationDto {
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(200) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(250) legalName?: string;
  @ApiProperty({ enum: OrganizationTypeDto }) @IsEnum(OrganizationTypeDto) organizationType!: OrganizationTypeDto;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) registrationNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(/^\+[1-9]\d{7,14}$/) mobile?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(128) timezone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(/^[A-Z]{3}$/) currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(/^[A-Z]{2}$/) country?: string;
}
export class UpdateOrganizationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) @MaxLength(200) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(250) legalName?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(/^\+[1-9]\d{7,14}$/) mobile?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2048) website?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(128) timezone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(/^[A-Z]{3}$/) currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Matches(/^[A-Z]{2}$/) country?: string;
}
