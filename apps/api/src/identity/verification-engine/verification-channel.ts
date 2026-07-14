import { randomBytes, randomInt } from 'node:crypto';
import { VerificationChannel as PrismaVerificationChannel } from '@prisma/client';

export type DeliveryPreparation = { token: string };

/** Channel contract used by the verification engine; delivery itself belongs to a future worker. */
export interface VerificationChannel {
  readonly channel: PrismaVerificationChannel;
  generate(): string;
  prepareDelivery(verificationId: string, secret: string): DeliveryPreparation;
  validate(secret: string): boolean;
  expire(): void;
  destroy(): void;
}

export class EmailChannel implements VerificationChannel {
  readonly channel = PrismaVerificationChannel.EMAIL;
  generate(): string { return randomBytes(32).toString('base64url'); }
  prepareDelivery(verificationId: string, secret: string): DeliveryPreparation { return { token: `${verificationId}.${secret}` }; }
  validate(secret: string): boolean { return /^[A-Za-z0-9_-]{32,}$/.test(secret); }
  expire(): void {}
  destroy(): void {}
}

abstract class UnsupportedChannel implements VerificationChannel {
  abstract readonly channel: PrismaVerificationChannel;
  generate(): string { throw new Error(`${this.channel} verification delivery is not implemented`); }
  prepareDelivery(): DeliveryPreparation { throw new Error(`${this.channel} verification delivery is not implemented`); }
  validate(): boolean { return false; }
  expire(): void {}
  destroy(): void {}
}

abstract class OtpChannel implements VerificationChannel {
  abstract readonly channel: PrismaVerificationChannel;
  generate(): string { return String(randomInt(100_000, 1_000_000)); }
  prepareDelivery(verificationId: string, secret: string): DeliveryPreparation { return { token: `${verificationId}.${secret}` }; }
  validate(secret: string): boolean { return /^\d{6}$/.test(secret); }
  expire(): void {}
  destroy(): void {}
}
export class SmsChannel extends OtpChannel { readonly channel = PrismaVerificationChannel.SMS; }
export class WhatsAppChannel extends OtpChannel { readonly channel = PrismaVerificationChannel.WHATSAPP; }
export class PasswordResetChannel extends UnsupportedChannel { readonly channel = PrismaVerificationChannel.EMAIL; }
export class MagicLinkChannel extends UnsupportedChannel { readonly channel = PrismaVerificationChannel.EMAIL; }
export class InvitationChannel extends UnsupportedChannel { readonly channel = PrismaVerificationChannel.EMAIL; }
