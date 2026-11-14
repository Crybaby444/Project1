# Yoyo v16 → yoyo.rent, stage 2: catalog and search — Implementation Plan

> Executed natively (owner rule: no subagents) with superpowers:executing-plans. Stacked on `feat/v16-site` (PR #19).

**Goal:** `/c`, `/c/[slug]` and `/search` look like v16: cream paper, hairlines, display type, no stickers.
**Spec:** `docs/design/concept-v16.html` (the catalog index the owner liked: two columns, number, name, subcategories, arrow), `DESIGN.md`.

## Global Constraints
- No sticker colours or rotated badges in the catalog; accents are the ice-blue dot/line only.
- Category names keep their URLs and the 13-root order from the API.
- Every listing card stays one link with the heart outside it; photo 4:3 sized before load; the shared photo transition keeps working.
- 320–2560 px, both themes, reduced motion.

## Review Focus
1. Long LV/RU category names in the index rows at 320 px — no overflow (ellipsis on one line, full name in `title`).
2. API down on `/c` — the error message still shows (existing branch kept).
3. Keyboard: every row and card reachable, visible focus.

### Task 1: Category index on `/c`
- Create `components/catalog/CategoryIndex.tsx` (`CategoryIndex({ roots, locale })`): numbered two-column rows (one column below 640 px), display-type name, first two subcategories, arrow; `data-cursor-text` on the name; the last row spans both columns when the count is odd.
- Test `CategoryIndex.test.tsx`: one link per root to its category path with the localised name; numbers `01…`; at most two subcategory names per row.
- `/c/page.tsx` uses it; the sticker dots go.

### Task 2: Quiet primitives
- `Chip`, `ChoicePills`, `ActiveFilters`, `SearchBox` suggestions, `HeartButton` sparks: sticker fills → ink outline / ink fill when active, ice-blue dot; sparks in `--glow` and `--paper`.
- Tests: existing ones stay green; new assertion in `ActiveFilters.test.tsx` that a filter chip has no `bg-sticker-` class.

### Task 3: Listing card and empty results
- `ListingCard`: no outlined tilted card; the photo (rounded, hairline) with text below; weekly discount as an ink pill with the blue dot; price in display type.
- `EmptyResults`: the stringless mark instead of the sticker star.
- Test in `ListingCard.test.tsx`: the weekly badge exists and carries no `bg-sticker-` / `rotate` class.

### Task 4: Check and PR
- Unit, typecheck, lint; frames of `/c`, `/c/tools`, `/search` at 320/390/1440 in both themes; PR stacked on #19.
