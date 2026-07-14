"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvitationChannel = exports.MagicLinkChannel = exports.PasswordResetChannel = exports.WhatsAppChannel = exports.SmsChannel = exports.EmailChannel = void 0;
const node_crypto_1 = require("node:crypto");
const client_1 = require("@prisma/client");
class EmailChannel {
    channel = client_1.VerificationChannel.EMAIL;
    generate() { return (0, node_crypto_1.randomBytes)(32).toString('base64url'); }
    prepareDelivery(verificationId, secret) { return { token: `${verificationId}.${secret}` }; }
    validate(secret) { return /^[A-Za-z0-9_-]{32,}$/.test(secret); }
    expire() { }
    destroy() { }
}
exports.EmailChannel = EmailChannel;
class UnsupportedChannel {
    generate() { throw new Error(`${this.channel} verification delivery is not implemented`); }
    prepareDelivery() { throw new Error(`${this.channel} verification delivery is not implemented`); }
    validate() { return false; }
    expire() { }
    destroy() { }
}
class OtpChannel {
    generate() { return String((0, node_crypto_1.randomInt)(100_000, 1_000_000)); }
    prepareDelivery(verificationId, secret) { return { token: `${verificationId}.${secret}` }; }
    validate(secret) { return /^\d{6}$/.test(secret); }
    expire() { }
    destroy() { }
}
class SmsChannel extends OtpChannel {
    channel = client_1.VerificationChannel.SMS;
}
exports.SmsChannel = SmsChannel;
class WhatsAppChannel extends OtpChannel {
    channel = client_1.VerificationChannel.WHATSAPP;
}
exports.WhatsAppChannel = WhatsAppChannel;
class PasswordResetChannel extends UnsupportedChannel {
    channel = client_1.VerificationChannel.EMAIL;
}
exports.PasswordResetChannel = PasswordResetChannel;
class MagicLinkChannel extends UnsupportedChannel {
    channel = client_1.VerificationChannel.EMAIL;
}
exports.MagicLinkChannel = MagicLinkChannel;
class InvitationChannel extends UnsupportedChannel {
    channel = client_1.VerificationChannel.EMAIL;
}
exports.InvitationChannel = InvitationChannel;
