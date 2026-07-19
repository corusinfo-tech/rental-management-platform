import assert from 'node:assert/strict';
import test from 'node:test';
import { OrganizationSettingsService } from '../dist/organization/settings.service.js';

const base = {
  id: 'settings-1', organizationId: 'organization-1', timezone: 'UTC', currency: 'INR', dateFormat: 'DD/MM/YYYY', timeFormat: '24H', language: 'en', country: 'IN', gstEnabled: false, gstNumber: null, invoicePrefix: 'INV', invoiceSequence: 1, brandName: null, logoUrl: null, primaryColor: null, secondaryColor: null, notificationEmail: null, supportEmail: null, maintenanceEmail: null, createdAt: new Date(), updatedAt: new Date(), version: 1,
};

test('authorized settings reads return the explicit settings allow-list', async () => {
  const repository = { transaction: async (callback) => callback({}), settingsAccess: async () => ({ id: 'owner-membership' }), findOrCreateDefaults: async () => base };
  const service = new OrganizationSettingsService(repository);
  const settings = await service.get('owner-user', 'organization-1');
  assert.equal(settings.organizationId, 'organization-1');
  assert.equal(settings.invoiceSequence, 1);
});

test('settings read initializes missing defaults instead of returning a not-found error', async () => {
  let initialized = false;
  const repository = {
    transaction: async (callback) => callback({}),
    settingsAccess: async (_userId, _organizationId, permissionCode) => permissionCode === 'organization.settings.read' ? ({ id: 'admin-membership' }) : null,
    findOrCreateDefaults: async () => { initialized = true; return base; },
  };
  const result = await new OrganizationSettingsService(repository).get('admin-user', 'organization-1');
  assert.equal(initialized, true);
  assert.equal(result.organizationId, 'organization-1');
});

test('brand and invoice settings update creates settings, brand, and invoice audit records plus the required outbox events', async () => {
  const calls = [];
  let reads = 0;
  const repository = {
    transaction: async (callback) => callback({}), settingsAccess: async () => ({ id: 'admin-membership' }), findOrCreateDefaults: async () => reads++ === 0 ? base : ({ ...base, notificationEmail: 'ops@example.com', brandName: 'NoAgent4U', invoicePrefix: 'NAU', invoiceSequence: 4, version: 2 }), findForUpdate: async () => ({ ...base, notificationEmail: 'ops@example.com', brandName: 'NoAgent4U', invoicePrefix: 'NAU', invoiceSequence: 4, version: 2 }),
    update: async () => ({ count: 1 }),
    audit: async (...args) => calls.push(['audit', args]), outbox: async (...args) => calls.push(['outbox', args]),
  };
  const service = new OrganizationSettingsService(repository);
  const result = await service.update('admin-user', 'organization-1', { expectedVersion: 1, brandName: 'NoAgent4U', invoicePrefix: 'NAU', invoiceSequence: 4, notificationEmail: 'OPS@EXAMPLE.COM' });
  assert.equal(result.notificationEmail, 'ops@example.com');
  assert.ok(calls.some(([kind, args]) => kind === 'audit' && args[1] === 'organization.settings.updated'));
  assert.ok(calls.some(([kind, args]) => kind === 'audit' && args[1] === 'organization.brand.updated'));
  assert.ok(calls.some(([kind, args]) => kind === 'audit' && args[1] === 'organization.invoice_settings.updated'));
  assert.ok(calls.some(([kind, args]) => kind === 'outbox' && args[0] === 'OrganizationSettingsUpdated'));
  assert.ok(calls.some(([kind, args]) => kind === 'outbox' && args[0] === 'BrandUpdated'));
});
