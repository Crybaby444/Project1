import { EmailSchema, PasswordSchema, RegisterRequestSchema } from '@yoyo/shared';
import { createTranslator } from 'next-intl';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import en from '../../../messages/en.json';
import lv from '../../../messages/lv.json';
import ru from '../../../messages/ru.json';
import { zodErrorMap } from './zod-messages';

const mapFor = (messages: typeof en, locale: string) => {
  const t = createTranslator({ locale, messages, namespace: 'validation' });
  return zodErrorMap((key, values) => t(key, values));
};

function firstMessage(schema: z.ZodType, value: unknown, messages = en, locale = 'en'): string | undefined {
  const result = schema.safeParse(value, { error: mapFor(messages, locale) });
  return result.success ? undefined : result.error.issues[0]?.message;
}

describe('zodErrorMap', () => {
  it('turns the shared schemas’ checks into the visitor’s language', () => {
    expect(firstMessage(EmailSchema, '')).toBe(en.validation.required);
    expect(firstMessage(EmailSchema, 'anna@')).toBe(en.validation.email);
    expect(firstMessage(PasswordSchema, 'short')).toBe('At least 8 characters.');
    expect(firstMessage(PasswordSchema, 'x'.repeat(129))).toBe('At most 128 characters.');
    expect(firstMessage(RegisterRequestSchema.shape.name, '   ')).toBe(en.validation.required);
  });

  it('speaks Latvian and Russian, with Russian plural forms', () => {
    expect(firstMessage(EmailSchema, 'anna@', lv, 'lv')).toBe(lv.validation.email);
    expect(firstMessage(PasswordSchema, 'short', ru, 'ru')).toBe('Не меньше 8 символов.');
    expect(firstMessage(z.string().min(1).max(1), 'ab', ru, 'ru')).toBe('Не больше 1 символа.');
    expect(firstMessage(z.string().min(2), 'a', lv, 'lv')).toBe('Vismaz 2 rakstzīmes.');
  });

  it('uses a message key a schema names in params', () => {
    const schema = z.string().refine((v) => v === 'a', { params: { messageKey: 'passwordMismatch' } });
    expect(firstMessage(schema, 'b')).toBe(en.validation.passwordMismatch);
  });

  it('falls back to "check this field" for anything else', () => {
    expect(firstMessage(z.number(), 'x')).toBe(en.validation.invalid);
  });
});
