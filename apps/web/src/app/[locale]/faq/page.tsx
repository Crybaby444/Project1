import type { Locale } from '@yoyo/shared';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { FaqList } from '@/components/pages/FaqList';
import { PageBanner } from '@/components/pages/PageBanner';
import { JsonLd } from '@/components/seo/JsonLd';
import { faqGroups, faqPageJsonLd } from '@/lib/faq';
import { alternates, pageMetadata } from '@/lib/seo';
import { CONTACT_EMAIL } from '@/lib/site';

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pages.faq' });
  return pageMetadata({ locale: locale as Locale, path: '/faq', title: t('title'), description: t('description') });
}

export default async function FaqPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('faq');
  const groups = faqGroups(t);

  return (
    <main className="flex flex-1 flex-col">
      <JsonLd data={faqPageJsonLd(groups, alternates('/faq', locale as Locale).canonical)} />
      <PageBanner
        title={t('title')}
        lead={t('lead')}
        stickers={[{ kind: 'star', size: 112, top: '-12%', right: '4%', rotate: 14, className: 'max-sm:hidden' }]}
      />
      <div className="bg-band overflow-x-clip">
        <div className="reveal mx-auto grid max-w-[1440px] gap-10 px-4 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1fr_2.2fr]">
          <aside className="border-ink bg-sticker-lavender rounded-card-xl flex flex-col gap-3 self-start border p-6 text-black lg:sticky lg:top-6">
            <p className="text-lg leading-relaxed font-bold">
              {t.rich('askUs', {
                email: CONTACT_EMAIL,
                mail: (chunks) => (
                  <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-4">
                    {chunks}
                  </a>
                ),
              })}
            </p>
          </aside>
          <FaqList groups={groups} />
        </div>
      </div>
    </main>
  );
}
