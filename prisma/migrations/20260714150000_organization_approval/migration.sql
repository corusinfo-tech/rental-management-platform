CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "OrganizationApproval" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedByUserId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationApproval_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizationApproval_organizationId_key" ON "OrganizationApproval"("organizationId");
CREATE INDEX "OrganizationApproval_status_createdAt_idx" ON "OrganizationApproval"("status", "createdAt");
CREATE INDEX "OrganizationApproval_reviewedByUserId_reviewedAt_idx" ON "OrganizationApproval"("reviewedByUserId", "reviewedAt");
ALTER TABLE "OrganizationApproval" ADD CONSTRAINT "OrganizationApproval_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrganizationApproval" ADD CONSTRAINT "OrganizationApproval_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Landlord organizations are the only current organization type that enters
-- administrative approval. Existing records are backfilled without altering
-- organization lifecycle status.
INSERT INTO "OrganizationApproval" ("id", "organizationId", "createdAt", "updatedAt")
SELECT md5('organization-approval:' || "id"), "id", "createdAt", CURRENT_TIMESTAMP
FROM "Organization"
WHERE "organizationType" = 'LANDLORD';
