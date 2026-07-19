import assert from 'node:assert/strict';
import test from 'node:test';
import { TenantAccessService } from '../dist/identity/authorization/tenant-access.service.js';

function prisma(overrides = {}) {
  return {
    organizationMembership: { findFirst: async () => ({ personId: 'person-1' }) },
    leaseParty: { findMany: async () => [{ leaseId: 'lease-1' }] },
    invoice: { findFirst: async () => null },
    payment: { findFirst: async () => null },
    leaseDocument: { findFirst: async () => null },
    ...overrides,
  };
}

test('tenant scope is derived from verified Person-to-LeaseParty links', async () => {
  let partyWhere;
  const service = new TenantAccessService(
    prisma({
      leaseParty: {
        findMany: async ({ where }) => {
          partyWhere = where;
          return [{ leaseId: 'lease-1' }];
        },
      },
    }),
  );
  const scope = await service.scope('user-1', 'organization-1');
  assert.deepEqual(scope.leaseIds, ['lease-1']);
  assert.equal(partyWhere.personId, 'person-1');
  assert.equal(partyWhere.linkedAt.not, null);
  assert.equal(partyWhere.linkVerificationId.not, null);
  assert.equal('email' in partyWhere, false);
  assert.equal('mobile' in partyWhere, false);
});

test('tenant cannot access an unlinked lease by guessed identifier', async () => {
  const service = new TenantAccessService(prisma());
  const scope = await service.scope('user-1', 'organization-1');
  await assert.rejects(() => service.assertLease(scope, 'lease-2'), /not linked/);
});

test('tenant invoice, payment, and document checks deny records outside linked leases', async () => {
  const service = new TenantAccessService(prisma());
  const scope = await service.scope('user-1', 'organization-1');
  await assert.rejects(() => service.assertInvoice(scope, 'invoice-2'), /not linked/);
  await assert.rejects(() => service.assertPayment(scope, 'payment-2'), /not linked/);
  await assert.rejects(() => service.assertDocument(scope, 'document-2'), /not linked/);
});

test('tenant payment check requires every allocation to belong to a linked lease', async () => {
  let paymentWhere;
  const service = new TenantAccessService(
    prisma({
      payment: {
        findFirst: async ({ where }) => {
          paymentWhere = where;
          return null;
        },
      },
    }),
  );
  const scope = await service.scope('user-1', 'organization-1');
  await assert.rejects(() => service.assertPayment(scope, 'shared-payment'), /not linked/);
  assert.deepEqual(paymentWhere.allocations.some.invoice.leaseId.in, ['lease-1']);
  assert.deepEqual(paymentWhere.allocations.every.invoice.leaseId.in, ['lease-1']);
});
