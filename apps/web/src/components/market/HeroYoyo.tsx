'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';

/** One thing the yo-yo brings: a real item with its photo, price a day and place. */
export type HeroItem = { id: string; title: string; href: string; photo: string; price: string; place: string; demo: boolean };

/** A dip down and back up (the swap happens at the bottom). */
const DIP_MS = 1100;
/** How often it goes on its own, and how many times, before it rests (it never runs on forever). */
const AUTO_EVERY_MS = 5200;
const AUTO_TIMES = 3;

/**
 * The home's yo-yo (owner, 2026-11-28: "something with a twist, and beautiful"): the Yoyo mark made large,
 * a disc with the slit across it, hanging on its string from the top of the hero's night. Its face is a window with a real
 * item in it. It is thrown in when the page opens; then it dips, spins and comes back with another thing,
 * a few times on its own (pausing while pointed at or focused) and whenever "Show another" is pressed. That
 * is the promise in one gesture: it always comes back. With reduced motion it simply hangs and changes.
 */
export function HeroYoyo({ items }: { items: HeroItem[] }) {
  const t = useTranslations('market.hero');
  const [at, setAt] = useState(0);
  const [phase, setPhase] = useState<'throw' | 'idle' | 'dip'>('throw');
  const still = useRef(false);
  const busy = useRef(false);
  const hold = useRef(false);
  const auto = useRef(0);
  const item = items[at % Math.max(items.length, 1)];

  useEffect(() => {
    still.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.hasAttribute('data-no-loader');
  }, []);

  const next = useCallback(() => {
    if (items.length < 2 || busy.current) return;
    if (still.current) {
      setAt((i) => (i + 1) % items.length);
      return;
    }
    busy.current = true;
    setPhase('dip');
    window.setTimeout(() => setAt((i) => (i + 1) % items.length), DIP_MS / 2);
    window.setTimeout(() => {
      setPhase('idle');
      busy.current = false;
    }, DIP_MS);
  }, [items.length]);

  useEffect(() => {
    if (items.length < 2) return;
    const timer = window.setInterval(() => {
      if (still.current || hold.current || document.hidden || auto.current >= AUTO_TIMES) return;
      auto.current += 1;
      next();
    }, AUTO_EVERY_MS);
    return () => window.clearInterval(timer);
  }, [next, items.length]);

  // The next photo is ready before the yo-yo reaches the bottom.
  useEffect(() => {
    const coming = items[(at + 1) % Math.max(items.length, 1)];
    if (coming) new Image().src = coming.photo;
  }, [at, items]);

  const holdOn = () => (hold.current = true);
  const holdOff = () => (hold.current = false);

  return (
    <div
      className="relative flex flex-col items-center [--disc:clamp(13rem,24vw,20rem)] [--hang:2.5rem] lg:[--hang:3.5rem]"
      onPointerEnter={holdOn}
      onPointerLeave={holdOff}
      onFocus={holdOn}
      onBlur={holdOff}
      data-hero-yoyo=""
    >
      {/* The one blue light, pooled behind the yo-yo. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-[calc(var(--disc)*0.25)] left-1/2 -z-10 size-[calc(var(--disc)*1.9)] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--accent)_22%,transparent),transparent)]"
      />
      <div className="relative h-[calc(var(--disc)+var(--hang)+1.5rem)] w-full">
        {item ? (
          <Link
            href={item.href}
            aria-label={`${item.title}, ${item.price}`}
            className={`yoyo-hang group absolute top-[var(--hang)] left-1/2 -ml-[calc(var(--disc)/2)] block outline-offset-8 ${phase === 'throw' ? 'yoyo-throw' : phase === 'dip' ? 'yoyo-dip' : ''}`}
            onAnimationEnd={(event) => {
              if (event.target === event.currentTarget && phase === 'throw') setPhase('idle');
            }}
          >
            {/* Its string, from the top of the night it hangs in (the banner clips what is above): long enough for the throw. */}
            <span aria-hidden="true" className="bg-ink absolute bottom-full left-1/2 h-[calc(var(--hang)+60vh)] w-[1.5px] -translate-x-1/2" />
            {/* The disc spins (throw, dip); the face inside it grows a little under the pointer. */}
            <span className="yoyo-disc block size-[var(--disc)] rounded-full shadow-[0_48px_70px_-36px_rgb(10_11_14/0.55)]">
              <span className="bg-mist relative block size-full overflow-hidden rounded-full transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-[1.03]">
                {/* eslint-disable-next-line @next/next/no-img-element -- a 640×480 card from the API's storage */}
                <img src={item.photo} alt="" width={640} height={480} fetchPriority="high" decoding="async" className="size-full object-cover" />
                {/* The mark's slit, and its rim. */}
                <span aria-hidden="true" className="bg-canvas absolute inset-x-0 top-1/2 h-[4.5%] -translate-y-1/2" />
                <span aria-hidden="true" className="absolute inset-0 rounded-full shadow-[inset_0_0_0_clamp(5px,0.75vw,9px)_var(--ink)]" />
              </span>
            </span>
          </Link>
        ) : (
          <span className="absolute top-[var(--hang)] left-1/2 -ml-[calc(var(--disc)/2)] block">
            <span aria-hidden="true" className="bg-ink absolute bottom-full left-1/2 h-[var(--hang)] w-[1.5px] -translate-x-1/2" />
            <span aria-hidden="true" className="bg-ink relative block size-[var(--disc)] rounded-full">
              <span className="bg-canvas absolute inset-x-0 top-1/2 h-[4.5%] -translate-y-1/2" />
            </span>
          </span>
        )}
      </div>

      {item && (
        // While the yo-yo dips past it, the caption steps aside; it comes back with the new thing.
        <div
          className={`flex w-full max-w-[24rem] items-end justify-between gap-4 transition-opacity duration-300 ${phase === 'dip' ? 'opacity-0' : 'opacity-100'}`}
          data-hero-item={item.id}
        >
          <div key={item.id} className="animate-step-in flex min-w-0 flex-col gap-1.5 [--step-from:0px]" aria-live="polite">
            {item.demo && <span className="type-caption text-ink/60">{t('example')}</span>}
            <Link href={item.href} className="line-clamp-2 text-base leading-snug font-bold decoration-1 underline-offset-4 hover:underline">
              {item.title}
            </Link>
            <span className="text-ink/70 text-sm">
              <b className="font-display text-ink text-2xl leading-none font-black tabular-nums uppercase">{item.price}</b>
              {/* The place on wider screens; on a phone the label stays one line under the yo-yo. */}
              {item.place ? <span className="ml-2 whitespace-nowrap max-sm:hidden">{item.place}</span> : null}
            </span>
          </div>
          {items.length > 1 && (
            <button
              type="button"
              onClick={() => {
                auto.current = AUTO_TIMES;
                next();
              }}
              aria-label={t('next')}
              className="border-ink/25 hover:border-ink rounded-pill ease-yoyo inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center gap-2 border text-sm font-bold whitespace-nowrap transition-[border-color,transform] duration-200 active:scale-95 sm:px-4"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.9]">
                <path d="M12 3v7" />
                <circle cx="12" cy="15.5" r="5" />
              </svg>
              <span aria-hidden="true" className="max-sm:hidden">
                {t('next')}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
