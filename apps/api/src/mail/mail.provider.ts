import { Logger } from '@nestjs/common';
import type { Env } from '../config/env';
import { SmtpMailProvider } from './smtp-mail.provider';

/** Names of the transactional emails, used for logs (never the content). */
export type MailTemplate = 'verify-email' | 'reset-password' | 'phone-code';

export interface MailMessage {
  template: MailTemplate;
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Where mail goes: SMTP today, any other service later without touching the senders. */
export interface MailProvider {
  send(message: MailMessage): Promise<void>;
}

/** Injection token for the MailProvider. */
export const MAIL_PROVIDER = Symbol('MAIL_PROVIDER');

/** `anna@mail.lv` → `a***@mail.lv`: enough to tell recipients apart in logs, not enough to read them. */
export function maskEmail(address: string): string {
  const at = address.lastIndexOf('@');
  if (at < 1) return '***';
  return `${address[0]}***${address.slice(at)}`;
}

/** Used when no mail server is configured (production before SMTP_URL is set): sends nothing. */
export class DisabledMailProvider implements MailProvider {
  private readonly logger = new Logger('Mail');

  async send(message: MailMessage): Promise<void> {
    this.logger.warn(`mail disabled: ${message.template} to ${maskEmail(message.to)} was not sent`);
  }
}

export function createMailProvider(env: Pick<Env, 'SMTP_URL' | 'MAIL_FROM'>): MailProvider {
  if (env.SMTP_URL) return new SmtpMailProvider(env.SMTP_URL, env.MAIL_FROM);
  new Logger('Mail').warn('SMTP_URL is not set: emails are not sent (mail disabled)');
  return new DisabledMailProvider();
}
