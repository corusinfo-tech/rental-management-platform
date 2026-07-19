import assert from 'node:assert/strict';
import test, { before } from 'node:test';

const apiUrl = process.env.PHASE1_TEST_API_URL;
if (!apiUrl) throw new Error('PHASE1_TEST_API_URL is required for Phase 1 HTTP validation');

const password = 'Phase1Test!123';
const organizationA = '11111111-1111-4111-8111-111111111111';
const organizationB = '22222222-2222-4222-8222-222222222222';
const propertyA1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const propertyA2 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
const principals = [
  'platform',
  'proprietor',
  'admin',
  'manager',
  'finance',
  'asset',
  'tenant',
  'outsider',
  'suspended',
  'second_admin',
];
const emails = {
  platform: 'platform@example.test',
  proprietor: 'proprietor@example.test',
  admin: 'admin@example.test',
  manager: 'manager@example.test',
  finance: 'finance@example.test',
  asset: 'asset@example.test',
  tenant: 'tenant@example.test',
  outsider: 'outsider@example.test',
  suspended: 'suspended@example.test',
  second_admin: 'second.admin@example.test',
};
const tokens = {};

async function request(path, token) {
  const response = await fetch(`${apiUrl}${path}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  return { response, payload };
}

async function login(label) {
  const response = await fetch(`${apiUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-device-id': `phase1-${label}` },
    body: JSON.stringify({ identifier: emails[label], password }),
  });
  const payload = await response.json();
  assert.equal(response.status, 200, `${label} login failed: ${JSON.stringify(payload)}`);
  return payload.data.accessToken;
}

before(async () => {
  for (const principal of principals) tokens[principal] = await login(principal);
});

test('platform administrator uses the platform workspace and not organization membership scope', async () => {
  assert.equal(
    (await request('/api/v1/admin/organizations/pending', tokens.platform)).response.status,
    200,
  );
  assert.equal(
    (await request(`/api/v1/organizations/${organizationA}/properties`, tokens.platform)).response
      .status,
    403,
  );
});

test('organization proprietor has explicit organization-wide scope', async () => {
  const result = await request(
    `/api/v1/organizations/${organizationA}/properties`,
    tokens.proprietor,
  );
  assert.equal(result.response.status, 200);
  assert.equal(result.payload.data.pagination.total, 2);
});

test('organization administrator has explicit organization-wide scope', async () => {
  const result = await request(`/api/v1/organizations/${organizationA}/properties`, tokens.admin);
  assert.equal(result.response.status, 200);
  assert.equal(result.payload.data.pagination.total, 2);
});

test('property manager sees only assigned property and direct unassigned IDs are denied', async () => {
  const list = await request(`/api/v1/organizations/${organizationA}/properties`, tokens.manager);
  assert.equal(list.response.status, 200);
  assert.deepEqual(
    list.payload.data.items.map(({ id }) => id),
    [propertyA1],
  );
  assert.equal(
    (
      await request(
        `/api/v1/organizations/${organizationA}/properties/${propertyA2}`,
        tokens.manager,
      )
    ).response.status,
    403,
  );
  assert.equal(
    (await request(`/api/v1/organizations/${organizationB}/properties`, tokens.manager)).response
      .status,
    403,
  );
});

test('finance user sees assigned invoices/payments but cannot enter property management', async () => {
  const invoices = await request(`/api/v1/organizations/${organizationA}/invoices`, tokens.finance);
  const payments = await request(`/api/v1/organizations/${organizationA}/payments`, tokens.finance);
  assert.equal(invoices.response.status, 200);
  assert.equal(invoices.payload.data.pagination.total, 1);
  assert.equal(payments.response.status, 200);
  assert.equal(payments.payload.data.pagination.total, 1);
  assert.equal(
    (await request(`/api/v1/organizations/${organizationA}/properties`, tokens.finance)).response
      .status,
    403,
  );
});

test('asset owner sees only the owned property', async () => {
  const list = await request(`/api/v1/organizations/${organizationA}/properties`, tokens.asset);
  assert.equal(list.response.status, 200);
  assert.deepEqual(
    list.payload.data.items.map(({ id }) => id),
    [propertyA1],
  );
  assert.equal(
    (await request(`/api/v1/organizations/${organizationA}/properties/${propertyA2}`, tokens.asset))
      .response.status,
    403,
  );
});

test('verified tenant is authenticated but cannot enter the management workspace', async () => {
  assert.equal((await request('/api/v1/auth/sessions', tokens.tenant)).response.status, 200);
  assert.equal(
    (await request(`/api/v1/organizations/${organizationA}/properties`, tokens.tenant)).response
      .status,
    403,
  );
});

test('outsider is denied organization access', async () => {
  assert.equal(
    (await request(`/api/v1/organizations/${organizationA}/properties`, tokens.outsider)).response
      .status,
    403,
  );
});

test('suspended membership loses organization access', async () => {
  assert.equal(
    (await request(`/api/v1/organizations/${organizationA}/properties`, tokens.suspended)).response
      .status,
    403,
  );
});

test('second organization administrator is isolated to the second organization', async () => {
  const own = await request(
    `/api/v1/organizations/${organizationB}/properties`,
    tokens.second_admin,
  );
  assert.equal(own.response.status, 200);
  assert.equal(own.payload.data.pagination.total, 1);
  assert.equal(
    (await request(`/api/v1/organizations/${organizationA}/properties`, tokens.second_admin))
      .response.status,
    403,
  );
});
