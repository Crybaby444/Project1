import { getTranslations } from 'next-intl/server';
import { Ribbon } from '@/components/decor/Ribbon';
import { CallToAction } from './CallToAction';
import { Section, SectionTitle } from './Section';

export async function FinalCta() {
  const t = await getTranslations('landing');

  return (
    <Section id="start" tone="canvas" className="flex flex-col items-center gap-8 pb-36 text-center sm:pb-44">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-2 sm:bottom-6">
        <Ribbon variant="wave" />
      </div>
      <SectionTitle
        id="start"
        eyebrow="Yoyo"
        title={t('final.title')}
        align="center"
        max="11rem"
        stickers={[
          { kind: 'yoyo', size: 120, top: '-18%', left: '2%', rotate: -12 },
          { kind: 'heart', size: 88, bottom: '-14%', right: '4%', rotate: 14, className: 'max-sm:hidden' },
        ]}
      />
      <p className="relative z-10 max-w-[44ch] text-lg leading-relaxed text-balance sm:text-xl">
        {t('final.lead')}
      </p>
      <CallToAction
        secondary={{ href: '/faq', label: t('final.faq') }}
        className="relative z-10 justify-center"
      />
    </Section>
  );
}
