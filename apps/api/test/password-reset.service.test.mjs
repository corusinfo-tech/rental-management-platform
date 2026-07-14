import assert from 'node:assert/strict';
import test from 'node:test';
import * as argon2 from 'argon2';
import { PasswordResetService } from '../dist/identity/password-reset/password-reset.service.js';

const id = '11111111-1111-4111-8111-111111111111';

test('password reset request is generic for unknown users and delegates known users to VerificationEngine', async () => {
  const calls = [];
  const known = { id: 'user-1', deletedAt: null };
  const repository = { findUserByIdentifier: async () => known, withTransaction: async (fn) => fn({}), findOrganizationIdForUser: async () => undefined };
  const engine = { resendVerification: async (input) => calls.push(input) };
  const service = new PasswordResetService(repository, engine);
  assert.deepEqual(await service.request('USER@EXAMPLE.COM', 'corr'), { accepted: true });
  assert.equal(calls[0].purpose, 'PASSWORD_RESET');
  const unknown = new PasswordResetService({ findUserByIdentifier: async () => null }, engine);
  assert.deepEqual(await unknown.request('missing@example.com'), { accepted: true });
});

test('password reset confirmation updates only the password hash, revokes sessions, audits, and emits completion', async () => {
  const calls = [];
  const repository = {
    updatePasswordHash: async (...args) => calls.push(['password', args]),
    revokeAllSessionsForUser: async () => ({ count: 2 }),
    createAuditEvent: async (input) => calls.push(['audit', input]), createOutboxEvent: async (input) => calls.push(['outbox', input]),
  };
  const engine = { verify: async (input) => { await input.afterVerified({ id, userId: 'user-1', purpose: 'PASSWORD_RESET', user: {} }, {}); return {}; } };
  const service = new PasswordResetService(repository, engine);
  assert.deepEqual(await service.confirm(`${id}.${'a'.repeat(43)}`, 'new-secure-password', 'corr'), { accepted: true });
  assert.match(calls.find(([name]) => name === 'password')[1][1], /^\$argon2/);
  assert.equal(calls.find(([name]) => name === 'outbox')[1].eventType, 'PasswordResetCompleted');
  assert.equal(calls.find(([name]) => name === 'audit')[1].action, 'identity.password_reset.completed');
});

test('malformed or replayed password reset tokens keep a generic response', async () => {
  const service = new PasswordResetService({}, { verify: async () => undefined });
  assert.deepEqual(await service.confirm('invalid', 'new-secure-password'), { accepted: true });
});
