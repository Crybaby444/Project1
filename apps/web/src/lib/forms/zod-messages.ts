import type { z } from 'zod';

type ValidationKey = 'required' | 'tooShort' | 'tooLong' | 'email' | 'passwordMismatch' | 'invalid';
/** next-intl's `t` for the `validation` messages (useTranslations('validation') or createTranslator). */
type ValidationTranslator = (key: ValidationKey, values?: { min?: number; max?: number }) => string;

/** Keys a schema may name with `{ params: { messageKey } }` (e.g. a refine that compares two fields). */
export type ValidationMessageKey = 'passwordMismatch' | 'required' | 'invalid';

type Issue = Parameters<z.core.$ZodErrorMap>[0];

function isEmpty(input: unknown): boolean {
  return input === undefined || input === null || (typeof input === 'string' && input.trim() === '');
}

/**
 * A zod error map that says the shared schemas' checks in the visitor's language
 * (messages under `validation`). Pass it when parsing: `schema.safeParse(value, { error })`.
 * Schemas from @yoyo/shared carry no texts of their own, so this map decides every message.
 */
export function zodErrorMap(t: ValidationTranslator): (issue: Issue) => string {
  return (issue) => {
    const key = (issue as { params?: { messageKey?: unknown } }).params?.messageKey;
    if (issue.code === 'custom' && typeof key === 'string') return t(key as ValidationMessageKey);
    if (isEmpty(issue.input)) return t('required');
    switch (issue.code) {
      case 'too_small':
        return issue.origin === 'string' ? t('tooShort', { min: Number(issue.minimum) }) : t('invalid');
      case 'too_big':
        return issue.origin === 'string' ? t('tooLong', { max: Number(issue.maximum) }) : t('invalid');
      case 'invalid_format':
        return issue.format === 'email' ? t('email') : t('invalid');
      default:
        return t('invalid');
    }
  };
}
