'use client';

import { useEffect, useRef } from 'react';
import { useReducedMotion } from '@/components/motion/hooks';
import { createStage } from './scene';
import { repaintOnThemeChange } from './repaint';
import { mountTimelines } from './timelines';
import './home-stage.css';

/**
 * Takes the server-rendered loader away with the concept's flood: dots of the page colour grow from the
 * middle out until they cover the screen, then the loader and the dots go. Resolves when it is done.
 */
function floodAway(loader: HTMLElement): Promise<void> {
  return new Promise((done) => {
    const c = document.createElement('canvas');
    c.setAttribute('aria-hidden', 'true');
    c.style.cssText = 'position:fixed;inset:0;z-index:101;width:100%;height:100%;pointer-events:none';
    document.body.append(c);
    const g = c.getContext('2d');
    if (!g) { loader.remove(); c.remove(); done(); return; }
    const dpr = Math.min(window.devicePixelRatio, 2), W = innerWidth, H = innerHeight;
    c.width = W * dpr; c.height = H * dpr; g.scale(dpr, dpr);
    const colour = getComputedStyle(document.documentElement).getPropertyValue('--canvas').trim() || '#f4f1e6';
    const sp = W < 640 ? 24 : 32, rows = Math.ceil(H / (sp * 0.866)) + 2, cols = Math.ceil(W / sp) + 2;
    const cx = W / 2, cy = H * 0.47, maxD = Math.hypot(W, H) / 2;
    const dots: [number, number, number][] = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const x = i * sp + (j % 2) * sp / 2, y = j * sp * 0.866;
      dots.push([x, y, (Math.hypot(x - cx, y - cy) / maxD) * 0.6 + Math.random() * 0.12]);
    }
    loader.querySelectorAll<HTMLElement>('svg, b').forEach((el) => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }));
    const start = performance.now(), dur = 1250;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      g.clearRect(0, 0, W, H); g.fillStyle = colour; g.beginPath();
      for (const [x, y, d] of dots) {
        const k = Math.min(1, Math.max(0, (t - d) / 0.28));
        if (k <= 0) continue;
        const r = sp * 0.64 * (1 - Math.pow(1 - k, 3));
        g.moveTo(x + r, y); g.arc(x, y, r, 0, Math.PI * 2);
      }
      g.fill();
      if (t < 1) { requestAnimationFrame(step); return; }
      loader.remove();
      c.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' }).finished.then(() => { c.remove(); done(); });
    };
    requestAnimationFrame(step);
  });
}

/**
 * The home's WebGL set and scroll choreography (v16). It stages the page only when it can: with reduced
 * motion, without WebGL, or under automation it renders nothing and the home stays the plain stack of
 * sections (the server loader then fades away by itself).
 */
export default function HomeStage() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLCanvasElement>(null);

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
    // The staged home always starts at its top: a reload mid-way restored the scroll before the scenes
    // were set, and showed them half-way (cream above, night below).
    const restoration = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    // Under the loader: the header and the hero's foot wait, and come in after the letters (concept v16).
    const waiting = [
      document.querySelector<HTMLElement>('[data-site-header]'),
      ...root.querySelectorAll<HTMLElement>('[data-home="hero"] [data-reveal], [data-home="hero"] [data-hero-in]'),
    ].filter((el): el is HTMLElement => el !== null);
    waiting.forEach((el) => { el.style.opacity = '0'; el.style.visibility = 'hidden'; });
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
    // The loader's count runs in CSS (1.1 s); the set waits for the fonts and at least that long, then the
    // dots flood the loader away and the intro plays.
    const minimum = new Promise((r) => setTimeout(r, 1150));
    Promise.all([document.fonts.ready, minimum]).then(async () => {
      if (!alive) return;
      stage.attach(dom);
      const loader = document.querySelector<HTMLElement>('[data-home-loader]');
      if (loader) await floodAway(loader);
      if (!alive) return;
      unmount = mountTimelines(stage, root, { mobile: window.matchMedia('(max-width: 639px)').matches });
      const stopRepaint = repaintOnThemeChange(() => requestAnimationFrame(() => stage.paintLetters()));
      const stopTimelines = unmount;
      unmount = () => { stopRepaint(); stopTimelines(); };
    });
    return () => {
      alive = false;
      unmount?.();
      stage.dispose();
      delete html.dataset.staged;
      history.scrollRestoration = restoration;
      waiting.forEach((el) => { el.style.opacity = ''; el.style.visibility = ''; });
      // The loader stays: a remount (React's strict mode in development) floods it away itself, and
      // without a stage it fades away on its own (CSS).
    };
  }, [reduce]);

  if (reduce) return null;
  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[5] h-lvh w-full" />;
}
