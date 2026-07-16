import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { Environment } from '../config/environment';
import { AccessTokenGuard } from './authorization/access-token.guard';
import { CurrentMembershipResolver } from './authorization/current-membership.resolver';
import { OrganizationResolver } from './authorization/organization.resolver';
import { RouteOrganizationContextGuard } from './authorization/route-organization-context.guard';
import { PermissionGuard } from './authorization/permission.guard';
import { PolicyGuard } from './authorization/policy.guard';
import { IdentityController } from './controllers/identity.controller';
import { IdentityRepository } from './repositories/identity.repository';
import { PublicRegistrationService } from './registration/public-registration.service';
import { RegistrationThrottleService } from './registration/registration-throttle.service';
import { EmailVerificationService } from './verification/email-verification.service';
import { EmailVerificationThrottleService } from './verification/email-verification-throttle.service';
import { VerificationEnvelopeService } from './verification/verification-envelope.service';
import { VerificationEngine } from './verification-engine/verification-engine.service';
import { PasswordResetService } from './password-reset/password-reset.service';
import { SmsVerificationService } from './sms-verification/sms-verification.service';
import { WhatsAppVerificationService } from './whatsapp-verification/whatsapp-verification.service';
import { AuthenticationThrottleService } from './security/authentication-throttle.service';
import { IdentityService } from './services/identity.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) => ({
        signOptions: {
          algorithm: config.getOrThrow('jwt').algorithm,
          issuer: config.getOrThrow('jwt').issuer,
          audience: config.getOrThrow('jwt').audience,
        },
      }),
    }),
  ],
  controllers: [IdentityController],
  providers: [
    IdentityRepository,
    IdentityService,
    PublicRegistrationService,
    RegistrationThrottleService,
    EmailVerificationService,
    EmailVerificationThrottleService,
    VerificationEnvelopeService,
    VerificationEngine,
    PasswordResetService,
    SmsVerificationService,
    WhatsAppVerificationService,
    AuthenticationThrottleService,
    AccessTokenGuard,
    OrganizationResolver,
    RouteOrganizationContextGuard,
    CurrentMembershipResolver,
    PermissionGuard,
    PolicyGuard,
  ],
  exports: [JwtModule, IdentityRepository, VerificationEngine, AccessTokenGuard, OrganizationResolver, RouteOrganizationContextGuard, CurrentMembershipResolver, PermissionGuard, PolicyGuard],
})
export class IdentityModule {}
