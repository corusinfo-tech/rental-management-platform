CREATE TYPE "ComplianceStatus" AS ENUM ('COMPLIANT', 'NON_COMPLIANT', 'UNDER_REVIEW');
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

CREATE TABLE "OrganizationCompliance" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "complianceStatus" "ComplianceStatus" NOT NULL DEFAULT 'UNDER_REVIEW',
  "kycStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "gstVerificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "lastReviewAt" TIMESTAMP(3),
  "nextReviewAt" TIMESTAMP(3),
  "riskLevel" "RiskLevel" NOT NULL DEFAULT 'LOW',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationCompliance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizationCompliance_organizationId_key" ON "OrganizationCompliance"("organizationId");
CREATE INDEX "OrganizationCompliance_complianceStatus_nextReviewAt_idx" ON "OrganizationCompliance"("complianceStatus", "nextReviewAt");
CREATE INDEX "OrganizationCompliance_riskLevel_updatedAt_idx" ON "OrganizationCompliance"("riskLevel", "updatedAt");
ALTER TABLE "OrganizationCompliance" ADD CONSTRAINT "OrganizationCompliance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "OrganizationCompliance" ("id", "organizationId", "createdAt", "updatedAt")
SELECT md5('organization-compliance:' || "id"), "id", "createdAt", CURRENT_TIMESTAMP
FROM "Organization";
