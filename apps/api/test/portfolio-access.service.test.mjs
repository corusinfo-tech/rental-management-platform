import assert from 'node:assert/strict';
import test from 'node:test';
import { PortfolioAccessService } from '../dist/identity/authorization/portfolio-access.service.js';

function membership(permissionCodes, propertyIds = []) {
  return {
    id: 'membership-1',
    roles: [
      {
        role: {
          permissions: permissionCodes.map((code) => ({ permission: { code, deletedAt: null } })),
        },
      },
    ],
    portfolioAssignments: propertyIds.map((propertyId) => ({ propertyId })),
  };
}

function prisma(overrides = {}) {
  return {
    organizationMembership: {
      findFirst: async () => membership(['property.read'], ['property-a']),
    },
    propertyOwnership: { findMany: async () => [{ propertyId: 'property-owned' }] },
    unit: { findFirst: async () => null },
    lease: { findFirst: async () => null },
    leaseRentSchedule: { findFirst: async () => null },
    invoice: { findFirst: async () => null, findMany: async () => [] },
    payment: { findFirst: async () => null },
    ...overrides,
  };
}

test('scoped membership combines explicit assignments and asset ownership without granting organization-wide access', async () => {
  const service = new PortfolioAccessService(prisma());
  const scope = await service.scope('manager-1', 'organization-1', 'property.read');
  assert.equal(scope.organizationWide, false);
  assert.deepEqual(scope.propertyIds.sort(), ['property-a', 'property-owned']);
  assert.deepEqual(service.propertyWhere(scope), { id: { in: ['property-a', 'property-owned'] } });
});

test('organization-wide scope requires the explicit portfolio permission', async () => {
  const service = new PortfolioAccessService(
    prisma({
      organizationMembership: {
        findFirst: async () => membership(['property.read', 'portfolio.access.all']),
      },
    }),
  );
  const scope = await service.scope('admin-1', 'organization-1', 'property.read');
  assert.equal(scope.organizationWide, true);
  assert.deepEqual(service.propertyWhere(scope), {});
});

test('legacy platform role cannot grant organization portfolio scope', async () => {
  const superAdmin = membership(['property.read', 'portfolio.access.all']);
  superAdmin.roles[0].role.code = 'SUPER_ADMIN';
  const service = new PortfolioAccessService(
    prisma({ organizationMembership: { findFirst: async () => superAdmin } }),
  );
  await assert.rejects(
    () => service.scope('platform-user', 'organization-1', 'property.read'),
    /Required permission is missing/,
  );
});

test('suspended member, outsider, or cross-organization actor is denied before resource lookup', async () => {
  const service = new PortfolioAccessService(
    prisma({ organizationMembership: { findFirst: async () => null } }),
  );
  await assert.rejects(
    () => service.scope('outsider', 'organization-2', 'property.read'),
    /Active organization membership is required/,
  );
});

test('finance permission does not imply property-management permission', async () => {
  const service = new PortfolioAccessService(
    prisma({
      organizationMembership: {
        findFirst: async () =>
          membership(
            ['invoice.read', 'invoice.manage', 'payment.read', 'payment.manage'],
            ['property-a'],
          ),
      },
    }),
  );
  await assert.rejects(
    () => service.scope('finance-1', 'organization-1', 'property.manage'),
    /Required permission is missing/,
  );
});

test('direct property and lease IDs outside the assigned portfolio are denied', async () => {
  const service = new PortfolioAccessService(prisma());
  const scope = await service.scope('manager-1', 'organization-1', 'property.read');
  await assert.rejects(
    () => service.assertProperty(scope, 'property-b'),
    /outside the assigned portfolio/,
  );
  await assert.rejects(
    () => service.assertLease(scope, 'lease-in-property-b'),
    /outside the assigned portfolio/,
  );
});

test('a payment cannot combine invoices from multiple properties', async () => {
  const service = new PortfolioAccessService(
    prisma({
      invoice: {
        findFirst: async () => null,
        findMany: async () => [
          {
            id: 'invoice-a',
            lease: { unit: { floor: { building: { propertyId: 'property-a' } } } },
          },
          {
            id: 'invoice-b',
            lease: { unit: { floor: { building: { propertyId: 'property-b' } } } },
          },
        ],
      },
    }),
  );
  const scope = {
    membershipId: 'membership-1',
    organizationId: 'organization-1',
    organizationWide: true,
    propertyIds: [],
    permissionCodes: ['payment.manage', 'portfolio.access.all'],
  };
  await assert.rejects(
    () => service.assertInvoices(scope, ['invoice-a', 'invoice-b']),
    /one property/,
  );
});

test('ambiguous historical payment is invisible to portfolio-scoped finance users', async () => {
  const service = new PortfolioAccessService(prisma({ payment: { findFirst: async () => null } }));
  const scope = {
    membershipId: 'membership-1',
    organizationId: 'organization-1',
    organizationWide: false,
    propertyIds: ['property-a'],
    permissionCodes: ['payment.read'],
  };
  await assert.rejects(
    () => service.assertPayment(scope, 'payment-with-null-property'),
    /outside the assigned portfolio/,
  );
});
