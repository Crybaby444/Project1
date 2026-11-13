import { getTranslations } from 'next-intl/server';

const STEPS = ['find', 'book', 'meet', 'back'] as const;

/**
 * What is Yoyo: the statement, centred, word by word (the stage lights them up), and the four steps of a
 * rental under a line that fills as they arrive.
 */
export async function WhatIsYoyo() {
  const t = await getTranslations('landing.what');
  const words = t('statement').split(/\s+/);
  return (
    <section data-home="what" id="what" className="bg-canvas text-ink relative">
      <div data-pin className="flex min-h-svh flex-col items-center justify-between gap-[5vh] px-4 pt-[11vh] pb-[6vh] text-center sm:px-8 sm:pt-[14vh] sm:pb-[7vh]">
        <p className="text-ink/65 m-0 flex items-center gap-2.5 text-[13px] font-semibold">
          <span aria-hidden="true" className="size-2 rounded-full bg-current" />
          {t('label')}
        </p>
        <h2 className="font-display m-0 mx-auto max-w-[14em] text-[clamp(2rem,9.4vw,3rem)] leading-[0.86] font-black uppercase sm:text-[clamp(2.4rem,5.3vw,6.4rem)]">
          {words.map((w, i) => (
            <span key={i}>
              <span data-word className="inline-block">
                {w}
              </span>{' '}
            </span>
          ))}
        </h2>
        <ol data-steps className="border-ink/15 relative m-0 grid w-full list-none grid-cols-1 border-t-[1.5px] p-0 text-center sm:grid-cols-4 sm:text-left">
          {STEPS.map((key, i) => (
            <li key={key} data-step className="sm:border-ink/15 pt-5 sm:pr-6 sm:[&+&]:border-l sm:[&+&]:pl-6">
              <b className="font-display block text-[clamp(2.6rem,5vw,5.4rem)] leading-[0.8] font-black">{String(i + 1).padStart(2, '0')}</b>
              <h3 className="mt-4 mb-2 text-lg font-bold">{t(`steps.${key}.title`)}</h3>
              <p className="text-ink/75 m-0 mx-auto max-w-[22em] text-[14.5px] leading-relaxed sm:mx-0">{t(`steps.${key}.body`)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
