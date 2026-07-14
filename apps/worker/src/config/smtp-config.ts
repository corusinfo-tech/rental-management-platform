export type SmtpConfig = { host: string; port: number; username?: string; password?: string; secure: boolean; from: string; replyTo?: string };
const required = (e: Record<string, string | undefined>, k: string) => { const v = e[k]?.trim(); if (!v) throw new Error(`Missing required SMTP configuration: ${k}`); return v; };
export function validateSmtpConfig(e: Record<string, string | undefined>): SmtpConfig {
  const port = Number(required(e, 'SMTP_PORT')); if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error('SMTP_PORT must be a valid port');
  const username = e.SMTP_USERNAME?.trim(); const password = e.SMTP_PASSWORD; if (Boolean(username) !== Boolean(password)) throw new Error('SMTP_USERNAME and SMTP_PASSWORD must be provided together');
  return { host: required(e, 'SMTP_HOST'), port, username, password, secure: e.SMTP_SECURE === 'true', from: required(e, 'SMTP_FROM'), replyTo: e.SMTP_REPLY_TO?.trim() || undefined };
}
