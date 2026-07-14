import assert from 'node:assert/strict';
import test from 'node:test';
import { EmailChannel, InvitationChannel, MagicLinkChannel, PasswordResetChannel, SmsChannel, WhatsAppChannel } from '../dist/identity/verification-engine/verification-channel.js';

test('email channel creates an opaque token suitable for an encrypted delivery envelope', () => {
  const channel = new EmailChannel();
  const secret = channel.generate();
  assert.equal(channel.validate(secret), true);
  assert.match(channel.prepareDelivery('verification-id', secret).token, /^verification-id\.[A-Za-z0-9_-]{32,}$/);
});

test('SMS channel generates and validates six-digit OTPs while provider delivery remains separate', () => {
  const sms = new SmsChannel(); const otp = sms.generate();
  assert.match(otp, /^\d{6}$/);
  assert.equal(sms.validate(otp), true);
  assert.equal(sms.validate('12345'), false);
});

test('WhatsApp channel reuses the same six-digit OTP strategy', () => {
  const channel = new WhatsAppChannel(); const otp = channel.generate();
  assert.match(otp, /^\d{6}$/); assert.equal(channel.validate(otp), true);
});

test('remaining unimplemented channels are explicit provider-free stubs', () => {
  for (const channel of [new PasswordResetChannel(), new MagicLinkChannel(), new InvitationChannel()]) {
    assert.equal(channel.validate('anything'), false);
    assert.throws(() => channel.generate(), /not implemented/);
  }
});
