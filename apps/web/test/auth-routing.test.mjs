import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('browser authentication uses a route outside the production /api proxy namespace', async () => {
  const [provider, proxy, route] = await Promise.all([
    source('components/auth/auth-provider.tsx'),
    source('lib/auth-proxy.ts'),
    source('app/auth-api/[...path]/route.ts'),
  ]);
  assert.match(provider, /AUTH_API_BASE/);
  assert.doesNotMatch(provider, /fetch\('\/api\/auth\/login/);
  assert.match(proxy, /\/api\/v1\/auth\//);
  assert.match(route, /handleAuthProxy/);
});

test('all public authentication screens and protected management screens exist', async () => {
  const paths = [
    'app/login/page.tsx', 'app/register/page.tsx', 'app/verify-email/page.tsx',
    'app/forgot-password/page.tsx', 'app/reset-password/page.tsx',
    'app/dashboard/page.tsx', 'app/properties/page.tsx', 'app/leases/page.tsx',
    'app/invoices/page.tsx', 'app/payments/page.tsx', 'app/settings/page.tsx',
  ];
  for (const path of paths) assert.ok((await source(path)).length > 0, `${path} must not be empty`);
  assert.doesNotMatch(await source('app/dashboard/page.tsx'), /later milestone/);
});

test('refresh token remains server-managed through an HttpOnly cookie', async () => {
  const proxy = await source('lib/auth-proxy.ts');
  assert.match(proxy, /httpOnly:\s*true/);
  assert.match(proxy, /sameSite:\s*'strict'/);
  assert.match(proxy, /secure:\s*isProductionRuntime\(\)/);
});
