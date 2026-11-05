import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const OG_SIZE = { width: 1200, height: 630 };

// The DESIGN.md palette, written out: the image renderer has no CSS variables.
const C = {
  sky: '#dceeff',
  ink: '#000000',
  white: '#ffffff',
  blue: '#4da2ff',
  shade: '#2a78d6',
  light: '#a9d2ff',
  sun: '#ffd731',
  lavender: '#e9ccff',
  ember: '#fb4903',
};

/** Font files (OFL) shipped with the site; next/og cannot read the woff2 that the pages use. */
async function fonts() {
  const dir = join(process.cwd(), 'src/assets/og');
  const [display, body] = await Promise.all([
    readFile(join(dir, 'Unbounded-Black.ttf')),
    readFile(join(dir, 'Onest-Bold.ttf')),
  ]);
  return [
    { name: 'Display', data: display, weight: 900 as const, style: 'normal' as const },
    { name: 'Body', data: body, weight: 700 as const, style: 'normal' as const },
  ];
}

/** Font size for the title: as big as the longest word and the length allow. */
function titleSize(title: string): number {
  const longest = Math.max(...title.split(/\s+/).map((word) => [...word].length));
  return Math.max(56, Math.min(132, Math.floor(980 / (longest * 0.98)), Math.floor(2600 / title.length)));
}

/**
 * The link-preview picture of a page (1200×630) in the sticker style: pastel paper, the page title in
 * the crushed display face, the ribbon, three stickers and the YOYO wordmark. Flat colours only.
 */
export async function ogImage({ title, kicker }: { title: string; kicker: string }) {
  const size = titleSize(title);
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: C.sky,
          padding: '56px 64px',
          position: 'relative',
          fontFamily: 'Body',
          color: C.ink,
        }}
      >
        <svg width="1200" height="260" viewBox="0 0 1200 260" style={{ position: 'absolute', left: 0, bottom: 40 }}>
          <path d="M-40 170C160 90 320 230 520 160S880 100 1040 170S1240 150 1260 130" fill="none" stroke={C.shade} strokeWidth="56" strokeLinecap="round" transform="translate(0 8)" />
          <path d="M-40 170C160 90 320 230 520 160S880 100 1040 170S1240 150 1260 130" fill="none" stroke={C.blue} strokeWidth="47" strokeLinecap="round" />
          <path d="M-40 170C160 90 320 230 520 160S880 100 1040 170S1240 150 1260 130" fill="none" stroke={C.light} strokeWidth="8" strokeLinecap="round" transform="translate(-2 -12)" />
        </svg>
        <div style={{ position: 'absolute', right: 70, top: 48, width: 120, height: 120, borderRadius: 60, background: C.sun, border: `2px solid ${C.ink}`, display: 'flex', transform: 'rotate(-12deg)' }} />
        <div style={{ position: 'absolute', right: 200, top: 120, width: 84, height: 84, borderRadius: 22, background: C.ember, border: `2px solid ${C.ink}`, display: 'flex', transform: 'rotate(10deg)' }} />
        <div style={{ position: 'absolute', right: 96, bottom: 150, width: 96, height: 96, borderRadius: 48, background: C.lavender, border: `2px solid ${C.ink}`, display: 'flex' }} />

        <div style={{ display: 'flex' }}>
          <div
            style={{
              display: 'flex',
              border: `2px solid ${C.ink}`,
              borderRadius: 999,
              background: C.white,
              padding: '10px 22px',
              fontSize: 24,
              letterSpacing: 1,
              textTransform: 'uppercase',
            }}
          >
            {kicker}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            fontFamily: 'Display',
            fontSize: size,
            lineHeight: 0.96, // room for Latvian macrons and Cyrillic capitals
            textTransform: 'uppercase',
            maxWidth: 940,
          }}
        >
          {title}
        </div>
        <div style={{ display: 'flex', fontFamily: 'Display', fontSize: 64, lineHeight: 1 }}>YOYO</div>
      </div>
    ),
    { ...OG_SIZE, fonts: await fonts() },
  );
}
