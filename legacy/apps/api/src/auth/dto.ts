import { ApiProperty } from '@nestjs/swagger'; import { Role } from '@prisma/client'; import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
export class RegisterDto { @ApiProperty() @IsString() @MinLength(2) tenantName!: string; @ApiProperty() @IsEmail() email!: string; @ApiProperty({ minLength: 12 }) @IsString() @MinLength(12) password!: string; @ApiProperty() @IsString() firstName!: string; @ApiProperty() @IsString() lastName!: string; @ApiProperty({ enum: Role }) @IsEnum(Role) role!: Role; }
export class LoginDto { @IsEmail() email!: string; @IsString() password!: string; @IsString() tenantId!: string; }
export class RefreshDto { @IsString() refreshToken!: string; }
