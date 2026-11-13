# Yoyo v16 → yoyo.rent, stage 1: style foundation, header, home — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> Owner rule for this project: work natively in the local session, no subagents (`superpowers:executing-plans`).

**Goal:** The live site gets the v16 look: new tokens and fonts site-wide, the new header, the drop cursor, and the v16 home page in three languages and both themes.

**Architecture:** Tokens and fonts change in place (`styles/tokens.css`, `styles/fonts.ts`), so every existing page picks up the new palette and type without touching its components. The home page becomes a stack of server-rendered sections (all copy in the DOM for SEO and screen readers) plus one client-only `HomeStage` that owns the WebGL canvas, Lenis and the GSAP scroll timelines; it is loaded with `next/dynamic` (`ssr: false`) only on `/`, so no other page pays for three.js. Without WebGL or with reduced motion the sections stand on their own, static and fully visible.

**Tech Stack:** Next.js 16.4.3 (read `apps/web/node_modules/next/dist/docs/` before writing code, per `apps/web/AGENTS.md`), React 19.3, next-intl 4.14, Tailwind 4.3, Vitest 5, Playwright 1.62; new: `three@0.170.0`, `gsap@3.13.0` (ScrollTrigger), `lenis@1.1.13`.

**Spec:** `docs/design/concept-v16.html` (the reference implementation: copy its maths and timings), `docs/CHECKPOINT.md` (v11–v16 sections: every owner decision and why), owner answers 2026-11-13: whole site in the new style, home gets a dark version.

## Global Constraints

- Palette (light): paper `#f4f1e6`, ink `#0a0b0e`, night `#0a0b0e`, ice-blue light `#9ed2ff` (accent only: a dot, a unit, a fill), chrome material `color 0xbfc4cc, metalness 1, roughness 0.2, clearcoat 0.8, envMapIntensity 2.6`. No yellow, no sticker colours, no gradients on UI.
- Dark theme: paper → `#0a0b0e`, ink → `#f4f1e6`; night scenes stay night, so in dark the hero and the final are night and the transitions become "night → deeper night (#050608)".
- Type: display `Sofia Sans Extra Condensed` 800/900 uppercase, body `Onest` 400–700; both must load latin, latin-ext (Latvian) and cyrillic (Russian).
- Copy: general slogans, no concrete items in taglines; every string in `messages/site/{en,lv,ru}.json`; Latvian goes to the owner for proofreading (list the new keys in the PR).
- Facts slide numbers come from `DEFAULT_BOOKING_SETTINGS` in `packages/domain/src/settings.ts` (`promoServicePercent` 0, `servicePercent` 10, `inspectionHours` 48), never typed by hand.
- Header: no navigation on the left; logo dead centre (absolute); right: language, theme, auth (or "Lend an item" + user menu). Phones: logo + one compact button.
- Loader mark spins without its string (`mark-spin`).
- Motion: `prefers-reduced-motion` → no loader, no pinning tricks that hide content, every section fully visible at load; touch devices get no custom cursor.
- Every page fits 320–2560 px wide; centred compositions as in the 2026-11-13 pass.
- Merge only after green CI; release the site after the API (CHECKPOINT incident 2026-11-09).

## Review Focus

1. **No WebGL / context lost** (old iPhone, blocked GPU): the home must show the word YOYO, all copy and both CTAs in the DOM, no blank pinned screens → test in Task 6.
2. **Reduced motion**: no loader, the night scene and the facts readable without scrolling through timelines → test in Task 8.
3. **Latvian/Russian length** in display type (hero foot, facts titles, statement): no overflow at 320 px → `fit-on-phones.spec.ts` gets the home in all three locales, Task 8.
4. **Resize / rotate mid-page and back-navigation into a pinned section**: ScrollTrigger refresh, canvas resized, night circle never stuck half-open → test in Task 7.
5. **Signed-in visitor** on the home: header shows "Lend an item" + user menu, the hero CTA does not say "Sign up" → test in Task 3.

---

### Task 1: Branch, dependencies, tokens and fonts

