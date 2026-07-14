import assert from 'node:assert/strict';
import test from 'node:test';
import { VerificationEngine } from '../dist/identity/verification-engine/verification-engine.service.js';

const settings = { expirySeconds: 60, maximumAttempts: 5, cooldownSeconds: 1 };

function createEngine() {
  const calls = [];
  const repository = {
    withTransaction: async (callback) => callback({}),
    createVerification: async (input) => ({ id: '11111111-1111-4111-8111-111111111111', ...input }),
    createVerificationDeliveryEnvelope: async (input) => calls.push(['envelope', input]),
    createAuditEvent: async (input) => calls.push(['audit', input]),
    createOutboxEvent: async (input) => calls.push(['outbox', input]),
  };
  const envelopes = { encrypt: (token, binding) => {
    calls.push(['binding', binding]);
    assert.match(token, /^11111111-1111-4111-8111-111111111111\.[A-Za-z0-9_-]{32,}$/);
    return { ciphertext: Buffer.from('ciphertext'), nonce: Buffer.alloc(12), authenticationTag: Buffer.alloc(16), keyVersion: 'v1', algorithm: 'AES-256-GCM', aad: Buffer.from('aad') };
  } };
  const config = { getOrThrow: (name) => { assert.equal(name, 'verification'); return { email: settings }; } };
  return { engine: new VerificationEngine(repository, config, envelopes), calls };
}

test('verification engine creates an invitation subject without a user while keeping the outbox ID-only', async () => {
  const { engine, calls } = createEngine();
  const result = await engine.createVerification({
    subjectType: 'INVITATION', subjectReferenceId: 'invitation-1', userId: undefined,
    organizationId: 'organization-1', channel: 'EMAIL', purpose: 'INVITATION', correlationId: 'corr-1',
  });
  assert.equal(result.subjectType, 'INVITATION');
  assert.equal(result.subjectReferenceId, 'invitation-1');
  assert.equal(result.userId, undefined);
  assert.deepEqual(calls.find(([kind]) => kind === 'binding')[1], {
    verificationId: result.id, organizationId: 'organization-1', userId: null,
    subjectType: 'INVITATION', subjectReferenceId: 'invitation-1', correlationId: 'corr-1',
  });
  const outbox = calls.find(([kind]) => kind === 'outbox')[1];
  assert.deepEqual(outbox.payload, { verificationId: result.id, organizationId: 'organization-1', userId: null, correlationId: 'corr-1' });
  const audit = calls.find(([kind]) => kind === 'audit')[1];
  assert.equal(audit.metadata.subjectType, 'INVITATION');
  assert.equal(audit.metadata.subjectReferenceId, 'invitation-1');
});

test('existing user callers default to the USER subject', async () => {
  const { engine } = createEngine();
  const result = await engine.createVerification({ userId: 'user-1', organizationId: null, channel: 'EMAIL', purpose: 'EMAIL_VERIFICATION' });
  assert.equal(result.subjectType, 'USER');
  assert.equal(result.subjectReferenceId, 'user-1');
});
