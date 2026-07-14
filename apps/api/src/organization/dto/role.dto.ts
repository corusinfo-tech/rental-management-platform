import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateOrganizationRoleDto {
  @ApiProperty() @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() @MaxLength(500) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class UpdateOrganizationRoleDto {
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() @MinLength(2) @MaxLength(100) name?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() @MaxLength(500) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class SetRolePermissionsDto {
  @ApiProperty({ type: [String], format: 'uuid' }) @IsArray() @ArrayUnique() @ArrayMaxSize(100) @IsUUID('4', { each: true }) permissionIds!: string[];
  @ApiPropertyOptional({ description: 'Replace the role permission set, producing revocation audit events for omitted permissions.' }) @IsOptional() @IsBoolean() replace?: boolean;
}

export class AssignOrganizationRoleDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() roleId!: string;
  @ApiPropertyOptional({ description: 'Remove this role from the membership instead of assigning it.' }) @IsOptional() @IsBoolean() remove?: boolean;
}

export class OrganizationRoleResponseDto {
  @ApiProperty() id!: string;
  @ApiPropertyOptional() organizationId?: string | null;
  @ApiProperty() code!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() description?: string | null;
  @ApiProperty() isSystem!: boolean;
  @ApiProperty() isDefault!: boolean;
  @ApiProperty({ type: [String] }) permissionCodes!: string[];
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
