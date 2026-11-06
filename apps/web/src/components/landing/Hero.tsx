import { getTranslations } from 'next-intl/server';
import { Ribbon } from '@/components/decor/Ribbon';
import { StickerCluster } from '@/components/decor/StickerCluster';
import { Wordmark } from '@/components/ui/Wordmark';
import { displayFit } from '@/lib/display-fit';
import { CallToAction } from './CallToAction';

/**
 * The poster at the top (DESIGN.md hero): the YOYO wordmark as a sculptural block, the ribbon-string
 * running behind it, stickers pinned around, the tagline and the one main action.
 */
export async function Hero() {
  const t = await getTranslations('landing');
  const home = await getTranslations('home');

  return (
    <section aria-labelledby="hero-title" className="bg-canvas relative overflow-x-clip">
      <div className="relative mx-auto flex max-w-[1440px] flex-col items-center gap-6 px-4 pt-10 pb-16 text-center sm:px-8 sm:pt-14 sm:pb-24">
        <p className="border-ink bg-surface text-ink rounded-pill relative z-10 border px-3 py-1.5 text-xs font-bold tracking-[0.032em] uppercase">
          {t('kicker')}
        </p>

        <div className="@container relative w-full pb-[6%]">
          <div
            aria-hidden="true"
            className="absolute top-[12%] left-1/2 w-[150%] -translate-x-1/2 sm:top-[6%] sm:w-[116%]"
          >
            <Ribbon variant="hero" />
          </div>
          <h1
            id="hero-title"
            style={displayFit('YOYO', { min: '5rem', max: '40rem' })}
            className="text-display-fit relative z-10 pt-[0.06em]"
          >
            <Wordmark animated className="block" />
          </h1>
          <StickerCluster
            float
            items={[
              { kind: 'coin', size: 128, top: '-6%', left: '1%', rotate: -14 },
              { kind: 'star', size: 112, top: '-10%', right: '3%', rotate: 10 },
              { kind: 'heart', size: 96, bottom: '-12%', left: '14%', rotate: 8, className: 'max-sm:hidden' },
              {
                kind: 'bolt',
                size: 104,
                bottom: '-6%',
                right: '12%',
                rotate: -10,
                className: 'max-sm:hidden',
              },
            ]}
          />
        </div>

        <p className="relative z-10 mt-6 max-w-[22ch] text-[clamp(1.75rem,4.4vw,4rem)] leading-[1.02] font-bold tracking-[-0.01em] text-balance">
          {home('tagline')}
        </p>
        <p className="relative z-10 max-w-[46ch] text-[17px] leading-relaxed text-balance sm:text-lg">
          {home('lead')}
        </p>
        <CallToAction
          secondary={{ href: '/how-it-works', label: t('ctaHowItWorks') }}
          className="relative z-10 justify-center"
        />
      </div>
    </section>
  );
}
