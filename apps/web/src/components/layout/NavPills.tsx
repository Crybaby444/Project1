'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from '@/i18n/navigation';

/**
 * The capsule's row of items with one light under them: a small glow that slides to the item under the
 * pointer (or keyboard focus) and rests under the page you are on — the yo-yo running along its string.
 */
export function NavPills({ children, activeHref }: { children: ReactNode; activeHref: string | null }) {
  const row = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [dot, setDot] = useState<{ x: number; w: number } | null>(null);

  const place = useCallback((el: Element | null) => {
    const box = row.current;
    if (!box || !el) return setDot(null);
    const a = (el as HTMLElement).getBoundingClientRect();
    const b = box.getBoundingClientRect();
    setDot({ x: a.left - b.left + a.width / 2, w: a.width });
  }, []);
  const rest = useCallback(() => {
    place(activeHref ? (row.current?.querySelector(`[data-nav-href="${activeHref}"]`) ?? null) : null);
  }, [activeHref, place]);

  useLayoutEffect(() => rest(), [rest, pathname]);
  useEffect(() => {
    window.addEventListener('resize', rest);
    return () => window.removeEventListener('resize', rest);
  }, [rest]);

  return (
    <div
      ref={row}
      className="relative flex items-center gap-0.5"
      onPointerOver={(e) => place((e.target as HTMLElement).closest('[data-nav-item]'))}
      onFocus={(e) => place((e.target as HTMLElement).closest('[data-nav-item]'))}
      onPointerLeave={rest}
      onBlur={rest}
    >
      {children}
      <span
        aria-hidden="true"
        className="bg-accent pointer-events-none absolute -bottom-[7px] size-[7px] rounded-full shadow-[0_0_10px_2px_color-mix(in_srgb,var(--accent)_70%,transparent)] transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ left: 0, transform: `translateX(${(dot?.x ?? 0) - 3.5}px)`, opacity: dot ? 1 : 0 }}
      />
    </div>
  );
}
