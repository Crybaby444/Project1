import { getTranslations } from 'next-intl/server';

/**
 * What is Yoyo: the statement, centred, word by word (the stage lights them up). The steps of a deal used
 * to sit under it; they now live in full, for each side, in TwoSides (owner, 2026-11-16: the page told the
 * same deal three times).
 */
export async function WhatIsYoyo() {
  const t = await getTranslations('landing.what');
  const words = t('statement').split(/\s+/);
  return (
    <section data-home="what" id="what" className="bg-canvas text-ink relative">
      <div data-pin className="flex min-h-svh flex-col items-center justify-center gap-[5vh] px-4 py-[14vh] text-center sm:px-8">
        <p className="text-ink/65 m-0 flex items-center gap-2.5 text-[13px] font-semibold">
          <span aria-hidden="true" className="size-2 rounded-full bg-current" />
          {t('label')}
        </p>
        <h2 className="font-display m-0 mx-auto max-w-[14em] text-[clamp(2rem,9.4vw,3rem)] leading-[0.95] font-black uppercase sm:text-[clamp(2.4rem,5.4vw,6.4rem)]">
          {words.map((w, i) => (
            <span key={i}>
              <span data-word className="inline-block">
                {w}
              </span>{' '}
            </span>
          ))}
        </h2>
      </div>
    </section>
  );
}
