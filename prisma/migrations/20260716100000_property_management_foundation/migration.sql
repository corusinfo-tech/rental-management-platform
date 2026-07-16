-- Property Management Foundation. This additive migration introduces only the
-- Property aggregate and its supporting hierarchy; rental lifecycle data is out of scope.

CREATE TYPE "PropertyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');
CREATE TYPE "PropertyType" AS ENUM ('RESIDENTIAL', 'COMMERCIAL', 'MIXED_USE', 'LAND');
CREATE TYPE "UnitStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'ARCHIVED');
CREATE TYPE "OccupancyStatus" AS ENUM ('VACANT', 'OCCUPIED', 'RESERVED');
CREATE TYPE "PropertyDocumentType" AS ENUM ('TITLE_DEED', 'LEASE_DOCUMENT', 'TAX_DOCUMENT', 'INSURANCE', 'FLOOR_PLAN', 'OTHER');

CREATE TABLE "Property" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "ownerUserId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "propertyType" "PropertyType" NOT NULL,
  "status" "PropertyStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PropertyAddress" (
  "id" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "line1" TEXT NOT NULL,
  "line2" TEXT,
  "locality" TEXT,
  "city" TEXT NOT NULL,
  "state" TEXT,
  "postalCode" TEXT,
  "country" TEXT NOT NULL,
  "latitude" DECIMAL(10,7),
  "longitude" DECIMAL(10,7),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PropertyAddress_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PropertyAddress_latitude_check" CHECK ("latitude" IS NULL OR ("latitude" >= -90 AND "latitude" <= 90)),
  CONSTRAINT "PropertyAddress_longitude_check" CHECK ("longitude" IS NULL OR ("longitude" >= -180 AND "longitude" <= 180))
);

CREATE TABLE "Building" (
  "id" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Building_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Building_sort_order_check" CHECK ("sortOrder" >= 0)
);

CREATE TABLE "Floor" (
  "id" TEXT NOT NULL,
  "buildingId" TEXT NOT NULL,
  "number" INTEGER NOT NULL,
  "name" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Floor_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Floor_sort_order_check" CHECK ("sortOrder" >= 0)
);

