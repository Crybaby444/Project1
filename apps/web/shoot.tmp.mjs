import { chromium } from '@playwright/test';
const out = process.argv[2];
const pages = ['/ru', '/ru/c', '/ru/search', '/ru/what-is-yoyo', '/ru/faq', '/ru/how-it-works', '/ru/login', '/ru/register', '/ru/terms', '/ru/no-such-page'];
const browser = await chromium.launch();
// one listing and one profile from the catalog
const probe = await (await browser.newContext()).newPage();
await probe.goto('https://yoyo.rent/ru/search', { waitUntil: 'networkidle' });
const item = await probe.locator('a[href*="/listings/"]').first().getAttribute('href');
await probe.goto('https://yoyo.rent' + item, { waitUntil: 'networkidle' });
const prof = await probe.locator('a[href*="/u/"]').first().getAttribute('href').catch(() => null);
pages.push(item); if (prof) pages.push(prof);
console.log('item', item, 'profile', prof);
for (const [w, h, tag] of [[1440, 900, 'd'], [390, 844, 'm']]) {
  for (const theme of ['light', 'dark']) {
    if (tag === 'm' && theme === 'dark') continue;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    await ctx.addCookies([{ name: 'yoyo-theme', value: theme, url: 'https://yoyo.rent' }, { name: 'yoyo-consent', value: 'denied', url: 'https://yoyo.rent' }]);
    const p = await ctx.newPage();
    for (const path of pages) {
      const name = `${tag}-${theme}-${path.replace(/[^a-z0-9]+/gi, '_')}`;
      try {
        await p.goto('https://yoyo.rent' + path, { waitUntil: 'networkidle', timeout: 60000 });
        await p.waitForTimeout(800);
        await p.screenshot({ path: `${out}/${name}.png`, fullPage: true });
        const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (over > 0) console.log('OVERFLOW', name, over);
      } catch (e) { console.log('FAIL', name, e.message.slice(0, 100)); }
    }
    await ctx.close();
  }
}
await browser.close();
