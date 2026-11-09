/**
 * Marks a fresh page load for the load animations in motion.css (`html[data-fresh]`): the headline
 * letters and the auth card rise in and the stickers float once, when the document loads, and never
 * again when the same page is rendered anew (a language switch remounts the layout and drops the
 * attribute). It is removed once the longest of them, a sticker's 3.8 s float, is over.
 *
 * Runs in <head> before the first paint, next to the theme script. Kept tiny and dependency-free.
 */
export const FRESH_LOAD_MS = 4500;

export const freshLoadScript = `(function(){try{var d=document.documentElement;d.setAttribute('data-fresh','');var off=function(){setTimeout(function(){d.removeAttribute('data-fresh');},${FRESH_LOAD_MS});};if(document.readyState==='complete')off();else window.addEventListener('load',off,{once:true});}catch(e){}})();`;
