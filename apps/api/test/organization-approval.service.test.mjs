import assert from 'node:assert/strict';
import test from 'node:test';
import { OrganizationApprovalService } from '../dist/organization/approval.service.js';

const pending = { id: 'approval-1', organizationId: 'organization-1', status: 'PENDING', version: 1, organization: { status: 'PENDING', name: 'Landlord Org' } };

test('super administrator approval invokes lifecycle activation and emits approval audit/outbox records', async () => {
  const calls = [];
  const repository = {
    transaction: async (callback) => callback({}), platformSuperAdmin: async () => ({ id: 'super' }), find: async () => pending,
    approve: async () => ({ count: 1 }), audit: async (...args) => calls.push(['audit', args]), outbox: async (...args) => calls.push(['outbox', args]),
  };
  const lifecycle = { activateAfterApproval: async (...args) => calls.push(['activate', args]) };
  const service = new OrganizationApprovalService(repository, lifecycle);
  assert.deepEqual(await service.approve('super-user', 'organization-1', { expectedVersion: 1 }), { accepted: true });
  assert.equal(calls.find(([kind]) => kind === 'activate')[1][0], 'super-user');
  assert.equal(calls.find(([kind]) => kind === 'outbox')[1][0], 'OrganizationApproved');
});

test('rejection retains the organization lifecycle state and records the review reason', async () => {
  const calls = [];
  const repository = {
    transaction: async (callback) => callback({}), platformSuperAdmin: async () => ({ id: 'super' }), find: async () => pending,
    reject: async (...args) => { calls.push(['reject', args]); return { count: 1 }; }, audit: async (...args) => calls.push(['audit', args]), outbox: async (...args) => calls.push(['outbox', args]),
  };
  const service = new OrganizationApprovalService(repository, { activateAfterApproval: async () => assert.fail('lifecycle activation must not occur on rejection') });
  assert.deepEqual(await service.reject('super-user', 'organization-1', { reason: 'Missing documentation', expectedVersion: 1 }), { accepted: true });
  assert.equal(calls.find(([kind]) => kind === 'reject')[1][2], 'Missing documentation');
  assert.equal(calls.find(([kind]) => kind === 'outbox')[1][0], 'OrganizationRejected');
});

test('only a rejected pending organization may be reopened', async () => {
  const calls = [];
  const repository = {
    transaction: async (callback) => callback({}), platformSuperAdmin: async () => ({ id: 'super' }),
    find: async () => ({ ...pending, status: 'REJECTED' }), reopen: async () => ({ count: 1 }), audit: async (...args) => calls.push(['audit', args]),
  };
  const service = new OrganizationApprovalService(repository, {});
  assert.deepEqual(await service.reopen('super-user', 'organization-1', { reason: 'Resubmitted', expectedVersion: 1 }), { accepted: true });
  assert.equal(calls.find(([kind]) => kind === 'audit')[1][1], 'organization.review.reopened');
});
