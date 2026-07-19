import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test, { after, before, beforeEach } from 'node:test';
import { PrismaClient } from '@prisma/client';
import { testEnvironment } from './config/environment.mjs';

const databaseUrl = testEnvironment.databaseUrl;
const shouldRun = Boolean(databaseUrl);
const prisma = shouldRun
  ? new PrismaClient({ datasources: { db: { url: databaseUrl } } })
  : undefined;
const argonHash =
  '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$hIgXfIyfDEUXaEUa0+Qf2SZpB8YIH4SFi2yZ0ElAFzs';

async function createOrganization(code) {
  return prisma.organization.create({
    data: { code, name: code.toUpperCase(), status: 'ACTIVE' },
  });
}

async function createUser(label, status = 'ACTIVE') {
  const person = await prisma.person.create({
    data: { firstName: label, lastName: 'Fixture' },
  });
  const user = await prisma.user.create({
    data: { personId: person.id, email: `${label}@example.test`, passwordHash: argonHash, status },
  });
  return { person, user };
}

async function createMembership(organizationId, personId, status = 'ACTIVE') {
  return prisma.organizationMembership.create({
    data: { organizationId, personId, status, joinedAt: status === 'ACTIVE' ? new Date() : null },
  });
}

async function createProperty(organizationId, creatorUserId, code) {
  return prisma.property.create({
    data: {
      organizationId,
      createdByUserId: creatorUserId,
      code,
      name: code,
      propertyType: 'RESIDENTIAL',
      status: 'ACTIVE',
    },
  });
}

async function createLease(organizationId, creatorUserId, code) {
  const property = await prisma.property.create({
    data: {
      organizationId,
      createdByUserId: creatorUserId,
      code: `PROPERTY-${code}`,
      name: code,
      propertyType: 'RESIDENTIAL',
      status: 'ACTIVE',
      buildings: {
        create: {
          code: 'MAIN',
          name: 'Main',
          floors: { create: { number: 1, units: { create: { code: '101' } } } },
        },
      },
    },
    include: { buildings: { include: { floors: { include: { units: true } } } } },
  });
  const unit = property.buildings[0].floors[0].units[0];
  const lease = await prisma.lease.create({
    data: {
      organizationId,
      unitId: unit.id,
      code: `LEASE-${code}`,
      status: 'ACTIVE',
      startsAt: new Date('2026-01-01T00:00:00Z'),
      endsAt: new Date('2027-01-01T00:00:00Z'),
    },
  });
  return { property, lease };
}

test('Phase 1 database tests require IDENTITY_TEST_DATABASE_URL', { skip: !shouldRun }, () => {
  assert.ok(databaseUrl);
});

