# Yoyo — design book (v16, "cream and chrome")

The reference is `docs/design/concept-v16.html`; the owner's decisions behind it are in `docs/CHECKPOINT.md`
(v11–v16). The old sticker book is kept at `docs/design/DESIGN-sticker-retired.md`.

## Palette

| Token | Light | Dark | Use |
|---|---|---|---|
| `--canvas` (paper) | `#f4f1e6` | `#0a0b0e` | page |
| `--ink` | `#0a0b0e` | `#f4f1e6` | text, 1px lines, solid buttons |
| `--night` | `#0a0b0e` | `#050608` | night scenes (always dark) |
| `--accent` (the blue) | `#2f5ff0` deep | `#9ed2ff` ice | the third colour (owner, 2026-11-28): what is chosen, current, new or waiting for you |
| `--accent-soft` | `#dfe7ff` | ice at 14% | a pale-blue ground: a chosen filter, the days of a booking, an avatar, an empty state's mark |
| `--glow` | `#9ed2ff` | same | the light itself: a dot, a unit (`%`, `h`), a pool in the night — never a surface |
| chrome | `0xbfc4cc`, metalness 1, roughness 0.2, clearcoat 0.8, envMapIntensity 2.6 | same | the yo-yo and its string |

No yellow, no pastel stickers, no gradients on UI. Ember red (`--sticker-ember`) only means "something is wrong".
The old `--sticker-*` names stay as quiet tones so unported pages keep working.

**The blue** is a role, never a page or a card: the chosen tab, chip, segment, date range and filter; counts and
unread marks; "Your turn" and a deal under way; the current step of a deal; stars and the favourite heart;
people's avatars (the account in the header is the bar's blue light); focus rings; an underlined link under the
pointer; the light pooled in a night block. A night block (`moment`) turns it over: ice on night, deep on cream.
The main button stays ink.

## The system (owner, 2026-11-26: "one style, one beautiful grid, the logic worked out")

Every working page is built from the same five things. Utilities live in `apps/web/src/app/globals.css`,
tokens in `apps/web/src/styles/tokens.css`, the components in `components/ui`.

### Grid

- **One container**, `page`: 1440px at most, a 16px gutter (32px from 640px). The floating header capsule,
  the footer and the phone's tab bar all sit on the same two edges, so the title of every page starts on the
  same line as the logo above it. `page-narrow` (48rem) is left for a lone form only.
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
| `page-chapter` | 80 / 112, top and bottom | the chapters of a page that persuades (the home) |
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

### Controls

- **Buttons** are pills in two sizes: `lg` (48px) only for the one decisive action at the end of a form
  (sign in, save, pay, send the request) and a scene's call to action; `md` (40px) everywhere else: a page
  header's actions, a sheet, a row, an empty state. One filled (the main action), the rest outlined.
- **Badges** (a status, "Your turn") are 28px pills, 14px bold, an icon at 14px; a count beside a heading is a
  plain outlined pill sized to its heading.
- **Switches between views**: a segmented pill for two or three views of the same thing (I rent / I lend, the
  theme, the settings on a phone), the chosen one filled with the blue; the profile's sections are a pill track
  (a quiet capsule) with a blue pill that slides to the chosen tab, each tab with its count.
- **Icons** are drawn line icons, one family: round caps, about 1.3px of line on screen whatever the
  viewBox (24-unit icons at 16–18px take 1.75–2); a "+" on a filled button is bolder.
- **Dialogs** float: `rounded-float`, a 24px (32px) inside, the title at the block step.

### Page

`PageHeader` is the head of every working page: crumbs (or a way back) above; the thing's picture on the
left when it has one (a deal, a booking); the title with its count as a chip; badges and facts under it; one
line on what the page is; the page's actions on the right (`md` buttons, the main one filled); and what works
on the whole page under it (a search box, chips, a notice). `Section` is a section of a page: its heading at
the section step, an action on the same line ("See all"), its content below. Scenes (the home, What is
Yoyo), sign-in and status pages (404) keep their own composition, on the same container and scale.

## The mark

`components/brand/Mark`: a solid yo-yo with the slit across its face, on a short string. The yo-yo appears in
two places only: as the **logo** (the header, the favicon, the app icon) and as the hero of **What is Yoyo**,
the story page with its 3D scenes. It is never used as decoration anywhere else on the site — no yo-yo
windows, strings, beads, spinners or icons on the home or the working pages (owner, 2026-11-28). Loaders are
plain spinners; icons are drawn line icons.

## Header

A floating capsule on the page's grid: the mark and the wordmark, the catalog and What is Yoyo on the left; the
search in the middle; theme, country, language, "Lend an item", messages, notifications and the account on the
right. It hides as you scroll down and comes back as you scroll up. On a phone the capsule keeps the mark, the
search as a magnifier (it opens the box under the bar), the country, the bell and the account, and the tab bar
below (Home, Catalog, Lend, Messages, You) never moves.

**The search lives only here** (owner, 2026-11-28): no page has a box of its own. It suggests categories, items
and people (an `@name` looks only for people); on the results page it holds the words, and the people found
come as a row of pills above the items. Confirming the email is asked on one's own profile (the first steps,
then a quiet reminder), never as a strip under the bar.

## Cursor

`components/motion/DropCursor`: a drop of ink (mix-blend difference) that swells with speed and pulls a tail,
is drawn to anything clickable and spills over it, splashes on a click. Mouse only; never with reduced motion.
Mark the text to fill with `data-cursor-text`.

## The home

Calm and sure of itself (owner, 2026-11-28: "it still looks cheap"; no yo-yo as decoration):

1. **The promise** — "Rent it nearby. / It comes back." set as large as the page allows (its longest word
   always fits, on a 320px phone too), *Browse the catalog* and *Lend one of yours* under it, and the four
   guarantees below a hairline, each with its own line icon in an ink disc, the title and one line.
2. **Popular now** — the item grid (personal once the browser knows someone), with an invitation to put
   yours in the empty places of the last row.
3. **Categories** — the catalog's quiet index: number, name in display type, the first subcategories, a peek
   at the newest photos, an arrow.
4. **Your things can earn** — the night band with the blue light: two sliders and the month's rent.
5. **Before your first deal** — four questions from the FAQ.

Searching is the header's job on every page. The yo-yo's own scenes (three.js, GSAP, Lenis) live on What is
Yoyo (`/what-is-yoyo`), and only there; as plain markup every scene is complete.

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
