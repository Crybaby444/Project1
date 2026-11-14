'use client';

import { RegisterRequestSchema } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useTheme } from '@/components/theme/ThemeProvider';
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
import { useLeaveWhenSignedIn, withNext } from './LoginForm';
import { PasswordField } from './PasswordField';
import { RetryAfterNotice } from './RetryAfterNotice';

const RegisterFormSchema = RegisterRequestSchema.omit({ locale: true });

export type PasswordStrength = 0 | 1 | 2 | 3;

/**
 * A rough hint, not a rule (the API only asks for 8+ characters): 1 weak, 2 okay, 3 strong, by
 * length and by how many kinds of characters it mixes (lower, upper, digits, other). 0 when empty.
 */
export function passwordStrength(password: string): PasswordStrength {
  if (password.length === 0) return 0;
  const kinds = [/\p{Ll}/u, /\p{Lu}/u, /\p{N}/u, /[^\p{L}\p{N}]/u].filter((re) => re.test(password)).length;
  if (password.length >= 20 || (password.length >= 12 && kinds >= 3)) return 3;
  if (password.length >= 10 && kinds >= 2) return 2;
  return 1;
}

const LEVEL = { 1: 'weak', 2: 'fair', 3: 'strong' } as const;
// v16: weak is the warning red, fair is half ink, strong is ink with the blue light.
const BAR_COLOUR = { 1: 'bg-[var(--sticker-ember)]', 2: 'bg-ink/50', 3: 'bg-ink shadow-[0_0_0_1px_var(--glow)]' } as const;

function StrengthMeter({ password }: { password: string }) {
  const t = useTranslations('auth.strength');
  const level = passwordStrength(password);
  if (level === 0) return null;
  return (
    <div className="flex items-center gap-3">
      <div aria-hidden="true" className="flex flex-1 gap-1">
        {[1, 2, 3].map((bar) => (
          <span
            key={bar}
            className={`border-ink rounded-pill h-2 flex-1 border ${bar <= level ? BAR_COLOUR[level] : 'bg-surface'}`}
          />
        ))}
      </div>
      <p className="text-sm font-bold" aria-live="polite">
        {t('label')}: {t(LEVEL[level])}
      </p>
    </div>
  );
}

export function RegisterForm({ next }: { next: string | null }) {
  const t = useTranslations('auth');
  const locale = useLocale();
  const client = useApiClient();
  const { setUser } = useSession();
  const { preference: theme } = useTheme();
  const router = useRouter();
  useLeaveWhenSignedIn(next);

  const { form, submit, formError, retryInSeconds, busy, disabled, fieldError } = useApiForm(
    RegisterFormSchema,
    {
      defaultValues: { name: '', email: '', password: '' },
      onSubmit: async (values) => {
        const body = { ...values, locale: locale as 'en' | 'lv' | 'ru' };
        let { user } = await unwrap(client.POST('/api/v1/auth/register', { body }));
        // A light or dark theme chosen before signing up becomes the new profile's, rather than the
        // profile's "system" replacing it on screen (SyncThemeWithProfile).
        if (theme !== 'system' && user.theme !== theme) {
          try {
            ({ user } = await unwrap(client.PATCH('/api/v1/me', { body: { theme } })));
          } catch {
            user = { ...user, theme }; // the account exists; the theme can be saved from the settings
          }
        }
        setUser(user);
        router.replace(safeNext(next));
      },
    },
  );
  const password = form.watch('password') ?? '';

  return (
    <AuthCard
      title={t('register.title')}
      subtitle={t('register.subtitle')}
      footer={
        <p>
          {t('register.haveAccount')}{' '}
          <Link href={withNext('/login', next)} className={TEXT_LINK}>
            {t('register.signIn')}
          </Link>
        </p>
      }
    >
      <GoogleButton next={next} />
      <form noValidate onSubmit={submit} className="flex flex-col gap-5">
        <FormError message={formError} />
        <RetryAfterNotice seconds={retryInSeconds} />
        <Field label={t('fields.name')} hint={t('register.nameHint')} error={fieldError('name')}>
          <input type="text" autoComplete="name" className={INPUT_CLASS} {...form.register('name')} />
        </Field>
        <Field label={t('fields.email')} error={fieldError('email')}>
          <input
            type="email"
            autoComplete="email"
            inputMode="email"
            className={INPUT_CLASS}
            {...form.register('email')}
          />
        </Field>
        <Field label={t('fields.password')} hint={t('register.passwordHint')} error={fieldError('password')}>
          <PasswordField autoComplete="new-password" {...form.register('password')} />
        </Field>
        <StrengthMeter password={password} />
        <Button type="submit" size="lg" loading={busy} disabled={disabled}>
          {t('register.submit')}
        </Button>
      </form>
    </AuthCard>
  );
}
