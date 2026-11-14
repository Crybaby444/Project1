import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/Button';
import { LIST_ITEM_HREF } from '@/lib/site';

/**
 * The first screen (v16): the word YOYO across the screen, the yo-yo hanging in front of it (drawn by the
 * stage into `data-anchor="hero-slot"`), one line and two ways in. Without the stage it is simply the word,
 * the line and the buttons.
 */
export async function Hero() {
  const t = await getTranslations('landing.hero');
  return (
    <section data-home="hero" className="bg-canvas text-ink relative h-svh min-h-[620px] overflow-hidden">
      <h1
        aria-label="Yoyo"
        className="font-display absolute inset-x-0 top-[38%] m-0 flex -translate-y-1/2 justify-center text-[46vw] leading-[0.8] font-black whitespace-nowrap uppercase sm:top-[47%] sm:text-[clamp(9rem,43vw,56rem)]"
      >
        {/* Two halves, so the word can open like doors on scroll. */}
        {(['l', 'r'] as const).map((half) => (
          <span key={half} data-half={half} className="inline-block overflow-hidden pt-[0.04em]" aria-hidden="true">
            <b data-letter className="inline-block font-black">Y</b>
            <b data-letter className="inline-block font-black">O</b>
          </span>
        ))}
      </h1>
      <div data-anchor="hero-slot" aria-hidden="true" className="absolute top-[44%] left-1/2 aspect-square w-[24vw] -translate-1/2 sm:top-[58%] sm:w-[min(25vh,19vw)]" />
      <div className="absolute inset-x-4 bottom-6 grid justify-items-center gap-4 text-center sm:inset-x-8 sm:grid-cols-[1fr_auto_1fr] sm:items-end sm:justify-items-stretch sm:text-left">
        <p data-reveal className="m-0 max-w-[22em] text-[clamp(1rem,1.25vw,1.2rem)] leading-snug font-medium">
          {t('line')}
        </p>
        <span data-hero-in aria-hidden="true" className="text-ink/60 hidden justify-items-center gap-1.5 text-xs font-semibold sm:grid">
          {/* The mouse with its wheel rolling down (the concept's scroll cue). */}
          <svg viewBox="0 0 14 22" fill="none" className="h-[22px] w-[14px]">
            <rect x="1" y="1" width="12" height="20" rx="6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M7 6v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="animate-[scroll-cue_1.8s_cubic-bezier(0.2,0.8,0.2,1)_infinite] motion-reduce:animate-none" />
          </svg>
          {t('scroll')}
        </span>
        <div data-hero-in className="flex flex-wrap justify-center gap-2 sm:justify-end">
          <Button href="/c" size="lg">
            <span aria-hidden="true" className="size-2 rounded-full bg-[var(--glow)]" />
            {t('find')}
          </Button>
          {LIST_ITEM_HREF ? (
            <Button href={LIST_ITEM_HREF} variant="ghost" size="lg">
              {t('lend')}
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
