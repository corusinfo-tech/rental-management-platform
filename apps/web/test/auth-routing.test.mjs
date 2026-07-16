import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const rootSource = (path) => readFile(new URL(`../../../${path}`, import.meta.url), 'utf8');

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
    'app/login/page.tsx',
    'app/register/page.tsx',
    'app/verify-email/page.tsx',
    'app/forgot-password/page.tsx',
    'app/reset-password/page.tsx',
    'app/dashboard/page.tsx',
    'app/properties/page.tsx',
    'app/leases/page.tsx',
    'app/invoices/page.tsx',
    'app/payments/page.tsx',
    'app/settings/page.tsx',
  ];
  for (const path of paths) assert.ok((await source(path)).length > 0, `${path} must not be empty`);
  assert.doesNotMatch(await source('app/dashboard/page.tsx'), /later milestone/);
});

test('refresh token remains server-managed through an HttpOnly cookie', async () => {
  const proxy = await source('lib/auth-proxy.ts');
  assert.match(proxy, /httpOnly:\s*true/);
  assert.match(proxy, /sameSite:\s*'strict'/);
  assert.match(proxy, /secure:\s*isProductionRuntime\(\)/);
  assert.match(proxy, /path:\s*cookiePath/);
  assert.doesNotMatch(proxy, /domain\s*:/i);
});

test('browser CSRF validation uses configured public origins and trusted proxy headers', async () => {
  const [authProxy, platformProxy, requestOrigin, runtime] = await Promise.all([
    source('lib/auth-proxy.ts'),
    source('app/platform-api/[...path]/route.ts'),
    source('lib/request-origin.ts'),
    source('lib/runtime-config.ts'),
  ]);
  assert.match(authProxy, /hasAllowedBrowserOrigin/);
  assert.match(platformProxy, /hasAllowedBrowserOrigin/);
  assert.doesNotMatch(authProxy, /origin === request\.nextUrl\.origin/);
  assert.match(requestOrigin, /x-forwarded-host/);
  assert.match(requestOrigin, /x-forwarded-proto/);
  assert.match(requestOrigin, /browserOrigin !== requestOrigin/);
  assert.match(runtime, /process\.env\.WEB_ORIGIN/);
  assert.match(runtime, /http:\/\/localhost:3000/);
});

test('production compose passes WEB_ORIGIN without exposing an application secret to the browser bundle', async () => {
  const [compose, developmentEnvironment, productionEnvironment] = await Promise.all([
    rootSource('docker-compose.production.yml'),
    rootSource('.env.example'),
    rootSource('.env.production.example'),
  ]);
  assert.match(compose, /WEB_ORIGIN:\s*\$\{WEB_ORIGIN:\?set WEB_ORIGIN in \.env\.production\}/);
  assert.match(developmentEnvironment, /WEB_ORIGIN=http:\/\/localhost:3000/);
  assert.match(productionEnvironment, /WEB_ORIGIN=https:\/\/noagent4u\.com/);
});

test('authentication shell uses a centered responsive flex layout', async () => {
  const shell = await source('components/auth/auth-shell.tsx');
  assert.match(shell, /flex min-h-screen w-full items-center justify-center/);
  assert.match(shell, /mx-auto w-full max-w-md/);
  assert.match(shell, /lg:max-w-lg/);
});
