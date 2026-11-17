'use client';

import { useTranslations } from 'next-intl';
import { useScrollProgress } from '@/lib/motion/use-scroll-progress';

const clamp = (x: number) => Math.min(1, Math.max(0, x));
const span = (p: number, a: number, b: number) => {
  const t = clamp((p - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const CARDS = ['profile', 'shop', 'chat'] as const;
/** Where each card lands when the fan is open: x in % of its width, turn in degrees. */
const FAN = [
  { x: -104, r: -6, y: 18 },
  { x: 0, r: 0, y: 0 },
  { x: 104, r: 6, y: 18 },
];

/**
 * People, not a warehouse: profiles with followers and reviews, shops of their own things, messages. Three
 * cards lie in one stack and fan out while you scroll (desktop); on a phone they are a plain column.
 */
export function PeopleScene() {
  const t = useTranslations('landing.people');
  const [section, p] = useScrollProgress<HTMLElement>();
  const open = span(p, 0.12, 0.6);

  return (
    <section
      ref={section}
      data-home="people"
      aria-labelledby="intro-people"
      className="relative bg-[var(--night)] text-[var(--paper)] motion-reduce:h-auto lg:h-[240vh]"
    >
      <div className="flex min-h-svh flex-col items-center justify-center gap-12 overflow-hidden px-4 py-24 motion-reduce:static sm:px-8 lg:sticky lg:top-0 lg:h-svh lg:py-16">
        <div className="flex max-w-[52rem] flex-col items-center gap-5 text-center">
          <h2
            id="intro-people"
            className="font-display text-display-xl leading-[0.88] font-black uppercase"
          >
            {t('title')}
          </h2>
          <p className="max-w-[46ch] text-lg leading-relaxed text-[var(--paper)]/75">{t('lead')}</p>
        </div>

        <ul className="relative m-0 grid w-full max-w-[1100px] list-none gap-5 p-0 lg:block lg:h-[min(46svh,420px)]">
          {CARDS.map((card, i) => {
            const f = FAN[i]!;
            return (
              <li
                key={card}
                className="rounded-[28px] bg-[var(--paper)] p-6 text-[var(--night)] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.7)] lg:absolute lg:top-0 lg:left-1/2 lg:w-[min(30%,340px)] lg:[transform:translateX(calc(-50%+var(--x)*1%))_translateY(calc(var(--y)*1px))_rotate(calc(var(--r)*1deg))] motion-reduce:lg:static motion-reduce:lg:transform-none"
                style={{
                  ['--x' as string]: String(f.x * open),
                  ['--y' as string]: String(f.y * open + (1 - open) * (i - 1) * -10),
                  ['--r' as string]: String(f.r * open + (1 - open) * (i - 1) * 3),
                  zIndex: i === 1 ? 3 : 2,
                }}
              >
                <Picture card={card} t={t} />
                <h3 className="mt-5 text-lg font-bold">{t(`${card}.title`)}</h3>
                <p className="mt-1.5 text-base leading-relaxed text-[var(--night)]/70">
                  {t(`${card}.body`)}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/** A small drawing of each part, in the site's own shapes (no made-up people or numbers). */
function Picture({ card, t }: { card: (typeof CARDS)[number]; t: ReturnType<typeof useTranslations> }) {
  if (card === 'profile') {
    return (
      <div aria-hidden="true" className="flex items-center gap-3 rounded-[18px] bg-[var(--night)]/[0.05] p-4">
        <span className="grid size-12 place-items-center rounded-full bg-[var(--night)] text-base font-bold text-[var(--paper)]">
          Y
        </span>
        <span className="flex flex-1 flex-col gap-1.5">
          <b className="text-base">@you</b>
          <span className="flex gap-1.5">
            <i className="h-1.5 w-10 rounded-full bg-[var(--night)]/20" />
            <i className="h-1.5 w-7 rounded-full bg-[var(--night)]/20" />
          </span>
        </span>
        <span className="rounded-full bg-[var(--night)] px-3.5 py-1.5 text-xs font-bold text-[var(--paper)]">
          {t('profile.follow')}
        </span>
      </div>
    );
  }
  if (card === 'shop') {
    return (
      <div aria-hidden="true" className="grid grid-cols-3 gap-2 rounded-[18px] bg-[var(--night)]/[0.05] p-3">
        {Array.from({ length: 6 }, (_, i) => (
          <span
            key={i}
            className={`grid aspect-square place-items-center rounded-[12px] ${i % 3 === 1 ? 'bg-[var(--night)]' : 'bg-[var(--night)]/10'}`}
          >
            <span
              className={`h-[3px] w-1/2 rounded-full ${i % 3 === 1 ? 'bg-[var(--paper)]' : 'bg-[var(--night)]/30'}`}
            />
          </span>
        ))}
      </div>
    );
  }
  return (
    <div
      aria-hidden="true"
      className="flex flex-col gap-2 rounded-[18px] bg-[var(--night)]/[0.05] p-4 text-sm"
    >
      <span className="self-start rounded-[16px] rounded-bl-[6px] bg-[var(--night)]/10 px-3.5 py-2">
        {t('chat.ask')}
      </span>
      <span className="self-end rounded-[16px] rounded-br-[6px] bg-[var(--night)] px-3.5 py-2 text-[var(--paper)]">
        {t('chat.answer')}
      </span>
    </div>
  );
}
