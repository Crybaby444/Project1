import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

const STEPS = ['find', 'book', 'use', 'back'] as const;

/**
 * The deal as a loop, on the night ground (the yo-yo's own path: out and back). Four stops along one drawn
 * string; the last one carries the one light, because the deposit comes back. The string draws itself as
 * the band scrolls in where the browser supports scroll-driven animation; otherwise it is simply there.
 */
export async function LoopBand() {
  const t = await getTranslations('market.loop');
  return (
    <section aria-labelledby="home-loop" className="bg-night text-[#f4f1e6]" data-home-loop="">
      <div className="mx-auto grid max-w-[1440px] gap-12 px-4 py-20 sm:px-8 sm:py-28 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center">
        <div className="flex flex-col gap-6">
          <h2 id="home-loop" className="font-display text-[clamp(3rem,7vw,6rem)] leading-[0.86] font-black uppercase">
            {t('title')}
          </h2>
          <p className="max-w-[46ch] text-[18px] leading-relaxed text-[#f4f1e6]/80">{t('lead')}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/what-is-yoyo" className="rounded-pill inline-flex min-h-11 items-center gap-2 bg-[#f4f1e6] px-5 text-[13px] font-bold tracking-[0.04em] text-[#0a0b0e] uppercase transition-transform duration-150 hover:-translate-y-0.5">
              {t('whatIs')}
            </Link>
            <Link href="/how-it-works" className="rounded-pill inline-flex min-h-11 items-center border border-[#f4f1e6]/40 px-5 text-[13px] font-bold tracking-[0.04em] uppercase transition-colors hover:border-[#f4f1e6]">
              {t('how')}
            </Link>
          </div>
        </div>
        <div className="relative">
          <svg viewBox="0 0 600 220" aria-hidden="true" className="w-full overflow-visible">
            <path
              className="loop-draw"
              d="M75 150 C 120 60, 180 55, 225 70 S 330 190, 375 165 S 480 40, 525 70"
              fill="none"
              stroke="rgba(244,241,230,0.55)"
              strokeWidth="2"
              strokeLinecap="round"
              pathLength={1}
            />
            {[
              [75, 150],
              [225, 70],
              [375, 165],
              [525, 70],
            ].map(([x, y], i) => (
              <g key={i}>
                {i === 3 && <circle cx={x} cy={y} r="22" fill="#9ed2ff" opacity="0.18" />}
                <circle cx={x} cy={y} r={i === 3 ? 9 : 7} fill={i === 3 ? '#9ed2ff' : '#f4f1e6'} />
              </g>
            ))}
          </svg>
          <ol className="mt-6 grid gap-6 text-center sm:grid-cols-4 sm:gap-4">
            {STEPS.map((step, i) => (
              <li key={step} className="flex flex-col items-center gap-1.5">
                <span className={`font-display text-[1.9rem] leading-none font-black uppercase ${i === 3 ? 'text-[#9ed2ff]' : ''}`}>{t(`steps.${step}.title`)}</span>
                <span className="text-[15px] leading-snug text-[#f4f1e6]/75">{t(`steps.${step}.body`)}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
