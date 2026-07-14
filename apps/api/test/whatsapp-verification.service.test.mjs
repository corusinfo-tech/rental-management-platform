import assert from 'node:assert/strict';
import test from 'node:test';
import { WhatsAppVerificationService } from '../dist/identity/whatsapp-verification/whatsapp-verification.service.js';

const id = '11111111-1111-4111-8111-111111111111';
test('WhatsApp request uses VerificationEngine and does not expose unknown accounts', async () => {
  const calls = []; const repository = { findUserByIdentifier: async () => ({ id: 'user-1', deletedAt: null }), withTransaction: async (fn) => fn({}), findOrganizationIdForUser: async () => undefined };
  const service = new WhatsAppVerificationService(repository, { resendVerification: async (input) => calls.push(input) });
  assert.deepEqual(await service.request('+14155550100', 'corr'), { accepted: true });
  assert.equal(calls[0].channel, 'WHATSAPP'); assert.equal(calls[0].purpose, 'WHATSAPP_OTP');
});
test('WhatsApp confirmation writes audit and WhatsAppVerified event through engine completion', async () => {
  const calls = []; const repository = { createAuditEvent: async (input) => calls.push(['audit', input]), createOutboxEvent: async (input) => calls.push(['outbox', input]) };
  const engine = { verify: async (input) => input.afterVerified({ id, userId: 'user-1', purpose: 'WHATSAPP_OTP', user: {} }, {}) };
  const service = new WhatsAppVerificationService(repository, engine);
  assert.deepEqual(await service.confirm(`${id}.123456`, 'corr'), { accepted: true });
  assert.equal(calls.find(([kind]) => kind === 'outbox')[1].eventType, 'WhatsAppVerified');
});
