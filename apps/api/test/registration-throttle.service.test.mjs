import assert from 'node:assert/strict';
import test from 'node:test';
import { RegistrationThrottleService } from '../dist/identity/registration/registration-throttle.service.js';

function throttleHarness(count) {
  const events = [];
  const service = Object.create(RegistrationThrottleService.prototype);
  service.config = {
    getOrThrow: (key) => key === 'registration'
      ? { ipLimit: 2, identifierLimit: 2, windowSeconds: 60, throttleHashSecret: 'x'.repeat(32) }
      : undefined,
  };
  service.redis = { eval: async () => [count, 60] };
  service.prisma = { identityAuditEvent: { create: async ({ data }) => events.push(data) } };
  return { service, events };
}

const dto = {
  firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com', password: 'correct-horse-battery-staple',
  countryCode: '+1', mobile: '4155550100', registrationType: 'TENANT',
};
const request = { ip: '203.0.113.10', socket: { remoteAddress: '127.0.0.1' } };

test('registration throttle permits requests within both distributed limits', async () => {
  const { service, events } = throttleHarness(2);
  await service.enforce(dto, request);
  assert.equal(events.length, 0);
});

test('registration throttle records privacy-safe audit data and returns a clean 429', async () => {
  const { service, events } = throttleHarness(3);
  await assert.rejects(() => service.enforce(dto, request), { status: 429 });
  assert.equal(events.length, 1);
  assert.equal(events[0].metadata.ipFingerprint.includes('203.0.113.10'), false);
  assert.equal(events[0].metadata.identifierFingerprint.includes('ada@example.com'), false);
});
