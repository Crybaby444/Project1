import { THEME_COOKIE } from '@yoyo/shared';

/**
 * Runs in <head> before the first paint. If the server did not already set an explicit
 * theme from the cookie, it resolves "system" from the OS so dark-OS visitors never see
 * a light flash. Kept tiny and dependency-free on purpose.
 */
export const themeInitScript = `(function(){try{var d=document.documentElement;if(d.dataset.theme)return;var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=([^;]*)/);var p=m?decodeURIComponent(m[1]):'system';if(p!=='light'&&p!=='dark'){p=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}d.dataset.theme=p;}catch(e){}})();`;
