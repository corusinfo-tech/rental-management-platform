import { PrismaClient } from '@prisma/client';
import { createRequire } from 'node:module';

const requireFromApi = createRequire(new URL('../../apps/api/package.json', import.meta.url));
const argon2 = requireFromApi('argon2');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const password = 'Phase1Test!123';
const passwordHash = await argon2.hash(password);

const ids = {
  organizationA: '11111111-1111-4111-8111-111111111111',
  organizationB: '22222222-2222-4222-8222-222222222222',
  propertyA1: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  propertyA2: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  propertyB1: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
};

const principalDefinitions = [
  ['platform', 'platform@example.test', null, null],
  ['proprietor', 'proprietor@example.test', ids.organizationA, 'ORG_PROPRIETOR'],
  ['admin', 'admin@example.test', ids.organizationA, 'ADMIN'],
  ['manager', 'manager@example.test', ids.organizationA, 'PROPERTY_MANAGER'],
  ['finance', 'finance@example.test', ids.organizationA, 'FINANCE'],
  ['asset', 'asset@example.test', ids.organizationA, 'ASSET_OWNER'],
  ['tenant', 'tenant@example.test', ids.organizationA, 'TENANT'],
  ['outsider', 'outsider@example.test', null, null],
  ['suspended', 'suspended@example.test', ids.organizationA, 'PROPERTY_MANAGER'],
  ['second_admin', 'second.admin@example.test', ids.organizationB, 'ADMIN'],
];

await prisma.$executeRawUnsafe(
  'TRUNCATE TABLE "Organization", "Person", "Role", "Permission" RESTART IDENTITY CASCADE',
);

const { spawnSync } = await import('node:child_process');
const seed = spawnSync(process.execPath, ['prisma/seed/identity.js'], {
  cwd: new URL('../..', import.meta.url),
  env: { ...process.env, DATABASE_URL: databaseUrl },
  stdio: 'inherit',
});
if (seed.status !== 0) throw new Error('identity seed failed');

await prisma.organization.createMany({
  data: [
    { id: ids.organizationA, code: 'http-org-a', name: 'HTTP Organization A', status: 'ACTIVE' },
    { id: ids.organizationB, code: 'http-org-b', name: 'HTTP Organization B', status: 'ACTIVE' },
  ],
});

const principals = {};
for (const [label, email, organizationId, roleCode] of principalDefinitions) {
  const person = await prisma.person.create({
    data: { firstName: label, lastName: 'HTTP Fixture' },
  });
  const user = await prisma.user.create({
    data: { personId: person.id, email, passwordHash, status: 'ACTIVE' },
  });
  let membership = null;
  if (organizationId && roleCode) {
    const role = await prisma.role.findFirstOrThrow({
      where: { code: roleCode, organizationId: null, isSystem: true },
    });
    membership = await prisma.organizationMembership.create({
      data: {
        organizationId,
        personId: person.id,
        status: label === 'suspended' ? 'SUSPENDED' : 'ACTIVE',
        joinedAt: label === 'suspended' ? null : new Date(),
        isOwner: label === 'proprietor',
        roles: { create: { roleId: role.id } },
      },
    });
  }
  principals[label] = { person, user, membership };
}

await prisma.platformPrincipal.create({
  data: { userId: principals.platform.user.id, role: 'SUPER_ADMIN', status: 'ACTIVE' },
});

await prisma.property.createMany({
  data: [
    {
      id: ids.propertyA1,
      organizationId: ids.organizationA,
      createdByUserId: principals.proprietor.user.id,
      code: 'A1',
      name: 'HTTP Property A1',
      propertyType: 'RESIDENTIAL',
      status: 'ACTIVE',
    },
    {
      id: ids.propertyA2,
      organizationId: ids.organizationA,
      createdByUserId: principals.proprietor.user.id,
      code: 'A2',
      name: 'HTTP Property A2',
      propertyType: 'COMMERCIAL',
      status: 'ACTIVE',
    },
    {
      id: ids.propertyB1,
      organizationId: ids.organizationB,
      createdByUserId: principals.second_admin.user.id,
      code: 'B1',
      name: 'HTTP Property B1',
      propertyType: 'RESIDENTIAL',
      status: 'ACTIVE',
    },
  ],
});

await prisma.propertyOwnership.create({
  data: { propertyId: ids.propertyA1, userId: principals.asset.user.id },
});
await prisma.propertyPortfolioAssignment.createMany({
  data: [
    {
      organizationId: ids.organizationA,
      propertyId: ids.propertyA1,
      membershipId: principals.manager.membership.id,
      assignedByUserId: principals.proprietor.user.id,
    },
    {
      organizationId: ids.organizationA,
      propertyId: ids.propertyA1,
      membershipId: principals.finance.membership.id,
      assignedByUserId: principals.proprietor.user.id,
    },
  ],
});

const propertyA1 = await prisma.property.update({
  where: { id: ids.propertyA1 },
  data: {
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
    organizationId: ids.organizationA,
    unitId: propertyA1.buildings[0].floors[0].units[0].id,
    code: 'HTTP-LEASE-A1',
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
    organizationId: ids.organizationA,
    leaseId: lease.id,
    rentScheduleId: lease.billingCalendar.schedules[0].id,
    invoiceNumber: 'HTTP-INV-A1',
    status: 'ISSUED',
    dueAt: new Date('2026-07-01T00:00:00Z'),
    subtotal: 100,
    total: 100,
    outstandingBalance: 100,
  },
});
await prisma.payment.create({
  data: {
    organizationId: ids.organizationA,
    propertyId: ids.propertyA1,
    paymentNumber: 'HTTP-PAY-A1',
    method: 'CASH',
    currency: 'INR',
    amount: 100,
    allocatedAmount: 100,
    unappliedAmount: 0,
    paidAt: new Date(),
    allocations: { create: { invoiceId: invoice.id, amount: 100 } },
  },
});

const verification = await prisma.verification.create({
  data: {
    id: 'tenant-http-verification',
    subjectType: 'INVITATION',
    subjectReferenceId: 'tenant-http-invitation',
    channel: 'EMAIL',
    purpose: 'INVITATION',
    secretHash: passwordHash,
    expiresAt: new Date(Date.now() + 3_600_000),
    status: 'CONSUMED',
    consumedAt: new Date(),
  },
});
const party = await prisma.leaseParty.create({
  data: { leaseId: lease.id, role: 'TENANT', name: 'HTTP Tenant' },
});
const tenantRole = await prisma.role.findFirstOrThrow({
  where: { code: 'TENANT', organizationId: null },
});
await prisma.organizationInvitation.create({
  data: {
    id: 'tenant-http-invitation',
    organizationId: ids.organizationA,
    email: principals.tenant.user.email,
    roleId: tenantRole.id,
    invitedByUserId: principals.proprietor.user.id,
    verificationId: verification.id,
    leasePartyId: party.id,
    status: 'ACCEPTED',
    acceptedAt: new Date(),
    expiresAt: new Date(Date.now() + 3_600_000),
  },
});
await prisma.leaseParty.update({
  where: { id: party.id },
  data: {
    personId: principals.tenant.person.id,
    linkedAt: new Date(),
    linkVerificationId: verification.id,
  },
});

console.log(
  JSON.stringify({
    password,
    ids,
    emails: Object.fromEntries(principalDefinitions.map(([label, email]) => [label, email])),
  }),
);
await prisma.$disconnect();
