import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Environment } from '../../config/environment';

export const VERIFICATION_ENVELOPE_ALGORITHM = 'AES-256-GCM';

export type VerificationEnvelopeBinding = {
  verificationId: string;
  organizationId: string | null;
  userId: string | null;
  subjectType?: string;
  subjectReferenceId?: string;
  correlationId: string | null;
};

export type EncryptedVerificationEnvelope = {
  ciphertext: Buffer;
  nonce: Buffer;
  authenticationTag: Buffer;
  keyVersion: string;
  algorithm: typeof VERIFICATION_ENVELOPE_ALGORITHM;
  aad: Buffer;
};

export type StoredVerificationEnvelope = EncryptedVerificationEnvelope & {
  status: 'PENDING' | 'PROCESSED' | 'EXPIRED' | 'DESTROYED';
  expiresAt: Date;
};

/**
 * The only API permitted to handle recoverable verification-token material.
 * Delivery workers will consume this interface in a later story; controllers never do.
 */
export interface VerificationDeliveryProcessor {
  loadEnvelope(verificationId: string): Promise<StoredVerificationEnvelope | undefined>;
  decrypt(envelope: StoredVerificationEnvelope, binding: VerificationEnvelopeBinding): string;
  deliver(token: string): Promise<void>;
  destroy(verificationId: string): Promise<void>;
}

@Injectable()
export class VerificationEnvelopeService {
  constructor(private readonly config: ConfigService<Environment, true>) {}

  encrypt(token: string, binding: VerificationEnvelopeBinding): EncryptedVerificationEnvelope {
    const nonce = randomBytes(12);
    const aad = this.serializeAad(binding);
    const cipher = createCipheriv('aes-256-gcm', this.encryption.verificationKey, nonce);
    cipher.setAAD(aad);
    const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
    return {
      ciphertext,
      nonce,
      authenticationTag: cipher.getAuthTag(),
      keyVersion: this.encryption.verificationKeyVersion,
      algorithm: VERIFICATION_ENVELOPE_ALGORITHM,
      aad,
    };
  }

  decrypt(envelope: StoredVerificationEnvelope, binding: VerificationEnvelopeBinding): string {
    this.validateExpiry(envelope);
    if (envelope.status !== 'PENDING') throw new Error('Verification delivery envelope is unavailable');
    if (envelope.algorithm !== VERIFICATION_ENVELOPE_ALGORITHM) throw new Error('Unsupported verification envelope algorithm');
    if (envelope.keyVersion !== this.encryption.verificationKeyVersion) throw new Error('Verification envelope key version is unavailable');
    if (!envelope.ciphertext || !envelope.nonce || !envelope.authenticationTag || !envelope.aad) {
      throw new Error('Verification delivery envelope has been destroyed');
    }
    const expectedAad = this.serializeAad(binding);
    if (expectedAad.length !== envelope.aad.length || !timingSafeEqual(expectedAad, envelope.aad)) {
      throw new Error('Verification delivery envelope binding is invalid');
    }
    const decipher = createDecipheriv('aes-256-gcm', this.encryption.verificationKey, envelope.nonce);
    decipher.setAAD(envelope.aad);
    decipher.setAuthTag(envelope.authenticationTag);
    return Buffer.concat([decipher.update(envelope.ciphertext), decipher.final()]).toString('utf8');
  }

  validateExpiry(envelope: Pick<StoredVerificationEnvelope, 'expiresAt'>): void {
    if (envelope.expiresAt <= new Date()) throw new Error('Verification delivery envelope has expired');
  }

  /** Returns the persistence state that irreversibly removes recoverable delivery material. */
  destroy(): { ciphertext: null; nonce: null; authenticationTag: null; aad: null; status: 'DESTROYED'; destroyedAt: Date } {
    return { ciphertext: null, nonce: null, authenticationTag: null, aad: null, status: 'DESTROYED', destroyedAt: new Date() };
  }

  private get encryption(): Environment['encryption'] {
    return this.config.getOrThrow('encryption');
  }

  private serializeAad(binding: VerificationEnvelopeBinding): Buffer {
    // Fixed key order makes binding deterministic and protects all ADR-required identifiers.
    return Buffer.from(JSON.stringify({
      verificationId: binding.verificationId,
      organizationId: binding.organizationId,
      userId: binding.userId,
      correlationId: binding.correlationId,
      // Subject properties are absent for pre-ADR envelopes, retaining their decryptability.
      ...(binding.subjectType ? { subjectType: binding.subjectType, subjectReferenceId: binding.subjectReferenceId } : {}),
    }), 'utf8');
  }
}
