import { Mark } from '@/components/brand/Mark';

/**
 * The loader of the home (v16), in the server HTML so it covers the very first frame: the stringless mark
 * turns and a count runs to 100 (pure CSS). The stage removes it with a flood of dots once the set is
 * built. It is never shown under automation or reduced motion (html[data-no-loader], set by the head script), and fades away by itself after a
 * few seconds if the stage never starts (no WebGL, no script), so nobody is ever left behind it.
 */
export function HomeLoader() {
  return (
    <div data-home-loader aria-hidden="true" className="home-loader">
      <Mark size={40} string={false} className="home-loader-mark" />
      <b className="home-loader-count" />
    </div>
  );
}
