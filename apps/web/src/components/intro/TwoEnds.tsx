'use client';

import { useTranslations } from 'next-intl';
import { useScrollProgress } from '@/lib/motion/use-scroll-progress';

const clamp = (x: number) => Math.min(1, Math.max(0, x));
/** 0 → 1 over [a, b], eased (smoothstep). */
const span = (p: number, a: number, b: number) => {
  const t = clamp((p - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const SIDES = ['need', 'have'] as const;

/**
 * Two ends of one string (2026-11-16): the person who needs a thing and the one who has it, on the two
 * halves of the screen, and the yo-yo between them. While you scroll it goes out to one end, across to the
 * other and back to the middle, where Yoyo holds the contract and the deposit. On a desktop the scene is held
 * on screen; on a phone and under reduced motion it is the finished picture.
 */
export function TwoEnds() {
  const t = useTranslations('landing.ends');
  const [section, p] = useScrollProgress<HTMLElement>();
  const draw = span(p, 0.02, 0.2);
  // Out to the left end, across to the right, back to the middle: like a throw.
  const x = p < 0.3 ? -span(p, 0.1, 0.3) : p < 0.62 ? -1 + 2 * span(p, 0.3, 0.62) : 1 - span(p, 0.62, 0.85);
  const middle = span(p, 0.8, 0.95);

  return (
    <section
      ref={section}
      data-home="ends"
      aria-labelledby="intro-ends"
      className="bg-canvas text-ink relative motion-reduce:h-auto lg:h-[300vh]"
    >
      <div className="flex min-h-svh flex-col justify-center gap-10 overflow-hidden px-4 py-24 motion-reduce:static sm:px-8 lg:sticky lg:top-0 lg:h-svh lg:py-16">
        <h2
          id="intro-ends"
          className="font-display mx-auto max-w-[12em] text-center text-[clamp(2.6rem,7vw,6rem)] leading-[0.88] font-black uppercase"
        >
          {t('title')}
        </h2>

        <div className="relative mx-auto grid w-full max-w-[1280px] gap-6 lg:grid-cols-2 lg:gap-0">
          {/* The string across the two ends, and the yo-yo running on it (desktop). */}
          <svg
            viewBox="-500 -40 1000 80"
            preserveAspectRatio="none"
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-1/2 z-10 hidden h-20 w-full -translate-y-1/2 overflow-visible motion-reduce:hidden lg:block"
          >
            <line
              x1="-500"
              x2="500"
              y1="0"
              y2="0"
              stroke="currentColor"
              strokeOpacity="0.14"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1={-500 * draw}
              x2={500 * draw}
              y1="0"
              y2="0"
              stroke="currentColor"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-1/2 z-20 hidden motion-reduce:hidden lg:block"
            style={{ transform: `translate(calc(-50% + ${x.toFixed(4)} * min(23vw, 300px)), -50%)` }}
          >
            <span
              className="bg-ink relative grid size-16 place-items-center rounded-full shadow-[0_18px_40px_-14px_rgba(10,11,14,0.55)]"
              style={{ transform: `rotate(${p * 1440}deg)`, opacity: draw }}
            >
              <span className="bg-canvas absolute h-[3px] w-[62%] rounded-full" />
              <span className="bg-canvas/80 absolute size-3 rounded-full" />
            </span>
          </div>

          {SIDES.map((side, i) => (
            <article
              key={side}
              className={`relative flex flex-col gap-5 rounded-[32px] p-7 sm:p-10 lg:min-h-[52svh] lg:justify-between ${i === 0 ? 'bg-ink/[0.04] lg:mr-10 lg:rounded-r-[12px]' : 'bg-[var(--night)] text-[var(--paper)] lg:ml-10 lg:rounded-l-[12px]'}`}
              data-end={side}
            >
              <div className="flex flex-col gap-3">
                <span
                  className={`text-[13px] font-bold ${i === 0 ? 'text-ink/75' : 'text-[var(--paper)]/75'}`}
                >
                  {t(`${side}.who`)}
                </span>
                <h3 className="font-display text-[clamp(2.2rem,4vw,3.8rem)] leading-[0.9] font-black uppercase">
                  {t(`${side}.title`)}
                </h3>
              </div>
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {(['a', 'b', 'c'] as const).map((k) => (
                  <li
                    key={k}
                    className={`flex gap-3 border-t pt-3 text-[16px] leading-snug ${i === 0 ? 'border-ink/12' : 'border-[var(--paper)]/15'}`}
                  >
                    <span
                      aria-hidden="true"
                      className="mt-[0.45em] size-1.5 flex-none rounded-full bg-current"
                    />
                    {t(`${side}.${k}`)}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <p
          className="border-ink/15 bg-canvas mx-auto flex max-w-[52ch] items-center gap-3 rounded-[20px] border px-5 py-3.5 text-[15px] font-semibold motion-reduce:opacity-100 lg:opacity-[var(--m)]"
          style={{ ['--m' as string]: String(middle) }}
        >
          <span aria-hidden="true" className="bg-ink grid size-7 flex-none place-items-center rounded-full">
            <span className="bg-canvas h-[2px] w-3.5 rounded-full" />
          </span>
          {t('middle')}
        </p>
      </div>
    </section>
  );
}
