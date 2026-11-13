/**
 * The stage draws the letters of YOYO into textures in the page's ink, once. When the theme flips on the
 * home (data-theme on <html>), repaint them so the word follows. Returns the stop.
 */
export function repaintOnThemeChange(paint: () => void): () => void {
  const mo = new MutationObserver(() => paint());
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => mo.disconnect();
}
