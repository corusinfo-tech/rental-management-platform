import assert from 'node:assert/strict';
import test from 'node:test';
import { LeaseService } from '../dist/rental/lease.service.js';

const access = { scope: async () => ({ organizationWide: true, propertyIds: [] }), assertUnit: async () => 'property-1', assertLease: async () => 'property-1', leaseWhere: () => ({}) };
const service = (repo) => new LeaseService(repo, access);

function repository(overrides = {}) {
  const calls = [];
  const lease = { id: 'lease-1', organizationId: 'organization-1', unitId: 'unit-1', status: 'DRAFT', startsAt: new Date('2026-08-01'), endsAt: new Date('2027-07-31') };
  return {
    calls,
    transaction: async (callback) => callback({
      lease: { create: async ({ data }) => ({ ...lease, ...data, terms: data.terms?.create, parties: data.parties?.create ?? [] }), update: async ({ data }) => ({ ...lease, ...data }) },
      leaseParty: { create: async ({ data }) => ({ id: 'party-1', ...data }) },
      leaseDocument: { create: async ({ data }) => ({ id: 'document-1', ...data }) },
    }),
    managerMembership: async () => ({ id: 'membership-1' }),
    findActiveUnit: async () => ({ id: 'unit-1' }),
    findLease: async () => lease,
    activeLeaseForUnit: async () => null,
    audit: async (...args) => calls.push(args),
    ...overrides,
  };
}

const createInput = {
  unitId: 'unit-1', code: 'lease-2026-1', startsAt: '2026-08-01T00:00:00.000Z', endsAt: '2027-07-31T00:00:00.000Z',
  terms: { rentAmount: 25000, securityDeposit: 50000, currency: 'inr' },
  parties: [{ role: 'TENANT', name: 'Tenant One', mobile: '+919999999999' }],
};

test('creates a lease with normalized code, terms, and an audit record', async () => {
  const repo = repository();
  const result = await service(repo).create('actor-1', 'organization-1', createInput);
  assert.equal(result.code, 'LEASE-2026-1');
  assert.equal(result.terms.currency, 'INR');
  assert.equal(repo.calls[0][3], 'lease.created');
});

test('rejects an invalid lease date range before persistence', async () => {
  const repo = repository();
  await assert.rejects(() => service(repo).create('actor-1', 'organization-1', { ...createInput, endsAt: createInput.startsAt }));
  assert.equal(repo.calls.length, 0);
});

test('does not activate a lease when the unit has another active lease', async () => {
  const repo = repository({ activeLeaseForUnit: async () => ({ id: 'lease-existing' }) });
  await assert.rejects(() => service(repo).update('actor-1', 'organization-1', 'lease-1', { status: 'ACTIVE' }));
  assert.equal(repo.calls.length, 0);
});

test('archives leases through a soft delete and writes an audit record', async () => {
  const repo = repository();
  const result = await service(repo).archive('actor-1', 'organization-1', 'lease-1');
  assert.equal(result.status, 'ARCHIVED');
  assert.ok(result.deletedAt instanceof Date);
  assert.equal(repo.calls[0][3], 'lease.archived');
});
