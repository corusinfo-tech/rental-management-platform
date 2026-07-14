-- Additive O1 hardening: optimistic-concurrency versions and queryable
-- organization audit context. Existing records start at version one.
ALTER TABLE "OrganizationSettings" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "OrganizationCompliance" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "OrganizationApproval" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "OrganizationInvitation" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "OrganizationSettings" ADD CONSTRAINT "OrganizationSettings_version_check" CHECK ("version" > 0);
ALTER TABLE "OrganizationCompliance" ADD CONSTRAINT "OrganizationCompliance_version_check" CHECK ("version" > 0);
ALTER TABLE "OrganizationApproval" ADD CONSTRAINT "OrganizationApproval_version_check" CHECK ("version" > 0);
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_version_check" CHECK ("version" > 0);

ALTER TABLE "IdentityAuditEvent" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "IdentityAuditEvent" ADD COLUMN "aggregateId" TEXT;
ALTER TABLE "IdentityAuditEvent" ADD CONSTRAINT "IdentityAuditEvent_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "IdentityAuditEvent_organizationId_createdAt_idx" ON "IdentityAuditEvent"("organizationId", "createdAt");
CREATE INDEX "IdentityAuditEvent_aggregateId_createdAt_idx" ON "IdentityAuditEvent"("aggregateId", "createdAt");
