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

## The system (owner, 2026-11-26: "one style, one beautiful grid, the logic worked out")

Every working page is built from the same five things. Utilities live in `apps/web/src/app/globals.css`,
tokens in `apps/web/src/styles/tokens.css`, the components in `components/ui`.

### Grid

- **One container**, `page`: 1440px at most, a 16px gutter (32px from 640px). The floating header capsule,
  the email strip, the footer and the phone's tab bar all sit on the same two edges, so the title of every
  page starts on the same line as the logo above it. `page-narrow` (48rem) is left for a lone form only.
- **Three layouts**, nothing in between:
  - one column;
  - `layout-split`: the work on the left, a **24rem** column of tools on the right (a deal, a booking,
    notifications and saved searches). The item page keeps its own 7:5 split: the calendar needs two months;
  - `layout-rail`: an **18rem** rail on the left, the content on the right (search filters, the settings'
    sections, a document's contents, the FAQ's contact card).
  Below lg both are one column, in reading order; a sticky column sticks at `top-24`, under the header.
- **Card grids**: `grid-cards` (2 → 4 columns) for items across the page, `grid-cards-rail` (2 → 3) beside a
  rail, `grid-tiles` (1 → 2 → 3) for wider cards (people, shops, my items). Gutter 12px, 16px from 640px; 32px
  between rows.

### Rhythm

A 4px scale used in a few named intervals, tight inside, generous between:

| Utility | Phone / from 640px | Between |
|---|---|---|
| `page-y` | 32 top, 56 bottom / 48, 80 | the header and the page, the page and the footer |
| `stack-page` | 40 / 56 | the page header and each section |
| `stack-section` | 16 / 20 | a section's heading and its content |
| `stack-sheets` | 16 / 24 | sheets in a column |
| `<Sheet>` padding | 20 / 24 (`pad="sm"` 16 / 20) | a sheet's edge and its content |

### Type

Four display steps about 1.4× apart (Sofia Sans Extra Condensed 900, uppercase), named by the place of the
heading, never by a size:

| Role | Size | Used for |
|---|---|---|
| `type-hero` | 48 → 96px | a scene, a reading page's banner |
| `type-title` | 40 → 64px | the page's h1 (in `PageHeader`; it shrinks only so far its longest word fits) |
| `type-section` | 32 → 46px | a section of a page; a builder step |
| `type-block` | 26 → 34px | the heading of a sheet, or of a group inside a column |

Small caps: `type-label` (14px bold, 0.03em) names a field or a group; `type-caption` (12px, 0.04em) tags a
fact or sits on a chip. Text is **Onest** 400–700 on Tailwind's steps (12 · 14 · 16 · 18 · 20 · 24).
No kicker above a heading: where it is, or how many, goes beside it as a chip ("Price 4 / 6", "My deals 3").
Slogans are general, never a list of concrete things.

### Surfaces

- **One sheet** (`components/ui/Sheet`): a film a little lighter than the page (`--sheet-bg`), a lit top edge
  and a soft fall of shadow (`--sheet-shadow`), both theme tokens. Its edge says its role: `quiet` (1px at
  15%) for almost everything, `ring` (2px ink) for the one block that waits for you (your turn, the booking
  you are making, the item's price and calendar), `danger` for a dispute. Nothing is nested in a sheet; a list
  inside one is rows between hairlines.
- **Four corners**: `rounded-tile` 10px (a thumbnail, an icon's square), `rounded-media` 14px (cards, sheets,
  photos, panels, multi-line fields), `rounded-float` 28px (what floats: the tab bar, a bottom bar, a phone
  sheet, a chat bubble), `rounded-pill` (buttons, fields, chips, the header capsule).
- An empty list is a quiet sheet (`EmptyState`): a small still mark, the title at the block step, one line,
  the next step at the end of the row.

### Page

`PageHeader` is the head of every working page: crumbs (or a way back) above; the thing's picture on the
left when it has one (a deal, a booking); the title with its count as a chip; badges and facts under it; one
line on what the page is; the page's actions on the right (`md` buttons, the main one filled); and what works
on the whole page under it (a search box, chips, a notice). `Section` is a section of a page: its heading at
the section step, an action on the same line ("See all"), its content below. Scenes (the home, What is
Yoyo), sign-in and status pages (404) keep their own composition, on the same container and scale.

## The mark

`components/brand/Mark`: a solid yo-yo with the slit across its face, on a short string. `string={false}`
for anything that spins (the loader), so it turns about its centre.

## Header

A floating capsule on the page's grid: the mark and the wordmark, the catalog and What is Yoyo on the left; the
search in the middle; theme, country, language, "Lend an item", messages, notifications and the account on the
right. It hides as you scroll down and comes back as you scroll up. On a phone the capsule keeps the mark, the
country, the bell and the account, and the tab bar below (Home, Catalog, Lend, Messages, You) never moves.

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

## The admin panel

It follows the site's theme and language, with its own switches (owner, 2026-11-26); night is where it
shines. One light, ice blue (`--admin-light`, a deeper blue on cream), only ever as light: two soft pools
behind the page, a lit dot for what waits, today's bar, the end of a sparkline. Glass stays faint
(`.admin-glass`): a thin sheet of paper over the night, a lit top edge, a soft shadow; the same sheet as the
site's, with the same type roles and corners. Information first:

- Every figure counts up as it arrives (`useCountUp`, `CountUp`); summary rows are `StatCard`s.
- A figure gets a small drawing when it has a story: two weeks as a sparkline with the last week against the
  one before, a share as a filled line, the money held as one bar of three parts.
- Charts are pills grown from the floor one day after another; pointing at (or focusing) a day reads it out.
- Blocks come out of a blur in turn (`.admin-rise`, `--i`), a change of section replays it, table rows arrive
  one after another. All of it is still with reduced motion, in tests and in automated browsers.
