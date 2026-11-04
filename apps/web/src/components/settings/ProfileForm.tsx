'use client';

import { LOCALES, NameSchema, type Locale, type PublicUser } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { z } from 'zod';
import { FormError } from '@/components/auth/FormError';
import { RetryAfterNotice } from '@/components/auth/RetryAfterNotice';
import { ThemeSelect } from '@/components/theme/ThemeSelect';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { INPUT_CLASS, TEXTAREA_CLASS } from '@/components/ui/inputs';
import { useToast } from '@/components/ui/Toast';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useApiForm } from '@/lib/forms/use-api-form';
import { unwrap } from '@/lib/session/api-error';
import { useApiClient, useSession } from '@/lib/session/SessionProvider';
import { SettingsSection } from './SettingsSection';

const ABOUT_MAX = 500;

/** The editable profile (the API turns an empty city or about into "none"). */
const ProfileFormSchema = z.object({
  name: NameSchema,
  city: z.string().trim().max(60),
  about: z.string().trim().max(ABOUT_MAX),
  locale: z.enum(LOCALES),
});

/** Settings → Profile: name, city, about, language (PATCH /me), and the theme. */
export function ProfileForm({ user }: { user: PublicUser }) {
  const t = useTranslations('settings.profile');
  const tLanguage = useTranslations('language');
  const pageLocale = useLocale();
  const client = useApiClient();
  const { setUser } = useSession();
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();

  const { form, submit, formError, retryInSeconds, busy, disabled, fieldError } = useApiForm(
    ProfileFormSchema,
    {
      defaultValues: { name: user.name, city: user.city ?? '', about: user.about ?? '', locale: user.locale },
      onSubmit: async (body) => {
        const { user: saved } = await unwrap(client.PATCH('/api/v1/me', { body }));
        setUser(saved);
        form.reset({
          name: saved.name,
          city: saved.city ?? '',
          about: saved.about ?? '',
          locale: saved.locale,
        });
        // A new language is the confirmation itself: the page comes back in it.
        if (saved.locale !== pageLocale) router.replace(pathname, { locale: saved.locale as Locale });
        else toast.show(t('saved'));
      },
    },
  );
  const aboutLength = (form.watch('about') ?? '').length;

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection title={t('title')} intro={t('intro')}>
        <form noValidate onSubmit={submit} className="flex flex-col gap-5">
          <FormError message={formError} />
          <RetryAfterNotice seconds={retryInSeconds} />
          <Field label={t('name')} error={fieldError('name')}>
            <input
              type="text"
              autoComplete="name"
              maxLength={60}
              className={INPUT_CLASS}
              {...form.register('name')}
            />
          </Field>
          <Field label={t('city')} hint={t('cityHint')} error={fieldError('city')}>
            <input
              type="text"
              autoComplete="address-level2"
              maxLength={60}
              className={INPUT_CLASS}
              {...form.register('city')}
            />
          </Field>
          <div className="flex flex-col gap-1">
            <Field label={t('about')} hint={t('aboutHint')} error={fieldError('about')}>
              <textarea
                rows={4}
                maxLength={ABOUT_MAX}
                className={TEXTAREA_CLASS}
                {...form.register('about')}
              />
            </Field>
            <p className="self-end text-sm tabular-nums">
              {aboutLength} / {ABOUT_MAX}
            </p>
          </div>
          <Field label={t('language')} hint={t('languageHint')} error={fieldError('locale')}>
            <select className={`${INPUT_CLASS} appearance-auto`} {...form.register('locale')}>
              {LOCALES.map((locale) => (
                <option key={locale} value={locale} lang={locale}>
                  {tLanguage(locale)}
                </option>
              ))}
            </select>
          </Field>
          <Button type="submit" size="lg" loading={busy} disabled={disabled} className="self-start">
            {t('save')}
          </Button>
        </form>
      </SettingsSection>
      <SettingsSection title={t('appearance')}>
        <ThemeSelect />
      </SettingsSection>
    </div>
  );
}
