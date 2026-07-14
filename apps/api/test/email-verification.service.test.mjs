import assert from 'node:assert/strict';
import test from 'node:test';
import { EmailVerificationService } from '../dist/identity/verification/email-verification.service.js';

const id = '11111111-1111-4111-8111-111111111111';
const eligible = { id: 'user-1', status: 'PENDING_EMAIL', emailVerifiedAt: null, deletedAt: null };

test('email adapter routes request to the generic engine without exposing account state', async () => {
  const calls = [];
  const repository = { findUserByEmail: async () => eligible, withTransaction: async (fn) => fn({}), findOrganizationIdForUser: async () => undefined };
  const engine = { resendVerification: async (input) => calls.push(input) };
  const service = new EmailVerificationService(repository, engine);
  assert.deepEqual(await service.request('ADA@EXAMPLE.COM', 'corr'), { accepted: true });
  assert.deepEqual(calls[0], { userId: 'user-1', organizationId: null, channel: 'EMAIL', purpose: 'EMAIL_VERIFICATION', correlationId: 'corr' });
});

test('email adapter consumes a verified generic-engine result and emits email transition events', async () => {
  const calls = [];
  const repository = {
    withTransaction: async (fn) => fn({}), transitionEmailVerifiedUser: async () => ({ id: 'user-1' }), findOrganizationIdForUser: async () => undefined,
    createAuditEvent: async (input) => calls.push(['audit', input]), createOutboxEvent: async (input) => calls.push(['outbox', input]),
  };
  const engine = { verify: async (input) => { const result = { id, userId: 'user-1', user: eligible }; await input.afterVerified(result, {}); return result; } };
  const service = new EmailVerificationService(repository, engine);
  assert.deepEqual(await service.confirm(`${id}.${'a'.repeat(43)}`, 'corr'), { accepted: true });
  assert.equal(calls.find(([kind]) => kind === 'outbox')[1].eventType, 'EmailVerified');
});

test('malformed, replayed, and ineligible email verification requests are generic', async () => {
  const service = new EmailVerificationService({ findUserByEmail: async () => null }, { verify: async () => undefined, resendVerification: async () => undefined });
  assert.deepEqual(await service.request('none@example.com'), { accepted: true });
  assert.deepEqual(await service.confirm('not-a-token'), { accepted: true });
});