if (shouldRun) {
  before(() => {
    execFileSync('node_modules/.bin/prisma', ['migrate', 'deploy', '--schema', 'prisma/schemas'], {
      cwd: new URL('..', import.meta.url),
      env: { ...testEnvironment.values, DATABASE_URL: databaseUrl },
      stdio: 'inherit',
    });
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "Organization", "Person", "Role", "Permission" RESTART IDENTITY CASCADE',
    );
  });

  after(async () => {
    await prisma.$disconnect();
  });

  test('Phase 1 tables, scoped indexes, foreign keys, unique constraints, and guards exist', async () => {
    const tables = await prisma.$queryRaw`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename IN ('PlatformPrincipal', 'PropertyPortfolioAssignment')
    `;
    assert.deepEqual(tables.map(({ tablename }) => tablename).sort(), [
      'PlatformPrincipal',
      'PropertyPortfolioAssignment',
    ]);

    const columns = await prisma.$queryRaw`
      SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND (table_name, column_name) IN (
        ('Property', 'createdByUserId'), ('LeaseParty', 'personId'),
        ('LeaseParty', 'linkVerificationId'), ('OrganizationInvitation', 'leasePartyId'),
        ('Payment', 'propertyId')
      )
    `;
    assert.equal(columns.length, 5);

    const indexes = await prisma.$queryRaw`
      SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname IN (
        'PlatformPrincipal_userId_key', 'Property_id_organizationId_key',
        'OrganizationMembership_id_organizationId_key',
        'PropertyPortfolioAssignment_membershipId_propertyId_key',
        'LeaseParty_linkVerificationId_key', 'Payment_organizationId_propertyId_paidAt_idx'
      )
    `;
    assert.equal(indexes.length, 6);

    const constraints = await prisma.$queryRaw`
      SELECT conname FROM pg_constraint WHERE conname IN (
        'PropertyPortfolioAssignment_propertyId_organizationId_fkey',
        'PropertyPortfolioAssignment_membershipId_organizationId_fkey',
        'Payment_propertyId_organizationId_fkey'
      )
    `;
    assert.equal(constraints.length, 3);

    const triggers = await prisma.$queryRaw`
      SELECT tgname FROM pg_trigger WHERE NOT tgisinternal AND tgname IN (
        'PropertyPortfolioAssignment_assigner_organization_guard',
        'OrganizationInvitation_lease_party_organization_guard',
        'LeaseParty_verified_identity_link_guard'
      )
    `;
    assert.equal(triggers.length, 3);
  });

  test('portfolio assignments enforce property, membership, actor, and organization consistency', async () => {
    const [organizationA, organizationB] = await Promise.all([
      createOrganization('assignment-a'),
      createOrganization('assignment-b'),
    ]);
    const actorA = await createUser('assignment-actor-a');
    const actorB = await createUser('assignment-actor-b');
    const [membershipA, membershipB] = await Promise.all([
      createMembership(organizationA.id, actorA.person.id),
      createMembership(organizationB.id, actorB.person.id),
    ]);
    const [propertyA, propertyB] = await Promise.all([
      createProperty(organizationA.id, actorA.user.id, 'A'),
      createProperty(organizationB.id, actorB.user.id, 'B'),
    ]);

    await prisma.propertyPortfolioAssignment.create({
      data: {
        organizationId: organizationA.id,
        propertyId: propertyA.id,
        membershipId: membershipA.id,
        assignedByUserId: actorA.user.id,
      },
    });
    await assert.rejects(() =>
      prisma.propertyPortfolioAssignment.create({
        data: {
          organizationId: organizationA.id,
          propertyId: propertyB.id,
          membershipId: membershipA.id,
          assignedByUserId: actorA.user.id,
        },
      }),
    );
    await assert.rejects(() =>
      prisma.propertyPortfolioAssignment.create({
        data: {
          organizationId: organizationA.id,
          propertyId: propertyA.id,
          membershipId: membershipB.id,
          assignedByUserId: actorA.user.id,
        },
      }),
    );
    await assert.rejects(() =>
      prisma.propertyPortfolioAssignment.create({
        data: {
          organizationId: organizationA.id,
          propertyId: propertyA.id,
          membershipId: membershipA.id,
          assignedByUserId: actorB.user.id,
        },
      }),
    );
    assert.equal(await prisma.propertyPortfolioAssignment.count(), 1);
  });

  test('payment property scope cannot reference another organization', async () => {
    const [organizationA, organizationB] = await Promise.all([
      createOrganization('payment-a'),
      createOrganization('payment-b'),
    ]);
    const creator = await createUser('payment-creator');
    const propertyB = await createProperty(organizationB.id, creator.user.id, 'PAY-B');
    await assert.rejects(() =>
      prisma.payment.create({
        data: {
          organizationId: organizationA.id,
          propertyId: propertyB.id,
          paymentNumber: 'PAY-CROSS',
          method: 'CASH',
          currency: 'INR',
          amount: 100,
          allocatedAmount: 100,
          unappliedAmount: 0,
          paidAt: new Date(),
        },
      }),
    );
  });

  test('tenant invitation and verified link guards reject cross-organization linkage', async () => {
    const [organizationA, organizationB] = await Promise.all([
      createOrganization('tenant-a'),
      createOrganization('tenant-b'),
    ]);
    const inviter = await createUser('tenant-inviter');
    await createMembership(organizationA.id, inviter.person.id);
    const tenant = await createUser('tenant-linked');
    await createMembership(organizationB.id, tenant.person.id);
    const { lease: leaseA } = await createLease(organizationA.id, inviter.user.id, 'A');
    const { lease: leaseB } = await createLease(organizationB.id, inviter.user.id, 'B');
    const [partyA, partyB] = await Promise.all([
      prisma.leaseParty.create({ data: { leaseId: leaseA.id, role: 'TENANT', name: 'Tenant A' } }),
      prisma.leaseParty.create({ data: { leaseId: leaseB.id, role: 'TENANT', name: 'Tenant B' } }),
    ]);
    const role = await prisma.role.create({
      data: { code: 'TENANT', name: 'Tenant', isSystem: true },
    });

    async function verification(id) {
      return prisma.verification.create({
        data: {
          id,
          subjectType: 'INVITATION',
          subjectReferenceId: `invitation-${id}`,
          channel: 'EMAIL',
          purpose: 'INVITATION',
          secretHash: argonHash,
          expiresAt: new Date(Date.now() + 60_000),
          status: 'CONSUMED',
          consumedAt: new Date(),
        },
      });
    }

    const crossVerification = await verification('verification-cross');
    await assert.rejects(() =>
      prisma.organizationInvitation.create({
        data: {
          id: 'invitation-verification-cross',
          organizationId: organizationA.id,
          email: tenant.user.email,
          roleId: role.id,
          invitedByUserId: inviter.user.id,
          verificationId: crossVerification.id,
          leasePartyId: partyB.id,
          expiresAt: new Date(Date.now() + 60_000),
        },
      }),
    );

    const sameVerification = await verification('verification-same');
    await prisma.organizationInvitation.create({
      data: {
        id: 'invitation-verification-same',
        organizationId: organizationA.id,
        email: tenant.user.email,
        roleId: role.id,
        invitedByUserId: inviter.user.id,
        verificationId: sameVerification.id,
        leasePartyId: partyA.id,
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    await assert.rejects(() =>
      prisma.leaseParty.update({
        where: { id: partyA.id },
        data: {
          personId: tenant.person.id,
          linkedAt: new Date(),
          linkVerificationId: sameVerification.id,
        },
      }),
    );
    await createMembership(organizationA.id, tenant.person.id);
    await prisma.leaseParty.update({
      where: { id: partyA.id },
      data: {
        personId: tenant.person.id,
        linkedAt: new Date(),
        linkVerificationId: sameVerification.id,
      },
    });
    assert.equal(
      (await prisma.leaseParty.findUniqueOrThrow({ where: { id: partyA.id } })).personId,
      tenant.person.id,
    );
  });
}
