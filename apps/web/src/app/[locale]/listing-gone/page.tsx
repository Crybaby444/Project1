import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Button } from '@/components/ui/Button';
import { displayFit } from '@/lib/display-fit';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'item.gone' });
  return { title: `${t('title')} · Yoyo`, robots: { index: false, follow: true } };
}

/**
 * What a removed item's address shows: the proxy rewrites `/listings/{id}-{slug}` of an archived item
 * here with the status 410 (W03 §G), so search engines drop it quickly; people get the catalog.
 */
export default async function ListingGonePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('item.gone');
  return (
    <main className="@container mx-auto flex w-full max-w-[1440px] flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <p aria-hidden="true" style={displayFit('410', { min: '3rem', max: '10rem' })} className="font-display text-display-fit leading-[0.8] font-black">
        410
      </p>
      <h1 className="text-3xl font-bold">{t('title')}</h1>
      <p className="max-w-[46ch] leading-relaxed">{t('body')}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button href="/c">{t('catalog')}</Button>
        <Button variant="ghost" href="/search">
          {t('search')}
        </Button>
      </div>
    </main>
  );
}
