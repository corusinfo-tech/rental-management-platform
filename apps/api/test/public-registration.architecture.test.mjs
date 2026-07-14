import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const controller = readFileSync(new URL('../src/identity/controllers/identity.controller.ts', import.meta.url), 'utf8');
const service = readFileSync(new URL('../src/identity/registration/public-registration.service.ts', import.meta.url), 'utf8');

test('identity controller exposes registration and documented session endpoints', () => {
  assert.match(controller, /@Controller\(\{ path: 'auth', version: '1' \}\)/);
  assert.match(controller, /@Post\('register'\)/);
  assert.match(controller, /HttpStatus\.ACCEPTED/);
  assert.match(controller, /ApiAcceptedResponse/);
  assert.match(controller, /ApiBadRequestResponse/);
  assert.match(controller, /ApiTooManyRequestsResponse/);
  assert.match(controller, /@Post\('login'\)/);
  assert.match(controller, /@Post\('logout'\)/);
  assert.match(controller, /@Post\('logout-all'\)/);
  assert.match(controller, /@Get\('sessions'\)/);
  assert.match(controller, /@Delete\('sessions\/:sessionId'\)/);
  assert.match(controller, /@Post\('refresh'\)/);
});

test('registration is atomic and does not issue tokens', () => {
  assert.match(service, /\.withTransaction\(/);
  assert.match(service, /createOutboxEvent/);
  assert.doesNotMatch(service, /JwtService|signAsync|accessToken|refreshToken/);
});
