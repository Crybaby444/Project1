# Yoyo — design book (v16, "cream and chrome")

The reference is `docs/design/concept-v16.html`; the owner's decisions behind it are in `docs/CHECKPOINT.md`
(v11–v16). The old sticker book is kept at `docs/design/DESIGN-sticker-retired.md`.

## Palette

| Token | Light | Dark | Use |
|---|---|---|---|
| `--canvas` (paper) | `#f4f1e6` | `#0a0b0e` | page |
| `--ink` | `#0a0b0e` | `#f4f1e6` | text, 1px lines, solid buttons |
| `--night` | `#0a0b0e` | `#050608` | night scenes (always dark) |
| `--glow` | `#9ed2ff` | same | the one light: a dot, a unit (`%`, `h`), a fill — never a surface |
| chrome | `0xbfc4cc`, metalness 1, roughness 0.2, clearcoat 0.8, envMapIntensity 2.6 | same | the yo-yo and its string |

No yellow, no pastel stickers, no gradients on UI. Ember red (`--sticker-ember`) only means "something is wrong".
The old `--sticker-*` names stay as quiet tones so unported pages keep working.

## Type

- Display: **Sofia Sans Extra Condensed** 900, uppercase, line-height 0.8–0.86.
- Text: **Onest** 400–700.
- Slogans are general, never a list of concrete things.

## The mark

`components/brand/Mark`: a solid yo-yo with the slit across its face, on a short string. `string={false}`
for anything that spins (the loader), so it turns about its centre.

## Header

Nothing on the left; the mark dead centre; language, theme and the account on the right. On a phone, the mark
and one button. The catalog is not in the header: it is on the home page and in the footer.

## Cursor

`components/motion/DropCursor`: a drop of ink (mix-blend difference) that swells with speed and pulls a tail,
is drawn to anything clickable and spills over it, splashes on a click. Mouse only; never with reduced motion.
Mark the text to fill with `data-cursor-text`.

## The home

Five scenes, each held on screen while it plays (sticky), with transitions out of the yo-yo, never cuts:

1. **Hero** — YOYO across the screen, the chrome yo-yo hanging on its chrome string in front of it, face-on,
   the slit level at rest. On scroll it revs, the night spills out of its rim, then the string reels it up.
2. **Night** — "Rent it · Use it · Bring it back" drift; they light up one by one; a line and the catalog.
3. **What is Yoyo** — the statement lights up word by word, then four steps arrive under a filling line.
4. **Facts** — one fact at a time, a huge number counting up; numbers come from `DEFAULT_BOOKING_SETTINGS`.
5. **Finale** — in the dark the yo-yo comes down on its string, light grows out of it, the string lets go, it
   lands and rolls away and back under "It always comes back."

Rules: as plain markup every scene is complete (no WebGL, no script, reduced motion); staging CSS lives under
`html[data-staged]`; three.js, GSAP and Lenis load on the home only.

## Motion

Text: words rise out of a mask (`expo.out`). Flights: `power3.inOut`. Scroll-driven values are smoothed, never
re-triggered. Everything fits 320–2560 px, centred.
