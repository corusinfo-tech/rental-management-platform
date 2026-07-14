import assert from 'node:assert/strict';
import test from 'node:test';
import { InvitationService } from '../dist/organization/invitation.service.js';

const invitationId = '11111111-1111-4111-8111-111111111111';
const verificationId = '22222222-2222-4222-8222-222222222222';

test('an owner invitation uses the shared generic verification subject and creates ID-only outbox records', async () => {
  const calls = [];
  const repository = {
    transaction: async (callback) => callback({}), ownerMembership: async () => ({ id: 'owner-membership' }),
    findInvitableRole: async () => ({ id: 'role-1' }), expirePending: async () => ({ count: 0 }), findPending: async () => null,
    create: async (input) => ({ ...input, status: 'PENDING', acceptedAt: null, declinedAt: null, revokedAt: null, createdAt: new Date(), updatedAt: new Date(), version: 1 }),
    audit: async (...args) => calls.push(['audit', args]), outbox: async (...args) => calls.push(['outbox', args]),
  };
  const engine = { createVerification: async (input) => {
    calls.push(['verification', input]);
    return { id: input.verificationId, expiresAt: new Date(Date.now() + 60_000) };
  } };
  const service = new InvitationService(repository, engine);
  const response = await service.invite('owner-user', 'org-1', { email: 'INVITEE@EXAMPLE.COM', roleId: 'role-1' }, 'corr-1');
  assert.equal(response.email, 'invitee@example.com');
  const verification = calls.find(([kind]) => kind === 'verification')[1];
  assert.equal(verification.subjectType, 'INVITATION');
  assert.equal(verification.purpose, 'INVITATION');
  assert.equal(verification.userId, undefined);
  assert.equal(calls.find(([kind]) => kind === 'outbox')[1][0], 'InvitationCreated');
});

test('existing-user acceptance creates one active membership and assigns the invitation role through the verification callback', async () => {
  const calls = [];
  const invitation = { id: invitationId, organizationId: 'org-1', verificationId, email: 'invitee@example.com', roleId: 'role-1' };
  const repository = {
    findByVerificationId: async () => ({ ...invitation, version: 1 }), accept: async () => ({ count: 1 }),
    findActiveUserByEmail: async () => ({ id: 'user-1', personId: 'person-1' }), findMembership: async () => null,
    createMembership: async () => ({ id: 'membership-1' }), assignRole: async (...args) => calls.push(['role', args]),
    audit: async (...args) => calls.push(['audit', args]), outbox: async (...args) => calls.push(['outbox', args]), expireIfNeeded: async () => ({ count: 0 }),
  };
  const engine = { verify: async (input) => {
    const record = { id: verificationId, userId: null, subjectType: 'INVITATION', subjectReferenceId: invitationId, purpose: 'INVITATION', user: null };
    await input.afterVerified(record, {});
    return record;
  } };
  const service = new InvitationService(repository, engine);
  assert.deepEqual(await service.accept(verificationId, `${verificationId}.${'a'.repeat(43)}`, 1, 'corr-1'), { accepted: true });
  assert.equal(calls.find(([kind]) => kind === 'role')[1][0], 'membership-1');
  assert.ok(calls.some(([kind, args]) => kind === 'outbox' && args[0] === 'MembershipCreated'));
  assert.ok(calls.some(([kind, args]) => kind === 'outbox' && args[0] === 'InvitationAccepted'));
});
