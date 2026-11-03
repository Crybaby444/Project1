import { THEME_COOKIE } from '@yoyo/shared';

/**
 * Inlined into <head> and run before first paint. The server already renders an
 * explicit choice into `data-theme`; this covers "system" (the server cannot see
 * the OS setting) so a dark-mode visitor never sees a light flash.
 */
export const themeInitScript = `(function(){try{
var m=document.cookie.match(/(?:^|;\\s*)${THEME_COOKIE}=([^;]*)/);
var p=m?decodeURIComponent(m[1]):'system';
if(p!=='light'&&p!=='dark'){p=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
document.documentElement.dataset.theme=p;
}catch(e){}})();`;
