import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeEmail, normalizeMobile } from '../dist/identity/registration/normalization.js';

test('normalizes public registration email addresses', () => {
  assert.equal(normalizeEmail('  Ada.Lovelace@Example.COM '), 'ada.lovelace@example.com');
});

test('normalizes a national mobile number to E.164', () => {
  assert.equal(normalizeMobile('+1', '(415) 555-0100'), '+14155550100');
});

test('rejects a mobile number that cannot form E.164', () => {
  assert.throws(() => normalizeMobile('+0', '12345'));
  assert.throws(() => normalizeMobile('+1', '123'));
});
