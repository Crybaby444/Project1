'use client';

import { PasswordSchema, type PublicUser } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { z } from 'zod';
import { FormError } from '@/components/auth/FormError';
import { PasswordField } from '@/components/auth/PasswordField';
import { RetryAfterNotice } from '@/components/auth/RetryAfterNotice';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Field } from '@/components/ui/Field';
import { INPUT_CLASS } from '@/components/ui/inputs';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from '@/i18n/navigation';
import { useErrorText } from '@/lib/forms/error-text';
import { useApiForm } from '@/lib/forms/use-api-form';
import { ApiError, unwrap } from '@/lib/session/api-error';
import { useApiClient, useSession } from '@/lib/session/SessionProvider';
import { SettingsSection } from './SettingsSection';

const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    password: PasswordSchema,
    repeat: z.string().min(1),
  })
  .refine((value) => value.password === value.repeat, {
    path: ['repeat'],
    params: { messageKey: 'passwordMismatch' },
  });

const isWrongPassword = (error: unknown) =>
  error instanceof ApiError && error.code === 'AUTH_INVALID_CREDENTIALS';

/** Settings → Security: the password (or why there is none), sign out everywhere, delete the account. */
export function SecuritySettings({ user }: { user: PublicUser }) {
  const t = useTranslations('settings.security');

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection title={t('password.title')}>
        {user.hasPassword ? (
          <ChangePasswordForm />
        ) : (
          <p className="leading-relaxed">{t('password.google')}</p>
        )}
      </SettingsSection>
      <SettingsSection title={t('logoutAll.open')} intro={t('logoutAll.intro')}>
        <LogoutEverywhere />
      </SettingsSection>
      <SettingsSection title={t('delete.open')} intro={t('delete.intro')}>
        <DeleteAccount hasPassword={user.hasPassword} />
      </SettingsSection>
    </div>
  );
}

function ChangePasswordForm() {
  const t = useTranslations('settings.security.password');
  const tFields = useTranslations('auth.fields');
  const tAuth = useTranslations('auth');
  const client = useApiClient();
  const { setUser } = useSession();
  const toast = useToast();

  const api = useApiForm(ChangePasswordSchema, {
    defaultValues: { currentPassword: '', password: '', repeat: '' },
    onSubmit: async ({ currentPassword, password }) => {
      try {
        const { user } = await unwrap(
          client.POST('/api/v1/me/password', { body: { currentPassword, newPassword: password } }),
        );
        setUser(user);
        api.form.reset();
        toast.show(t('changed'));
      } catch (error) {
        if (!isWrongPassword(error)) throw error;
        api.form.setError(
          'currentPassword',
          { type: 'server', message: t('wrongCurrent') },
          { shouldFocus: true },
        );
      }
    },
  });
  const { form, submit, formError, retryInSeconds, busy, disabled, fieldError } = api;

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-5">
      <FormError message={formError} />
      <RetryAfterNotice seconds={retryInSeconds} />
      <Field label={tFields('currentPassword')} error={fieldError('currentPassword')}>
        <PasswordField autoComplete="current-password" {...form.register('currentPassword')} />
      </Field>
      <Field
        label={tFields('newPassword')}
        hint={tAuth('register.passwordHint')}
        error={fieldError('password')}
      >
        <PasswordField autoComplete="new-password" {...form.register('password')} />
      </Field>
      <Field label={tFields('repeatPassword')} error={fieldError('repeat')}>
        <PasswordField autoComplete="new-password" {...form.register('repeat')} />
      </Field>
      <Button type="submit" size="lg" loading={busy} disabled={disabled} className="self-start">
        {t('submit')}
      </Button>
    </form>
  );
}

function LogoutEverywhere() {
  const t = useTranslations('settings.security');
  const errorText = useErrorText();
  const client = useApiClient();
  const { forget } = useSession();
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await unwrap(client.POST('/api/v1/auth/logout-all'));
      setOpen(false);
      forget();
      toast.show(t('logoutAll.done'));
      router.replace('/');
    } catch (failure) {
      setError(errorText(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)} className="self-start">
        {t('logoutAll.open')}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={t('logoutAll.title')}>
        <div className="flex flex-col gap-5">
          <p className="leading-relaxed">{t('logoutAll.body')}</p>
          <FormError message={error} />
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={confirm} loading={busy}>
              {t('logoutAll.submit')}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

function DeleteAccount({ hasPassword }: { hasPassword: boolean }) {
  const t = useTranslations('settings.security');
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)} className="self-start">
        {t('delete.open')}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={t('delete.title')}>
        <DeleteAccountForm hasPassword={hasPassword} onCancel={() => setOpen(false)} />
      </Dialog>
    </>
  );
}

function DeleteAccountForm({ hasPassword, onCancel }: { hasPassword: boolean; onCancel(): void }) {
  const t = useTranslations('settings.security');
  const locale = useLocale();
  const client = useApiClient();
  const { forget } = useSession();
  const toast = useToast();
  const router = useRouter();
  const word = t('delete.word');

  // Google-only accounts have no password to give; the API asks for none from them.
  const schema = useMemo(
    () => z.object({ word: z.string(), password: hasPassword ? z.string().min(1).max(128) : z.string() }),
    [hasPassword],
  );
  const api = useApiForm(schema, {
    defaultValues: { word: '', password: '' },
    onSubmit: async ({ password }) => {
      try {
        await unwrap(client.DELETE('/api/v1/me', { body: hasPassword ? { password } : {} }));
      } catch (error) {
        if (!isWrongPassword(error)) throw error;
        api.form.setError(
          'password',
          { type: 'server', message: t('password.wrongCurrent') },
          { shouldFocus: true },
        );
        return;
      }
      forget();
      toast.show(t('delete.done'));
      router.replace('/');
    },
  });
  const { form, submit, formError, retryInSeconds, busy, disabled, fieldError } = api;
  const typed = form.watch('word') ?? '';
  const confirmed = typed.trim().toLocaleUpperCase(locale) === word.toLocaleUpperCase(locale);

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-5">
      <p className="leading-relaxed">{t('delete.body')}</p>
      <FormError message={formError} />
      <RetryAfterNotice seconds={retryInSeconds} />
      <Field label={t('delete.confirmLabel', { word })} error={fieldError('word')}>
        <input
          type="text"
          autoComplete="off"
          spellCheck={false}
          className={INPUT_CLASS}
          {...form.register('word')}
        />
      </Field>
      {hasPassword && (
        <Field label={t('delete.passwordLabel')} error={fieldError('password')}>
          <PasswordField autoComplete="current-password" {...form.register('password')} />
        </Field>
      )}
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="ghost" onClick={onCancel}>
          {t('cancel')}
        </Button>
        <Button type="submit" loading={busy} disabled={disabled || !confirmed}>
          {t('delete.submit')}
        </Button>
      </div>
    </form>
  );
}
