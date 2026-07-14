import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsInt, IsString, IsUUID, Matches, MaxLength, Min } from 'class-validator';

export class CreateOrganizationInvitationDto {
  @ApiProperty({ example: 'invitee@example.com' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  roleId!: string;
}

export class InvitationTokenDto {
  @ApiProperty({ description: 'Opaque token received through the secure delivery envelope.' })
  @IsString()
  @Matches(/^[0-9a-f-]{36}\.[A-Za-z0-9_-]{32,}$/i)
  token!: string;
  @ApiProperty({ description: 'Invitation version returned when it was created.' }) @IsInt() @Min(1) expectedVersion!: number;
}

export class RevokeInvitationDto {
  @ApiProperty({ description: 'Invitation version returned when it was created.' }) @IsInt() @Min(1) expectedVersion!: number;
}

export class InvitationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() organizationId!: string;
  @ApiProperty() email!: string;
  @ApiProperty() roleId!: string;
  @ApiProperty() verificationId!: string;
  @ApiProperty({ enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'REVOKED'] }) status!: string;
  @ApiProperty() expiresAt!: Date;
  @ApiPropertyOptional() acceptedAt?: Date | null;
  @ApiPropertyOptional() declinedAt?: Date | null;
  @ApiPropertyOptional() revokedAt?: Date | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
  @ApiProperty() version!: number;
}

export class OrganizationMemberResponseDto {
  @ApiProperty() membershipId!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ enum: ['INVITED', 'ACTIVE', 'SUSPENDED', 'ARCHIVED'] }) status!: string;
  @ApiProperty() isOwner!: boolean;
  @ApiPropertyOptional() joinedAt?: Date | null;
  @ApiProperty({ type: [String] }) roleCodes!: string[];
}
