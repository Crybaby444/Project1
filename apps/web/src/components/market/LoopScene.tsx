'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useScrollProgress } from '@/lib/motion/use-scroll-progress';

const STEPS = ['find', 'book', 'use', 'back'] as const;
/** Where each stop sits along the string (0..1 of its length). */
const STOPS = [0, 0.33, 0.67, 1];
const PATH = 'M60 300 C 170 70, 300 70, 380 190 S 600 400, 700 250 S 860 50, 940 110';

/**
 * Out and back, like a yo-yo (owner: keep the idea, make it alive). The band holds the screen while you
 * scroll; a yo-yo runs along one string through the four stops of every rental, each lighting as it is
 * reached, its words taking the stage on the left; at the last stop the deposit counts back to you in the
 * one light. As plain markup (reduced motion) it is the finished picture with all four stops.
 */
export function LoopScene({ deposit }: { deposit: string }) {
  const t = useTranslations('market.loop');
  const [section, p] = useScrollProgress<HTMLElement>();
  const path = useRef<SVGPathElement>(null);
  const [point, setPoint] = useState({ x: 60, y: 300 });
  const travel = Math.min(1, Math.max(0, (p - 0.06) / 0.8));
  const step = STOPS.reduce((acc, s, i) => (travel >= s - 0.02 ? i : acc), 0);

  useEffect(() => {
    const el = path.current;
    if (!el) return;
    const at = el.getPointAtLength(el.getTotalLength() * travel);
    setPoint({ x: at.x, y: at.y });
  }, [travel]);

  return (
    <section ref={section} aria-labelledby="home-loop" className="bg-night relative h-[320vh] text-[#f4f1e6] motion-reduce:h-auto" data-home-loop="">
      <div className="sticky top-0 flex min-h-[100svh] items-center overflow-hidden motion-reduce:static">
        <div className="mx-auto grid w-full max-w-[1440px] gap-10 px-4 py-24 sm:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center">
          <div className="flex flex-col gap-7">
            <h2 id="home-loop" className="font-display text-[clamp(2.8rem,6.4vw,5.6rem)] leading-[0.86] font-black uppercase">
              {t('title')}
            </h2>
            <div className="relative min-h-[8.5rem]">
              {STEPS.map((s, i) => (
                <div
                  key={s}
                  aria-hidden={i !== step}
                  className="absolute inset-0 flex flex-col gap-2 transition-[opacity,transform,filter] duration-500 ease-out motion-reduce:hidden"
                  style={{ opacity: i === step ? 1 : 0, transform: `translateY(${i === step ? 0 : i < step ? -14 : 14}px)`, filter: i === step ? 'none' : 'blur(4px)' }}
                >
                  <span className="text-[13px] font-bold tracking-[0.08em] text-[#f4f1e6]/55 tabular-nums">
                    {i + 1} / 4
                  </span>
                  <span className={`font-display text-[clamp(2rem,3.6vw,3rem)] leading-none font-black uppercase `}>{t(`steps.${s}.title`)}</span>
                  <span className="max-w-[40ch] text-[17px] leading-relaxed text-[#f4f1e6]/80">{t(`steps.${s}.body`)}</span>
                </div>
              ))}
              <p className="hidden max-w-[46ch] text-[18px] leading-relaxed text-[#f4f1e6]/80 motion-reduce:block">{t('lead')}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/what-is-yoyo" className="rounded-pill inline-flex min-h-11 items-center gap-2 bg-[#f4f1e6] px-5 text-[13px] font-bold tracking-[0.04em] text-[#0a0b0e] uppercase transition-transform duration-200 hover:-translate-y-0.5">
                {t('whatIs')}
              </Link>
              <Link href="/how-it-works" className="rounded-pill inline-flex min-h-11 items-center border border-[#f4f1e6]/35 px-5 text-[13px] font-bold tracking-[0.04em] uppercase transition-colors hover:border-[#f4f1e6]">
                {t('how')}
              </Link>
            </div>
          </div>

          <div className="relative">
            <svg viewBox="0 0 1000 440" aria-hidden="true" className="w-full overflow-visible">
              <path d={PATH} fill="none" stroke="rgba(244,241,230,0.16)" strokeWidth="2" strokeLinecap="round" />
              <path ref={path} d={PATH} fill="none" stroke="rgba(244,241,230,0.85)" strokeWidth="2.4" strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - travel} className="motion-reduce:[stroke-dashoffset:0]" />
              {STOPS.map((s, i) => {
                const lit = travel >= s - 0.02;
                return <StopDot key={i} d={PATH} at={s} lit={lit} last={i === 3} label={t(`steps.${STEPS[i]}.title`)} />;
              })}
              {/* The yo-yo itself: a solid disc with its slit, turning as it runs. */}
              <g transform={`translate(${point.x} ${point.y}) rotate(${travel * 1080})`} className="motion-reduce:hidden">
                <circle r="20" fill="#f4f1e6" />
                <circle r="20" fill="none" stroke="#0a0b0e" strokeOpacity="0.15" />
                <rect x="-20" y="-2.2" width="40" height="4.4" rx="2.2" fill="#0a0b0e" />
              </g>
            </svg>
            <div
              className="absolute right-0 bottom-0 flex items-center gap-3 rounded-full border border-[#f4f1e6]/30 bg-[#0a0b0e]/70 shadow-[0_0_40px_-6px_rgba(244,241,230,0.35)] py-2 pr-5 pl-2 backdrop-blur transition-[opacity,transform] duration-700 ease-out motion-reduce:opacity-100"
              style={{ opacity: travel > 0.98 ? 1 : 0, transform: `translateY(${travel > 0.98 ? 0 : 12}px)` }}
            >
              <span className="grid size-9 place-items-center rounded-full bg-[#f4f1e6] text-[#0a0b0e]">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
                  <path d="M5 12.5 10 17l9-10" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="text-[15px] font-semibold">{t('returned', { amount: deposit })}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** A stop on the string, placed by its share of the path's length; it lights when the yo-yo reaches it. */
function StopDot({ d, at, lit, last, label }: { d: string; at: number; lit: boolean; last: boolean; label: string }) {
  const ref = useRef<SVGPathElement>(null);
  const [pt, setPt] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const p = el.getPointAtLength(el.getTotalLength() * at);
    setPt({ x: p.x, y: p.y });
  }, [at]);
  return (
    <>
      <path ref={ref} d={d} fill="none" stroke="none" />
      {pt && (
        <g transform={`translate(${pt.x} ${pt.y})`}>
          {last && <circle r="38" fill="#f4f1e6" opacity={lit ? 0.12 : 0} style={{ transition: 'opacity 600ms' }} />}
          {last && <circle r="22" fill="none" stroke="#f4f1e6" strokeOpacity={lit ? 0.5 : 0} strokeWidth="1.5" style={{ transition: 'stroke-opacity 600ms' }} />}
          <circle r="9" fill={lit ? '#f4f1e6' : '#0a0b0e'} stroke={lit ? 'none' : 'rgba(244,241,230,0.4)'} strokeWidth="2" style={{ transition: 'fill 400ms' }} />
          <text y="58" textAnchor="middle" fill={lit ? '#f4f1e6' : 'rgba(244,241,230,0.45)'} style={{ font: '700 20px var(--font-body)', transition: 'fill 400ms' }}>
            {label}
          </text>
        </g>
      )}
    </>
  );
}
