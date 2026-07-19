import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test, { after, before, beforeEach } from 'node:test';
import { PrismaClient } from '@prisma/client';
import { PortfolioAccessService } from '../dist/identity/authorization/portfolio-access.service.js';
import { TenantAccessService } from '../dist/identity/authorization/tenant-access.service.js';
import { IdentityRepository } from '../dist/identity/repositories/identity.repository.js';
import { OrganizationSettingsRepository } from '../dist/organization/settings.repository.js';
import { OrganizationSettingsService } from '../dist/organization/settings.service.js';

const databaseUrl = process.env.PHASE1_API_TEST_DATABASE_URL;
const shouldRun = Boolean(databaseUrl);
const prisma = shouldRun
  ? new PrismaClient({ datasources: { db: { url: databaseUrl } } })
  : undefined;
const repositoryRoot = new URL('../../..', import.meta.url);
const argonHash =
  '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$hIgXfIyfDEUXaEUa0+Qf2SZpB8YIH4SFi2yZ0ElAFzs';

async function user(label, status = 'ACTIVE') {
  const person = await prisma.person.create({ data: { firstName: label, lastName: 'Fixture' } });
  const record = await prisma.user.create({
    data: { personId: person.id, email: `${label}@example.test`, passwordHash: argonHash, status },
  });
  return { person, user: record };
}

async function membership(organizationId, principal, roleCode, status = 'ACTIVE') {
  const role = await prisma.role.findFirstOrThrow({
    where: { organizationId: null, code: roleCode, isSystem: true },
  });
  return prisma.organizationMembership.create({
    data: {
      organizationId,
      personId: principal.person.id,
      status,
      joinedAt: status === 'ACTIVE' ? new Date() : null,
      roles: { create: { roleId: role.id } },
    },
  });
}

