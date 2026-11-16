/**
 * The loader of What is Yoyo, in the server HTML so it covers the very first frame: only the night
 * (owner, 2026-11-16: no count, no turning yo-yo). The stage removes it with the flood of dots once the
 * set is built, the same flood every page change uses (components/motion/PageFlood). It is never shown
 * under automation or reduced motion (html[data-no-loader], set by the head script), and fades away by
 * itself after a few seconds if the stage never starts (no WebGL, no script), so nobody is left behind it.
 */
export function HomeLoader() {
  return <div data-home-loader aria-hidden="true" className="home-loader" />;
}
