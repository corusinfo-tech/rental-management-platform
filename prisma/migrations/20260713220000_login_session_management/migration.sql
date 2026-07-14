ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "membershipId" TEXT;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "deviceId" TEXT;
CREATE INDEX IF NOT EXISTS "Session_membershipId_idx" ON "Session"("membershipId");
CREATE INDEX IF NOT EXISTS "Session_organizationId_idx" ON "Session"("organizationId");
ALTER TABLE "Session" ADD CONSTRAINT "Session_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "OrganizationMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