CREATE TABLE "Unit" (
  "id" TEXT NOT NULL,
  "floorId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT,
  "unitType" TEXT,
  "status" "UnitStatus" NOT NULL DEFAULT 'ACTIVE',
  "occupancyStatus" "OccupancyStatus" NOT NULL DEFAULT 'VACANT',
  "bedrooms" INTEGER,
  "bathrooms" INTEGER,
  "areaSqFt" DECIMAL(12,2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Unit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Unit_bedrooms_check" CHECK ("bedrooms" IS NULL OR "bedrooms" >= 0),
  CONSTRAINT "Unit_bathrooms_check" CHECK ("bathrooms" IS NULL OR "bathrooms" >= 0),
  CONSTRAINT "Unit_area_check" CHECK ("areaSqFt" IS NULL OR "areaSqFt" > 0)
);

CREATE TABLE "UnitOccupancy" (
  "id" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "status" "OccupancyStatus" NOT NULL,
  "occupantName" TEXT,
  "occupantEmail" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UnitOccupancy_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UnitOccupancy_dates_check" CHECK ("endsAt" IS NULL OR "endsAt" > "startsAt")
);

CREATE TABLE "PropertyAmenity" (
  "id" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PropertyAmenity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PropertyDocument" (
  "id" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "type" "PropertyDocumentType" NOT NULL DEFAULT 'OTHER',
  "name" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "PropertyDocument_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PropertyDocument_size_check" CHECK ("sizeBytes" >= 0)
);

CREATE TABLE "PropertyImage" (
  "id" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "altText" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isCover" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "PropertyImage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PropertyImage_sort_order_check" CHECK ("sortOrder" >= 0)
);

CREATE TABLE "PropertyOwnership" (
  "id" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "share" DECIMAL(5,2) NOT NULL DEFAULT 100,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PropertyOwnership_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PropertyOwnership_share_check" CHECK ("share" > 0 AND "share" <= 100)
);

CREATE UNIQUE INDEX "Property_organizationId_code_key" ON "Property"("organizationId", "code");
CREATE INDEX "Property_organizationId_status_deletedAt_idx" ON "Property"("organizationId", "status", "deletedAt");
CREATE INDEX "Property_organizationId_name_idx" ON "Property"("organizationId", "name");
CREATE INDEX "Property_ownerUserId_deletedAt_idx" ON "Property"("ownerUserId", "deletedAt");
CREATE UNIQUE INDEX "PropertyAddress_propertyId_key" ON "PropertyAddress"("propertyId");
CREATE INDEX "PropertyAddress_country_city_idx" ON "PropertyAddress"("country", "city");
CREATE UNIQUE INDEX "Building_propertyId_code_key" ON "Building"("propertyId", "code");
CREATE INDEX "Building_propertyId_deletedAt_sortOrder_idx" ON "Building"("propertyId", "deletedAt", "sortOrder");
CREATE UNIQUE INDEX "Floor_buildingId_number_key" ON "Floor"("buildingId", "number");
CREATE INDEX "Floor_buildingId_deletedAt_sortOrder_idx" ON "Floor"("buildingId", "deletedAt", "sortOrder");
CREATE UNIQUE INDEX "Unit_floorId_code_key" ON "Unit"("floorId", "code");
CREATE INDEX "Unit_floorId_status_occupancyStatus_deletedAt_idx" ON "Unit"("floorId", "status", "occupancyStatus", "deletedAt");
CREATE INDEX "UnitOccupancy_unitId_status_startsAt_idx" ON "UnitOccupancy"("unitId", "status", "startsAt");
CREATE UNIQUE INDEX "PropertyAmenity_propertyId_name_key" ON "PropertyAmenity"("propertyId", "name");
CREATE INDEX "PropertyAmenity_propertyId_idx" ON "PropertyAmenity"("propertyId");
CREATE UNIQUE INDEX "PropertyDocument_propertyId_storageKey_key" ON "PropertyDocument"("propertyId", "storageKey");
CREATE INDEX "PropertyDocument_propertyId_type_deletedAt_idx" ON "PropertyDocument"("propertyId", "type", "deletedAt");
CREATE UNIQUE INDEX "PropertyImage_propertyId_storageKey_key" ON "PropertyImage"("propertyId", "storageKey");
CREATE INDEX "PropertyImage_propertyId_deletedAt_sortOrder_idx" ON "PropertyImage"("propertyId", "deletedAt", "sortOrder");
CREATE UNIQUE INDEX "PropertyOwnership_propertyId_userId_key" ON "PropertyOwnership"("propertyId", "userId");
CREATE INDEX "PropertyOwnership_userId_idx" ON "PropertyOwnership"("userId");
CREATE UNIQUE INDEX "PropertyImage_one_cover_per_property" ON "PropertyImage"("propertyId") WHERE "isCover" = true AND "deletedAt" IS NULL;

ALTER TABLE "Property" ADD CONSTRAINT "Property_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Property" ADD CONSTRAINT "Property_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PropertyAddress" ADD CONSTRAINT "PropertyAddress_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Building" ADD CONSTRAINT "Building_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Floor" ADD CONSTRAINT "Floor_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UnitOccupancy" ADD CONSTRAINT "UnitOccupancy_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PropertyAmenity" ADD CONSTRAINT "PropertyAmenity_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PropertyDocument" ADD CONSTRAINT "PropertyDocument_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PropertyImage" ADD CONSTRAINT "PropertyImage_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PropertyOwnership" ADD CONSTRAINT "PropertyOwnership_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PropertyOwnership" ADD CONSTRAINT "PropertyOwnership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
