import { ReportButton } from '@/components/reports/ReportButton';
import { LISTING_STATUSES, type Locale } from '@yoyo/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ProfileTabs } from '@/components/profile/ProfileTabs';
import { isProfileTab } from '@/components/profile/profile-tabs';
import { ProfileHero } from '@/components/profile/ProfileHero';
import { loadProfile } from '@/lib/catalog/server-api';
import { profileSeo, seoMetadata } from '@/lib/seo';

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

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
export default async function ProfilePage({ params, searchParams }: Props) {
  const { locale, id } = (await params) as { locale: Locale; id: string };
  const query = await searchParams;
  const tab = first(query['tab']);
  const status = first(query['status']);
  setRequestLocale(locale);
  const loaded = await loadProfile(id);
  if (!loaded.ok) {
    if (loaded.status === 404) notFound();
    throw new Error(`The profile could not be loaded (${loaded.status})`);
  }
  const t = await getTranslations('profile');
  const { user, listings } = loaded.data;

  return (
    <main className="page flex flex-col gap-10 py-8 sm:py-10">
      <ProfileHero user={user} />
      {user.about && (
        <section aria-labelledby="profile-about" className="grid gap-3 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-10">
          <h2 id="profile-about" className="font-display text-display-s leading-[0.95] font-black uppercase">
            {t('about')}
          </h2>
          <p className="max-w-read text-lg leading-relaxed whitespace-pre-line [overflow-wrap:anywhere]">{user.about}</p>
        </section>
      )}
      <ProfileTabs
        listings={listings}
        name={user.name}
        userId={user.id}
        initialTab={isProfileTab(tab) ? tab : 'items'}
        initialStatus={(LISTING_STATUSES as readonly string[]).includes(status ?? '') ? (status as (typeof LISTING_STATUSES)[number]) : 'ALL'}
      />
      <ReportButton target="USER" id={user.id} ownerId={user.id} className="self-start" />
    </main>
  );
}
