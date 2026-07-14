import assert from 'node:assert/strict';
import test from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from '../dist/identity/dto/auth.dto.js';

test('registration DTO trims and normalizes names, email, and mobile', async () => {
  const dto = plainToInstance(RegisterDto, {
    firstName: ' Ada ', lastName: ' Lovelace ', email: ' ADA@EXAMPLE.COM ', password: 'correct-horse-battery-staple',
    countryCode: ' +1 ', mobile: '(415) 555-0100', registrationType: 'TENANT',
  });
  assert.equal((await validate(dto)).length, 0);
  assert.equal(dto.firstName, 'Ada');
  assert.equal(dto.email, 'ada@example.com');
  assert.equal(dto.mobile, '4155550100');
});

test('registration DTO rejects blank and control-character names', async () => {
  const dto = plainToInstance(RegisterDto, {
    firstName: '   ', lastName: 'Bad\u0000Name', email: 'ada@example.com', password: 'correct-horse-battery-staple',
    countryCode: '+1', mobile: '4155550100', registrationType: 'TENANT',
  });
  assert.ok((await validate(dto)).length >= 2);
});
