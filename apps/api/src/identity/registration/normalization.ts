import { BadRequestException } from '@nestjs/common';

const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeMobile(countryCode: string, mobile: string): string {
  const normalizedCountryCode = countryCode.trim();
  const nationalNumber = mobile.replace(/\D/g, '');
  const normalized = `${normalizedCountryCode}${nationalNumber}`;

  if (!E164_PATTERN.test(normalized)) {
    throw new BadRequestException('Mobile number must form a valid E.164 number');
  }

  return normalized;
}
