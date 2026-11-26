import { ReportButton } from '@/components/reports/ReportButton';
import type { Locale } from '@yoyo/shared';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ProfileTabs } from '@/components/profile/ProfileTabs';
import { ProfileHero } from '@/components/profile/ProfileHero';
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
  const { user, listings } = loaded.data;

  return (
    <main className="page page-y stack-page">
      <ProfileHero user={user} />
      <ProfileTabs listings={listings} name={user.name} userId={user.id} reviewCount={user.reviewCount} />
      <ReportButton target="USER" id={user.id} ownerId={user.id} className="self-start" />
    </main>
  );
}
