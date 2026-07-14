CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'REVOKED');

CREATE TABLE "OrganizationInvitation" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "invitedByUserId" TEXT NOT NULL,
  "verificationId" TEXT NOT NULL,
  "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "declinedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationInvitation_email_normalized_check" CHECK ("email" = lower(btrim("email"))),
  CONSTRAINT "OrganizationInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizationInvitation_verificationId_key" ON "OrganizationInvitation"("verificationId");
CREATE UNIQUE INDEX "OrganizationInvitation_one_pending_email_per_organization" ON "OrganizationInvitation"("organizationId", "email") WHERE "status" = 'PENDING';
CREATE INDEX "OrganizationInvitation_organizationId_status_expiresAt_idx" ON "OrganizationInvitation"("organizationId", "status", "expiresAt");
CREATE INDEX "OrganizationInvitation_email_status_expiresAt_idx" ON "OrganizationInvitation"("email", "status", "expiresAt");
CREATE INDEX "OrganizationInvitation_roleId_idx" ON "OrganizationInvitation"("roleId");
CREATE INDEX "OrganizationInvitation_invitedByUserId_createdAt_idx" ON "OrganizationInvitation"("invitedByUserId", "createdAt");

ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "Verification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
