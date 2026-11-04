import { createTransport, type Transporter } from 'nodemailer';
import type { MailMessage, MailProvider } from './mail.provider';

/**
 * nodemailer waits up to 2 minutes for a connection by default. Hosts that silently drop SMTP traffic
 * (Render's free tier blocks ports 25/465/587) would keep each attempt open that long, so give up sooner.
 */
const DEFAULT_TIMEOUT_MS = 10_000;

/** Sends through any SMTP server given as a URL (Mailpit locally, Gmail or another service in production). */
export class SmtpMailProvider implements MailProvider {
  private readonly transport: Transporter;

  constructor(url: string, from: string, options: { timeoutMs?: number } = {}) {
    const timeout = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.transport = createTransport(
      { url, connectionTimeout: timeout, greetingTimeout: timeout, socketTimeout: timeout * 3 },
      { from },
    );
  }

  async send({ to, subject, html, text }: MailMessage): Promise<void> {
    await this.transport.sendMail({ to, subject, html, text });
  }
}
