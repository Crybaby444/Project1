import { getTranslations } from 'next-intl/server';

const FEATURES = ['contract', 'deposit', 'checked', 'chat', 'live', 'map', 'reviews', 'follow', 'shops', 'favorites', 'wallet', 'languages'] as const;

/** Everything inside Yoyo, in one sheet: what the platform does for both sides (each line is a working part). */
export async function Inside() {
  const t = await getTranslations('landing.inside');
  return (
    <section data-home="inside" aria-labelledby="intro-inside" className="bg-canvas text-ink px-4 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-12">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
          <h2 id="intro-inside" className="font-display text-[clamp(2.6rem,7vw,6rem)] leading-[0.88] font-black uppercase">
            {t('title')}
          </h2>
          <p className="text-ink/75 max-w-[46ch] text-[17px] leading-relaxed lg:pb-2">{t('lead')}</p>
        </div>
        <ul className="border-ink/15 m-0 grid list-none border-t p-0 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <li key={f} className="border-ink/15 group flex flex-col gap-3 border-b py-7 sm:px-6 sm:[&:nth-child(2n+1)]:pl-0 lg:[&:nth-child(2n+1)]:pl-6 lg:[&:nth-child(4n+1)]:pl-0 lg:[&:not(:nth-child(4n+1))]:border-l sm:max-lg:[&:nth-child(2n)]:border-l">
              <span className="text-ink/70 text-[13px] font-bold tabular-nums">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="text-[19px] leading-snug font-bold">{t(`${f}.title`)}</h3>
              <p className="text-ink/75 m-0 text-[15px] leading-relaxed">{t(`${f}.body`)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
