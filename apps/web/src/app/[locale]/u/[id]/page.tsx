import type { Locale } from '@yoyo/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { OwnerCard } from '@/components/item/OwnerCard';
import { ProfileTabs } from '@/components/profile/ProfileTabs';
import { loadProfile } from '@/lib/catalog/server-api';
import { profileSeo, seoMetadata } from '@/lib/seo';

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = (await params) as { locale: Locale; id: string };
  const loaded = await loadProfile(id);
  if (!loaded.ok) return {};
  const t = await getTranslations({ locale, namespace: 'profile' });
  const { user, listings } = loaded.data;
  return {
    title: `${t('title', { name: user.name })} · Yoyo`,
    description: t('description', { name: user.name, count: listings.length }),
    // Under every language the canonical is the English address, and there are no hreflang variants
    // (the proxy drops next-intl's Link header): the page is the same person in any language.
    ...seoMetadata(profileSeo(user.id, listings.length)),
  };
}

/** Someone's public page `/u/{id}`: who they are as everyone may see it, and their items. */
export default async function ProfilePage({ params }: Props) {
  const { locale, id } = (await params) as { locale: Locale; id: string };
  setRequestLocale(locale);
  const loaded = await loadProfile(id);
  if (!loaded.ok) {
    if (loaded.status === 404) notFound();
    throw new Error(`The profile could not be loaded (${loaded.status})`);
  }
  const t = await getTranslations('profile');
  const { user, listings } = loaded.data;

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-10 sm:px-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
        <OwnerCard owner={user} heading="h1" />
        {user.about && (
          <section aria-labelledby="profile-about" className="flex flex-col gap-2">
            <h2 id="profile-about" className="text-2xl font-bold">
              {t('about')}
            </h2>
            <p className="max-w-[68ch] text-lg leading-relaxed whitespace-pre-line [overflow-wrap:anywhere]">{user.about}</p>
          </section>
        )}
      </div>
      <ProfileTabs listings={listings} name={user.name} />
    </main>
  );
}
