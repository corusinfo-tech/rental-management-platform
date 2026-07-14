import assert from 'node:assert/strict';
import test from 'node:test';
import { VerificationEnvelopeService } from '../dist/identity/verification/verification-envelope.service.js';

const key = Buffer.alloc(32, 7);
const config = (keyVersion = 'v1', encryptionKey = key) => ({
  getOrThrow: (name) => {
    assert.equal(name, 'encryption');
    return { verificationKey: encryptionKey, verificationKeyVersion: keyVersion };
  },
});
const binding = { verificationId: '11111111-1111-4111-8111-111111111111', organizationId: null, userId: 'user-1', correlationId: 'corr-1' };

function stored(service) {
  return { ...service.encrypt(`${binding.verificationId}.secret`, binding), status: 'PENDING', expiresAt: new Date(Date.now() + 60_000) };
}

test('AES-256-GCM envelope decrypts only with the correct binding', () => {
  const service = new VerificationEnvelopeService(config());
  const envelope = stored(service);
  assert.equal(envelope.algorithm, 'AES-256-GCM');
  assert.equal(envelope.nonce.length, 12);
  assert.equal(service.decrypt(envelope, binding), `${binding.verificationId}.secret`);
  assert.throws(() => service.decrypt(envelope, { ...binding, correlationId: 'other' }));
});

test('generic subject identifiers are authenticated, while legacy user envelopes remain readable', () => {
  const service = new VerificationEnvelopeService(config());
  const invitationBinding = {
    ...binding,
    userId: null,
    subjectType: 'INVITATION',
    subjectReferenceId: 'invitation-1',
  };
  const envelope = { ...service.encrypt('opaque-token', invitationBinding), status: 'PENDING', expiresAt: new Date(Date.now() + 60_000) };
  assert.equal(service.decrypt(envelope, invitationBinding), 'opaque-token');
  assert.throws(() => service.decrypt(envelope, { ...invitationBinding, subjectReferenceId: 'invitation-2' }));

  const legacyEnvelope = stored(service);
  assert.equal(service.decrypt(legacyEnvelope, binding), `${binding.verificationId}.secret`);
});

test('tampering, wrong keys, expiry, and key-version mismatch are rejected', () => {
  const service = new VerificationEnvelopeService(config());
  const envelope = stored(service);
  assert.throws(() => service.decrypt({ ...envelope, ciphertext: Buffer.from(envelope.ciphertext.map((byte, index) => index === 0 ? byte ^ 1 : byte)) }, binding));
  assert.throws(() => service.decrypt({ ...envelope, nonce: Buffer.from(envelope.nonce.map((byte, index) => index === 0 ? byte ^ 1 : byte)) }, binding));
  assert.throws(() => service.decrypt({ ...envelope, aad: Buffer.from(envelope.aad.map((byte, index) => index === 0 ? byte ^ 1 : byte)) }, binding));
  assert.throws(() => new VerificationEnvelopeService(config('v1', Buffer.alloc(32, 8))).decrypt(envelope, binding));
  assert.throws(() => new VerificationEnvelopeService(config('v2')).decrypt(envelope, binding));
  assert.throws(() => service.decrypt({ ...envelope, expiresAt: new Date(Date.now() - 1) }, binding));
});

test('destroy state removes every recoverable encrypted component', () => {
  const service = new VerificationEnvelopeService(config());
  const destroyed = service.destroy();
  assert.equal(destroyed.ciphertext, null);
  assert.equal(destroyed.nonce, null);
  assert.equal(destroyed.authenticationTag, null);
  assert.equal(destroyed.aad, null);
  assert.equal(destroyed.status, 'DESTROYED');
  assert.ok(destroyed.destroyedAt instanceof Date);
});
