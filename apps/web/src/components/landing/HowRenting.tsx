import { getTranslations } from 'next-intl/server';
import { Ribbon } from '@/components/decor/Ribbon';
import { TransitionLink } from '@/components/motion/TransitionLink';
import { Section, SectionTitle } from './Section';

const RENTER = ['find', 'ask', 'sign', 'meet', 'return'] as const;
const OWNER = ['list', 'choose', 'handover', 'paid', 'check'] as const;
const DOTS = ['bg-sticker-sun text-black', 'bg-sticker-blue text-black', 'bg-sticker-lavender text-black', 'bg-sticker-mint text-black', 'bg-sticker-violet text-white'];

function Steps({ heading, steps, prefix }: { heading: string; steps: { title: string; body: string }[]; prefix: string }) {
  return (
    <div className="border-ink bg-surface text-ink rounded-card-xl flex flex-col gap-6 border p-6 sm:p-8">
      <h3 id={`${prefix}-heading`} className="text-[30px] leading-tight font-bold">
        {heading}
      </h3>
      <ol aria-labelledby={`${prefix}-heading`} className="flex flex-col gap-5">
        {steps.map((step, index) => (
          <li key={step.title} className="grid grid-cols-[3rem_1fr] items-start gap-4">
            <span
              aria-hidden="true"
              className={`border-ink font-display inline-grid size-12 place-items-center rounded-full border text-lg font-black ${DOTS[index % DOTS.length]}`}
            >
              {index + 1}
            </span>
            <span className="flex flex-col gap-1 pt-1">
              <span className="text-lg leading-snug font-bold">{step.title}</span>
              <span className="text-[15px] leading-relaxed sm:text-base">{step.body}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export async function HowRenting() {
  const t = await getTranslations('landing.how');

  return (
    <Section id="how" tone="band">
      <div className="relative">
        <SectionTitle
          id="how"
          eyebrow={t('eyebrow')}
          title={t('title')}
          stickers={[{ kind: 'check', size: 96, top: '-8%', right: '2%', rotate: -10 }]}
        />
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -bottom-16 hidden w-[28rem] lg:block">
          <Ribbon variant="loop" />
        </div>
      </div>
      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <Steps
          prefix="renter"
          heading={t('renter')}
          steps={RENTER.map((key) => ({ title: t(`renterSteps.${key}.title`), body: t(`renterSteps.${key}.body`) }))}
        />
        <Steps
          prefix="owner"
          heading={t('owner')}
          steps={OWNER.map((key) => ({ title: t(`ownerSteps.${key}.title`), body: t(`ownerSteps.${key}.body`) }))}
        />
      </div>
      <p className="mt-10">
        <TransitionLink
          href="/how-it-works"
          className="rounded-pill inline-flex min-h-10 items-center gap-2 text-lg font-bold underline underline-offset-4 transition-transform duration-150 ease-yoyo hover:-translate-y-0.5"
        >
          {t('more')}
          <span aria-hidden="true">→</span>
        </TransitionLink>
      </p>
    </Section>
  );
}
