-- Phase 1 is an expand/backfill migration. Legacy roles and ownership columns
-- intentionally remain so the previous application version can still run.

CREATE TYPE "PlatformPrincipalStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');
CREATE TYPE "PlatformRole" AS ENUM ('SUPER_ADMIN');

CREATE TABLE "PlatformPrincipal" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "PlatformRole" NOT NULL DEFAULT 'SUPER_ADMIN',
  "status" "PlatformPrincipalStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "PlatformPrincipal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformPrincipal_userId_key" ON "PlatformPrincipal"("userId");
CREATE INDEX "PlatformPrincipal_role_status_deletedAt_idx" ON "PlatformPrincipal"("role", "status", "deletedAt");
ALTER TABLE "PlatformPrincipal" ADD CONSTRAINT "PlatformPrincipal_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill the independent platform principal from the legacy global-role
-- membership path. The legacy membership/role is retained for rollback.
INSERT INTO "PlatformPrincipal" ("id", "userId", "role", "status", "createdAt", "updatedAt")
SELECT DISTINCT md5('platform-principal:' || u."id"), u."id", 'SUPER_ADMIN'::"PlatformRole", 'ACTIVE'::"PlatformPrincipalStatus", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User" u
JOIN "Person" p ON p."id" = u."personId"
JOIN "OrganizationMembership" m ON m."personId" = p."id"
JOIN "MembershipRole" mr ON mr."membershipId" = m."id"
JOIN "Role" r ON r."id" = mr."roleId"
WHERE r."code" = 'SUPER_ADMIN'
  AND r."organizationId" IS NULL
  AND r."isSystem" = true
  AND r."deletedAt" IS NULL
  AND m."status" = 'ACTIVE'
  AND m."deletedAt" IS NULL
  AND u."deletedAt" IS NULL
ON CONFLICT ("userId") DO NOTHING;

-- Separate record creator from the legacy owner field. PropertyOwnership is
-- the asset-ownership foundation; ownerUserId is retained only for rollback.
ALTER TABLE "Property" ALTER COLUMN "ownerUserId" DROP NOT NULL;
ALTER TABLE "Property" ADD COLUMN "createdByUserId" TEXT;
UPDATE "Property" SET "createdByUserId" = "ownerUserId" WHERE "createdByUserId" IS NULL;
CREATE INDEX "Property_createdByUserId_createdAt_idx" ON "Property"("createdByUserId", "createdAt");
ALTER TABLE "Property" ADD CONSTRAINT "Property_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "PropertyPortfolioAssignment" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "membershipId" TEXT NOT NULL,
  "assignedByUserId" TEXT,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "PropertyPortfolioAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PropertyPortfolioAssignment_membershipId_propertyId_key" ON "PropertyPortfolioAssignment"("membershipId", "propertyId");
