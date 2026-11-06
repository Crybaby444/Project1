import { getTranslations } from 'next-intl/server';
import { TransitionLink } from '@/components/motion/TransitionLink';
import { FaqList } from '@/components/pages/FaqList';
import { FAQ_TEASER } from '@/lib/faq';
import { Section, SectionTitle } from './Section';

/** Four common questions from the FAQ, and the way to the rest. */
export async function FaqTeaser() {
  const t = await getTranslations('landing.faq');
  const faq = await getTranslations('faq');
  const items = FAQ_TEASER.map(([group, key]) => ({
    id: `faq-${key}`,
    question: faq(`groups.${group}.items.${key}.q`),
    answer: faq(`groups.${group}.items.${key}.a`),
  }));

  return (
    <Section id="faq" tone="lavender">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col items-start gap-8">
          <SectionTitle
            id="faq"
            eyebrow={t('eyebrow')}
            title={t('title')}
            stickers={[
              {
                kind: 'heart',
                size: 80,
                bottom: '-30%',
                right: '10%',
                rotate: -12,
                className: 'max-sm:hidden',
              },
            ]}
          />
          <TransitionLink
            href="/faq"
            className="rounded-pill ease-yoyo inline-flex min-h-10 items-center gap-2 text-lg font-bold underline underline-offset-4 transition-transform duration-150 hover:-translate-y-0.5"
          >
            {t('all')}
            <span aria-hidden="true">→</span>
          </TransitionLink>
        </div>
        <FaqList titled={false} groups={[{ id: 'teaser', title: t('title'), items }]} />
      </div>
    </Section>
  );
}
