'use client';

import { useEffect, useRef, useState } from 'react';
import { Mark } from '@/components/brand/Mark';
import { useReducedMotion } from '@/components/motion/hooks';
import { createStage } from './scene';
import { repaintOnThemeChange } from './repaint';
import { mountTimelines } from './timelines';
import './home-stage.css';

/**
 * The home's WebGL set and scroll choreography (v16). It stages the page only when it can: with reduced
 * motion, or without WebGL, it renders nothing and the home stays the plain stack of sections.
 */
export default function HomeStage() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const loader = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const root = document.querySelector<HTMLElement>('[data-home-root]');
    // Under automation (navigator.webdriver: CI has no GPU) the set is skipped: software WebGL on every
    // frame starves the tests running beside it. The plain sections are the page those tests check.
    if (reduce || !canvas || !root || navigator.webdriver) return;
    const stage = createStage(canvas, { mobile: window.matchMedia('(max-width: 639px)').matches });
    if (!stage) return;
    let alive = true;
    let unmount: (() => void) | null = null;
    const html = document.documentElement;
    html.dataset.staged = '';
    stage.resize();
    const dom = {
      heroSlot: root.querySelector<HTMLElement>('[data-anchor="hero-slot"]')!,
      finalSlot: root.querySelector<HTMLElement>('[data-anchor="final-slot"]')!,
      finalPin: root.querySelector<HTMLElement>('[data-home="finale"] > [data-pin]')!,
      night: root.querySelector<HTMLElement>('[data-home="night"]')!,
      shade: root.querySelector<HTMLElement>('[data-shade]')!,
      rollShadow: root.querySelector<HTMLElement>('[data-roll-shadow]')!,
      letters: Array.from(root.querySelectorAll<HTMLElement>('[data-home="hero"] [data-letter]')),
    };
    // The count is for show while the set builds; the paper lifts once the fonts are in.
    const start = performance.now();
    const counter = window.setInterval(() => setCount(Math.min(99, Math.round(((performance.now() - start) / 1000) * 100))), 50);
    document.fonts.ready.then(() => {
      if (!alive) return;
      stage.attach(dom);
      window.clearInterval(counter);
      setCount(100);
      const el = loader.current;
      if (el) el.animate([{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 100% 0)' }], { duration: 900, easing: 'cubic-bezier(0.65,0,0.35,1)', fill: 'forwards' }).finished.then(() => alive && setLoading(false));
      else setLoading(false);
      unmount = mountTimelines(stage, root, { mobile: window.matchMedia('(max-width: 639px)').matches });
      const stopRepaint = repaintOnThemeChange(() => requestAnimationFrame(() => stage.paintLetters()));
      const stopTimelines = unmount;
      unmount = () => { stopRepaint(); stopTimelines(); };
    });
    return () => {
      alive = false;
      window.clearInterval(counter);
      unmount?.();
      stage.dispose();
      delete html.dataset.staged;
    };
  }, [reduce]);

  if (reduce) return null;
  return (
    <>
      <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[5] h-full w-full" />
      {loading ? (
        <div ref={loader} aria-hidden="true" className="home-loader">
          <Mark size={40} string={false} />
          <b>{count}</b>
        </div>
      ) : null}
    </>
  );
}
