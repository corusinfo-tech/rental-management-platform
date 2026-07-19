-- Representative data inserted after the pre-Phase-1 migrations and before
-- 20260719120000_phase1_authorization_isolation. IDs are deterministic so the
-- validation queries can report exact before/after counts.

INSERT INTO "Organization" ("id", "code", "name", "status", "timezone", "currency", "country", "createdAt", "updatedAt") VALUES
  ('org-a', 'org-a', 'Organization A', 'ACTIVE', 'Asia/Kolkata', 'INR', 'IN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('org-b', 'org-b', 'Organization B', 'ACTIVE', 'UTC', 'USD', 'US', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "Person" ("id", "firstName", "lastName", "createdAt", "updatedAt") VALUES
  ('person-platform', 'Platform', 'Admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('person-proprietor', 'Organization', 'Proprietor', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('person-asset', 'Legacy', 'Asset Owner', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "User" ("id", "personId", "email", "passwordHash", "status", "createdAt", "updatedAt") VALUES
  ('user-platform', 'person-platform', 'platform@example.test', '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$hIgXfIyfDEUXaEUa0+Qf2SZpB8YIH4SFi2yZ0ElAFzs', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('user-proprietor', 'person-proprietor', 'proprietor@example.test', '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$hIgXfIyfDEUXaEUa0+Qf2SZpB8YIH4SFi2yZ0ElAFzs', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('user-asset', 'person-asset', 'asset@example.test', '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$hIgXfIyfDEUXaEUa0+Qf2SZpB8YIH4SFi2yZ0ElAFzs', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "Role" ("id", "organizationId", "code", "name", "isSystem", "isDefault", "createdAt", "updatedAt") VALUES
  ('role-super-admin', NULL, 'SUPER_ADMIN', 'Legacy Platform Super Administrator', true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('role-owner', NULL, 'OWNER', 'Legacy Owner', true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "OrganizationMembership" ("id", "organizationId", "personId", "status", "isOwner", "joinedAt", "createdAt", "updatedAt") VALUES
  ('membership-platform', 'org-a', 'person-platform', 'ACTIVE', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('membership-proprietor', 'org-a', 'person-proprietor', 'ACTIVE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('membership-asset', 'org-a', 'person-asset', 'ACTIVE', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "MembershipRole" ("membershipId", "roleId", "assignedAt") VALUES
  ('membership-platform', 'role-super-admin', CURRENT_TIMESTAMP),
  ('membership-proprietor', 'role-owner', CURRENT_TIMESTAMP),
  ('membership-asset', 'role-owner', CURRENT_TIMESTAMP);

INSERT INTO "Property" ("id", "organizationId", "ownerUserId", "code", "name", "propertyType", "status", "createdAt", "updatedAt") VALUES
  ('property-a1', 'org-a', 'user-asset', 'A1', 'Property A1', 'RESIDENTIAL', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('property-a2', 'org-a', 'user-proprietor', 'A2', 'Property A2', 'COMMERCIAL', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('property-b1', 'org-b', 'user-proprietor', 'B1', 'Property B1', 'RESIDENTIAL', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "Building" ("id", "propertyId", "code", "name", "createdAt", "updatedAt") VALUES
  ('building-a1', 'property-a1', 'MAIN', 'A1 Building', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('building-a2', 'property-a2', 'MAIN', 'A2 Building', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('building-b1', 'property-b1', 'MAIN', 'B1 Building', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "Floor" ("id", "buildingId", "number", "createdAt", "updatedAt") VALUES
  ('floor-a1', 'building-a1', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('floor-a2', 'building-a2', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('floor-b1', 'building-b1', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "Unit" ("id", "floorId", "code", "status", "occupancyStatus", "createdAt", "updatedAt") VALUES
  ('unit-a1', 'floor-a1', '101', 'ACTIVE', 'OCCUPIED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('unit-a2', 'floor-a2', '101', 'ACTIVE', 'OCCUPIED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('unit-b1', 'floor-b1', '101', 'ACTIVE', 'OCCUPIED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "Lease" ("id", "organizationId", "unitId", "code", "status", "startsAt", "endsAt", "createdAt", "updatedAt") VALUES
  ('lease-a1', 'org-a', 'unit-a1', 'LEASE-A1', 'ACTIVE', '2026-01-01', '2027-01-01', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('lease-a2', 'org-a', 'unit-a2', 'LEASE-A2', 'ACTIVE', '2026-01-01', '2027-01-01', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('lease-b1', 'org-b', 'unit-b1', 'LEASE-B1', 'ACTIVE', '2026-01-01', '2027-01-01', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "LeaseParty" ("id", "leaseId", "role", "name", "email", "createdAt", "updatedAt") VALUES
  ('party-a1', 'lease-a1', 'TENANT', 'Unlinked Tenant', 'tenant@example.test', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "LeaseBillingCalendar" ("id", "leaseId", "billingCycle", "prorationMethod", "status", "createdAt", "updatedAt") VALUES
  ('calendar-a1', 'lease-a1', 'MONTHLY', 'DAILY', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('calendar-a2', 'lease-a2', 'MONTHLY', 'DAILY', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('calendar-b1', 'lease-b1', 'MONTHLY', 'DAILY', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "LeaseRentSchedule" ("id", "calendarId", "sequence", "periodStartsAt", "periodEndsAt", "dueAt", "rentAmount", "totalDue", "createdAt", "updatedAt") VALUES
  ('schedule-a1', 'calendar-a1', 1, '2026-07-01', '2026-08-01', '2026-07-01', 100, 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('schedule-a2', 'calendar-a2', 1, '2026-07-01', '2026-08-01', '2026-07-01', 100, 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('schedule-b1', 'calendar-b1', 1, '2026-07-01', '2026-08-01', '2026-07-01', 100, 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "Invoice" ("id", "organizationId", "leaseId", "rentScheduleId", "invoiceNumber", "status", "dueAt", "currency", "subtotal", "total", "outstandingBalance", "createdAt", "updatedAt") VALUES
  ('invoice-a1', 'org-a', 'lease-a1', 'schedule-a1', 'INV-A1', 'ISSUED', '2026-07-01', 'INR', 100, 100, 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('invoice-a2', 'org-a', 'lease-a2', 'schedule-a2', 'INV-A2', 'ISSUED', '2026-07-01', 'INR', 100, 100, 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('invoice-b1', 'org-b', 'lease-b1', 'schedule-b1', 'INV-B1', 'ISSUED', '2026-07-01', 'USD', 100, 100, 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "Payment" ("id", "organizationId", "paymentNumber", "method", "purpose", "status", "currency", "amount", "allocatedAmount", "unappliedAmount", "paidAt", "createdAt", "updatedAt") VALUES
  ('payment-single', 'org-a', 'PAY-SINGLE', 'CASH', 'INVOICE', 'COMPLETED', 'INR', 100, 100, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('payment-multi', 'org-a', 'PAY-MULTI', 'CASH', 'INVOICE', 'COMPLETED', 'INR', 200, 200, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('payment-cross-org', 'org-b', 'PAY-CROSS', 'CASH', 'INVOICE', 'COMPLETED', 'INR', 100, 100, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "PaymentAllocation" ("id", "paymentId", "invoiceId", "amount") VALUES
  ('allocation-single', 'payment-single', 'invoice-a1', 100),
  ('allocation-multi-a1', 'payment-multi', 'invoice-a1', 100),
  ('allocation-multi-a2', 'payment-multi', 'invoice-a2', 100),
  ('allocation-cross', 'payment-cross-org', 'invoice-a1', 100);
