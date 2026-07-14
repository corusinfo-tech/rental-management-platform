-- Identity database foundation. This migration is additive: it creates the
-- identity tables on a clean database and contains no DROP statements.

CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "UserStatus" AS ENUM ('REGISTERED', 'ACTIVE', 'LOCKED', 'SUSPENDED', 'ARCHIVED');
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');
CREATE TYPE "VerificationChannel" AS ENUM ('EMAIL', 'WHATSAPP');
CREATE TYPE "VerificationPurpose" AS ENUM ('EMAIL_VERIFICATION', 'MOBILE_VERIFICATION', 'PASSWORD_RESET');
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'CONSUMED', 'EXPIRED', 'REVOKED');

CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobile" TEXT,
    "passwordHash" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'REGISTERED',
    "emailVerifiedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "User_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "User_email_normalized_check" CHECK ("email" = lower(btrim("email"))),
    CONSTRAINT "User_mobile_e164_check" CHECK ("mobile" IS NULL OR "mobile" ~ '^\\+[1-9][0-9]{1,14}$'),
    CONSTRAINT "User_password_hash_check" CHECK ("passwordHash" LIKE '$argon2%')
);

CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "Role_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Role_system_scope_check" CHECK (("isSystem" = false) OR "organizationId" IS NULL)
);

CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId", "permissionId")
);

CREATE TABLE "OrganizationMembership" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'INVITED',
    "joinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MembershipRole" (
    "membershipId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    CONSTRAINT "MembershipRole_pkey" PRIMARY KEY ("membershipId", "roleId")
);

CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "parentSessionId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "deviceName" TEXT,
    "userAgent" TEXT,
    "ipAddress" INET,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Session_refresh_token_hash_check" CHECK ("refreshTokenHash" LIKE '$argon2%'),
    CONSTRAINT "Session_expiry_check" CHECK ("expiresAt" > "createdAt")
);

CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "VerificationChannel" NOT NULL,
    "purpose" "VerificationPurpose" NOT NULL,
    "secretHash" TEXT NOT NULL,
    "providerRequestId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "lastAttemptAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Verification_secret_hash_check" CHECK ("secretHash" LIKE '$argon2%'),
    CONSTRAINT "Verification_attempt_bounds_check" CHECK ("attempts" >= 0 AND "maxAttempts" > 0 AND "attempts" <= "maxAttempts"),
    CONSTRAINT "Verification_expiry_check" CHECK ("expiresAt" > "createdAt")
);

CREATE TABLE "IdentityAuditEvent" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "subjectUserId" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IdentityAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_personId_key" ON "User"("personId");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_mobile_key" ON "User"("mobile");
CREATE INDEX "User_status_idx" ON "User"("status");
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");
CREATE INDEX "Person_deletedAt_idx" ON "Person"("deletedAt");
CREATE UNIQUE INDEX "Organization_code_key" ON "Organization"("code");
CREATE INDEX "Organization_deletedAt_idx" ON "Organization"("deletedAt");
CREATE UNIQUE INDEX "Role_organizationId_code_key" ON "Role"("organizationId", "code");
CREATE UNIQUE INDEX "Role_global_code_key" ON "Role"("code") WHERE "organizationId" IS NULL;
CREATE INDEX "Role_organizationId_deletedAt_idx" ON "Role"("organizationId", "deletedAt");
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");
CREATE INDEX "Permission_deletedAt_idx" ON "Permission"("deletedAt");
CREATE INDEX "OrganizationMembership_organizationId_status_idx" ON "OrganizationMembership"("organizationId", "status");
CREATE INDEX "OrganizationMembership_personId_status_idx" ON "OrganizationMembership"("personId", "status");
CREATE INDEX "OrganizationMembership_deletedAt_idx" ON "OrganizationMembership"("deletedAt");
CREATE UNIQUE INDEX "OrganizationMembership_organizationId_personId_key" ON "OrganizationMembership"("organizationId", "personId");
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");
CREATE INDEX "Session_familyId_revokedAt_expiresAt_idx" ON "Session"("familyId", "revokedAt", "expiresAt");
CREATE INDEX "Session_parentSessionId_idx" ON "Session"("parentSessionId");
CREATE INDEX "Verification_userId_purpose_status_expiresAt_idx" ON "Verification"("userId", "purpose", "status", "expiresAt");
CREATE INDEX "Verification_providerRequestId_idx" ON "Verification"("providerRequestId");
CREATE INDEX "IdentityAuditEvent_actorUserId_createdAt_idx" ON "IdentityAuditEvent"("actorUserId", "createdAt");
CREATE INDEX "IdentityAuditEvent_subjectUserId_createdAt_idx" ON "IdentityAuditEvent"("subjectUserId", "createdAt");

ALTER TABLE "User" ADD CONSTRAINT "User_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Role" ADD CONSTRAINT "Role_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MembershipRole" ADD CONSTRAINT "MembershipRole_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "OrganizationMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MembershipRole" ADD CONSTRAINT "MembershipRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IdentityAuditEvent" ADD CONSTRAINT "IdentityAuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IdentityAuditEvent" ADD CONSTRAINT "IdentityAuditEvent_subjectUserId_fkey" FOREIGN KEY ("subjectUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A private role belongs only to its organization. Global system roles may be
-- assigned to memberships in any organization. A trigger is required because
-- the invariant spans MembershipRole, OrganizationMembership, and Role.
CREATE FUNCTION "enforce_membership_role_organization"() RETURNS TRIGGER AS $$
DECLARE
  membership_organization_id TEXT;
  role_organization_id TEXT;
BEGIN
  SELECT "organizationId" INTO membership_organization_id
  FROM "OrganizationMembership" WHERE "id" = NEW."membershipId";
  SELECT "organizationId" INTO role_organization_id
  FROM "Role" WHERE "id" = NEW."roleId";

  IF membership_organization_id IS NULL OR (
    role_organization_id IS NOT NULL AND role_organization_id IS DISTINCT FROM membership_organization_id
  ) THEN
    RAISE EXCEPTION 'private role cannot be assigned outside its organization'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "MembershipRole_organization_guard"
BEFORE INSERT OR UPDATE ON "MembershipRole"
FOR EACH ROW EXECUTE FUNCTION "enforce_membership_role_organization"();

CREATE FUNCTION "enforce_verification_lifecycle"() RETURNS TRIGGER AS $$
BEGIN
  IF NEW."status" = 'CONSUMED' AND NEW."consumedAt" IS NOT NULL AND NEW."expiresAt" <= CURRENT_TIMESTAMP THEN
    RAISE EXCEPTION 'expired verification cannot be consumed' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Verification_lifecycle_guard"
BEFORE UPDATE ON "Verification"
FOR EACH ROW EXECUTE FUNCTION "enforce_verification_lifecycle"();
