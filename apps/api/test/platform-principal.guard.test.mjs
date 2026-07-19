import assert from 'node:assert/strict';
import test from 'node:test';
import { CurrentMembershipResolver } from '../dist/identity/authorization/current-membership.resolver.js';
import { PlatformPrincipalGuard } from '../dist/identity/authorization/platform-principal.guard.js';

function context(userId = 'user-1') {
  return {
    switchToHttp: () => ({ getRequest: () => ({ identity: { sub: userId, sid: 'session-1' } }) }),
  };
}

test('platform guard authorizes the independent platform principal', async () => {
  const guard = new PlatformPrincipalGuard({
    findActivePlatformPrincipal: async () => ({ id: 'platform-principal-1' }),
  });
  assert.equal(await guard.canActivate(context()), true);
});

test('organization membership or legacy role alone cannot satisfy platform authorization', async () => {
  const guard = new PlatformPrincipalGuard({ findActivePlatformPrincipal: async () => null });
  await assert.rejects(
    () => guard.canActivate(context()),
    /Platform super administrator access is required/,
  );
});

test('platform guard requires an authenticated user before principal lookup', async () => {
  const guard = new PlatformPrincipalGuard({
    findActivePlatformPrincipal: async () => {
      throw new Error('must not be called');
    },
  });
  const anonymous = { switchToHttp: () => ({ getRequest: () => ({}) }) };
  await assert.rejects(() => guard.canActivate(anonymous), /Access token is required/);
});

test('legacy platform role contributes no organization-workspace permissions', async () => {
  const resolver = new CurrentMembershipResolver(
    {
      findActiveMembershipForUser: async () => ({
        id: 'membership-1',
        organizationId: 'organization-1',
        roles: [
          {
            role: {
              code: 'SUPER_ADMIN',
              permissions: [{ permission: { code: 'organization.settings.manage' } }],
            },
          },
          {
            role: {
              code: 'ADMIN',
              permissions: [{ permission: { code: 'organization.settings.read' } }],
            },
          },
        ],
      }),
    },
    { resolve: () => 'organization-1' },
  );
  const request = { identity: { sub: 'platform-user', sid: 'session-1' } };
  const resolved = await resolver.resolve(request);
  assert.deepEqual(resolved.permissionCodes, ['organization.settings.read']);
});
