CREATE TABLE "OrganizationSettings" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "dateFormat" TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
  "timeFormat" TEXT NOT NULL DEFAULT '24H',
  "language" TEXT NOT NULL DEFAULT 'en',
  "country" TEXT NOT NULL DEFAULT 'IN',
  "gstEnabled" BOOLEAN NOT NULL DEFAULT false,
  "gstNumber" TEXT,
  "invoicePrefix" TEXT NOT NULL DEFAULT 'INV',
  "invoiceSequence" INTEGER NOT NULL DEFAULT 1,
  "brandName" TEXT,
  "logoUrl" TEXT,
  "primaryColor" TEXT,
  "secondaryColor" TEXT,
  "notificationEmail" TEXT,
  "supportEmail" TEXT,
  "maintenanceEmail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationSettings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrganizationSettings_invoiceSequence_check" CHECK ("invoiceSequence" >= 1)
);

CREATE UNIQUE INDEX "OrganizationSettings_organizationId_key" ON "OrganizationSettings"("organizationId");
CREATE INDEX "OrganizationSettings_country_idx" ON "OrganizationSettings"("country");
ALTER TABLE "OrganizationSettings" ADD CONSTRAINT "OrganizationSettings_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Retain existing organization configuration as the initial separate settings
-- record without changing or deleting legacy columns.
INSERT INTO "OrganizationSettings" ("id", "organizationId", "timezone", "currency", "country", "createdAt", "updatedAt")
SELECT md5('organization-settings:' || "id"), "id", "timezone", "currency", "country", "createdAt", CURRENT_TIMESTAMP
FROM "Organization";
