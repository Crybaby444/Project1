import type { Locale } from '@yoyo/shared';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CallToAction } from '@/components/landing/CallToAction';
import { PageBanner } from '@/components/pages/PageBanner';
import { Sticker } from '@/components/ui/Sticker';
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
const DOTS = ['bg-sticker-sun', 'bg-sticker-blue', 'bg-sticker-lavender', 'bg-sticker-mint', 'bg-sticker-ember', 'bg-sticker-sun'];

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pages.howItWorks' });
  return pageMetadata({ locale: locale as Locale, path: '/how-it-works', title: t('title'), description: t('description') });
}

function StepList({ id, heading, steps }: { id: string; heading: string; steps: { title: string; body: string }[] }) {
  return (
    <section aria-labelledby={id} className="border-ink bg-surface rounded-card-xl flex flex-col gap-6 border p-6 sm:p-8">
      <h2 id={id} className="text-[clamp(1.75rem,3vw,2.5rem)] leading-tight font-bold">
        {heading}
      </h2>
      <ol className="flex flex-col gap-6">
        {steps.map((step, index) => (
          <li key={step.title} className="grid grid-cols-[3rem_1fr] gap-4">
            <span
              aria-hidden="true"
              className={`border-ink font-display inline-grid size-12 place-items-center rounded-full border text-lg font-black text-black ${DOTS[index % DOTS.length]}`}
            >
              {index + 1}
            </span>
            <span className="flex flex-col gap-1 pt-1">
              <span className="text-xl leading-snug font-bold">{step.title}</span>
              <span className="max-w-[60ch] text-base leading-relaxed">{step.body}</span>
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

      <div className="bg-band overflow-x-clip">
        <div className="reveal mx-auto grid max-w-[1440px] gap-6 px-4 py-16 sm:px-8 sm:py-24 lg:grid-cols-2">
          <StepList
            id="renter"
            heading={t('renter.heading')}
            steps={RENTER.map((key) => ({ title: t(`renter.steps.${key}.title`), body: t(`renter.steps.${key}.body`, FACTS) }))}
          />
          <StepList
            id="owner"
            heading={t('owner.heading')}
            steps={OWNER.map((key) => ({ title: t(`owner.steps.${key}.title`), body: t(`owner.steps.${key}.body`, FACTS) }))}
          />
        </div>
      </div>

      <div className="bg-surface overflow-x-clip">
        <div className="reveal mx-auto grid max-w-[1440px] gap-10 px-4 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.4fr_1fr]">
          <section aria-labelledby="deposit" className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <Sticker kind="coin" size={64} className="shrink-0 -rotate-6" />
              <h2 id="deposit" className="text-[clamp(1.75rem,3vw,2.5rem)] leading-tight font-bold">
                {t('deposit.heading')}
              </h2>
            </div>
            <p className="text-lg leading-relaxed">{t('deposit.lead')}</p>
            <ul className="flex flex-col gap-3">
              {(['fine', 'agreed', 'disputed'] as const).map((key, index) => (
                <li
                  key={key}
                  className={`border-ink rounded-card border p-5 text-base leading-relaxed text-black ${['bg-sticker-mint', 'bg-sticker-lavender', 'bg-sticker-sun'][index]}`}
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
              <h2 id="cancel" className="text-[30px] leading-tight font-bold">
                {t('cancel.heading')}
              </h2>
              <p className="leading-relaxed">{t('cancel.body')}</p>
            </section>
            <section aria-labelledby="reviews" className="flex flex-col gap-3">
              <h2 id="reviews" className="text-[30px] leading-tight font-bold">
                {t('reviews.heading')}
              </h2>
              <p className="leading-relaxed">{t('reviews.body', FACTS)}</p>
            </section>
            <section aria-labelledby="today" className="border-ink bg-canvas rounded-card flex flex-col gap-3 border p-6">
              <h2 id="today" className="text-2xl leading-tight font-bold">
                {t('today.heading')}
              </h2>
              <p className="leading-relaxed">{t('today.body')}</p>
            </section>
          </div>
        </div>
      </div>

      <div className="bg-canvas overflow-x-clip">
        <div className="reveal mx-auto flex max-w-[1440px] flex-col items-start gap-6 px-4 py-16 sm:px-8 sm:py-24">
          <h2 className="font-display text-[clamp(2.25rem,7vw,5.5rem)] leading-[0.85] font-black uppercase">{t('cta.title')}</h2>
          <CallToAction secondary={{ href: '/faq', label: t('cta.faq') }} />
        </div>
      </div>
    </main>
  );
}
