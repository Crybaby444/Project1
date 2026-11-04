import type { MailRecipient } from '../mail/mail.service';

/** Delivers phone confirmation codes. A real SMS service can replace the mailbox simulation later. */
export interface SmsProvider {
  send(user: MailRecipient, phone: string, code: string): Promise<void>;
}

/** Injection token: the configured SmsProvider, or null when phone confirmation is switched off. */
export const SMS_PROVIDER = Symbol('SMS_PROVIDER');
