import { Inject, Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';
import { CLOCK, type Clock } from '../clock/clock';
import { ENV, type Env } from '../config/env';
import { createElement, type ReactElement } from 'react';
import { render } from 'react-email';
import { MAIL_PROVIDER, maskEmail, type MailProvider, type MailTemplate } from './mail.provider';
import { DealEvent } from './templates/DealEvent';
import type { DealRole } from './templates/deal-texts';
import { ListingApproved } from './templates/ListingApproved';
import { ListingRejected } from './templates/ListingRejected';
import { PhoneCode } from './templates/PhoneCode';
import { ResetPassword } from './templates/ResetPassword';
import { fill as fillTexts, textsFor, type MailTexts } from './templates/texts';
import { VerifyEmail } from './templates/VerifyEmail';

export interface MailRecipient {
  email: string;
  name: string;
  locale: string;
}

/** How long shutdown waits for mail that is still being sent. */
const SHUTDOWN_GRACE_MS = 10_000;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/**
 * Account emails in the recipient's language. Every send* resolves once the mail is handed over or has
 * failed, and never rejects: a failure is logged (template, masked address, reason, never the link or
 * code), so callers can fire and forget and the user can ask for the email again.
 */
@Injectable()
export class MailService implements OnApplicationShutdown {
  private readonly logger = new Logger('Mail');
  private readonly inFlight = new Set<Promise<void>>();
  /** When each mail of the last 24 hours went out, oldest first (at most MAIL_DAILY_LIMIT). */
  private readonly sentAt: number[] = [];
  private lastBudgetAlertAt = Number.NEGATIVE_INFINITY;

  constructor(
    @Inject(MAIL_PROVIDER) private readonly provider: MailProvider,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ENV) private readonly env: Pick<Env, 'MAIL_DAILY_LIMIT'>,
  ) {}

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

  /** The listing passed moderation; `link` opens it on the site. */
  sendListingApproved(user: MailRecipient, listing: { title: string; link: string }): Promise<void> {
    return this.deliver('listing-approved', user, (t) => t.listingApproved.subject, (t, lang) =>
      createElement(ListingApproved, { t, lang, name: user.name, ...listing }),
    );
  }

  /** The listing did not pass: the moderator's reason, and `link` to edit it. */
  sendListingRejected(user: MailRecipient, listing: { title: string; reason: string; link: string }): Promise<void> {
    return this.deliver('listing-rejected', user, (t) => t.listingRejected.subject, (t, lang) =>
      createElement(ListingRejected, { t, lang, name: user.name, ...listing }),
    );
  }

  /**
   * A step of a deal or a price offer (plan 8): `deal.<template>.<role>` filled with `values`, a short
   * summary of the deal and a button to `link`. Unknown template and role pairs are a bug (logged).
   */
  sendDealEvent(
    user: MailRecipient,
    mail: {
      template: string;
      role: DealRole;
      values: (locale: string) => Record<string, string>;
      summary: (locale: string) => { item: string; dates: string; total: string | null };
      link: string;
      button: 'button' | 'offerButton';
    },
  ): Promise<void> {
    const textsOf = (t: MailTexts) => {
      const texts = (t.deal as unknown as Record<string, Record<string, { subject: string; preview: string; heading: string; body: string }>>)[mail.template]?.[
        mail.role
      ];
      if (!texts) throw new Error(`no texts for deal email ${mail.template}/${mail.role}`);
      return texts;
    };
    return this.deliver('deal-event', user, (t) => fillTexts(textsOf(t).subject, mail.values(textsFor(user.locale).locale)), (t, lang) =>
      createElement(DealEvent, {
        t,
        lang,
        name: user.name,
        texts: textsOf(t),
        values: mail.values(lang),
        summary: mail.summary(lang),
        button: t.deal.common[mail.button],
        link: mail.link,
      }),
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
    if (!this.withinBudget(template)) return Promise.resolve();
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

  /**
   * Counts one mail against the global 24-hour budget (MAIL_DAILY_LIMIT, sliding window on the Clock).
   * Over it, the mail is skipped and an error is logged at most once an hour.
   */
  private withinBudget(template: MailTemplate): boolean {
    const now = this.clock.now().getTime();
    while (this.sentAt.length > 0 && this.sentAt[0]! <= now - DAY) this.sentAt.shift();
    if (this.sentAt.length < this.env.MAIL_DAILY_LIMIT) {
      this.sentAt.push(now);
      return true;
    }
    if (now - this.lastBudgetAlertAt >= HOUR) {
      this.lastBudgetAlertAt = now;
      this.logger.error(
        `daily mail budget of ${this.env.MAIL_DAILY_LIMIT} reached: ${template} and further mail skipped until it refills`,
      );
    }
    return false;
  }
}
