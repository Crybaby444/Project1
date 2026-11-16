import { expect, test } from '@playwright/test';
import en from '../messages/site/en.json' with { type: 'json' };
import lv from '../messages/site/lv.json' with { type: 'json' };
import ru from '../messages/site/ru.json' with { type: 'json' };

const SITE = 'https://yoyo.rent';
const LANGUAGES = [
  { locale: 'en', prefix: '', m: en },
  { locale: 'lv', prefix: '/lv', m: lv },
  { locale: 'ru', prefix: '/ru', m: ru },
] as const;
const PAGES = [
  ['/', 'home'],
  ['/what-is-yoyo', 'whatIs'],
  ['/how-it-works', 'howItWorks'],
  ['/faq', 'faq'],
  ['/terms', 'terms'],
  ['/privacy', 'privacy'],
  ['/cookies', 'cookies'],
] as const;

const at = (prefix: string, path: string) => (path === '/' ? prefix || '/' : `${prefix}${path}`);
/** Absolute address as the site writes it: the English home page is the bare origin. */
const abs = (prefix: string, path: string) => `${SITE}${at(prefix, path)}`.replace(/\/$/, '');

for (const { locale, prefix, m } of LANGUAGES) {
  for (const [path, key] of PAGES) {
    test(`${at(prefix, path)}: title, description, canonical, hreflang and a preview image`, async ({ page, request }) => {
      await page.goto(at(prefix, path));
      const meta = m.pages[key];
      await expect(page).toHaveTitle(key === 'home' || key === 'whatIs' ? meta.title : `${meta.title} · Yoyo`);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', meta.description);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', abs(prefix, path));

      const hreflang = await page
        .locator('link[rel="alternate"][hreflang]')
        .evaluateAll((links) => Object.fromEntries(links.map((l) => [l.getAttribute('hreflang'), l.getAttribute('href')])));
      expect(hreflang).toEqual({
        en: abs('', path),
        lv: abs('/lv', path),
        ru: abs('/ru', path),
        'x-default': abs('', path),
      });

      await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', { en: 'en_US', lv: 'lv_LV', ru: 'ru_RU' }[locale]);
      const image = await page.locator('meta[property="og:image"]').getAttribute('content');
      expect(image).toMatch(new RegExp(`^${SITE}/`));
      const response = await request.get(image!.replace(SITE, ''));
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toBe('image/png');
    });
  }
}

test('sitemap.xml is an index; its pages sitemap lists every page in every language with alternates', async ({ request }) => {
  const index = await request.get('/sitemap.xml');
  expect(index.status()).toBe(200);
  const indexXml = await index.text();
  expect(indexXml).toContain('<sitemapindex');
  expect(indexXml).toContain(`<loc>${SITE}/sitemap-pages.xml</loc>`);
  expect(indexXml).toContain(`<loc>${SITE}/sitemap-categories.xml</loc>`);
  expect(indexXml).toContain(`<loc>${SITE}/sitemap-listings.xml</loc>`);

  const response = await request.get('/sitemap-pages.xml');
  expect(response.status()).toBe(200);
  const xml = await response.text();
  expect(xml.match(/<url>/g)).toHaveLength(21);
  expect(xml).toContain(`<loc>${SITE}/lv/faq</loc>`);
  expect(xml).toContain(`hreflang="ru" href="${SITE}/ru/privacy"`);
});

test('robots.txt allows the site, keeps the API out and names the sitemap', async ({ request }) => {
  const text = await (await request.get('/robots.txt')).text();
  expect(text).toContain('Allow: /');
  expect(text).toContain('Disallow: /api/');
  expect(text).toContain(`Sitemap: ${SITE}/sitemap.xml`);
});

test('the home page describes Yoyo as an Organization and a WebSite', async ({ page }) => {
  await page.goto('/');
  const data = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((scripts) => scripts.flatMap((s) => [JSON.parse(s.textContent ?? 'null')].flat()));
  const types = data.map((item: { '@type': string }) => item['@type']);
  expect(types).toEqual(expect.arrayContaining(['Organization', 'WebSite']));
  expect(data.find((item: { '@type': string }) => item['@type'] === 'Organization')).toMatchObject({
    name: 'Yoyo',
    email: 'admin@yoyo.rent',
  });
});

test('the site has an icon', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="icon"]').first().getAttribute('href');
  expect((await request.get(href!)).status()).toBe(200);
});

test('llms.txt explains Yoyo for AI assistants and lists the categories', async ({ request }) => {
  const res = await request.get('/llms.txt');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('text/plain');
  const text = await res.text();
  expect(text.startsWith('# Yoyo\n')).toBe(true);
  expect(text).toContain('/what-is-yoyo)');
  expect(text).toMatch(/## Catalog\n\n- \[/);
});

test('a category page gives search engines its breadcrumb trail', async ({ page }) => {
  await page.goto('/c');
  const trails = await page.locator('script[type="application/ld+json"]').evaluateAll((els) =>
    els.map((e) => JSON.parse(e.textContent ?? '{}')).filter((d) => d['@type'] === 'BreadcrumbList'),
  );
  expect(trails).toHaveLength(1);
  expect(trails[0].itemListElement.map((i: { name: string }) => i.name)).toEqual(['Home', 'Catalog']);

test('a category page opens with what people rent there and closes with the rules every rental keeps', async ({ page }) => {
  const site = (await import('../messages/site/en.json', { with: { type: 'json' } })).default;
  await page.goto('/c/tools');
  await expect(page.getByText(site.categoryIntro.roots.tools)).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Renting Tools on Yoyo' })).toBeVisible();
  await expect(page.getByRole('link', { name: site.categoryIntro.about.more })).toHaveAttribute('href', '/how-it-works');
});
