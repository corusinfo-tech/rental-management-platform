import assert from 'node:assert/strict';
import test from 'node:test';
import * as argon2 from 'argon2';
import { IdentityService } from '../dist/identity/services/identity.service.js';

const config = { getOrThrow: () => ({ accessSecret: 'a'.repeat(32), refreshSecret: 'b'.repeat(32), issuer: 'issuer', audience: 'audience', algorithm: 'HS256', accessTtlSeconds: 900, refreshTtlSeconds: 2_592_000 }) };
const jwt = { signAsync: async (claims) => `token-${claims.sub}-${claims.sid}`, verifyAsync: async () => ({ sub: 'user-1', sid: 'session-1' }) };

test('login creates a session with only an Argon2 refresh hash', async () => {
  const sessions = []; const audits = [];
  const repository = {
    findUserByIdentifier: async () => ({ id: 'user-1', passwordHash: await argon2.hash('correct-password'), status: 'ACTIVE' }),
    findDefaultMembershipForUser: async () => ({ id: 'membership-1', organizationId: 'org-1' }),
    createSession: async (input) => sessions.push(input), createAuditEvent: async (input) => audits.push(input),
  };
  const service = new IdentityService(repository, jwt, config);
  const result = await service.login({ identifier: 'USER@EXAMPLE.COM', password: 'correct-password', deviceId: 'device-1', ipAddress: '127.0.0.1' });
  assert.match(result.accessToken, /^token-user-1-/);
  assert.equal(sessions.length, 1);
  assert.match(sessions[0].refreshTokenHash, /^\$argon2/);
  assert.equal(sessions[0].refreshTokenHash.includes(result.refreshToken), false);
  assert.equal(audits[0].action, 'identity.login.succeeded');
});

test('unknown, pending, suspended, archived, locked, and wrong-password logins have one generic failure', async () => {
  for (const user of [null, { id: 'u', status: 'PENDING_EMAIL', passwordHash: await argon2.hash('x') }, { id: 'u', status: 'SUSPENDED', passwordHash: await argon2.hash('x') }, { id: 'u', status: 'ARCHIVED', passwordHash: await argon2.hash('x') }, { id: 'u', status: 'LOCKED', passwordHash: await argon2.hash('x') }, { id: 'u', status: 'ACTIVE', passwordHash: await argon2.hash('other') }]) {
    const repository = { findUserByIdentifier: async () => user, createAuditEvent: async () => undefined };
    const service = new IdentityService(repository, jwt, config);
    await assert.rejects(() => service.login({ identifier: 'x@example.com', password: 'x' }), { message: 'Invalid credentials' });
  }
});
