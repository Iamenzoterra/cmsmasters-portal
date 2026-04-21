# Layout Maker ↔ Portal Parity Log

**Purpose.** One place to collect every observed case where **Layout Maker
lied** — where its Inspector or Canvas said one thing and the Portal rendered
another. Every entry is either fixed (with a commit ref) or still open with
enough detail to reproduce.

**North star.** LM, the config (YAML / `slot_config`), the exported CSS, and
the Portal render must speak **one language**. If the Inspector shows "Content
align: Center" or "Gap: XL", that semantic must travel intact through
import → config → CSS generator → Portal DOM, and the Portal must honor it.

When it doesn't, it goes here. When enough cases accumulate, the fix is a
**contract** (tests on `css-generator.ts`, on `html-parser.ts`, on Portal's
slot-config CSS injector) so the same class of lie can't recur.

---

## How to add an entry

Copy the template below. Fill in every field honestly — especially *where in
the pipeline the lie is introduced*, since that's what tells us whether the
fix is in the generator, the Inspector, the schema, or the Portal.

```markdown
### [BP] Short description

- **Layout / scope:** `<layout id / yaml file> / <scope>`
- **Breakpoint:** `desktop | tablet | mobile`
- **Slot:** `<slot name>`
- **Field:** `<config key, e.g. max-width + align>`
- **LM claims:** what the Inspector shows
- **LM canvas:** what the Canvas renders (matches Inspector? or diverges?)
- **Portal renders:** what the real page looks like at the same BP
- **Where the lie lives:** generator | inspector | schema | portal | html-parser | unknown
- **Root cause:** one-paragraph explanation
- **Repro:**
  1. ...
  2. ...
- **Status:** `open` | `fixed <commit-sha>` | `wontfix <reason>`
- **Contract/test added:** link to test, or "none yet"
```

---

## Open

### [tablet] `align` + `max-width` on container slots are silently ignored

- **Layout / scope:** `layouts/2132.yaml` ("the-new") / `theme`
- **Breakpoint:** tablet (and any BP, actually — this is a schema-level issue)
- **Slot:** `content` (has `nested-slots: [theme-blocks]`, so it is a container)
- **Field:** `align: center`, `max-width: 615px`, `padding: --spacing-xl`, `padding-x: 0`
- **LM claims:** Inspector exposes Content align / Inner max-width / padding controls on the slot — user can set them, they are written to `config.slots.content` and visible in YAML.
- **LM canvas:** mostly matches Inspector — shows the fixed-width centered frame on the canvas for that slot.
- **Portal renders:** ignores them. `[data-slot="content"]` has no `.slot-inner` child (its child is `<div data-slot="theme-blocks">`), so the generator skips the per-slot inner rule (`css-generator.ts:234-246`: `if (slot['nested-slots'] && length > 0) continue`). The vars like `--sl-content-mw: 615px` are emitted but no rule consumes them.
- **Where the lie lives:** **inspector + schema**. The Inspector shows inner/leaf controls for container slots; the schema has no notion of "these fields are illegal when nested-slots is set".
- **Root cause:** The visual-params panel (`Inspector.tsx`) doesn't branch on `slot['nested-slots']`. See `tools/layout-maker/CLAUDE.md` "Container vs Leaf Slots (WP-020)" which says containers should only show "chip list + Add/Create buttons" — but the inner-params section is also being shown for containers.
- **Repro:**
  1. Open a layout where `content` has `nested-slots: [theme-blocks]`.
  2. Select `content` in the Canvas.
  3. Set `Content align: Center`, `Inner max-width: 615px` (Fixed).
  4. Save, export, and open the actual themed page in Portal.
  5. Observe: title blocks are NOT constrained to 615px, NOT centered — they fill parent width.
- **Status:** `open`
- **Contract/test added:** none yet. Proposed:
  - `css-generator.test.ts`: given a slot with `nested-slots`, assert no `[data-slot="X"] > .slot-inner` rule is emitted AND no inner vars (`--sl-X-mw`, `--sl-X-al`, `--sl-X-px`, `--sl-X-pt`, `--sl-X-pb`) are emitted.
  - `Inspector.test.tsx`: when the selected slot has `nested-slots`, the inner-params controls (align / max-width / padding / gap) must not render.

_(no other open entries — add as they surface)_

---

## Fixed

### [tablet] Drawer sidebars render unstyled (blocks missing content + wrong colors)

