'use client';

import { useTranslations } from 'next-intl';
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { LIST_ITEM_HREF } from '@/lib/site';

const SIDES = ['rent', 'lend'] as const;
type Side = (typeof SIDES)[number];
const STEPS = ['s1', 's2', 's3', 's4', 's5'] as const;
const SHIELDS = ['a', 'b', 'c'] as const;

/**
 * Both sides in full (owner, 2026-11-16): the one who rents and the one who lends, each with the five steps
 * of a deal from their side and what protects them. A switch between the two; both panels are in the HTML
 * (the hidden one with `hidden`), so search engines and readers without script get the whole story.
 */
export function TwoSides() {
  const t = useTranslations('landing.sides');
  const [side, setSide] = useState<Side>('rent');
  const id = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const next = side === 'rent' ? 'lend' : 'rent';
    setSide(next);
    tabs.current[SIDES.indexOf(next)]?.focus();
  };

  return (
    <section data-home="sides" aria-labelledby={`${id}-title`} className="bg-canvas text-ink relative px-4 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-12">
        <div className="flex flex-col items-center gap-8 text-center">
          <h2 id={`${id}-title`} className="font-display max-w-[12em] text-[clamp(2.6rem,7vw,6rem)] leading-[0.88] font-black uppercase">
            {t('title')}
          </h2>
          <p className="text-ink/75 max-w-[52ch] text-[17px] leading-relaxed">{t('lead')}</p>

          {/* The switch: a yo-yo slides under the side you pick. */}
          <div role="tablist" aria-label={t('switch')} onKeyDown={onKey} className="border-ink/20 relative grid grid-cols-2 rounded-full border-[1.5px] p-1.5">
            <span
              aria-hidden="true"
              className="bg-ink absolute inset-y-1.5 left-1.5 w-[calc(50%-6px)] rounded-full transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
              style={{ transform: side === 'lend' ? 'translateX(100%)' : 'none' }}
            />
            {SIDES.map((s, i) => (
              <button
                key={s}
                ref={(el) => { tabs.current[i] = el; }}
                type="button"
                role="tab"
                id={`${id}-tab-${s}`}
                aria-selected={side === s}
                aria-controls={`${id}-panel-${s}`}
                tabIndex={side === s ? 0 : -1}
                onClick={() => setSide(s)}
                className={`relative z-10 min-h-12 rounded-full px-5 text-[15px] font-bold transition-colors duration-300 sm:px-8 ${side === s ? 'text-canvas' : 'text-ink/75 hover:text-ink'}`}
              >
                {t(`${s}.tab`)}
              </button>
            ))}
          </div>
        </div>

        {SIDES.map((s) => (
          <div key={s} role="tabpanel" id={`${id}-panel-${s}`} aria-labelledby={`${id}-tab-${s}`} hidden={side !== s} data-side={s} className="flex flex-col gap-10">
            <ol className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-5">
              {STEPS.map((k, i) => (
                <li
                  key={k}
                  className="border-ink/12 bg-ink/[0.035] flex flex-col gap-3 rounded-[24px] border p-6 motion-safe:animate-[side-in_600ms_cubic-bezier(0.16,1,0.3,1)_both]"
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <b className="font-display text-[clamp(2.4rem,3.6vw,3.4rem)] leading-[0.8] font-black">{String(i + 1).padStart(2, '0')}</b>
                  <h3 className="text-[18px] leading-snug font-bold">{t(`${s}.steps.${k}.title`)}</h3>
                  <p className="text-ink/75 m-0 text-[15px] leading-relaxed">{t(`${s}.steps.${k}.body`)}</p>
                </li>
              ))}
            </ol>

            <div className="grid gap-6 rounded-[32px] bg-[var(--night)] p-7 text-[var(--paper)] sm:p-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)_auto] lg:items-center">
              <h3 className="font-display text-[clamp(1.8rem,3vw,2.8rem)] leading-[0.9] font-black uppercase">{t(`${s}.shield.title`)}</h3>
              <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-3">
                {SHIELDS.map((k) => (
                  <li key={k} className="flex gap-3 border-t border-[var(--paper)]/15 pt-3 text-[15px] leading-snug">
                    <span aria-hidden="true" className="mt-[0.45em] size-1.5 flex-none rounded-full bg-current" />
                    {t(`${s}.shield.${k}`)}
                  </li>
                ))}
              </ul>
              {s === 'rent' ? (
                <Button href="/c" size="lg" className="border-[var(--paper)]! bg-[var(--paper)]! text-[var(--night)]!">
                  {t('rent.cta')}
                </Button>
              ) : LIST_ITEM_HREF ? (
                <Button href={LIST_ITEM_HREF} size="lg" className="border-[var(--paper)]! bg-[var(--paper)]! text-[var(--night)]!">
                  {t('lend.cta')}
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
