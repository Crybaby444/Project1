'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * The string answers the hand: moving the pointer across it gives the tags a push that dies away on a
 * spring (a CSS variable --swing the tags read), on top of their idle sway. Mouse only; still under
 * reduced motion.
 */
export function SwingRow({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !window.matchMedia('(pointer: fine)').matches) return;
    let angle = 0;
    let speed = 0;
    let lastX: number | null = null;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      if (lastX !== null) speed += Math.max(-6, Math.min(6, (e.clientX - lastX) * 0.06));
      lastX = e.clientX;
    };
    const onLeave = () => (lastX = null);
    const tick = () => {
      speed += -angle * 0.06; // spring back
      speed *= 0.9; // damping
      angle += speed;
      el.style.setProperty('--swing', `${angle.toFixed(2)}deg`);
      frame = requestAnimationFrame(tick);
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    frame = requestAnimationFrame(tick);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <ul ref={ref} className={className}>
      {children}
    </ul>
  );
}
