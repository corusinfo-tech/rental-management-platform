import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../../../prisma/migrations/20260719120000_phase1_authorization_isolation/migration.sql',
  import.meta.url,
);

test('Phase 1 migration is additive and retains rollback-compatible legacy structures', async () => {
  const sql = await readFile(migrationUrl, 'utf8');
  assert.doesNotMatch(sql, /DROP\s+(TABLE|COLUMN|TYPE)/i);
  assert.match(sql, /CREATE TABLE "PlatformPrincipal"/);
  assert.match(sql, /CREATE TABLE "PropertyPortfolioAssignment"/);
  assert.match(sql, /ALTER TABLE "Property" ALTER COLUMN "ownerUserId" DROP NOT NULL/);
});

test('Phase 1 backfills platform principals, settings, and only unambiguous payment property scope', async () => {
  const sql = await readFile(migrationUrl, 'utf8');
  assert.match(sql, /platform-principal:/);
  assert.match(sql, /ON CONFLICT \("userId"\) DO NOTHING/);
  assert.match(sql, /organization-settings:/);
  assert.match(sql, /ON CONFLICT \("organizationId"\) DO NOTHING/);
  assert.match(sql, /HAVING COUNT\(DISTINCT p\."id"\) = 1/);
});

test('Phase 1 tenant linkage is verification-backed and legacy non-proprietor OWNER grants are removed', async () => {
  const sql = await readFile(migrationUrl, 'utf8');
  assert.match(sql, /LeaseParty_linkVerificationId_fkey/);
  assert.match(sql, /REFERENCES "Verification"\("id"\)/);
  assert.match(sql, /DELETE FROM "MembershipRole"/);
  assert.match(sql, /membership\."isOwner" = false/);
});
