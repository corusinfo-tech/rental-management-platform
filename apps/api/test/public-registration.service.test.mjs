import assert from 'node:assert/strict';
import test from 'node:test';
import { PublicRegistrationService } from '../dist/identity/registration/public-registration.service.js';

function createRepository() {
  const calls = [];
  return {
    calls,
    withTransaction: async (callback) => callback({}),
    findUserByEmail: async () => null,
    findUserByMobile: async () => null,
    findSystemRoleByCode: async (code) => ({ id: `${code}-role` }),
    createUser: async (input) => {
      calls.push(['user', input]);
      return { id: 'user-1', personId: 'person-1', status: input.status };
    },
    createRegistrationOrganization: async (input) => {
      calls.push(['organization', input]);
      return { id: 'organization-1' };
    },
    createActiveMembership: async (input) => {
      calls.push(['membership', input]);
      return { id: 'membership-1' };
    },
    assignRoleToMembership: async (input) => calls.push(['role', input]),
    createEmailVerification: async (input) => { calls.push(['verification', input]); return { id: '11111111-1111-4111-8111-111111111111' }; },
    createVerificationDeliveryEnvelope: async (input) => calls.push(['envelope', input]),
    createAuditEvent: async (input) => calls.push(['audit', input]),
    createOutboxEvent: async (input) => calls.push(['outbox', input]),
  };
}

test('tenant registration creates no organization or membership and writes an outbox', async () => {
  const repository = createRepository();
  const service = new PublicRegistrationService(repository, verificationEngine());

  const result = await service.register({
    firstName: ' Ada ',
    lastName: ' Lovelace ',
    email: ' ADA@EXAMPLE.COM ',
    password: 'correct-horse-battery-staple',
    countryCode: '+1',
    mobile: '(415) 555-0100',
    registrationType: 'TENANT',
  });

  assert.deepEqual(result, { accepted: true });
  assert.deepEqual(repository.calls.find(([type]) => type === 'user')[1].mobile, '+14155550100');
  assert.equal(repository.calls.some(([type]) => type === 'organization'), false);
  assert.equal(repository.calls.some(([type]) => type === 'membership'), false);
  assert.equal(repository.calls.some(([type]) => type === 'role'), false);
  assert.deepEqual(repository.calls.find(([type]) => type === 'audit')[1], {
    subjectUserId: 'user-1',
    action: 'identity.registration.submitted',
    metadata: { registrationType: 'TENANT', organizationId: null },
  });
  assert.equal(repository.calls.filter(([type]) => type === 'outbox').length, 1);
});

test('landlord registration creates one owner organization and assigns the landlord role', async () => {
  const repository = createRepository();
  const service = new PublicRegistrationService(repository, verificationEngine());

  const result = await service.register({
    firstName: 'Grace', lastName: 'Hopper', email: 'grace@example.com', password: 'correct-horse-battery-staple',
    countryCode: '+91', mobile: '9876543210', registrationType: 'LANDLORD',
  });

  assert.deepEqual(result, { accepted: true });
  assert.equal(repository.calls.filter(([type]) => type === 'organization').length, 1);
  assert.deepEqual(repository.calls.find(([type]) => type === 'membership')[1], {
    organizationId: 'organization-1', personId: 'person-1', isOwner: true,
  });
  assert.deepEqual(repository.calls.find(([type]) => type === 'role')[1], { membershipId: 'membership-1', roleId: 'LANDLORD-role' });
});

test('duplicate identifiers receive the same idempotent accepted response without new records', async () => {
  const repository = createRepository();
  repository.findUserByEmail = async () => ({ id: 'existing-user' });
  const service = new PublicRegistrationService(repository, verificationEngine());

  const result = await service.register({
    firstName: 'Existing', lastName: 'Person', email: 'existing@example.com', password: 'correct-horse-battery-staple',
    countryCode: '+1', mobile: '4155550102', registrationType: 'TENANT',
  });

  assert.deepEqual(result, { accepted: true });
  assert.equal(repository.calls.length, 0);
});

function verificationEngine() {
  return {
    createVerification: async () => ({ id: '11111111-1111-4111-8111-111111111111' }),
  };
}
