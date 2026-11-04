'use client';

import { PasswordSchema } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { Link, useRouter } from '@/i18n/navigation';
import { useApiForm } from '@/lib/forms/use-api-form';
import { unwrap } from '@/lib/session/api-error';
import { useApiClient, useSession } from '@/lib/session/SessionProvider';
import { AuthCard, TEXT_LINK } from './AuthCard';
import { FormError } from './FormError';
import { PasswordField } from './PasswordField';
import { RetryAfterNotice } from './RetryAfterNotice';
import { linkProblemOf, type LinkProblem } from './VerifyEmailView';

/** The new password twice; the second must match (checked here, the API only sees one). */
export const NewPasswordSchema = z
  .object({ password: PasswordSchema, repeat: z.string().min(1) })
  .refine((value) => value.password === value.repeat, {
    path: ['repeat'],
    params: { messageKey: 'passwordMismatch' },
  });

/**
 * /reset-password?token=…: a new password twice. The API ends every session, so on success this
 * signs in with the new password and goes home; link errors get the same screens as verify-email.
 */
export function ResetPasswordForm({ token }: { token: string | null }) {
  const t = useTranslations('auth');
  const client = useApiClient();
  const { setUser } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [problem, setProblem] = useState<LinkProblem | null>(token ? null : 'invalid');
  const [changed, setChanged] = useState(false);

  const { form, submit, formError, retryInSeconds, busy, disabled, fieldError } = useApiForm(
    NewPasswordSchema,
    {
      defaultValues: { password: '', repeat: '' },
      onSubmit: async ({ password }) => {
        let email: string;
        try {
          ({
            user: { email },
          } = await unwrap(
            client.POST('/api/v1/auth/reset-password', { body: { token: token ?? '', password } }),
          ));
        } catch (error) {
          const linkProblem = linkProblemOf(error);
          if (!linkProblem) throw error;
          setProblem(linkProblem);
          return;
        }
        setUser(null); // the API has ended every session, this browser's included
        try {
          const { user } = await unwrap(client.POST('/api/v1/auth/login', { body: { email, password } }));
          setUser(user);
          toast.show(t('reset.done'));
          router.replace('/');
        } catch {
          setChanged(true); // the password is changed either way; signing in is up to the person now
        }
      },
    },
  );

  if (problem) {
    return (
      <AuthCard
        title={t(`reset.${problem}.title`)}
        subtitle={t(`reset.${problem}.body`)}
        focusTitle={token !== null}
      >
        <Button href="/forgot-password" size="lg">
          {t('reset.requestNew')}
        </Button>
      </AuthCard>
    );
  }

  if (changed) {
    return (
      <AuthCard title={t('reset.changed.title')} subtitle={t('reset.changed.body')} focusTitle>
        <Button href="/login" size="lg">
          {t('reset.signIn')}
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={t('reset.title')}
      subtitle={t('reset.subtitle')}
      footer={
        <Link href="/login" className={TEXT_LINK}>
          {t('forgot.back')}
        </Link>
      }
    >
      <form noValidate onSubmit={submit} className="flex flex-col gap-5">
        <FormError message={formError} />
        <RetryAfterNotice seconds={retryInSeconds} />
        <Field
          label={t('fields.newPassword')}
          hint={t('register.passwordHint')}
          error={fieldError('password')}
        >
          <PasswordField autoComplete="new-password" {...form.register('password')} />
        </Field>
        <Field label={t('fields.repeatPassword')} error={fieldError('repeat')}>
          <PasswordField autoComplete="new-password" {...form.register('repeat')} />
        </Field>
        <Button type="submit" size="lg" loading={busy} disabled={disabled}>
          {t('reset.submit')}
        </Button>
      </form>
    </AuthCard>
  );
}
