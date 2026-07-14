ALTER TABLE "Role" ADD COLUMN "description" TEXT;
ALTER TABLE "Role" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "RolePermission" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "MembershipRole" ADD COLUMN "assignedByUserId" TEXT;
ALTER TABLE "MembershipRole" ADD COLUMN "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "MembershipRole_assignedByUserId_idx" ON "MembershipRole"("assignedByUserId");
ALTER TABLE "MembershipRole" ADD CONSTRAINT "MembershipRole_assignedByUserId_fkey"
  FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- An organization can expose at most one default custom role. System roles are
-- global templates and cannot be defaults for a specific organization.
CREATE UNIQUE INDEX "Role_one_default_per_organization"
  ON "Role"("organizationId") WHERE "isDefault" = true AND "deletedAt" IS NULL;
CREATE UNIQUE INDEX "Role_one_active_custom_name_per_organization"
  ON "Role"("organizationId", lower("name")) WHERE "isSystem" = false AND "deletedAt" IS NULL;
