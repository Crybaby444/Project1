'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useHydrated } from '@/components/motion/hooks';
import { usePathname, useRouter } from '@/i18n/navigation';
import { useFavoriteIds, useToggleFavorite } from '@/lib/catalog/use-favorites';
import { useSession } from '@/lib/session/SessionProvider';

const SPARKS = ['var(--sticker-ember)', 'var(--sticker-sun)', 'var(--sticker-blue)', 'var(--sticker-mint)', 'var(--sticker-violet)', 'var(--sticker-lavender)'];

/**
 * The favourite heart (spec §8): pressed at once, it pops with sparks of the sticker palette when it
 * turns on (450 ms; nothing moves under prefers-reduced-motion). A visitor is taken to sign in and
 * brought back to this page.
 */
export function HeartButton({ listingId, title, className = '' }: { listingId: string; title: string; className?: string }) {
  const t = useTranslations('favorites');
  const { status } = useSession();
  const ids = useFavoriteIds();
  const toggle = useToggleFavorite(listingId);
  const router = useRouter();
  const pathname = usePathname();
  const [burst, setBurst] = useState(0);
  const pressed = ids.data?.has(listingId) ?? false;
  const hydrated = useHydrated();
  // The sparks are placed inside the button: it is `relative` unless the caller positions it itself
  // (two position classes would fight, and the later one in the stylesheet wins).
  const position = /(^|\s)(absolute|fixed|sticky)(\s|$)/.test(className) ? '' : 'relative';

  function onClick() {
    if (status !== 'authenticated') {
      const next = `${pathname}${typeof window === 'undefined' ? '' : window.location.search}`;
      router.push(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    if (!pressed) setBurst((n) => n + 1);
    toggle.mutate(!pressed);
  }

  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={pressed ? t('remove', { title }) : t('add', { title })}
      title={pressed ? t('removeShort') : t('addShort')}
      onClick={onClick}
      // Until the page is interactive and it is known who is signed in, a press would be lost or would
      // send a signed-in person to sign in; tests and fast fingers wait instead.
      disabled={!hydrated || status === 'loading'}
      className={`group border-ink bg-surface text-ink ease-yoyo ${position} inline-grid size-11 shrink-0 place-items-center rounded-full border transition-transform duration-150 hover:-translate-y-0.5 hover:-rotate-6 active:scale-[0.9] ${className}`}
    >
      <svg
        key={burst}
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={`size-5 ${burst > 0 && pressed ? 'animate-heart-pop' : ''}`}
      >
        <path
          d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z"
          fill={pressed ? 'var(--sticker-ember)' : 'none'}
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
      </svg>
      {burst > 0 && pressed && (
        <span key={`sparks-${burst}`} aria-hidden="true" className="pointer-events-none absolute inset-0">
          {SPARKS.map((color, i) => (
            <span
              key={color}
              style={{ '--spark-angle': `${i * 60}deg`, backgroundColor: color } as React.CSSProperties}
              className="animate-spark absolute top-1/2 left-1/2 size-1.5 rounded-full border border-black opacity-0"
            />
          ))}
        </span>
      )}
    </button>
  );
}
