import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test, { after, before, beforeEach } from 'node:test';
import { PrismaClient } from '@prisma/client';
import { testEnvironment } from './config/environment.mjs';

const databaseUrl = testEnvironment.databaseUrl;
const shouldRun = Boolean(databaseUrl);
const prisma = shouldRun ? new PrismaClient({ datasources: { db: { url: databaseUrl } } }) : undefined;
const argonHash = '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$hIgXfIyfDEUXaEUa0+Qf2SZpB8YIH4SFi2yZ0ElAFzs';

function timestamp() {
  return new Date();
}

async function createUser(email, mobile = null) {
  const person = await prisma.person.create({ data: { firstName: 'Identity', lastName: 'Test' } });
  return prisma.user.create({
    data: { personId: person.id, email, mobile, passwordHash: argonHash },
  });
}

test('Identity database integration tests require IDENTITY_TEST_DATABASE_URL', { skip: !shouldRun }, () => {
  assert.ok(!databaseUrl);
});

if (shouldRun) {
  before(() => {
    execFileSync(
      'node_modules/.bin/prisma',
      ['migrate', 'deploy', '--schema', 'prisma/schemas'],
      { cwd: new URL('..', import.meta.url), env: { ...testEnvironment.values, DATABASE_URL: databaseUrl }, stdio: 'inherit' },
    );
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "OutboxEvent", "IdentityAuditEvent", "MembershipRole", "RolePermission", "Verification", "Session", "OrganizationMembership", "Role", "Permission", "User", "Person", "Organization" RESTART IDENTITY CASCADE',
    );
  });

  after(async () => {
    await prisma.$disconnect();
  });

  test('the migration applies and exposes the required indexes and constraints', async () => {
    const indexes = await prisma.$queryRaw`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public' AND tablename IN ('User', 'OrganizationMembership', 'Session', 'Verification')
    `;
    const names = indexes.map((index) => index.indexname);
    assert.ok(names.includes('User_email_key'));
    assert.ok(names.includes('OrganizationMembership_organizationId_personId_key'));
    assert.ok(names.includes('Session_familyId_revokedAt_expiresAt_idx'));
    assert.ok(names.includes('Verification_userId_purpose_status_expiresAt_idx'));

    const constraints = await prisma.$queryRaw`
      SELECT conname FROM pg_constraint
      WHERE conname IN ('User_email_normalized_check', 'User_mobile_e164_check', 'Session_refresh_token_hash_check')
    `;
    assert.equal(constraints.length, 3);
  });

  test('the identity seed creates only standard roles and permissions', async () => {
    execFileSync(process.execPath, ['prisma/seed/identity.js'], {
      cwd: new URL('..', import.meta.url),
      env: { ...testEnvironment.values, DATABASE_URL: databaseUrl },
      stdio: 'inherit',
    });
    const [roles, permissions, users, organizations] = await Promise.all([
      prisma.role.count({ where: { organizationId: null, isSystem: true } }),
      prisma.permission.count(),
      prisma.user.count(),
      prisma.organization.count(),
    ]);
    assert.equal(roles, 4);
    assert.equal(permissions, 6);
    assert.equal(users, 0);
    assert.equal(organizations, 0);
  });

  test('tenant registration persistence creates no organization and writes its outbox records', async () => {
    execFileSync(process.execPath, ['prisma/seed/identity.js'], {
      cwd: new URL('..', import.meta.url),
      env: { ...testEnvironment.values, DATABASE_URL: databaseUrl },
      stdio: 'inherit',
    });
    const result = await prisma.$transaction(async (transaction) => {
      const person = await transaction.person.create({ data: { firstName: 'Public', lastName: 'Tenant' } });
      const user = await transaction.user.create({
        data: {
          personId: person.id,
          email: 'public.tenant@example.com',
          mobile: '+14155550101',
          passwordHash: argonHash,
          status: 'PENDING_EMAIL',
        },
      });
      const verification = await transaction.verification.create({
        data: {
          userId: user.id,
          channel: 'EMAIL',
          purpose: 'EMAIL_VERIFICATION',
          secretHash: argonHash,
          expiresAt: new Date(Date.now() + 86_400_000),
        },
      });
      await transaction.identityAuditEvent.create({
        data: { subjectUserId: user.id, action: 'identity.registration.submitted', metadata: { registrationType: 'TENANT' } },
      });
      await transaction.outboxEvent.createMany({ data: [
        { eventType: 'UserRegistered', aggregateType: 'User', aggregateId: user.id, payload: { userId: user.id } },
        { eventType: 'VerificationRequested', aggregateType: 'Verification', aggregateId: verification.id, payload: { verificationId: verification.id } },
      ] });
      return user.id;
    });
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: result },
      include: { person: { include: { memberships: true } }, verifications: true, auditEventsAsSubject: true },
    });
    assert.equal(user.status, 'PENDING_EMAIL');
    assert.equal(user.person.memberships.length, 0);
    assert.equal(await prisma.organization.count(), 0);
    assert.equal(user.verifications[0].secretHash.startsWith('$argon2'), true);
    assert.equal(user.auditEventsAsSubject[0].action, 'identity.registration.submitted');
    assert.equal(await prisma.outboxEvent.count(), 2);
  });

  test('landlord registration persistence creates exactly one owner organization', async () => {
    execFileSync(process.execPath, ['prisma/seed/identity.js'], {
      cwd: new URL('..', import.meta.url), env: { ...testEnvironment.values, DATABASE_URL: databaseUrl }, stdio: 'inherit',
    });
    const role = await prisma.role.findFirstOrThrow({ where: { code: 'LANDLORD', organizationId: null, isSystem: true } });
    const person = await prisma.person.create({ data: { firstName: 'Landlord', lastName: 'Owner' } });
    const organization = await prisma.organization.create({ data: { code: 'landlord-test', name: 'Landlord Owner' } });
    const membership = await prisma.organizationMembership.create({
      data: { organizationId: organization.id, personId: person.id, status: 'ACTIVE', isOwner: true, joinedAt: timestamp() },
    });
    await prisma.membershipRole.create({ data: { membershipId: membership.id, roleId: role.id } });
    assert.equal(await prisma.organization.count(), 1);
    assert.equal((await prisma.organizationMembership.findUniqueOrThrow({ where: { id: membership.id } })).isOwner, true);
  });

  test('normalized duplicate email is rejected', async () => {
    await createUser('alice@example.com');
    await assert.rejects(() => createUser('alice@example.com'));
    await assert.rejects(() => createUser('Alice@Example.com'));
  });

  test('normalized duplicate mobile is rejected', async () => {
    await createUser('one@example.com', '+14155550100');
    await assert.rejects(() => createUser('two@example.com', '+14155550100'));
    await assert.rejects(() => createUser('three@example.com', '14155550100'));
  });

  test('concurrent duplicate registrations are constrained to one user', async () => {
    const results = await Promise.allSettled([
      createUser('concurrent@example.com', '+14155550120'),
      createUser('concurrent@example.com', '+14155550121'),
    ]);
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
  });

  test('invalid organization membership references fail', async () => {
    const person = await prisma.person.create({ data: { firstName: 'Reference', lastName: 'Test' } });
    await assert.rejects(() => prisma.organizationMembership.create({
      data: { organizationId: 'missing-organization', personId: person.id },
    }));
  });

  test('a private role cannot be assigned to another organization membership', async () => {
    const organizationA = await prisma.organization.create({ data: { code: 'org-a', name: 'Organization A' } });
    const organizationB = await prisma.organization.create({ data: { code: 'org-b', name: 'Organization B' } });
    const person = await prisma.person.create({ data: { firstName: 'Role', lastName: 'Test' } });
    const membership = await prisma.organizationMembership.create({
      data: { organizationId: organizationB.id, personId: person.id, status: 'ACTIVE', joinedAt: timestamp() },
    });
    const privateRole = await prisma.role.create({
      data: { organizationId: organizationA.id, code: 'PRIVATE_MANAGER', name: 'Private manager' },
    });

    await assert.rejects(() => prisma.membershipRole.create({
      data: { membershipId: membership.id, roleId: privateRole.id },
    }));
  });

  test('revoked sessions are excluded from usable-session lookup', async () => {
    const user = await createUser('session@example.com');
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: argonHash,
        familyId: 'family-1',
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: timestamp(),
        revokedReason: 'logout',
      },
    });
    const usableSessions = await prisma.session.findMany({
      where: { userId: user.id, revokedAt: null, expiresAt: { gt: timestamp() } },
    });
    assert.equal(usableSessions.length, 0);
  });

  test('a failed transaction rolls back session persistence', async () => {
    const user = await createUser('rollback@example.com');
    await assert.rejects(() => prisma.$transaction(async (transaction) => {
      await transaction.session.create({
        data: {
          userId: user.id,
          refreshTokenHash: argonHash,
          familyId: 'rollback-family',
          expiresAt: new Date(Date.now() + 60_000),
        },
      });
      throw new Error('force rollback');
    }));
    assert.equal(await prisma.session.count({ where: { userId: user.id } }), 0);
  });

  test('a failed registration transaction rolls back outbox and audit records', async () => {
    await assert.rejects(() => prisma.$transaction(async (transaction) => {
      const person = await transaction.person.create({ data: { firstName: 'Rollback', lastName: 'Registration' } });
      const user = await transaction.user.create({
        data: { personId: person.id, email: 'registration-rollback@example.com', passwordHash: argonHash, status: 'PENDING_EMAIL' },
      });
      await transaction.identityAuditEvent.create({ data: { subjectUserId: user.id, action: 'identity.registration.submitted', metadata: {} } });
      await transaction.outboxEvent.create({ data: { eventType: 'UserRegistered', aggregateType: 'User', aggregateId: user.id, payload: {} } });
      throw new Error('force registration rollback');
    }));
    assert.equal(await prisma.user.count({ where: { email: 'registration-rollback@example.com' } }), 0);
    assert.equal(await prisma.outboxEvent.count(), 0);
    assert.equal(await prisma.identityAuditEvent.count(), 0);
  });

  test('session family revocation invalidates every active member', async () => {
    const user = await createUser('family@example.com');
    await prisma.session.createMany({
      data: [
        { userId: user.id, refreshTokenHash: argonHash, familyId: 'family-reuse', expiresAt: new Date(Date.now() + 60_000) },
        { userId: user.id, refreshTokenHash: argonHash, familyId: 'family-reuse', expiresAt: new Date(Date.now() + 60_000) },
      ],
    });
    await prisma.session.updateMany({
      where: { familyId: 'family-reuse', revokedAt: null },
      data: { revokedAt: timestamp(), revokedReason: 'REUSE_DETECTED' },
    });
    assert.equal(await prisma.session.count({ where: { familyId: 'family-reuse', revokedAt: null } }), 0);
  });

  test('expired verifications cannot be consumed', async () => {
    const user = await createUser('verification@example.com');
    const verification = await prisma.verification.create({
      data: {
        userId: user.id,
        channel: 'EMAIL',
        purpose: 'EMAIL_VERIFICATION',
        secretHash: argonHash,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    await prisma.verification.update({
      where: { id: verification.id },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    });
    await assert.rejects(() => prisma.verification.update({
      where: { id: verification.id },
      data: { status: 'CONSUMED', consumedAt: timestamp() },
    }));
  });

  test('plaintext refresh and verification secrets cannot be stored', async () => {
    const user = await createUser('secret@example.com');
    await assert.rejects(() => prisma.session.create({
      data: { userId: user.id, refreshTokenHash: 'plaintext-refresh-token', familyId: 'family-2', expiresAt: new Date(Date.now() + 60_000) },
    }));
    await assert.rejects(() => prisma.verification.create({
      data: {
        userId: user.id,
        channel: 'EMAIL',
        purpose: 'PASSWORD_RESET',
        secretHash: 'plaintext-reset-token',
        expiresAt: new Date(Date.now() + 60_000),
      },
    }));
  });
}
