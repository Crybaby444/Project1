'use client';

import { isErrorCode, LoginRequestSchema } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { INPUT_CLASS } from '@/components/ui/inputs';
import { Link, useRouter } from '@/i18n/navigation';
import { useApiForm } from '@/lib/forms/use-api-form';
import { unwrap } from '@/lib/session/api-error';
import { safeNext } from '@/lib/session/safe-next';
import { useApiClient, useSession } from '@/lib/session/SessionProvider';
import { AuthCard, TEXT_LINK } from './AuthCard';
import { FormError } from './FormError';
import { GoogleButton } from './GoogleButton';
import { PasswordField } from './PasswordField';
import { RetryAfterNotice } from './RetryAfterNotice';

/** Codes the API's Google callback may send back in `?oauthError=`. */
const OAUTH_ERRORS = new Set(['OAUTH_CANCELLED', 'OAUTH_STATE_INVALID', 'OAUTH_FAILED', 'AUTH_BLOCKED']);

/** `/register?next=…` and friends: carries a safe next page along between the auth screens. */
export function withNext(path: string, next: string | null): string {
  const target = safeNext(next);
  return target === '/' ? path : `${path}?next=${encodeURIComponent(target)}`;
}

/** Sends a signed-in person on to `next` (the sign-in screens are for visitors). */
export function useLeaveWhenSignedIn(next: string | null): void {
  const { status } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (status === 'authenticated') router.replace(safeNext(next));
  }, [status, next, router]);
}

export function LoginForm({ next, oauthError }: { next: string | null; oauthError: string | null }) {
  const t = useTranslations('auth');
  const tErrors = useTranslations('errors');
  const client = useApiClient();
  const { setUser } = useSession();
  const router = useRouter();
  useLeaveWhenSignedIn(next);

  const { form, submit, formError, retryInSeconds, busy, disabled, fieldError } = useApiForm(
    LoginRequestSchema,
    {
      defaultValues: { email: '', password: '' },
      onSubmit: async (body) => {
        const { user } = await unwrap(client.POST('/api/v1/auth/login', { body }));
        setUser(user);
        router.replace(safeNext(next));
      },
    },
  );

  const oauthMessage =
    oauthError && OAUTH_ERRORS.has(oauthError) && isErrorCode(oauthError) ? tErrors(oauthError) : null;

  return (
    <AuthCard
      title={t('login.title')}
      subtitle={t('login.subtitle')}
      footer={
        <p>
          {t('login.noAccount')}{' '}
          <Link href={withNext('/register', next)} className={TEXT_LINK}>
            {t('login.register')}
          </Link>
        </p>
      }
    >
      <GoogleButton next={next} />
      <form noValidate onSubmit={submit} className="flex flex-col gap-5">
        <FormError message={formError ?? (form.formState.submitCount === 0 ? oauthMessage : null)} />
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
        <Field label={t('fields.password')} error={fieldError('password')}>
          <PasswordField autoComplete="current-password" {...form.register('password')} />
        </Field>
        <Link href="/forgot-password" className={`${TEXT_LINK} -mt-2 self-start text-sm`}>
          {t('login.forgot')}
        </Link>
        <Button type="submit" size="lg" loading={busy} disabled={disabled}>
          {t('login.submit')}
        </Button>
      </form>
    </AuthCard>
  );
}
