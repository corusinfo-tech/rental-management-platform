import assert from 'node:assert/strict';
import test from 'node:test';
import { PortfolioAssignmentService } from '../dist/organization/portfolio-assignment.service.js';

function access(scope) {
  return { scope: async () => scope };
}

test('organization-wide administrator can replace a member portfolio with same-organization properties', async () => {
  const calls = [];
  const transaction = {
    propertyPortfolioAssignment: {
      updateMany: async (input) => calls.push(['revoke', input]),
      upsert: async (input) => calls.push(['upsert', input]),
    },
  };
  const repository = {
    transaction: async (callback) => callback(transaction),
    targetMembership: async () => ({ id: 'membership-2' }),
    properties: async () => [{ id: 'property-a' }, { id: 'property-b' }],
    audit: async (...args) => calls.push(['audit', args]),
  };
  const service = new PortfolioAssignmentService(
    repository,
    access({
      organizationWide: true,
      permissionCodes: ['property.manage', 'portfolio.access.all', 'organization.members.manage'],
    }),
  );
  const result = await service.replace('admin-1', 'organization-1', 'membership-2', {
    propertyIds: ['property-a', 'property-b'],
  });
  assert.deepEqual(result.propertyIds, ['property-a', 'property-b']);
  assert.equal(calls.filter(([kind]) => kind === 'upsert').length, 2);
  assert.ok(calls.some(([kind]) => kind === 'audit'));
});

test('scoped manager cannot grant portfolio assignments', async () => {
  const service = new PortfolioAssignmentService(
    {},
    access({
      organizationWide: false,
      permissionCodes: ['property.manage', 'organization.members.manage'],
    }),
  );
  await assert.rejects(
    () =>
      service.replace('manager-1', 'organization-1', 'membership-2', {
        propertyIds: ['property-a'],
      }),
    /Organization-wide portfolio assignment permission is required/,
  );
});

test('cross-organization property IDs are rejected before assignment writes', async () => {
  let wrote = false;
  const repository = {
    transaction: async (callback) =>
      callback({
        propertyPortfolioAssignment: {
          updateMany: async () => {
            wrote = true;
          },
          upsert: async () => {
            wrote = true;
          },
        },
      }),
    targetMembership: async () => ({ id: 'membership-2' }),
    properties: async () => [{ id: 'property-a' }],
  };
  const service = new PortfolioAssignmentService(
    repository,
    access({
      organizationWide: true,
      permissionCodes: ['property.manage', 'portfolio.access.all', 'organization.members.manage'],
    }),
  );
  await assert.rejects(
    () =>
      service.replace('admin-1', 'organization-1', 'membership-2', {
        propertyIds: ['property-a', 'property-from-organization-2'],
      }),
    /outside the organization/,
  );
  assert.equal(wrote, false);
});
