CREATE TYPE "OrganizationStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');
CREATE TYPE "OrganizationType" AS ENUM ('LANDLORD', 'PROPERTY_MANAGER', 'ENTERPRISE');
ALTER TABLE "Organization" ADD COLUMN "legalName" TEXT;
ALTER TABLE "Organization" ADD COLUMN "organizationType" "OrganizationType" NOT NULL DEFAULT 'LANDLORD';
ALTER TABLE "Organization" ADD COLUMN "registrationNumber" TEXT;
ALTER TABLE "Organization" ADD COLUMN "gstNumber" TEXT;
ALTER TABLE "Organization" ADD COLUMN "panNumber" TEXT;
ALTER TABLE "Organization" ADD COLUMN "email" TEXT;
ALTER TABLE "Organization" ADD COLUMN "mobile" TEXT;
ALTER TABLE "Organization" ADD COLUMN "website" TEXT;
ALTER TABLE "Organization" ADD COLUMN "status" "OrganizationStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Organization" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'UTC';
ALTER TABLE "Organization" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'INR';
ALTER TABLE "Organization" ADD COLUMN "country" TEXT NOT NULL DEFAULT 'IN';
CREATE INDEX "Organization_status_deletedAt_idx" ON "Organization"("status", "deletedAt");
CREATE INDEX "Organization_email_idx" ON "Organization"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationMembership_one_owner_per_organization"
ON "OrganizationMembership" ("organizationId")
WHERE "isOwner" = true;