**Files:**
- Modify: `apps/web/package.json`, `pnpm-lock.yaml`
- Modify: `apps/web/src/styles/tokens.css`, `apps/web/src/styles/fonts.ts`, `apps/web/src/app/globals.css` (the `--fit-em` comment/value for the new face)
- Test: `apps/web/e2e/theme.spec.ts` (existing), new `apps/web/src/styles/tokens.test.ts`

**Interfaces:**
- Produces: CSS variables `--canvas --surface --band --mist --ink --cta-bg --cta-fg --marquee-bg --marquee-fg` remapped to the v16 palette (names kept so every page restyles); new `--paper --night --glow --chrome`; `fontVariables` unchanged in name.

- [ ] **Step 1:** Create the worktree with `superpowers:using-git-worktrees` from `main` (branch `feat/v16-site`); the main checkout holds uncommitted work from `feat/mascots-identity` that must not move.
- [ ] **Step 2: Failing test** `tokens.test.ts`: read `tokens.css` as text; assert light `--canvas: #f4f1e6`, light `--ink: #0a0b0e`, dark `--canvas: #0a0b0e`, dark `--ink: #f4f1e6`, `--glow: #9ed2ff`, and that no `--sticker-sun`/`#ffd731` remains.
- [ ] **Step 3:** Run `pnpm --filter @yoyo/web test tokens` → FAIL.
- [ ] **Step 4:** Rewrite the token values (light/dark/`prefers-color-scheme` blocks); swap `Unbounded` for `Sofia_Sans_Extra_Condensed` (weights 800, 900) in `fonts.ts`, keep Onest (add 400, 600); update `--fit-em` to the new face's widest-word width (measure "WORK" in the browser and note the value in the comment). `pnpm add three@0.170.0 gsap@3.13.0 lenis@1.1.13` and `@types/three@0.170.0` (dev).
- [ ] **Step 5:** `pnpm --filter @yoyo/web test && pnpm --filter @yoyo/web typecheck && pnpm --filter @yoyo/web e2e theme` → PASS.
- [ ] **Step 6: Commit** `feat(web): v16 palette and type across the site`.

### Task 2: Brand mark

**Files:**
- Create: `apps/web/src/components/brand/Mark.tsx`, `Mark.test.tsx`
- Modify: every import of `components/ui/LogoMark` (grep), `apps/web/src/app/icon.svg`

**Interfaces:**
- Produces: `Mark({ size = 24, string = true, className }: { size?: number; string?: boolean; className?: string }): JSX.Element` — the concept's `#mark` (circle r 8.6, slit, string `M12 1v4.2`); `string={false}` draws `#mark-spin` (circle r 10 centred, slit) for anything that rotates.

- [ ] **Step 1: Failing test:** `<Mark string={false} />` renders no `path[d^="M12 1"]` and a circle centred at 12,12; default renders the string path; `aria-hidden="true"` on both.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement; replace `LogoMark` uses; `icon.svg` = the stringed mark on paper. **Step 4:** Run → PASS. **Step 5: Commit** `feat(web): the yo-yo mark, with a stringless version for spinning`.

### Task 3: Header

**Files:**
- Modify: `apps/web/src/components/layout/SiteHeader.tsx`, `SiteHeader.test.tsx`; `apps/web/messages/en.json` (`header`) only if a label changes
- Test: `SiteHeader.test.tsx`, `apps/web/e2e/home.spec.ts` (language switcher test keeps working)

**Interfaces:**
- Consumes: `Mark` (Task 2), existing `LanguageSwitcher`, `ThemeToggle`, `UserMenu`, `Button`, `useSession`.
- Produces: `SiteHeader({ catalog }: { catalog?: MenuRoot[] })` — same signature; `catalog` is no longer rendered in the header (the catalog is reached from the hero CTA and the footer; note this in the PR for the owner).

- [ ] **Step 1: Failing tests:** brand link is centred (`data-site-brand` has class `absolute` and `left-1/2`); anonymous: language, theme, "Sign in", "Sign up" on the right, no catalog button; authenticated: "Lend an item" + account menu, no "Sign up"; below 640 px only one auth button (assert class `max-sm:hidden` on the language and theme controls).
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement the grid `1fr auto 1fr`, brand absolute centre, actions in column 3. **Step 4:** Run unit + `e2e home language-switch` → PASS. **Step 5: Commit** `feat(web): header with the mark in the middle`.

