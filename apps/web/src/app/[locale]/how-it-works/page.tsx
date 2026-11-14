import type { Locale } from '@yoyo/shared';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CallToAction } from '@/components/landing/CallToAction';
import { PageBanner } from '@/components/pages/PageBanner';
import { Mark } from '@/components/brand/Mark';
import { pageMetadata } from '@/lib/seo';
import { SERVICE_FACTS } from '@/lib/site';

type Params = { params: Promise<{ locale: string }> };

const FACTS = {
  requestHours: SERVICE_FACTS.requestHours,
  checkHours: SERVICE_FACTS.checkHours,
  reviewDays: SERVICE_FACTS.reviewDays,
  fee: SERVICE_FACTS.serviceFeePercent,
};

const RENTER = ['find', 'request', 'contract', 'pay', 'handover', 'return'] as const;
const OWNER = ['list', 'review', 'accept', 'handover', 'check'] as const;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pages.howItWorks' });
  return pageMetadata({
    locale: locale as Locale,
    path: '/how-it-works',
    title: t('title'),
    description: t('description'),
  });
}

function StepList({
  id,
  heading,
  steps,
}: {
  id: string;
  heading: string;
  steps: { title: string; body: string }[];
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-6">
      <h2 id={id} className="font-display text-[clamp(2.2rem,4vw,3.6rem)] leading-[0.9] font-black uppercase">
        {heading}
      </h2>
      {/* The steps read as the catalog's index: a number, a display title, one line; hairlines between. */}
      <ol className="border-ink/15 m-0 list-none border-t p-0">
        {steps.map((step, index) => (
          <li key={step.title} className="border-ink/15 grid grid-cols-[2.6rem_1fr] gap-x-4 gap-y-2 border-b py-6 sm:grid-cols-[3.4rem_1fr]">
            <span aria-hidden="true" className="font-display text-ink/55 text-[2.2rem] leading-[0.85] font-black tabular-nums sm:text-[2.8rem]">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="flex flex-col gap-2">
              <span className="font-display text-[1.7rem] leading-[0.95] font-black uppercase sm:text-[2rem]">{step.title}</span>
              <span className="text-ink/85 max-w-[60ch] text-base leading-relaxed">{step.body}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default async function HowItWorksPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('howItWorks');

  return (
    <main className="flex flex-1 flex-col">
      <PageBanner
        title={t('title')}
        lead={t('lead')}
        ribbon
        stickers={[
          { kind: 'yoyo', size: 120, top: '-10%', right: '4%', rotate: 12 },
          { kind: 'coin', size: 80, bottom: '-30%', right: '22%', rotate: -10, className: 'max-sm:hidden' },
        ]}
      />

      <div className="overflow-x-clip">
        <div className="reveal mx-auto grid max-w-[1440px] gap-14 px-4 py-16 sm:px-8 sm:py-24 lg:grid-cols-2 lg:gap-[clamp(32px,4vw,72px)]">
          <StepList
            id="renter"
            heading={t('renter.heading')}
            steps={RENTER.map((key) => ({
              title: t(`renter.steps.${key}.title`),
              body: t(`renter.steps.${key}.body`, FACTS),
            }))}
          />
          <StepList
            id="owner"
            heading={t('owner.heading')}
            steps={OWNER.map((key) => ({
              title: t(`owner.steps.${key}.title`),
              body: t(`owner.steps.${key}.body`, FACTS),
            }))}
          />
        </div>
      </div>

      <div className="overflow-x-clip">
        <div className="border-ink/15 reveal mx-auto grid max-w-[1440px] gap-14 border-t px-4 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.4fr_1fr] lg:gap-[clamp(32px,4vw,72px)]">
          <section aria-labelledby="deposit" className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <Mark size={64} string={false} className="shrink-0 animate-[spin_6s_linear_infinite] motion-reduce:animate-none" />
              <h2 id="deposit" className="font-display text-[clamp(1.9rem,3.2vw,2.8rem)] leading-[0.95] font-black uppercase">
                {t('deposit.heading')}
              </h2>
            </div>
            <p className="text-lg leading-relaxed">{t('deposit.lead')}</p>
            <ol className="border-ink/15 m-0 list-none border-t p-0">
              {(['fine', 'agreed', 'disputed'] as const).map((key, index) => (
                <li key={key} className="border-ink/15 grid grid-cols-[2.2rem_1fr] gap-3 border-b py-4 text-base leading-relaxed">
                  <span aria-hidden="true" className="pt-0.5 text-xs font-bold tabular-nums">{String(index + 1).padStart(2, '0')}</span>
                  <span>{t(`deposit.${key}`)}</span>
                </li>
              ))}
            </ol>
            <p className="max-w-[64ch] leading-relaxed">{t('deposit.timeouts', FACTS)}</p>
            <p className="max-w-[64ch] leading-relaxed">{t('deposit.notReturned')}</p>
          </section>

          <div className="flex flex-col gap-10">
            <section aria-labelledby="cancel" className="flex flex-col gap-3">
              <h2 id="cancel" className="font-display text-[clamp(1.9rem,3.2vw,2.8rem)] leading-[0.95] font-black uppercase">
                {t('cancel.heading')}
              </h2>
              <p className="leading-relaxed">{t('cancel.body')}</p>
            </section>
            <section aria-labelledby="reviews" className="flex flex-col gap-3">
              <h2 id="reviews" className="font-display text-[clamp(1.9rem,3.2vw,2.8rem)] leading-[0.95] font-black uppercase">
                {t('reviews.heading')}
              </h2>
              <p className="leading-relaxed">{t('reviews.body', FACTS)}</p>
            </section>
            <section
              aria-labelledby="today"
              className="border-ink flex flex-col gap-3 border-t-2 pt-6"
            >
              <h2 id="today" className="font-display text-[clamp(1.9rem,3.2vw,2.8rem)] leading-[0.95] font-black uppercase">
                {t('today.heading')}
              </h2>
              <p className="leading-relaxed">{t('today.body')}</p>
            </section>
          </div>
        </div>
      </div>

      <div className="overflow-x-clip">
        <div className="border-ink/15 reveal mx-auto flex max-w-[1440px] flex-col items-start gap-6 border-t px-4 py-16 sm:px-8 sm:py-24">
          <h2 className="font-display text-[clamp(2.25rem,7vw,5.5rem)] leading-[0.85] font-black uppercase">
            {t('cta.title')}
          </h2>
          <CallToAction secondary={{ href: '/faq', label: t('cta.faq') }} />
        </div>
      </div>
    </main>
  );
}
