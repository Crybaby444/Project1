'use client';

import { ForgotPasswordRequestSchema } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { INPUT_CLASS } from '@/components/ui/inputs';
import { Link } from '@/i18n/navigation';
import { useApiForm } from '@/lib/forms/use-api-form';
import { unwrap } from '@/lib/session/api-error';
import { useApiClient } from '@/lib/session/SessionProvider';
import { AuthCard, TEXT_LINK } from './AuthCard';
import { FormError } from './FormError';
import { RetryAfterNotice } from './RetryAfterNotice';

/**
 * /forgot-password. The API answers 202 whether or not the account exists, and so does this screen:
 * one "check your email" for everybody (only a 429 or an unreachable API look different).
 */
export function ForgotPasswordForm() {
  const t = useTranslations('auth');
  const client = useApiClient();
  const [sentTo, setSentTo] = useState<string | null>(null);

  const { form, submit, formError, retryInSeconds, busy, disabled, fieldError } = useApiForm(
    ForgotPasswordRequestSchema,
    {
      defaultValues: { email: '' },
      onSubmit: async (body) => {
        await unwrap(client.POST('/api/v1/auth/forgot-password', { body }));
        setSentTo(body.email);
      },
    },
  );

  const back = (
    <Link href="/login" className={TEXT_LINK}>
      {t('forgot.back')}
    </Link>
  );

  if (sentTo) {
    return (
      <AuthCard
        title={t('forgot.sent.title')}
        subtitle={t('forgot.sent.body', { email: sentTo })}
        footer={back}
        focusTitle
      >
        <Button href="/login" variant="ghost" size="lg">
          {t('login.title')}
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t('forgot.title')} subtitle={t('forgot.subtitle')} footer={back}>
      <form noValidate onSubmit={submit} className="flex flex-col gap-5">
        <FormError message={formError} />
        <RetryAfterNotice seconds={retryInSeconds} />
        <Field label={t('fields.email')} error={fieldError('email')}>
          <input
            type="email"
            autoComplete="email"
            inputMode="email"
            className={INPUT_CLASS}
            {...form.register('email')}
          />
        </Field>
        <Button type="submit" size="lg" loading={busy} disabled={disabled}>
          {t('forgot.submit')}
        </Button>
      </form>
    </AuthCard>
  );
}
