/**
 * jsdom has no matchMedia; components read it for prefers-reduced-motion.
 * The setup file installs `stubMatchMedia(false)`; a test that needs "reduce" calls `stubMatchMedia(true)`.
 */
export function stubMatchMedia(reduceMotion: boolean): void {
  window.matchMedia = (query: string) =>
    ({
      matches: query.includes('prefers-reduced-motion') ? reduceMotion : false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
