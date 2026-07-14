import assert from 'node:assert/strict';
import test from 'node:test';
import { OrganizationRoleService } from '../dist/organization/role.service.js';

test('owner creates a custom organization role with a RoleCreated outbox event', async () => {
  const calls = [];
  const repository = {
    transaction: async (callback) => callback({}), ownerMembership: async () => ({ id: 'owner' }), findCustomByName: async () => null,
    clearDefault: async () => ({ count: 0 }), create: async (input) => ({ id: 'role-1', ...input, description: input.description ?? null, isSystem: false, createdAt: new Date(), updatedAt: new Date() }),
    audit: async (...args) => calls.push(['audit', args]), outbox: async (...args) => calls.push(['outbox', args]),
  };
  const service = new OrganizationRoleService(repository);
  const role = await service.create('owner-user', 'organization-1', { name: 'Leasing Manager', description: 'Manages leasing', isDefault: false });
  assert.equal(role.isSystem, false);
  assert.equal(role.name, 'Leasing Manager');
  assert.equal(calls.find(([kind]) => kind === 'outbox')[1][0], 'RoleCreated');
});

test('permission replacement records grants and revocations and publishes only granted IDs', async () => {
  const calls = [];
  const repository = {
    transaction: async (callback) => callback({}), ownerMembership: async () => ({ id: 'owner' }),
    findCustom: async () => ({ id: 'role-1', name: 'Custom', permissions: [] }),
    findPermissions: async (ids) => ids.map((id) => ({ id })), rolePermissionIds: async () => [{ permissionId: 'old-permission' }],
    grantPermissions: async (...args) => calls.push(['grant', args]), revokePermissions: async (...args) => calls.push(['revoke', args]),
    audit: async (...args) => calls.push(['audit', args]), outbox: async (...args) => calls.push(['outbox', args]),
  };
  const service = new OrganizationRoleService(repository);
  await service.setPermissions('owner-user', 'organization-1', 'role-1', { permissionIds: ['new-permission'], replace: true });
  assert.deepEqual(calls.find(([kind]) => kind === 'grant')[1][1], ['new-permission']);
  assert.deepEqual(calls.find(([kind]) => kind === 'revoke')[1][1], ['old-permission']);
  assert.deepEqual(calls.find(([kind]) => kind === 'outbox')[1][4].permissionIds, ['new-permission']);
});

test('role assignment is scoped to the requested organization and produces a RoleAssigned outbox event', async () => {
  const calls = [];
  const repository = {
    transaction: async (callback) => callback({}), ownerMembership: async () => ({ id: 'owner' }),
    findMembership: async () => ({ id: 'membership-1' }), findAssignable: async () => ({ id: 'role-1' }),
    assign: async (...args) => calls.push(['assign', args]), audit: async (...args) => calls.push(['audit', args]), outbox: async (...args) => calls.push(['outbox', args]),
  };
  const service = new OrganizationRoleService(repository);
  await service.assign('owner-user', 'organization-1', 'membership-1', { roleId: 'role-1' });
  assert.equal(calls.find(([kind]) => kind === 'assign')[1][2], 'owner-user');
  assert.equal(calls.find(([kind]) => kind === 'outbox')[1][0], 'RoleAssigned');
});
