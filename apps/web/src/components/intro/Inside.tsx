import { getTranslations } from 'next-intl/server';

/** The three that make a deal between strangers safe: big, on the night. */
const PILLARS = ['contract', 'deposit', 'checked'] as const;
/** Everything else the platform does, in a compact sheet. */
const PARTS = [
  'chat',
  'live',
  'map',
  'reviews',
  'follow',
  'shops',
  'favorites',
  'wallet',
  'languages',
] as const;

/**
 * Everything inside Yoyo (2026-11-16): the three guarantees as large night cards, each with its own small
 * drawing, and the nine working parts under them. Every line is a part of the platform that works today.
 */
export async function Inside() {
  const t = await getTranslations('landing.inside');
  return (
    <section
      data-home="inside"
      aria-labelledby="intro-inside"
      className="bg-canvas text-ink px-4 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto flex max-w-[1280px] flex-col gap-12">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
          <h2
            id="intro-inside"
            className="font-display text-[clamp(2.6rem,7vw,6rem)] leading-[0.88] font-black uppercase"
          >
            {t('title')}
          </h2>
          <p className="text-ink/75 max-w-[46ch] text-[17px] leading-relaxed lg:pb-2">{t('lead')}</p>
        </div>

        <ul className="m-0 grid list-none gap-3 p-0 lg:grid-cols-3">
          {PILLARS.map((f) => (
            <li
              key={f}
              className="group flex min-h-[19rem] flex-col justify-between gap-8 rounded-[28px] bg-[var(--night)] p-7 text-[var(--paper)] sm:p-9"
            >
              <Drawing kind={f} />
              <div className="flex flex-col gap-3">
                <h3 className="font-display text-[clamp(1.9rem,2.8vw,2.6rem)] leading-[0.9] font-black uppercase">
                  {t(`${f}.title`)}
                </h3>
                <p className="m-0 max-w-[34ch] text-[15.5px] leading-relaxed text-[var(--paper)]/80">
                  {t(`${f}.body`)}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <ul className="border-ink/15 m-0 grid list-none gap-x-8 border-t p-0 sm:grid-cols-2 lg:grid-cols-3">
          {PARTS.map((f) => (
            <li key={f} className="border-ink/15 flex flex-col gap-1.5 border-b py-6">
              <h3 className="text-[18px] leading-snug font-bold">{t(`${f}.title`)}</h3>
              <p className="text-ink/75 m-0 text-[15px] leading-relaxed">{t(`${f}.body`)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** A small line drawing per guarantee, in the yo-yo's language: two signatures, a disc that returns, an eye. */
function Drawing({ kind }: { kind: (typeof PILLARS)[number] }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  return (
    <svg
      viewBox="0 0 120 64"
      aria-hidden="true"
      className="h-16 w-[120px] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1.5 motion-reduce:transition-none"
    >
      {kind === 'contract' && (
        <g {...common}>
          <path d="M6 44c8-14 14-14 18-4s10 10 16-6" />
          <path d="M60 44c6-12 12-16 16-6 3 7 8 6 12-2s9-10 14 0" />
          <path d="M4 56h48M58 56h58" strokeOpacity="0.45" />
        </g>
      )}
      {kind === 'deposit' && (
        <g {...common}>
          <circle cx="28" cy="32" r="20" />
          <path d="M14 32h28" />
          <path d="M62 32h44" strokeDasharray="2 7" />
          <path d="M98 24l8 8-8 8" />
        </g>
      )}
      {kind === 'checked' && (
        <g {...common}>
          <path d="M6 32c14-18 42-18 56 0-14 18-42 18-56 0z" />
          <circle cx="34" cy="32" r="7" />
          <path d="M80 32l10 10 24-24" />
        </g>
      )}
    </svg>
  );
}
