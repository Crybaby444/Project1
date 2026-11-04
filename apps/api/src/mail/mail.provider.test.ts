import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMailProvider, maskEmail, type MailMessage } from './mail.provider';

const resetMail: MailMessage = {
  template: 'reset-password',
  to: 'anna@mail.lv',
  subject: 'Reset your password',
  html: '<a href="https://yoyo.test/reset-password?token=SECRET">Reset</a>',
  text: 'https://yoyo.test/reset-password?token=SECRET',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('maskEmail', () => {
  it('keeps the first letter of the name and the whole domain', () => {
    expect(maskEmail('anna@mail.lv')).toBe('a***@mail.lv');
    expect(maskEmail('x@y.lv')).toBe('x***@y.lv');
    expect(maskEmail('not-an-email')).toBe('***');
  });
});

describe('createMailProvider without SMTP_URL (production default)', () => {
  it('sends nothing and logs only "mail disabled", the template and a masked address', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const provider = createMailProvider({ SMTP_URL: undefined, MAIL_FROM: 'Yoyo <no-reply@yoyo.local>' });

    await provider.send(resetMail);

    const logged = warn.mock.calls.flat().join(' ');
    expect(logged).toContain('mail disabled');
    expect(logged).toContain('reset-password');
    expect(logged).toContain('a***@mail.lv');
    expect(logged).not.toContain('anna@mail.lv');
    expect(logged).not.toContain('SECRET');
    expect(logged).not.toContain('Reset your password');
  });
});
