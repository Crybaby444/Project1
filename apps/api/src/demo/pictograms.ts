/**
 * Line pictograms for the demo listings (owner, 2026-11-16: branded placeholders, no borrowed photos).
 * Each is SVG content for a 200×200 box, drawn with `currentColor` strokes; the composer sets the colour
 * and the stroke width. Kept plain on purpose: a recognisable outline, nothing that pretends to be a photo.
 */
export const PICTOGRAMS = {
  drill: `<path d="M40 70h86a14 14 0 0 1 14 14v14a14 14 0 0 1-14 14H40z"/><path d="M140 84h28M140 98h22"/><path d="M72 112l-10 50h34l8-50"/><path d="M60 162h44"/><path d="M168 91h12"/><circle cx="58" cy="91" r="6"/>`,
  tent: `<path d="M20 160L100 40l80 120z"/><path d="M100 40v120"/><path d="M78 160l22-46 22 46"/><path d="M10 160h180"/>`,
  projector: `<rect x="30" y="70" width="140" height="70" rx="16"/><circle cx="120" cy="105" r="22"/><circle cx="120" cy="105" r="9"/><path d="M50 92h30M50 110h22"/><path d="M50 140v14M150 140v14"/>`,
  camera: `<rect x="24" y="64" width="152" height="96" rx="16"/><path d="M70 64l12-20h36l12 20"/><circle cx="100" cy="112" r="30"/><circle cx="100" cy="112" r="14"/><path d="M146 84h10"/>`,
  bike: `<circle cx="50" cy="130" r="32"/><circle cx="150" cy="130" r="32"/><path d="M50 130l34-56h46l20 56"/><path d="M84 74l16 56h50"/><path d="M72 62h26M126 60h20"/>`,
  kayak: `<path d="M12 128c34 20 142 20 176 0-34-12-142-12-176 0z"/><path d="M84 120c8-12 24-12 32 0"/><path d="M28 84l144 22"/><path d="M16 72l-6 24 26 4zM184 118l6-24-26-4z"/>`,
  ladder: `<path d="M64 30l-24 150M136 30l24 150"/><path d="M58 64h84M53 98h94M48 132h104M43 166h114"/>`,
  washer: `<rect x="34" y="70" width="70" height="80" rx="12"/><circle cx="56" cy="160" r="14"/><circle cx="96" cy="160" r="10"/><path d="M104 96h30l36-24"/><path d="M170 72l14-8M170 72l14 4"/><path d="M50 92h36"/>`,
  speaker: `<rect x="56" y="24" width="88" height="152" rx="18"/><circle cx="100" cy="118" r="32"/><circle cx="100" cy="118" r="10"/><circle cx="100" cy="58" r="12"/>`,
  console: `<path d="M44 84h112c20 0 30 18 30 40 0 18-10 30-22 30-14 0-20-14-30-24H66c-10 10-16 24-30 24-12 0-22-12-22-30 0-22 10-40 30-40z"/><path d="M60 106v24M48 118h24"/><circle cx="136" cy="110" r="5"/><circle cx="150" cy="124" r="5"/>`,
  drone: `<rect x="76" y="86" width="48" height="30" rx="10"/><path d="M76 92L40 64M124 92l36-28M76 110l-36 28M124 110l36 28"/><ellipse cx="40" cy="58" rx="26" ry="6"/><ellipse cx="160" cy="58" rx="26" ry="6"/><ellipse cx="40" cy="144" rx="26" ry="6"/><ellipse cx="160" cy="144" rx="26" ry="6"/><circle cx="100" cy="122" r="6"/>`,
  mower: `<path d="M40 110h104l12 30H28z"/><circle cx="52" cy="150" r="14"/><circle cx="140" cy="150" r="14"/><path d="M134 110l36-80h18"/><path d="M60 110V90h50v20"/>`,
  sup: `<path d="M100 14c26 30 30 140 0 172-30-32-26-142 0-172z"/><path d="M100 70v60"/><path d="M150 30l-10 150"/><path d="M134 18h32"/>`,
  stroller: `<path d="M50 60a60 60 0 0 1 60 60H50z"/><path d="M50 120h96l14-60h24"/><circle cx="66" cy="158" r="14"/><circle cx="138" cy="158" r="14"/><path d="M78 120l-10 24M128 120l8 24"/>`,
  roofbox: `<path d="M20 110c10-30 40-42 80-42s70 12 80 42z"/><path d="M20 110h160"/><path d="M40 110v18M160 110v18"/><path d="M14 128h172"/><path d="M60 92h80"/>`,
  partytent: `<path d="M20 80L100 30l80 50z"/><path d="M20 80v90M180 80v90M100 30v140"/><path d="M20 80c20 14 40 14 60 0 20 14 40 14 60 0 20 14 40 14 60 0"/>`,
  dj: `<rect x="16" y="66" width="168" height="80" rx="14"/><circle cx="58" cy="106" r="26"/><circle cx="142" cy="106" r="26"/><circle cx="58" cy="106" r="6"/><circle cx="142" cy="106" r="6"/><path d="M100 82v48M92 94h16"/>`,
  guitar: `<path d="M78 118c-30 0-44 16-44 34s16 32 38 32c20 0 32-12 34-28 2-12 10-16 18-20 12-6 14-24 2-30s-22 2-30 8c-6 4-10 4-18 4z"/><path d="M110 104l56-64"/><path d="M158 30l18 18"/><circle cx="82" cy="148" r="10"/>`,
  snowboard: `<rect x="80" y="10" width="40" height="180" rx="20"/><path d="M88 66h24M88 134h24"/><path d="M100 54v24M100 122v24"/>`,
  vacuum: `<path d="M70 40h30l40 110"/><rect x="118" y="146" width="56" height="20" rx="8"/><rect x="26" y="70" width="52" height="80" rx="18"/><circle cx="40" cy="158" r="10"/><path d="M78 92h16"/>`,
  generator: `<rect x="26" y="60" width="148" height="92" rx="12"/><path d="M26 80h148"/><rect x="44" y="96" width="50" height="36" rx="6"/><circle cx="138" cy="114" r="16"/><path d="M60 44h80M70 44v16M130 44v16"/>`,
  scooter: `<circle cx="44" cy="154" r="16"/><circle cx="156" cy="154" r="16"/><path d="M44 154h96l30-130"/><path d="M152 24h34"/><path d="M60 154l10-14h60"/>`,
  binoculars: `<rect x="30" y="70" width="56" height="86" rx="22"/><rect x="114" y="70" width="56" height="86" rx="22"/><path d="M86 96h28M86 120h28"/><path d="M44 70V48h28v22M128 70V48h28v22"/><circle cx="58" cy="128" r="12"/><circle cx="142" cy="128" r="12"/>`,
  saw: `<circle cx="96" cy="112" r="46"/><circle cx="96" cy="112" r="8"/><path d="M96 66V40h60l24 30v40h-38"/><path d="M58 158l-14 14M134 158l14 14"/>`,
} as const;

export type Pictogram = keyof typeof PICTOGRAMS;
