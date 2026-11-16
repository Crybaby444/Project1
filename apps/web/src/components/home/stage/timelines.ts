import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { shouldRelayout } from './relayout';
import type { Stage } from './scene';

gsap.registerPlugin(ScrollTrigger);

/** The intro is 520vh; the hero was tuned for 230vh of travel and keeps it (concept v16, HK). */
export const HK = 420 / 230;
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

/**
 * Plays the home as you scroll: smooth scrolling (Lenis), the intro, the night story, What is Yoyo, the
 * facts and the finale (all values from docs/design/concept-v16.html). Returns the clean-up.
 */
export function mountTimelines(stage: Stage, root: HTMLElement, opts: { mobile: boolean }): () => void {
  // A phone's browser bar changes the height while scrolling: the triggers keep their layout through it.
  ScrollTrigger.config({ ignoreMobileResize: true });
  const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  const tick = (time: number) => {
    lenis.raf(time * 1000);
    stage.frame(performance.now());
  };
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  const onPointer = (e: PointerEvent) => {
    stage.state.px = (e.clientX / innerWidth) * 2 - 1;
    stage.state.py = -((e.clientY / innerHeight) * 2 - 1);
  };
  addEventListener('pointermove', onPointer, { passive: true });

  const q = <T extends Element>(sel: string) => Array.from(root.querySelectorAll<T>(sel));

  const ctx = gsap.context(() => {
    const h = (x: number) => x / HK;
    // GSAP blends colours, not var(): read the theme's value when the tween starts.
    const tone = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const letters = q<HTMLElement>('[data-home="hero"] [data-letter]');

    // ---- intro on arrival: the letters rise, the yo-yo drops on its string and bounces at its end
    const S = stage.state;
    gsap.set(letters, { yPercent: 105 });
    gsap
      .timeline()
      .to(
        letters,
        {
          yPercent: 0,
          stagger: 0.06,
          duration: 1.1,
          ease: 'expo.out',
          onUpdate() {
            letters.forEach((l) => (l.dataset.rise = String(gsap.getProperty(l, 'yPercent'))));
          },
        },
        0,
      )
      .to(S, { intro: 1, duration: 1.2, ease: 'back.out(1.4)' }, 0.15)
      .fromTo(S, { drop: 1 }, { drop: 0, duration: 1.9, ease: 'elastic.out(1, 0.55)' }, 0.15)
      .fromTo(S, { spinBoost: 16 }, { spinBoost: 0, duration: 2.4, ease: 'power2.out' }, 0.15); // only the word and the yo-yo (owner, 2026-11-16)

    // ---- the intro on scroll: the hero (its own length), then the night's story
    ScrollTrigger.create({
      trigger: '[data-intro]',
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (st) => (S.p = Math.min(1, st.progress * HK)),
    });
    gsap
      .timeline({
        scrollTrigger: { trigger: '[data-intro]', start: 'top top', end: 'bottom bottom', scrub: 1 },
      })
      .to('[data-half="l"]', { xPercent: -140, ease: 'power2.in', duration: h(0.5) }, h(0.08))
      .to('[data-half="r"]', { xPercent: 140, ease: 'power2.in', duration: h(0.5) }, h(0.08))
      .fromTo(
        '[data-row]',
        // Only light, no scale or blur on rows that already run sideways: two motions at once judder.
        { opacity: 0 },
        { opacity: 0.22, stagger: 0.02, duration: 0.07 },
        h(0.58),
      )
      .to('[data-row="1"]', { opacity: 1, duration: 0.07, ease: 'power2.inOut' }, 0.4)
      .to('[data-row="1"]', { opacity: 0.3, duration: 0.07, ease: 'power2.inOut' }, 0.52)
      .to('[data-row="2"]', { opacity: 1, duration: 0.07, ease: 'power2.inOut' }, 0.52)
      .to('[data-row="2"]', { color: () => tone('--paper'), duration: 0.07, ease: 'power2.inOut' }, 0.52)
      .to('[data-row="2"]', { opacity: 0.3, duration: 0.07, ease: 'power2.inOut' }, 0.64)
      .to('[data-row="2"]', { color: () => tone('--night'), duration: 0.07, ease: 'power2.inOut' }, 0.64)
      .to('[data-row="3"]', { opacity: 1, duration: 0.07, ease: 'power2.inOut' }, 0.64)
      .to('[data-row]', { opacity: 1, duration: 0.07, ease: 'power2.inOut' }, 0.78)
      .fromTo(
        '[data-say]',
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.08, ease: 'power3.out' },
        0.84,
      )
      .set({}, {}, 1);

    // ---- What is Yoyo: the words light up, then the four steps glide in while the line fills
    const steps = q<HTMLElement>('[data-step]');
    gsap.set(steps, { opacity: 0, y: 50 });
    const wt = gsap.timeline({
      scrollTrigger: { trigger: '[data-home="what"]', start: 'top top', end: 'bottom bottom', scrub: 1.4 },
    });
    // Without the steps under it (2026-11-16) the statement has the whole scene to light up in.
    wt.to(
      '[data-home="what"] [data-word]',
      { opacity: 1, duration: 0.06, ease: 'none', stagger: { amount: steps.length ? 0.34 : 0.78 } },
      0.04,
    );
    steps.forEach((st, i) => {
      const at = 0.4 + i * 0.14;
      if (opts.mobile && i > 0)
        wt.to(steps[i - 1]!, { opacity: 0, y: -40, duration: 0.1, ease: 'power2.inOut' }, at - 0.04);
      wt.to(st, { opacity: 1, y: 0, duration: 0.16, ease: 'power2.inOut' }, at).to(
        '[data-steps]',
        { '--p': (i + 1) / steps.length, duration: 0.14, ease: 'power1.inOut' },
        at,
      );
    });
    wt.set({}, {}, 1);

    // (The facts scene is gone, owner 2026-11-16: the rules section says the same, honestly.)

    // ---- finale: driven by how far you are into the held last slide; then it rolls away and back
    const R = { x: 0, hop: 0 };
    const roll = gsap.timeline({
      repeat: -1,
      paused: true,
      onUpdate: () => {
        S.rollX = R.x;
        S.rollHop = R.hop;
      },
    });
    for (const d of [1, -1]) {
      roll
        .to(R, { x: d, duration: 1.7, ease: 'power2.inOut' })
        .to(R, { x: 0, duration: 1.25, ease: 'power3.inOut' }, '+=0.35')
        .to(R, { hop: 1, duration: 0.22, ease: 'power2.out' }, '-=0.3')
        .to(R, { hop: 0, duration: 0.45, ease: 'bounce.out' })
        .to({}, { duration: 0.7 });
    }
    ScrollTrigger.create({
      trigger: '[data-home="finale"]',
      start: 'top top',
      end: () => '+=' + innerHeight,
      scrub: true,
      onUpdate: (st) => {
        S.fq = st.progress;
        if (st.progress > 0.9) roll.play();
        else {
          roll.pause();
          gsap.to(R, {
            x: 0,
            hop: 0,
            duration: 0.4,
            overwrite: true,
            onUpdate: () => {
              S.rollX = R.x;
              S.rollHop = R.hop;
            },
          });
        }
      },
    });
    gsap.from('[data-home="finale"] h2 > span', {
      yPercent: 40,
      opacity: 0,
      stagger: 0.12,
      duration: 1.1,
      ease: 'expo.out',
      scrollTrigger: { trigger: '[data-home="finale"]', start: () => 'top+=' + innerHeight * 0.4 + ' top' },
    });
  }, root);

  let size = { w: innerWidth, h: innerHeight };
  const onResize = () => {
    const next = { w: innerWidth, h: innerHeight };
    if (!shouldRelayout(size, next, opts.mobile)) return;
    size = next;
    stage.resize();
    stage.paintLetters();
    ScrollTrigger.refresh();
  };
  addEventListener('resize', onResize);
  return () => {
    removeEventListener('resize', onResize);
    removeEventListener('pointermove', onPointer);
    gsap.ticker.remove(tick);
    ctx.revert();
    lenis.destroy();
  };
}
