import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('dashboard requests real organization, property, lease, invoice, and payment endpoints', async () => {
  const source = await read('app/dashboard/page.tsx');
  for (const path of ['properties', 'leases', 'invoices', 'payments']) {
    assert.match(
      source,
      new RegExp(`PLATFORM_API_BASE}/organizations/\\$\\{organizationId\\}/${path}`),
    );
  }
  assert.match(source, /PLATFORM_API_BASE}\/organizations\/\$\{organizationId\}`/);
  assert.match(source, /requirePlatformData/);
});

test('management list pages use the authenticated BFF and reject unsuccessful envelopes', async () => {
  const [entityList, properties, settings, client, proxy] = await Promise.all([
    read('components/management/entity-list.tsx'),
    read('app/properties/page.tsx'),
    read('app/settings/page.tsx'),
    read('lib/platform-client.ts'),
    read('app/platform-api/[...path]/route.ts'),
  ]);
  assert.match(
    entityList,
    /authenticatedFetch\(`\$\{PLATFORM_API_BASE}\/organizations\/\$\{organizationId}\/\$\{path}/,
  );
  assert.match(
    properties,
    /authenticatedFetch\(`\$\{PLATFORM_API_BASE}\/organizations\/\$\{organizationId}\/properties/,
  );
  assert.match(
    settings,
    /authenticatedFetch\(`\$\{PLATFORM_API_BASE}\/organizations\/\$\{organizationId}\/settings/,
  );
  assert.match(client, /!response\.ok \|\| !payload\.success/);
  assert.match(proxy, /fetch\(`\$\{apiInternalUrl\(\)}\/api\/\$\{path}/);
  assert.match(proxy, /status: upstream\.status/);
});
