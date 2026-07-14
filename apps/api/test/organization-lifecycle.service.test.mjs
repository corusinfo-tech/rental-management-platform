import assert from 'node:assert/strict';
import test from 'node:test';
import { OrganizationLifecycleService } from '../dist/organization/lifecycle.service.js';

function repository(status) {
  const calls = [];
  return {
    calls,
    transaction: async (callback) => callback({}), find: async () => ({ id: 'organization-1', status }),
    ownerMembership: async () => ({ id: 'owner-membership' }), platformSuperAdmin: async () => null,
    transition: async (...args) => { calls.push(['transition', args]); return { count: 1 }; },
    audit: async (...args) => calls.push(['audit', args]), outbox: async (...args) => calls.push(['outbox', args]),
  };
}

test('organization owners cannot activate PENDING organizations outside approval', async () => {
  const repo = repository('PENDING');
  const service = new OrganizationLifecycleService(repo);
  await assert.rejects(() => service.activate('owner-user', 'organization-1'));
  assert.equal(repo.calls.some(([kind]) => kind === 'transition'), false);
});

test('invalid PENDING to SUSPENDED transition is rejected before persistence', async () => {
  const repo = repository('PENDING');
  const service = new OrganizationLifecycleService(repo);
  await assert.rejects(() => service.suspend('owner-user', 'organization-1'));
  assert.equal(repo.calls.some(([kind]) => kind === 'transition'), false);
});

test('global platform super administrator may perform an allowed lifecycle transition', async () => {
  const repo = repository('SUSPENDED');
  repo.ownerMembership = async () => null;
  repo.platformSuperAdmin = async () => ({ id: 'super-admin-membership' });
  const service = new OrganizationLifecycleService(repo);
  assert.deepEqual(await service.restore('super-admin-user', 'organization-1'), { accepted: true, status: 'ACTIVE' });
  assert.equal(repo.calls.find(([kind]) => kind === 'outbox')[1][0], 'OrganizationRestored');
});
