import assert from 'node:assert/strict';
import test from 'node:test';
import { OrganizationComplianceService } from '../dist/organization/compliance.service.js';

const base = { id: 'compliance-1', organizationId: 'organization-1', complianceStatus: 'UNDER_REVIEW', kycStatus: 'PENDING', gstVerificationStatus: 'PENDING', lastReviewAt: null, nextReviewAt: null, riskLevel: 'LOW', notes: null, createdAt: new Date(), updatedAt: new Date(), version: 1 };

test('super administrator reads the separate compliance aggregate', async () => {
  const repository = { transaction: async (callback) => callback({}), platformSuperAdmin: async () => ({ id: 'super' }), find: async () => base };
  const service = new OrganizationComplianceService(repository);
  assert.equal((await service.get('super-user', 'organization-1')).complianceStatus, 'UNDER_REVIEW');
});

test('risk and scheduled review changes write compliance, risk, and review audit records with required outbox events', async () => {
  const calls = [];
  const repository = {
    transaction: async (callback) => callback({}), platformSuperAdmin: async () => ({ id: 'super' }), find: async () => base,
    update: async () => ({ count: 1 }), audit: async (...args) => calls.push(['audit', args]), outbox: async (...args) => calls.push(['outbox', args]),
  };
  const service = new OrganizationComplianceService(repository);
  await service.update('super-user', 'organization-1', { expectedVersion: 1, complianceStatus: 'COMPLIANT', riskLevel: 'HIGH', nextReviewAt: '2027-01-01T00:00:00.000Z' });
  assert.ok(calls.some(([kind, args]) => kind === 'audit' && args[1] === 'organization.compliance.updated'));
  assert.ok(calls.some(([kind, args]) => kind === 'audit' && args[1] === 'organization.risk.changed'));
  assert.ok(calls.some(([kind, args]) => kind === 'audit' && args[1] === 'organization.review.scheduled'));
  assert.ok(calls.some(([kind, args]) => kind === 'outbox' && args[0] === 'OrganizationComplianceUpdated'));
  assert.ok(calls.some(([kind, args]) => kind === 'outbox' && args[0] === 'OrganizationRiskChanged'));
});