async function property(organizationId, creatorUserId, code) {
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

async function invoiceForProperty(organizationId, creatorUserId, code) {
  const propertyRecord = await prisma.property.create({
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
  const lease = await prisma.lease.create({
    data: {
      organizationId,
      unitId: propertyRecord.buildings[0].floors[0].units[0].id,
      code: `LEASE-${code}`,
      status: 'ACTIVE',
      startsAt: new Date('2026-01-01T00:00:00Z'),
      endsAt: new Date('2027-01-01T00:00:00Z'),
      billingCalendar: {
        create: {
          billingCycle: 'MONTHLY',
          schedules: {
            create: {
              sequence: 1,
              periodStartsAt: new Date('2026-07-01T00:00:00Z'),
              periodEndsAt: new Date('2026-08-01T00:00:00Z'),
              dueAt: new Date('2026-07-01T00:00:00Z'),
              rentAmount: 100,
              totalDue: 100,
            },
          },
        },
      },
    },
    include: { billingCalendar: { include: { schedules: true } } },
  });
  const invoice = await prisma.invoice.create({
    data: {
      organizationId,
      leaseId: lease.id,
      rentScheduleId: lease.billingCalendar.schedules[0].id,
      invoiceNumber: `INV-${code}`,
      status: 'ISSUED',
      dueAt: new Date('2026-07-01T00:00:00Z'),
      subtotal: 100,
      total: 100,
      outstandingBalance: 100,
    },
  });
  return { property: propertyRecord, lease, invoice };
}

test(
  'Phase 1 API database tests require PHASE1_API_TEST_DATABASE_URL',
  { skip: !shouldRun },
  () => {
    assert.ok(databaseUrl);
  },
);

if (shouldRun) {
  before(() => {
    execFileSync('node_modules/.bin/prisma', ['migrate', 'deploy', '--schema', 'prisma/schemas'], {
      cwd: repositoryRoot,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'inherit',
    });
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "Organization", "Person", "Role", "Permission" RESTART IDENTITY CASCADE',
    );
    execFileSync(process.execPath, ['prisma/seed/identity.js'], {
      cwd: repositoryRoot,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'ignore',
    });
  });

  after(async () => {
    await prisma.$disconnect();
  });

  test('asset owners, managers, and finance users resolve only owned or assigned portfolios', async () => {
    const organization = await prisma.organization.create({
      data: { code: 'portfolio-db', name: 'Portfolio DB', status: 'ACTIVE' },
    });
    const admin = await user('portfolio-admin');
    await membership(organization.id, admin, 'ORG_PROPRIETOR');
    const asset = await user('portfolio-asset');
    const manager = await user('portfolio-manager');
    const finance = await user('portfolio-finance');
    const [assetMembership, managerMembership, financeMembership] = await Promise.all([
      membership(organization.id, asset, 'ASSET_OWNER'),
      membership(organization.id, manager, 'PROPERTY_MANAGER'),
      membership(organization.id, finance, 'FINANCE'),
    ]);
    const [owned, assigned, other] = await Promise.all([
      property(organization.id, admin.user.id, 'OWNED'),
      property(organization.id, admin.user.id, 'ASSIGNED'),
      property(organization.id, admin.user.id, 'OTHER'),
    ]);
    await prisma.propertyOwnership.create({
      data: { propertyId: owned.id, userId: asset.user.id },
    });
    await prisma.propertyPortfolioAssignment.createMany({
      data: [
        {
          organizationId: organization.id,
          propertyId: assigned.id,
          membershipId: assetMembership.id,
          assignedByUserId: admin.user.id,
        },
        {
          organizationId: organization.id,
          propertyId: assigned.id,
          membershipId: managerMembership.id,
          assignedByUserId: admin.user.id,
        },
        {
          organizationId: organization.id,
          propertyId: assigned.id,
          membershipId: financeMembership.id,
          assignedByUserId: admin.user.id,
        },
      ],
    });

    const access = new PortfolioAccessService(prisma);
    const [assetScope, managerScope, financeScope] = await Promise.all([
      access.scope(asset.user.id, organization.id, 'property.read'),
      access.scope(manager.user.id, organization.id, 'property.read'),
      access.scope(finance.user.id, organization.id, 'invoice.read'),
    ]);
    assert.deepEqual(assetScope.propertyIds.sort(), [assigned.id, owned.id].sort());
    assert.deepEqual(managerScope.propertyIds, [assigned.id]);
    assert.deepEqual(financeScope.propertyIds, [assigned.id]);
    assert.equal(assetScope.propertyIds.includes(other.id), false);

    await prisma.propertyPortfolioAssignment.updateMany({
      where: { membershipId: managerMembership.id },
      data: { revokedAt: new Date() },
    });
    assert.deepEqual(
      (await access.scope(manager.user.id, organization.id, 'property.read')).propertyIds,
      [],
    );
    await prisma.organizationMembership.update({
      where: { id: financeMembership.id },
      data: { status: 'SUSPENDED' },
    });
    await assert.rejects(() => access.scope(finance.user.id, organization.id, 'invoice.read'));
  });

  test('legacy SUPER_ADMIN and OWNER permissions cannot enter organization portfolio policy', async () => {
    const organization = await prisma.organization.create({
      data: { code: 'legacy-policy', name: 'Legacy Policy', status: 'ACTIVE' },
    });
    const legacySuper = await user('legacy-super');
    const legacyOwner = await user('legacy-owner');
    await membership(organization.id, legacySuper, 'SUPER_ADMIN');
    await membership(organization.id, legacyOwner, 'OWNER');
    const permissions = await prisma.permission.findMany({
      where: { code: { in: ['portfolio.access.all', 'property.read'] } },
    });
    const legacyRoles = await prisma.role.findMany({
      where: { code: { in: ['SUPER_ADMIN', 'OWNER'] }, organizationId: null },
    });
    await prisma.rolePermission.createMany({
      data: legacyRoles.flatMap((role) =>
        permissions.map((permission) => ({ roleId: role.id, permissionId: permission.id })),
      ),
      skipDuplicates: true,
    });
    const access = new PortfolioAccessService(prisma);
    await assert.rejects(() => access.scope(legacySuper.user.id, organization.id, 'property.read'));
    await assert.rejects(() => access.scope(legacyOwner.user.id, organization.id, 'property.read'));
  });

  test('suspended platform principals and suspended memberships lose access', async () => {
    const principal = await user('suspended-platform');
    await prisma.platformPrincipal.create({
      data: { userId: principal.user.id, status: 'SUSPENDED' },
    });
    const identities = new IdentityRepository(prisma);
    assert.equal(await identities.findActivePlatformPrincipal(principal.user.id), null);

    const organization = await prisma.organization.create({
      data: { code: 'suspended-member', name: 'Suspended Member', status: 'ACTIVE' },
    });
    const manager = await user('suspended-manager');
    await membership(organization.id, manager, 'PROPERTY_MANAGER', 'SUSPENDED');
    await assert.rejects(() =>
      new PortfolioAccessService(prisma).scope(manager.user.id, organization.id, 'property.read'),
    );
  });

  test('concurrent Settings reads create exactly one defaults row', async () => {
    const organization = await prisma.organization.create({
      data: {
        code: 'settings-race',
        name: 'Settings Race',
        status: 'ACTIVE',
        timezone: 'Asia/Kolkata',
        currency: 'INR',
        country: 'IN',
      },
    });
    const proprietor = await user('settings-proprietor');
    await membership(organization.id, proprietor, 'ORG_PROPRIETOR');
    const service = new OrganizationSettingsService(new OrganizationSettingsRepository(prisma));
    const results = await Promise.all(
      Array.from({ length: 8 }, () => service.get(proprietor.user.id, organization.id)),
    );
    assert.equal(new Set(results.map(({ id }) => id)).size, 1);
    assert.equal(
      await prisma.organizationSettings.count({ where: { organizationId: organization.id } }),
      1,
    );
  });

  test('tenant payment access checks every allocation and scoped finance denies ambiguous payment scope', async () => {
    const organization = await prisma.organization.create({
      data: { code: 'tenant-payment', name: 'Tenant Payment', status: 'ACTIVE' },
    });
    const proprietor = await user('tenant-payment-admin');
    await membership(organization.id, proprietor, 'ORG_PROPRIETOR');
    const tenant = await user('tenant-payment-user');
    await membership(organization.id, tenant, 'TENANT');
    const finance = await user('tenant-payment-finance');
    const financeMembership = await membership(organization.id, finance, 'FINANCE');
    const [linked, external] = await Promise.all([
      invoiceForProperty(organization.id, proprietor.user.id, 'LINKED'),
      invoiceForProperty(organization.id, proprietor.user.id, 'EXTERNAL'),
    ]);
    await prisma.propertyPortfolioAssignment.create({
      data: {
        organizationId: organization.id,
        propertyId: linked.property.id,
        membershipId: financeMembership.id,
        assignedByUserId: proprietor.user.id,
      },
    });

    const verification = await prisma.verification.create({
      data: {
        id: 'tenant-link-verification',
        subjectType: 'INVITATION',
        subjectReferenceId: 'tenant-link-invitation',
        channel: 'EMAIL',
        purpose: 'INVITATION',
        secretHash: argonHash,
        expiresAt: new Date(Date.now() + 60_000),
        status: 'CONSUMED',
        consumedAt: new Date(),
      },
    });
    const party = await prisma.leaseParty.create({
      data: { leaseId: linked.lease.id, role: 'TENANT', name: 'Linked Tenant' },
    });
    const tenantRole = await prisma.role.findFirstOrThrow({
      where: { code: 'TENANT', organizationId: null },
    });
    await prisma.organizationInvitation.create({
      data: {
        id: 'tenant-link-invitation',
        organizationId: organization.id,
        email: tenant.user.email,
        roleId: tenantRole.id,
        invitedByUserId: proprietor.user.id,
        verificationId: verification.id,
        leasePartyId: party.id,
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    await prisma.leaseParty.update({
      where: { id: party.id },
      data: {
        personId: tenant.person.id,
        linkedAt: new Date(),
        linkVerificationId: verification.id,
      },
    });

    const sharedPayment = await prisma.payment.create({
      data: {
        organizationId: organization.id,
        paymentNumber: 'PAY-SHARED',
        method: 'CASH',
        currency: 'INR',
        amount: 200,
        allocatedAmount: 200,
        unappliedAmount: 0,
        paidAt: new Date(),
        allocations: {
          create: [
            { invoiceId: linked.invoice.id, amount: 100 },
            { invoiceId: external.invoice.id, amount: 100 },
          ],
        },
      },
    });
    const tenantAccess = new TenantAccessService(prisma);
    const tenantScope = await tenantAccess.scope(tenant.user.id, organization.id);
    await assert.rejects(() => tenantAccess.assertPayment(tenantScope, sharedPayment.id));

    const financeAccess = new PortfolioAccessService(prisma);
    const financeScope = await financeAccess.scope(
      finance.user.id,
      organization.id,
      'payment.read',
    );
    await assert.rejects(() => financeAccess.assertPayment(financeScope, sharedPayment.id));
  });
}
