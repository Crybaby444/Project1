export type RibbonVariant = 'hero' | 'loop' | 'wave';

type Shape = { width: number; height: number; path: string; stroke: number };

/*
 * One tube per variant, drawn along a single path. The "inflatable" look comes from three flat strokes
 * along it (DESIGN.md Project adaptations §6): a darker underside, the Electric Blue body and a light
 * highlight, plus a fine grain. No gradients anywhere.
 */
const SHAPES: Record<RibbonVariant, Shape> = {
  // A long string that crosses the hero and ties one loop, like a yo-yo thrown out and coming back.
  hero: {
    width: 1200,
    height: 420,
    stroke: 58,
    path: 'M-60 300C140 380 260 160 460 230S700 380 800 250C860 170 980 150 990 230C1000 300 900 320 880 250C860 170 1000 80 1260 120',
  },
  // A short piece with one loop, beside a section title.
  loop: {
    width: 400,
    height: 240,
    stroke: 34,
    path: 'M-20 180C80 200 140 80 220 90C300 100 300 190 240 190C180 190 200 60 420 40',
  },
  // A low wave across a band (banners, footer).
  wave: {
    width: 1200,
    height: 160,
    stroke: 40,
    path: 'M-40 100C160 20 320 160 520 90S880 30 1040 100S1240 80 1260 60',
  },
};

type RibbonProps = {
  variant: RibbonVariant;
  className?: string;
};

/**
 * The Electric Blue ribbon, Yoyo's signature motif (it doubles as the yo-yo string). Purely decorative
 * and still: it never animates on its own. Its box (width 100%, aspect ratio of the drawing) is known
 * before it paints, so it never shifts the page.
 */
export function Ribbon({ variant, className = '' }: RibbonProps) {
  const { width, height, path, stroke } = SHAPES[variant];
  const grainId = `ribbon-grain-${variant}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
      style={{ aspectRatio: `${width} / ${height}` }}
      className={`block h-auto w-full overflow-visible ${className}`}
    >
      <defs>
        <filter id={grainId} x="-5%" y="-25%" width="110%" height="150%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.55 0 0 0 -0.18" result="grain" />
          <feComposite in="grain" in2="SourceGraphic" operator="in" result="grain-on-tube" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="grain-on-tube" />
          </feMerge>
        </filter>
      </defs>
      <g filter={`url(#${grainId})`} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path
          data-ribbon-layer="underside"
          d={path}
          stroke="var(--ribbon-shade)"
          strokeWidth={stroke}
          transform={`translate(0 ${stroke * 0.14})`}
        />
        <path data-ribbon-layer="body" d={path} stroke="var(--sticker-blue)" strokeWidth={stroke * 0.84} />
        <path
          data-ribbon-layer="highlight"
          d={path}
          stroke="var(--ribbon-light)"
          strokeWidth={stroke * 0.14}
          transform={`translate(${-stroke * 0.04} ${-stroke * 0.22})`}
        />
      </g>
    </svg>
  );
}
