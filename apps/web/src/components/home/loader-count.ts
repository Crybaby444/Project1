/** How long the loader's count runs (concept v16). */
export const LOADER_COUNT_MS = 1100;

/** The count's ease (the concept's power2.inOut). */
export function loaderEase(x: number): number {
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

/**
 * The home loader's count, 0 → 100 in 1.1 s, as a few lines for the head script: it starts with the
 * first frame, before React or the stage, writes the number into `.home-loader-count` and notes when it
 * ends (`window.__homeCountEnd`): LoaderCount leaves the number alone until then, and counts it itself
 * after a client-side navigation (no head script runs then). A CSS counter animation would be simpler but Safari does not repaint it (it jumped 0 → 100).
 */
export const loaderCountScript =
  ';(function(){try{var t0=null,D=' + LOADER_COUNT_MS + ';function e(x){return x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2}' +
  'function f(now){var el=document.querySelector(".home-loader-count");' +
  'if(!el){if(document.readyState==="complete")return;requestAnimationFrame(f);return}' +
  'if(t0===null){t0=now;window.__homeCountEnd=now+D}var k=Math.min(1,(now-t0)/D);el.textContent=String(Math.round(e(k)*100));' +
  'if(k<1)requestAnimationFrame(f)}requestAnimationFrame(f)}catch(_){}})();';