### Task 4: Drop cursor

**Files:**
- Create: `apps/web/src/components/motion/DropCursor.tsx`, `drop-cursor.ts` (pure maths), `drop-cursor.test.ts`
- Modify: `apps/web/src/app/[locale]/layout.tsx` (mount once)

**Interfaces:**
- Produces: `headRadius(speedPxPerS: number, hover: number, burst: number): number` = `(9 + min(speed*0.016, 22)) * (1 - hover*0.85) + burst*20`; `fillPoints(rect: DOMRect, n = 5, hover: number, plop: number): {x,y,r}[]` (capsule along the element, radius `min(h/2,40)*0.68*hover*(plop/26)`); `<DropCursor />` renders a fixed `canvas` (z 60, `mix-blend-mode: difference`) only when `(pointer: fine)` and not reduced motion; hides the system cursor via `body.has-cursor`.

- [ ] **Step 1: Failing tests:** `headRadius(0,0,0)===9`; `headRadius(5000,0,0)===31`; `headRadius(0,1,0)` ≈ 1.35; `fillPoints` returns 5 points on the rect's vertical centre, first/last inside the rect; component renders nothing when `matchMedia('(pointer: fine)')` is false.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Port the concept's goo (WebGL metaballs, trail 11 + fill 5, hover magnet 0.35, elastic plop, click burst); for `.line`-style rows measure the text with a `Range`. **Step 4:** Run → PASS; check by hand on `/` and `/search`: pill fills exactly, no halo. **Step 5: Commit** `feat(web): a drop of ink for a cursor`.

### Task 5: Home copy and server sections

**Files:**
- Create: `apps/web/src/components/home/{Hero,NightScene,WhatIsYoyo,Facts,Finale}.tsx`, `apps/web/src/lib/home/facts.ts`, `facts.test.ts`
- Modify: `apps/web/src/app/[locale]/page.tsx` (new section list; keep `JsonLd` and metadata), `apps/web/messages/site/{en,lv,ru}.json` (`landing` → new keys, old unused keys removed), `apps/web/messages/{en,lv,ru}.json` (`home.tagline` = hero line)
- Delete: home-only components no longer used (`landing/Categories*`, `HowRenting`, `Safety`, `FaqTeaser`, `Marquee` if unused elsewhere — grep first)

**Interfaces:**
- Produces: `homeFacts(s: BookingSettings): { value: number; unit: '%' | 'h' | ''; key: 'fee' | 'inspection' | 'contract' | 'checked' | 'languages' }[]` → `[{0,'%','fee'},{48,'h','inspection'},{1,'','contract'},{100,'%','checked'},{3,'','languages'}]` for the defaults (fee line also states `servicePercent`). Section roots carry `data-home="hero|night|what|facts|finale"`; anchors `data-anchor="hero-slot|final-slot"` for the stage.
- Copy (EN, exact, from v16): hero line "Rent from the people around you, for as long as you need."; night rows "Rent it" / "Use it" / "Bring it back"; night line "Why buy what you only need once? Someone near you already has it, and is happy to share."; statement "Yoyo is a rental marketplace between people. Take what you need for as long as you need it, share what you rarely use, and everything finds its way back."; four steps and five facts as in v16; finale "It always / comes back."

