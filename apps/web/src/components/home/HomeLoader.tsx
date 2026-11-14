import { getTranslations } from 'next-intl/server';
import { Mark } from '@/components/brand/Mark';
import { LoaderCount } from './LoaderCount';

/**
 * The loader of the home (v16), in the server HTML so it covers the very first frame: on the night, the
 * stringless mark turns and a count runs to 100 (the head script), the name sits in the corner. The stage removes
 * it with a flood of dots once the set is built. It is never shown under automation or reduced motion
 * (html[data-no-loader], set by the head script), and fades away by itself after a few seconds if the
 * stage never starts (no WebGL, no script), so nobody is ever left behind it.
 */
export async function HomeLoader() {
  const t = await getTranslations('landing');
  return (
    <div data-home-loader aria-hidden="true" className="home-loader">
      <Mark size={44} string={false} className="home-loader-mark" />
      <LoaderCount />
      <span className="home-loader-name">{t('loader')}</span>
    </div>
  );
}
