import { getTranslations } from 'next-intl/server';

/** Everything else the platform does, in a compact sheet. */
const PARTS = ['live', 'map', 'favorites', 'wallet'] as const;

/**
 * What else is inside (owner, 2026-11-16: no repeats): only the parts no other section tells — the
 * guarantees are in the numbers (Facts), people, shops and chats in PeopleScene, the deal in TwoSides.
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

        <ul className="border-ink/15 m-0 grid list-none gap-x-8 border-t p-0 sm:grid-cols-2 lg:grid-cols-4">
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
