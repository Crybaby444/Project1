/**
 * The home loader's count, 0 → 100 in 1.1 s (concept v16: power2.inOut), as a few lines for the head
 * script: it starts with the first frame, before React or the stage, and writes the number into
 * `.home-loader-count`. A CSS counter animation would be simpler but Safari does not repaint it (it
 * jumped 0 → 100). It stops once the number reaches 100 or the loader is gone.
 */
export const loaderCountScript =
  ';(function(){try{var t0=null,D=1100;function e(x){return x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2}' +
  'function f(now){var el=document.querySelector(".home-loader-count");' +
  'if(!el){if(document.readyState==="complete")return;requestAnimationFrame(f);return}' +
  'if(t0===null)t0=now;var k=Math.min(1,(now-t0)/D);el.textContent=String(Math.round(e(k)*100));' +
  'if(k<1)requestAnimationFrame(f)}requestAnimationFrame(f)}catch(_){}})();';
