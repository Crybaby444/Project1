import { THEME_COOKIE } from '@yoyo/shared';

/**
 * Inline script for <head>: runs before the first paint. The server already sets data-theme for a
 * saved light/dark preference; for "system" (or no cookie) this resolves it from the OS setting.
 */
export const themeInitScript = `(function(){try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=(light|dark|system)/);var p=m?m[1]:'system';var d=document.documentElement;if(p==='system'){d.dataset.theme=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}else{d.dataset.theme=p;}d.dataset.themePreference=p;}catch(e){}})();`;
