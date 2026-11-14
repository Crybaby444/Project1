import type { Locale } from '@yoyo/shared';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CallToAction } from '@/components/landing/CallToAction';
import { StickyStack } from '@/components/motion/StickyStack';
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
const DOTS = [
  'bg-ink text-canvas',
  'bg-ink text-canvas',
  'bg-ink text-canvas',
  'bg-ink text-canvas',
  'bg-ink text-canvas',
  'bg-ink text-canvas',
];

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
      {/* Each step is a small card that pins and lands on the pile as the page scrolls. */}
      <StickyStack labelledBy={id} className="gap-4">
        {steps.map((step, index) => (
          <div
            key={step.title}
            className="border-ink/15 bg-canvas text-ink rounded-media grid grid-cols-[3rem_1fr] gap-4 border p-5 sm:p-6"
          >
            <span
              aria-hidden="true"
              className={`font-display inline-grid size-12 place-items-center rounded-full text-lg font-black ${DOTS[index % DOTS.length]}`}
            >
              {index + 1}
            </span>
            <span className="flex flex-col gap-1 pt-1">
              <span className="text-xl leading-snug font-bold">{step.title}</span>
              <span className="max-w-[60ch] text-base leading-relaxed">{step.body}</span>
            </span>
          </div>
        ))}
      </StickyStack>
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

      <div className="bg-band overflow-x-clip">
        <div className="reveal mx-auto grid max-w-[1440px] gap-6 px-4 py-16 sm:px-8 sm:py-24 lg:grid-cols-2">
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

      <div className="bg-surface overflow-x-clip">
        <div className="reveal mx-auto grid max-w-[1440px] gap-10 px-4 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.4fr_1fr]">
          <section aria-labelledby="deposit" className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <Mark size={64} string={false} className="shrink-0 animate-[spin_6s_linear_infinite] motion-reduce:animate-none" />
              <h2 id="deposit" className="font-display text-[clamp(1.9rem,3.2vw,2.8rem)] leading-[0.95] font-black uppercase">
                {t('deposit.heading')}
              </h2>
            </div>
            <p className="text-lg leading-relaxed">{t('deposit.lead')}</p>
            <ul className="flex flex-col gap-3">
              {(['fine', 'agreed', 'disputed'] as const).map((key, index) => (
                <li
                  key={key}
                  className={`border-ink/15 rounded-media border p-5 text-base leading-relaxed ${['bg-mist', 'bg-mist', 'bg-mist'][index]}`}
                >
                  {t(`deposit.${key}`)}
                </li>
              ))}
            </ul>
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
              className="border-ink/15 bg-canvas rounded-media flex flex-col gap-3 border p-6"
            >
              <h2 id="today" className="font-display text-[clamp(1.9rem,3.2vw,2.8rem)] leading-[0.95] font-black uppercase">
                {t('today.heading')}
              </h2>
              <p className="leading-relaxed">{t('today.body')}</p>
            </section>
          </div>
        </div>
      </div>

      <div className="bg-canvas overflow-x-clip">
        <div className="reveal mx-auto flex max-w-[1440px] flex-col items-start gap-6 px-4 py-16 sm:px-8 sm:py-24">
          <h2 className="font-display text-[clamp(2.25rem,7vw,5.5rem)] leading-[0.85] font-black uppercase">
            {t('cta.title')}
          </h2>
          <CallToAction secondary={{ href: '/faq', label: t('cta.faq') }} />
        </div>
      </div>
    </main>
  );
}
