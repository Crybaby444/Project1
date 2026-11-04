import type { MailMessage, MailProvider } from '../../src/mail/mail.provider';

/** Collects mail instead of sending it. */
export class FakeMailProvider implements MailProvider {
  readonly sent: MailMessage[] = [];

  async send(message: MailMessage): Promise<void> {
    this.sent.push(message);
  }

  /** Mail sent to one address, oldest first. */
  to(address: string): MailMessage[] {
    return this.sent.filter((message) => message.to === address);
  }
}
