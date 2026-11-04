import { Inject, Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';
import { createElement, type ReactElement } from 'react';
import { render } from 'react-email';
import { MAIL_PROVIDER, maskEmail, type MailProvider, type MailTemplate } from './mail.provider';
import { PhoneCode } from './templates/PhoneCode';
import { ResetPassword } from './templates/ResetPassword';
import { textsFor, type MailTexts } from './templates/texts';
import { VerifyEmail } from './templates/VerifyEmail';

export interface MailRecipient {
  email: string;
  name: string;
  locale: string;
}

/** How long shutdown waits for mail that is still being sent. */
const SHUTDOWN_GRACE_MS = 10_000;

/**
 * Account emails in the recipient's language. Every send* resolves once the mail is handed over or has
 * failed, and never rejects: a failure is logged (template, masked address, reason, never the link or
 * code), so callers can fire and forget and the user can ask for the email again.
 */
@Injectable()
export class MailService implements OnApplicationShutdown {
  private readonly logger = new Logger('Mail');
  private readonly inFlight = new Set<Promise<void>>();

  constructor(@Inject(MAIL_PROVIDER) private readonly provider: MailProvider) {}

  sendVerifyEmail(user: MailRecipient, link: string): Promise<void> {
    return this.deliver('verify-email', user, (t) => t.verifyEmail.subject, (t, lang) =>
      createElement(VerifyEmail, { t, lang, name: user.name, link }),
    );
  }

  sendPasswordReset(user: MailRecipient, link: string): Promise<void> {
    return this.deliver('reset-password', user, (t) => t.resetPassword.subject, (t, lang) =>
      createElement(ResetPassword, { t, lang, name: user.name, link }),
    );
  }

  sendPhoneCode(user: MailRecipient, code: string): Promise<void> {
    return this.deliver('phone-code', user, (t) => t.phoneCode.subject, (t, lang) =>
      createElement(PhoneCode, { t, lang, name: user.name, code }),
    );
  }

  /** Resolves when every mail handed over so far has been sent or has failed. */
  async idle(): Promise<void> {
    while (this.inFlight.size > 0) await Promise.all([...this.inFlight]);
  }

  async onApplicationShutdown(): Promise<void> {
    let timer: NodeJS.Timeout | undefined;
    const grace = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, SHUTDOWN_GRACE_MS);
      timer.unref();
    });
    await Promise.race([this.idle(), grace]);
    clearTimeout(timer);
  }

  private deliver(
    template: MailTemplate,
    user: MailRecipient,
    subject: (t: MailTexts) => string,
    element: (t: MailTexts, lang: string) => ReactElement,
  ): Promise<void> {
    const task = (async () => {
      try {
        const { locale, t } = textsFor(user.locale);
        const email = element(t, locale);
        const [html, text] = await Promise.all([render(email), render(email, { plainText: true })]);
        await this.provider.send({ template, to: user.email, subject: subject(t), html, text });
      } catch (error) {
        const reason = (error instanceof Error ? error.message : String(error)).replaceAll(
          user.email,
          maskEmail(user.email),
        );
        this.logger.error(`mail ${template} to ${maskEmail(user.email)} failed: ${reason}`);
      }
    })();
    this.inFlight.add(task);
    void task.finally(() => this.inFlight.delete(task));
    return task;
  }
}
