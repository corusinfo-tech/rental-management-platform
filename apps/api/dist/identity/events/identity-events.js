"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdentityEventType = void 0;
/** Central identity outbox taxonomy. Payloads contain identifiers only. */
exports.IdentityEventType = {
    VerificationCreated: 'VerificationCreated', VerificationResent: 'VerificationResent', VerificationVerified: 'VerificationVerified', VerificationExpired: 'VerificationExpired', VerificationRevoked: 'VerificationRevoked', VerificationAttemptsExceeded: 'VerificationAttemptsExceeded',
    EmailVerified: 'EmailVerified', SmsVerified: 'SmsVerified', WhatsAppVerified: 'WhatsAppVerified', PasswordResetCompleted: 'PasswordResetCompleted',
};
