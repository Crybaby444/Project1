import type { MailRecipient, MailService } from '../mail/mail.service';
import type { SmsProvider } from './sms.provider';

/**
 * SMS simulation for development and tests (SMS_PROVIDER=mailbox): the code goes to the user's email
 * (Mailpit locally), not to the phone. It proves nothing about the phone, so production refuses it.
 */
export class MailboxSmsProvider implements SmsProvider {
  constructor(private readonly mail: MailService) {}

  send(user: MailRecipient, _phone: string, code: string): Promise<void> {
    return this.mail.sendPhoneCode(user, code);
  }
}