CREATE INDEX "PropertyPortfolioAssignment_organizationId_membershipId_revokedAt_idx" ON "PropertyPortfolioAssignment"("organizationId", "membershipId", "revokedAt");
CREATE INDEX "PropertyPortfolioAssignment_propertyId_revokedAt_idx" ON "PropertyPortfolioAssignment"("propertyId", "revokedAt");
CREATE INDEX "PropertyPortfolioAssignment_assignedByUserId_idx" ON "PropertyPortfolioAssignment"("assignedByUserId");
ALTER TABLE "PropertyPortfolioAssignment" ADD CONSTRAINT "PropertyPortfolioAssignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PropertyPortfolioAssignment" ADD CONSTRAINT "PropertyPortfolioAssignment_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PropertyPortfolioAssignment" ADD CONSTRAINT "PropertyPortfolioAssignment_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "OrganizationMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PropertyPortfolioAssignment" ADD CONSTRAINT "PropertyPortfolioAssignment_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Verified invitation linkage. No email/mobile values are used as an
-- authorization key; the accepted verification identifies the link event.
ALTER TABLE "LeaseParty" ADD COLUMN "personId" TEXT;
ALTER TABLE "LeaseParty" ADD COLUMN "linkedAt" TIMESTAMP(3);
ALTER TABLE "LeaseParty" ADD COLUMN "linkVerificationId" TEXT;
ALTER TABLE "OrganizationInvitation" ADD COLUMN "leasePartyId" TEXT;
CREATE INDEX "LeaseParty_personId_role_idx" ON "LeaseParty"("personId", "role");
CREATE UNIQUE INDEX "LeaseParty_linkVerificationId_key" ON "LeaseParty"("linkVerificationId");
CREATE INDEX "OrganizationInvitation_leasePartyId_status_idx" ON "OrganizationInvitation"("leasePartyId", "status");
ALTER TABLE "LeaseParty" ADD CONSTRAINT "LeaseParty_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeaseParty" ADD CONSTRAINT "LeaseParty_linkVerificationId_fkey" FOREIGN KEY ("linkVerificationId") REFERENCES "Verification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_leasePartyId_fkey" FOREIGN KEY ("leasePartyId") REFERENCES "LeaseParty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Anchor finance scope to one property. Existing payments are backfilled only
-- when every allocation resolves to exactly one property. Ambiguous rows stay
-- NULL and are restricted to organization-wide finance access.
ALTER TABLE "Payment" ADD COLUMN "propertyId" TEXT;
WITH payment_property AS (
  SELECT pa."paymentId", MIN(p."id") AS "propertyId"
  FROM "PaymentAllocation" pa
  JOIN "Invoice" i ON i."id" = pa."invoiceId"
  JOIN "Lease" l ON l."id" = i."leaseId"
  JOIN "Unit" u ON u."id" = l."unitId"
  JOIN "Floor" f ON f."id" = u."floorId"
  JOIN "Building" b ON b."id" = f."buildingId"
  JOIN "Property" p ON p."id" = b."propertyId"
  GROUP BY pa."paymentId"
  HAVING COUNT(DISTINCT p."id") = 1
)
UPDATE "Payment" payment
SET "propertyId" = payment_property."propertyId"
FROM payment_property
WHERE payment."id" = payment_property."paymentId";
CREATE INDEX "Payment_organizationId_propertyId_paidAt_idx" ON "Payment"("organizationId", "propertyId", "paidAt");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Repair organizations created through registration paths that predated or
-- bypassed settings creation. This insert is idempotent.
INSERT INTO "OrganizationSettings" ("id", "organizationId", "timezone", "currency", "country", "createdAt", "updatedAt")
SELECT md5('organization-settings:' || organization."id"), organization."id", organization."timezone", organization."currency", organization."country", organization."createdAt", CURRENT_TIMESTAMP
FROM "Organization" organization
ON CONFLICT ("organizationId") DO NOTHING;

