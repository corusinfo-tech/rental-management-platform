import assert from 'node:assert/strict';
import test from 'node:test';
import { SmsVerificationService } from '../dist/identity/sms-verification/sms-verification.service.js';

const id = '11111111-1111-4111-8111-111111111111';

test('SMS request routes a known E.164 user through VerificationEngine and unknown users stay generic', async () => {
  const calls = []; const repository = { findUserByIdentifier: async () => ({ id: 'user-1', deletedAt: null }), withTransaction: async (fn) => fn({}), findOrganizationIdForUser: async () => undefined };
  const engine = { resendVerification: async (input) => calls.push(input) };
  const service = new SmsVerificationService(repository, engine);
  assert.deepEqual(await service.request('+14155550100', 'corr'), { accepted: true });
  assert.deepEqual(calls[0].purpose, 'SMS_OTP'); assert.deepEqual(calls[0].channel, 'SMS');
  assert.deepEqual(await new SmsVerificationService({ findUserByIdentifier: async () => null }, engine).request('+14155550101'), { accepted: true });
});

test('SMS confirmation uses engine purpose validation and emits SmsVerified audit/outbox', async () => {
  const calls = []; const repository = { createAuditEvent: async (input) => calls.push(['audit', input]), createOutboxEvent: async (input) => calls.push(['outbox', input]) };
  const engine = { verify: async (input) => { await input.afterVerified({ id, userId: 'user-1', purpose: 'SMS_OTP', user: {} }, {}); } };
  const service = new SmsVerificationService(repository, engine);
  assert.deepEqual(await service.confirm(`${id}.123456`, 'corr'), { accepted: true });
  assert.equal(calls.find(([name]) => name === 'outbox')[1].eventType, 'SmsVerified');
  assert.equal(calls.find(([name]) => name === 'audit')[1].action, 'identity.sms_verification.verified');
});