- [ ] **Step 1: Failing tests:** `homeFacts(DEFAULT_BOOKING_SETTINGS)` equals the list above; `homeFacts({...d, inspectionHours: 72})[1].value === 72`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement `facts.ts`, the five server sections (static layout = the concept's final state of each scene, so no-JS / no-WebGL is complete), messages in three languages. **Step 4:** `pnpm --filter @yoyo/web test && typecheck` → PASS; `/`, `/lv`, `/ru` render with one `h1` "Yoyo". **Step 5: Commit** `feat(web): the v16 home, as plain sections in three languages`.

### Task 6: HomeStage — the WebGL set

**Files:**
- Create: `apps/web/src/components/home/stage/{HomeStage.tsx,scene.ts,yoyo.ts,letters.ts,studio.ts}`, `stage/yoyo.test.ts`
- Modify: `apps/web/src/components/home/Hero.tsx` (mount `HomeStage` via `next/dynamic` with `ssr: false`)

**Interfaces:**
- Consumes: section anchors from Task 5.
- Produces: `createStage(canvas: HTMLCanvasElement, opts: { reduced: boolean; mobile: boolean }): { setProgress(key: 'hero'|'final', p: number): void; dispose(): void } | null` (null when WebGL is unavailable); `makeYoyo(material): { g: Group; body: Group }` with the logo slit on both faces; `studio(renderer, scene)` = the concept's canvas-drawn environment (one PMREM per renderer).

- [ ] **Step 1: Failing tests:** `makeYoyo` returns a body with two lathe halves and two slit boxes at `y = ±0.31`; `createStage` returns `null` when `canvas.getContext('webgl2')` and `'webgl'` both return null; e2e: with `--disable-gpu --disable-webgl` the home still shows the YOYO `h1`, both hero CTAs and the finale heading.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Port from the concept: renderer settings, chrome material, yo-yo on the chrome string (hero: drop with `elastic.out(1,0.55)`, pendulum, rev → night spills from the rim → reel up), the in-scene letters (`ZW = -0.4·VH`, no fog), finale (descend in the dark, light hole from the rim via mask, string lets go, land, roll loop). Dispose everything on unmount. **Step 4:** Run → PASS. **Step 5: Commit** `feat(web): the yo-yo on its string, in WebGL, on the home only`.

### Task 7: Scroll choreography

**Files:**
- Create: `apps/web/src/components/home/stage/timelines.ts`, `apps/web/src/components/motion/SmoothScroll.tsx`
- Test: `apps/web/e2e/home-motion.spec.ts`

**Interfaces:**
- Consumes: `createStage` (Task 6), section roots (Task 5).
- Produces: `mountTimelines(stage, root: HTMLElement, opts): () => void` — intro 520 vh with `HK = 420/230`, night story at 0.40/0.52/0.64/0.78/0.84, What 460 vh (words 0.02–0.36, steps at 0.40 + i·0.14, scrub 1.4), facts 520 vh (smoothed scroll-driven stack, no restarts), finale pinned 210 vh (q thresholds 0.34/0.66/0.82/0.9). Lenis only on `/`.

- [ ] **Step 1: Failing e2e:** after scrolling to 0.9 of the intro the `.night` layer has `clip-path: none`; at What progress 0.98 no statement word has opacity < 0.95; jumping straight to the middle of the facts shows exactly one fact with `visibility: visible` per layer; after `setViewportSize(390, 844)` mid-page the canvas size equals the viewport.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Port the timelines. **Step 4:** Run → PASS. **Step 5: Commit** `feat(web): the home plays as you scroll`.

### Task 8: Dark home, reduced motion, phones

**Files:**
- Modify: home sections' classes (theme tokens only), `stage/studio.ts` (dark fog/env), `apps/web/e2e/{fit-on-phones,landing,home,motion}.spec.ts`

- [ ] **Step 1: Failing e2e:** dark theme: hero background `rgb(10, 11, 14)`, word ink `rgb(244, 241, 230)`; reduced motion: no `.loader`, every `[data-home]` section visible and readable at load, facts listed (all five values in the DOM); `/`, `/lv`, `/ru` at 320 px: no horizontal scroll, no text overflowing its box.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** `pnpm --filter @yoyo/web e2e` (whole suite) → PASS; manual look at 320/390/768/1440/2560 both themes. **Step 5: Commit** `feat(web): the home in the dark and without motion`.

### Task 9: Design book, checkpoint, PR

**Files:** `DESIGN.md` (rewrite from v16: tokens, type, mark, motion rules, cursor, sections), `docs/CHECKPOINT.md`, PR body (`mattpocock-skills:pr`) listing the new LV strings for the owner.

- [ ] Run `pnpm -w lint typecheck test` and the e2e suite; open the PR; merge only after green CI and the owner's yes.

## Later stages (one plan each, after stage 1 ships)

2. Catalog and search in the new style (cards, filters, map).
3. Item page and booking flow.
4. Sign-in / sign-up / password reset.
5. Profile, my items, deals, wallet, favourites, settings.
6. Service pages (how it works, FAQ, legal, 404, errors) and the admin.