- **Layout / scope:** any drawer layout using blocks with scoped JS (e.g. `sidebar-pricing`)
- **Breakpoint:** drawer BPs (tablet / mobile)
- **Slot:** drawered sidebars (`sidebar-left`, `sidebar-right`)
- **LM claims:** opening the drawer shows the sidebar with its blocks fully styled.
- **Portal rendered (before fix):** drawer opened with mostly blank cards — pricing card empty, "This theme is perfect for" missing its bullet list, tag pills in wrong (non-active) colors.
- **Where the lie lived:** **html-generator**. It emitted TWO DOM copies of each drawered sidebar (`<aside data-slot="X">` in the grid + `<div data-slot="X">` inside `.drawer-panel > .drawer-body`) and let the Portal resolver fill both. But block scripts use `document.querySelector('.block-X')` (singular) — they initialize ONLY the first instance found in DOM. The grid copy got initialized (fine at desktop), the drawer copy never did. The `.reveal → .visible` transition was never triggered, the discount `priceRow--has-discount` class never added, etc. Same root cause broke the active-tag color and the perfect-for list items.
- **Fix:** Keep exactly ONE DOM copy of each sidebar. The same `<aside data-slot="X">` lives in the grid at desktop; at drawer BPs the layout CSS turns THAT element into a drawer panel (`position: fixed`, `transform: translateX(-100%)`, shell-token width/bg/shadow). The `drawer-shell` now contains only triggers + backdrop. Opening a drawer is a body class (`drawer-is-open-{side}`) that the shell CSS gates the `translateX(0)` on. Block JS runs against the one instance it finds — which is the same element whether it's a grid column or a drawer panel. `portal-shell.js` rewritten to toggle body classes; `DrawerPreview` (LM canvas) mirrors the same body classes plus a canvas-only panel visualizer (`.lm-drawer-canvas-panel`) using the same `--drawer-*` tokens.
- **Ancillary fix:** drawer z-index tokens raised from `40/50/60` to `1050/1100/1200` so the panel covers the sticky header (`z-index: 999`).
- **Status:** `fixed <this commit>`
- **Contract/test:** `html-generator.test.ts` — "keeps exactly one DOM copy of each sidebar (no data-slot duplication)" + 9 other cases enforcing the new shell vocabulary. `css-generator.test.ts` — "does NOT emit display:none on drawered sidebars" and "emits per-BP panel rules on the grid sidebar with shell tokens".

### [tablet] `grid-template-columns: 1fr 1fr 1fr` kept even when sidebars go to drawer

- **Layout / scope:** `layouts/2132.yaml` / `theme`
- **Breakpoint:** tablet (all sidebars → drawer)
- **Slot:** grid-level (`.layout-grid`)
- **Field:** `grid-template-columns`
- **LM claims:** Canvas shows content spanning the freed-up horizontal space once sidebars go to drawer (visually, sidebars disappear and content fills).
- **LM canvas:** content appears wider when sidebars become drawers.
- **Portal renders (before fix):** `<main data-slot="content">` stays in column 2 of a 3-track grid. Sidebars are `display: none` so they vacate, but tracks remain. Content ends up constrained to ~1/3 of the viewport.
- **Where the lie lived:** **generator**. `css-generator.ts` in the responsive BP branch only wrote `display: none` on hidden/drawered sidebars — it did not prune their tracks from `grid-template-columns`, so the remaining slots got their original fr-share of the viewport.
- **Fix:** In the responsive BP loop (`css-generator.ts`), compute the hidden/drawered slot set BEFORE writing `grid-template-columns`, then filter those slot names out of `grid.columns` so the emitted track list contains only visible slots.
- **Status:** `fixed <this commit>`
- **Contract/test:** `tools/layout-maker/runtime/lib/css-generator.test.ts` — 5 cases covering grid-level `drawer`, grid-level `hidden`, per-slot `visibility: drawer`, mixed (one sidebar hidden / one visible), and the negative case (all visible, all tracks preserved).

---

## Systemic themes — fixes that retire multiple entries at once

As patterns emerge across entries, list them here with the planned fix and
which open entries it would close. This is the "adapt the system" half of the
trashcan.

1. **Container-vs-leaf field validity.** Container slots (those with
   `nested-slots`) must reject inner-only fields at the schema layer and the
   Inspector must not expose them. One fix kills a whole category of
   "Inspector says X, Portal ignores X."

2. **Responsive grid recomputation.** Any BP that changes slot visibility
   (hidden / drawer) must recompute `grid-template-columns` for the columns
   still in the flow. Until then, every drawer layout silently mis-sizes its
   remaining slots.

3. **Portal shell is shared, not duplicated.** Chrome-level UI (drawer,
   future overlays, scroll behaviors) must live in
   `packages/ui/src/portal/portal-shell.css` with values driven by
   `--*` tokens. Neither `css-generator.ts` nor the LM canvas are allowed
   to reimplement these visuals — each duplication becomes a divergence.
   Every shell rule must be reachable by exactly one class name from
   exactly one file. Contract-level defense: `css-generator.test.ts`
   ownership tests that assert no drawer visuals leak into generated CSS.

---

## Review cadence

After each round of fixes, every entry that gets closed must ship with at
least one of: a `css-generator` unit test, an `Inspector` test, or a schema
validation rule. The log's job is not to grow — it's to shrink by turning
incidents into contracts.
