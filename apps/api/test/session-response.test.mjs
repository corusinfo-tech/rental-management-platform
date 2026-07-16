import assert from 'node:assert/strict';
import test from 'node:test';
import { IdentityRepository } from '../dist/identity/repositories/identity.repository.js';

test('active session query uses a response allow-list and never selects refresh hashes', async () => {
  let query;
  const repository = new IdentityRepository({
    session: {
      findMany: async (input) => { query = input; return []; },
    },
  });

  await repository.listActiveSessions('user-1');
  assert.equal(query.select.refreshTokenHash, undefined);
  assert.equal(query.select.familyId, undefined);
  assert.equal(query.select.revokedReason, undefined);
  assert.equal(query.select.organizationId, true);
  assert.equal(query.select.membershipId, true);
});
