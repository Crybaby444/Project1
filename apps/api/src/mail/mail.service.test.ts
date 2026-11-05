import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../test/support/fake-clock';
import { FakeMailProvider } from '../../test/support/fake-mail';
import en from './i18n/en.json';
import lv from './i18n/lv.json';
import ru from './i18n/ru.json';
import type { MailMessage, MailProvider } from './mail.provider';
import { MailService } from './mail.service';

type Tree = { [key: string]: string | Tree };

function flatKeys(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree)
    .flatMap(([key, value]) => (typeof value === 'string' ? [`${prefix}${key}`] : flatKeys(value, `${prefix}${key}.`)))
    .sort();
}

function leaves(tree: Tree, prefix = ''): [string, string][] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string' ? [[`${prefix}${key}`, value] as [string, string]] : leaves(value, `${prefix}${key}.`),
  );
}

const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MailService', () => {
  describe('the global daily mail budget (MAIL_DAILY_LIMIT)', () => {
    const HOUR = 3_600_000;
    const anna = { email: 'anna@b.lv', name: 'Anna', locale: 'en' };

    it('keeps a fifth of the budget for account emails, so deal emails can never use it all up', async () => {
      const fake = new FakeMailProvider();
      const mail = new MailService(fake, new FakeClock(new Date('2026-11-04T10:00:00.000Z')), { MAIL_DAILY_LIMIT: 10 });
      vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      const deal = {
        template: 'REQUESTED',
        role: 'owner' as const,
        values: () => ({ title: 'Drill', start: '1', end: '2', total: '1', rent: '1', deposit: '1', other: 'Anna', price: '1' }),
        summary: () => ({ item: 'Drill', dates: '1 – 2', total: '1' }),
        link: 'https://yoyo.test/bookings/b',
        button: 'button' as const,
      };
      for (let i = 0; i < 10; i++) await mail.sendDealEvent(anna, deal);
      await mail.sendListingApproved(anna, { title: 'Drill', link: 'https://yoyo.test/items/l' });
      expect(fake.sent).toHaveLength(8);
      for (let i = 0; i < 3; i++) await mail.sendVerifyEmail(anna, 'https://yoyo.test/verify-email?token=T');
      expect(fake.sent.map((m) => m.template)).toEqual([...Array<string>(8).fill('deal-event'), 'verify-email', 'verify-email']);
    });

    it('skips mail over the budget without failing, logs the error at most once an hour, and refills over 24 hours', async () => {
      const fake = new FakeMailProvider();
      const clock = new FakeClock(new Date('2026-11-04T10:00:00.000Z'));
      const mail = new MailService(fake, clock, { MAIL_DAILY_LIMIT: 3 });
      const errors = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

      for (let i = 0; i < 3; i++) await mail.sendVerifyEmail(anna, 'https://yoyo.test/verify-email?token=T');
      expect(fake.sent).toHaveLength(3);
      expect(errors).not.toHaveBeenCalled();

      await expect(mail.sendPasswordReset(anna, 'https://yoyo.test/reset-password?token=R')).resolves.toBeUndefined();
      await mail.sendPhoneCode(anna, '123456');
      expect(fake.sent).toHaveLength(3);
      expect(errors).toHaveBeenCalledTimes(1);
      expect(String(errors.mock.calls[0]![0])).toMatch(/daily mail budget/i);
      expect(String(errors.mock.calls[0]![0])).not.toContain('token=R');

      clock.advance(HOUR - 1);
      await mail.sendPhoneCode(anna, '123456');
      expect(errors).toHaveBeenCalledTimes(1);
      clock.advance(1);
      await mail.sendPhoneCode(anna, '123456');
      expect(errors).toHaveBeenCalledTimes(2);
      expect(fake.sent).toHaveLength(3);

      clock.advance(23 * HOUR); // 24 hours after the first three
      await mail.sendVerifyEmail(anna, 'https://yoyo.test/verify-email?token=T2');
      expect(fake.sent).toHaveLength(4);
    });
  });

  it('sends the verification link in the recipient’s language, as HTML and as plain text', async () => {
    const fake = new FakeMailProvider();
    const mail = new MailService(fake, new FakeClock(), { MAIL_DAILY_LIMIT: 90 });

    await mail.sendVerifyEmail({ email: 'a@b.lv', name: 'Anna', locale: 'lv' }, 'https://yoyo.test/lv/verify-email?token=T');

    expect(fake.sent).toHaveLength(1);
    const [message] = fake.sent as [MailMessage];
    expect(message).toMatchObject({ to: 'a@b.lv', template: 'verify-email', subject: lv.verifyEmail.subject });
    expect(message.html).toContain('https://yoyo.test/lv/verify-email?token=T');
    expect(message.text).toContain('https://yoyo.test/lv/verify-email?token=T');
    expect(message.html).toContain(lv.verifyEmail.button);
    expect(message.text).toContain('Anna');
  });

  it('sends the password reset link', async () => {
    const fake = new FakeMailProvider();
    await new MailService(fake, new FakeClock(), { MAIL_DAILY_LIMIT: 90 }).sendPasswordReset(
      { email: 'b@b.lv', name: 'Boris', locale: 'ru' },
      'https://yoyo.test/ru/reset-password?token=R',
    );

    const [message] = fake.sent as [MailMessage];
    expect(message).toMatchObject({ to: 'b@b.lv', template: 'reset-password', subject: ru.resetPassword.subject });
    expect(message.html).toContain('https://yoyo.test/ru/reset-password?token=R');
    expect(message.text).toContain('https://yoyo.test/ru/reset-password?token=R');
  });

  it('sends a phone confirmation code', async () => {
    const fake = new FakeMailProvider();
    await new MailService(fake, new FakeClock(), { MAIL_DAILY_LIMIT: 90 }).sendPhoneCode({ email: 'c@b.lv', name: 'Chris', locale: 'en' }, '042137');

    const [message] = fake.sent as [MailMessage];
    expect(message).toMatchObject({ to: 'c@b.lv', template: 'phone-code', subject: en.phoneCode.subject });
    expect(message.html).toContain('042137');
    expect(message.text).toContain('042137');
  });

  it('falls back to English for a language it does not know', async () => {
    const fake = new FakeMailProvider();
    await new MailService(fake, new FakeClock(), { MAIL_DAILY_LIMIT: 90 }).sendVerifyEmail({ email: 'a@b.lv', name: 'Anna', locale: 'de' }, 'https://yoyo.test/v');
    expect(fake.sent[0]!.subject).toBe(en.verifyEmail.subject);
  });

  it('escapes what users typed (their name) instead of rendering it as HTML', async () => {
    const fake = new FakeMailProvider();
    await new MailService(fake, new FakeClock(), { MAIL_DAILY_LIMIT: 90 }).sendVerifyEmail(
      { email: 'a@b.lv', name: '<img src=x onerror=alert(1)>', locale: 'en' },
      'https://yoyo.test/v',
    );
    expect(fake.sent[0]!.html).not.toContain('<img src=x');
    expect(fake.sent[0]!.html).toContain('&lt;img src=x');
  });

  it('never rejects when sending fails, and logs the failure without the link', async () => {
    const error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const failing: MailProvider = { send: () => Promise.reject(new Error('SMTP down for a@b.lv')) };

    await expect(
      new MailService(failing, new FakeClock(), { MAIL_DAILY_LIMIT: 90 }).sendPasswordReset({ email: 'a@b.lv', name: 'Anna', locale: 'en' }, 'https://yoyo.test/r?token=SECRET'),
    ).resolves.toBeUndefined();

    const logged = error.mock.calls.flat().join(' ');
    expect(logged).toContain('reset-password');
    expect(logged).toContain('SMTP down');
    expect(logged).not.toContain('SECRET');
    expect(logged).not.toContain('a@b.lv');
  });

  it('idle() waits until mail handed over in the background has been sent', async () => {
    let release!: () => void;
    const sent: string[] = [];
    const slow: MailProvider = {
      send: (message) =>
        new Promise<void>((resolve) => {
          release = () => {
            sent.push(message.to);
            resolve();
          };
        }),
    };
    const mail = new MailService(slow, new FakeClock(), { MAIL_DAILY_LIMIT: 90 });

    void mail.sendPhoneCode({ email: 'a@b.lv', name: 'Anna', locale: 'en' }, '123456');
    let idle = false;
    const waiting = mail.idle().then(() => {
      idle = true;
    });
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    expect(idle).toBe(false);

    release();
    await waiting;
    expect(sent).toEqual(['a@b.lv']);
  });
});

describe('mail translations', () => {
  const locales = { lv, ru } as Record<string, Tree>;

  it.each(['lv', 'ru'])('%s has exactly the same keys as English', (locale) => {
    expect(flatKeys(locales[locale]!)).toEqual(flatKeys(en));
  });

  it.each(['lv', 'ru'])('%s keeps every {placeholder} of the English text', (locale) => {
    const english = new Map(leaves(en));
    for (const [key, text] of leaves(locales[locale]!)) {
      expect(placeholders(text), key).toEqual(placeholders(english.get(key)!));
    }
  });

  it.each([
    ['en', en],
    ['lv', lv],
    ['ru', ru],
  ] as const)('%s has no empty strings', (_locale, tree) => {
    expect(leaves(tree).filter(([, text]) => text.trim() === '')).toEqual([]);
  });
});