-- Add the explicit capability catalog. Role assignment remains idempotent and
-- organization-wide portfolio access is granted only to proprietor/admin roles.
INSERT INTO "Permission" ("id", "code", "name", "createdAt", "updatedAt") VALUES
  (md5('permission:portfolio.access.all'), 'portfolio.access.all', 'Access every property in the organization', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (md5('permission:property.read'), 'property.read', 'Read assigned properties', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (md5('permission:property.manage'), 'property.manage', 'Manage assigned properties', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (md5('permission:lease.read'), 'lease.read', 'Read leases in the assigned portfolio', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (md5('permission:lease.manage'), 'lease.manage', 'Manage leases in the assigned portfolio', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (md5('permission:invoice.read'), 'invoice.read', 'Read invoices in the assigned portfolio', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (md5('permission:invoice.manage'), 'invoice.manage', 'Manage invoices in the assigned portfolio', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (md5('permission:payment.read'), 'payment.read', 'Read payments in the assigned portfolio', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (md5('permission:payment.manage'), 'payment.manage', 'Manage payments in the assigned portfolio', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (md5('permission:organization.settings.read'), 'organization.settings.read', 'Read organization settings', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name", "deletedAt" = NULL, "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "Role" ("id", "organizationId", "code", "name", "description", "isSystem", "isDefault", "createdAt", "updatedAt") VALUES
  (md5('system-role:ORG_PROPRIETOR'), NULL, 'ORG_PROPRIETOR', 'Organization Proprietor', 'Principal responsible for the organization; separate from managed-property asset ownership.', true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (md5('system-role:ASSET_OWNER'), NULL, 'ASSET_OWNER', 'Managed Property Asset Owner', 'Read-only portfolio role whose scope is derived from PropertyOwnership.', true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description", "isSystem" = true, "deletedAt" = NULL, "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "RolePermission" ("roleId", "permissionId", "createdAt")
SELECT role."id", permission."id", CURRENT_TIMESTAMP
FROM "Role" role
JOIN "Permission" permission ON permission."code" IN (
  'portfolio.access.all', 'property.read', 'property.manage', 'lease.read', 'lease.manage',
  'invoice.read', 'invoice.manage', 'payment.read', 'payment.manage', 'organization.settings.read'
)
WHERE role."organizationId" IS NULL AND role."isSystem" = true AND role."deletedAt" IS NULL AND role."code" IN ('OWNER', 'ADMIN', 'LANDLORD', 'ORG_PROPRIETOR')
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId", "createdAt")
SELECT role."id", permission."id", CURRENT_TIMESTAMP
FROM "Role" role
JOIN "Permission" permission ON permission."code" IN ('property.read', 'property.manage', 'lease.read', 'lease.manage', 'invoice.read', 'payment.read')
WHERE role."organizationId" IS NULL AND role."isSystem" = true AND role."deletedAt" IS NULL AND role."code" = 'PROPERTY_MANAGER'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId", "createdAt")
SELECT role."id", permission."id", CURRENT_TIMESTAMP
FROM "Role" role
JOIN "Permission" permission ON permission."code" IN ('invoice.read', 'invoice.manage', 'payment.read', 'payment.manage')
WHERE role."organizationId" IS NULL AND role."isSystem" = true AND role."deletedAt" IS NULL AND role."code" = 'FINANCE'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId", "createdAt")
SELECT role."id", permission."id", CURRENT_TIMESTAMP
FROM "Role" role
JOIN "Permission" permission ON permission."code" IN ('property.read', 'lease.read', 'invoice.read', 'payment.read')
WHERE role."organizationId" IS NULL AND role."isSystem" = true AND role."deletedAt" IS NULL AND role."code" = 'VIEWER'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId", "createdAt")
SELECT role."id", permission."id", CURRENT_TIMESTAMP
FROM "Role" role
JOIN "Permission" permission ON permission."code" IN ('property.read', 'lease.read', 'invoice.read', 'payment.read')
WHERE role."organizationId" IS NULL AND role."isSystem" = true AND role."deletedAt" IS NULL AND role."code" = 'ASSET_OWNER'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- Every organization proprietor receives the explicit proprietor role.
INSERT INTO "MembershipRole" ("membershipId", "roleId", "assignedByUserId", "assignedAt")
SELECT membership."id", role."id", NULL, CURRENT_TIMESTAMP
FROM "OrganizationMembership" membership
JOIN "Role" role ON role."id" = md5('system-role:ORG_PROPRIETOR')
WHERE membership."isOwner" = true AND membership."deletedAt" IS NULL
ON CONFLICT ("membershipId", "roleId") DO NOTHING;

-- A legacy OWNER assignment on a non-proprietor represented an asset owner.
-- Move that assignment to the separate read-only role so it cannot retain the
-- organization-wide permission granted to actual proprietors.
INSERT INTO "MembershipRole" ("membershipId", "roleId", "assignedByUserId", "assignedAt")
SELECT membershipRole."membershipId", assetRole."id", membershipRole."assignedByUserId", CURRENT_TIMESTAMP
FROM "MembershipRole" membershipRole
JOIN "OrganizationMembership" membership ON membership."id" = membershipRole."membershipId" AND membership."isOwner" = false
JOIN "Role" legacyRole ON legacyRole."id" = membershipRole."roleId" AND legacyRole."code" = 'OWNER' AND legacyRole."organizationId" IS NULL
JOIN "Role" assetRole ON assetRole."id" = md5('system-role:ASSET_OWNER')
ON CONFLICT ("membershipId", "roleId") DO NOTHING;

DELETE FROM "MembershipRole" membershipRole
USING "OrganizationMembership" membership, "Role" legacyRole
WHERE membershipRole."membershipId" = membership."id"
  AND membershipRole."roleId" = legacyRole."id"
  AND membership."isOwner" = false
  AND legacyRole."code" = 'OWNER'
  AND legacyRole."organizationId" IS NULL;
