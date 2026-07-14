"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeEmail = normalizeEmail;
exports.normalizeMobile = normalizeMobile;
const common_1 = require("@nestjs/common");
const E164_PATTERN = /^\+[1-9]\d{7,14}$/;
function normalizeEmail(email) {
    return email.trim().toLowerCase();
}
function normalizeMobile(countryCode, mobile) {
    const normalizedCountryCode = countryCode.trim();
    const nationalNumber = mobile.replace(/\D/g, '');
    const normalized = `${normalizedCountryCode}${nationalNumber}`;
    if (!E164_PATTERN.test(normalized)) {
        throw new common_1.BadRequestException('Mobile number must form a valid E.164 number');
    }
    return normalized;
}
