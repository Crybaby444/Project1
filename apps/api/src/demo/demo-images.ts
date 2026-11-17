import sharp from 'sharp';
import { PICTOGRAMS, type Pictogram } from './pictograms';

/** Yoyo's palette (DESIGN.md): cream, night, chrome and one blue light. */
const CREAM = '#F3EFE6';
const PAPER = '#FBF8F2';
const NIGHT = '#0A0B0E';
const CHROME = '#A9AEB6';
const ICE = '#4D7CFF';

const W = 1600;
const H = 1200;

function icon(name: Pictogram, x: number, y: number, size: number, color: string, stroke: number): string {
  const scale = size / 200;
  return `<g transform="translate(${x - size / 2} ${y - size / 2}) scale(${scale})" fill="none" stroke="${color}" stroke-width="${stroke / scale}" stroke-linecap="round" stroke-linejoin="round">${PICTOGRAMS[name]}</g>`;
}

/** Four views of one item: in the studio, at night under the blue light, a close-up, and a scene. */
function compositions(name: Pictogram, seed: number): string[] {
  const tilt = (seed % 7) - 3;
  const studio = `
    <defs><radialGradient id="floor" cx="50%" cy="78%" r="45%"><stop offset="0" stop-color="${CHROME}" stop-opacity=".55"/><stop offset="1" stop-color="${CHROME}" stop-opacity="0"/></radialGradient></defs>
    <rect width="${W}" height="${H}" fill="${CREAM}"/>
    <ellipse cx="${W / 2}" cy="${H * 0.86}" rx="620" ry="80" fill="url(#floor)"/>
    <g transform="rotate(${tilt} ${W / 2} ${H / 2})">${icon(name, W / 2, H * 0.47, 1040, NIGHT, 22)}</g>`;
  const night = `
    <defs><radialGradient id="glow" cx="62%" cy="38%" r="55%"><stop offset="0" stop-color="${ICE}" stop-opacity=".55"/><stop offset=".55" stop-color="${ICE}" stop-opacity=".08"/><stop offset="1" stop-color="${NIGHT}" stop-opacity="0"/></radialGradient></defs>
    <rect width="${W}" height="${H}" fill="${NIGHT}"/>
    <rect width="${W}" height="${H}" fill="url(#glow)"/>
    ${icon(name, W / 2, H / 2, 980, PAPER, 20)}`;
  const detail = `
    <defs><linearGradient id="metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E6E8EC"/><stop offset="1" stop-color="${CHROME}"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#metal)"/>
    ${icon(name, W * 0.6, H * 0.6, 2100, NIGHT, 30)}`;
  const dots = Array.from({ length: 9 }, (_, i) => `<circle cx="${180 + (i % 3) * 120}" cy="${180 + Math.floor(i / 3) * 120}" r="${i === seed % 9 ? 26 : 14}" fill="${i === seed % 9 ? ICE : NIGHT}" opacity="${i === seed % 9 ? 1 : 0.14}"/>`).join('');
  const scene = `
    <rect width="${W}" height="${H}" fill="${PAPER}"/>
    <circle cx="${W * 0.66}" cy="${H * 0.52}" r="420" fill="none" stroke="${NIGHT}" stroke-opacity=".12" stroke-width="3"/>
    <circle cx="${W * 0.66}" cy="${H * 0.52}" r="300" fill="${CREAM}"/>
    ${dots}
    ${icon(name, W * 0.66, H * 0.52, 640, NIGHT, 18)}`;
  return [studio, night, detail, scene];
}

/** The four JPEG photos of a demo item (1600×1200, 4:3 like the builder's crop). */
export async function demoPhotos(name: Pictogram, seed: number): Promise<Buffer[]> {
  return Promise.all(
    compositions(name, seed).map((body) =>
      sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`))
        .jpeg({ quality: 86, mozjpeg: true })
        .toBuffer(),
    ),
  );
}
