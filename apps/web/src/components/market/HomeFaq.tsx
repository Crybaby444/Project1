import { getTranslations } from 'next-intl/server';
import { FaqList } from '@/components/pages/FaqList';
import { Link } from '@/i18n/navigation';
import { FAQ_TEASER } from '@/lib/faq';

/** Four questions people ask before their first deal, answered on the home; the rest are on /faq. */
export async function HomeFaq() {
  const [t, tf] = await Promise.all([getTranslations('market.faq'), getTranslations('faq')]);
  const items = FAQ_TEASER.map(([group, key]) => ({ id: `home-${key}`, question: tf(`groups.${group}.items.${key}.q`), answer: tf(`groups.${group}.items.${key}.a`) }));
  return (
    <section aria-labelledby="home-faq" className="page grid gap-10 py-20 sm:py-28 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="flex flex-col items-start gap-5">
        <h2 id="home-faq" className="type-title">
          {t('title')}
        </h2>
        <Link href="/faq" className="text-base font-bold underline decoration-1 underline-offset-4">
          {t('all')}
        </Link>
      </div>
      <FaqList titled={false} groups={[{ id: 'home', title: t('title'), items }]} />
    </section>
  );
}
