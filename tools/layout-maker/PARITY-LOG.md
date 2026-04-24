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

_(none)_

## Status (as of Phase 7 close, 2026-04-24)

Open: **0 entries**. All Phase 2–Phase 6 entries resolved. The last Open
entry (grid-template-columns not pruning hidden/drawer sidebars) was
moved to Fixed in the Phase 4 cut chain with its css-generator contract
test (5 cases). Trust reforge closes with no outstanding lies.

---

## Fixed

### [tablet] `align` + `max-width` on container slots are silently ignored

- **Layout / scope:** `layouts/2132.yaml` ("the-new") / `theme`
- **Breakpoint:** tablet (and any BP, actually — this was a schema-level issue)
- **Slot:** `content` (has `nested-slots: [theme-blocks]`, so it is a container)
- **Field:** `align: center`, `max-width: 615px`, `padding: --spacing-xl`, `padding-x: 0`
- **LM claims (before fix):** Inspector exposed Content align / Inner max-width / padding controls on container slots — user could set them, they were written to `config.slots.content` and visible in YAML.
- **LM canvas (before fix):** mostly matched Inspector — showed the fixed-width centered frame on the canvas for that slot.
- **Portal rendered (before fix):** ignored them. `[data-slot="content"]` has no `.slot-inner` child (its child is `<div data-slot="theme-blocks">`), so the generator's per-slot inner-rule emit skipped containers (still at `css-generator.ts:261-262`: `if (slot['nested-slots'] && length > 0) continue`). But `--sl-content-mw: 615px` style vars were still emitted into `:root` — dead code that gave the Inspector a false reason to surface inner fields.
- **Where the lie lived:** **generator + inspector**. Two halves: (a) generator emitted inner-slot vars for containers that no rule consumed; (b) Inspector branched on a scattered 17-site gating layer (container / sidebar / position / is-global / sticky / etc.) that hid most inner controls on containers but not all of them — and every new field added risked reopening the lie.
- **Fix (Phase 4, two cuts):**
  1. **Cut A (`775917cc`) — generator side:** `css-generator.ts` var-emit loop now honors the same `nested-slots` skip condition as the inner-rule selector loop. Container slots emit zero `--sl-<name>-{mw,al,px,pt,pb,gap}` vars.
  2. **Cut B (`<phase-4 Cut B SHA>`) — inspector side:** 17 scattered gating sites in `Inspector.tsx` routed through a single `canShow(fieldId, traits, scope)` dispatcher in `src/lib/inspector-capabilities.ts`. Every container trait hard-rejects inner-params. New sections can't accidentally bypass — every gate decision lives in one file with a table test.
- **Status:** `fixed <Cut A 775917cc + Cut B phase-4>`
- **Contract/test added:**
  - `runtime/lib/css-generator.test.ts` — "Phase 4: container slots never reach the leaf inner-params pipeline" describe block — 3 cases asserting zero inner-rule selector AND zero inner vars for containers, plus regression guard that adjacent leaves still emit inner rules.
  - `src/lib/inspector-capabilities.test.ts` — "container PARITY lock" test asserts `canShow` hard-rejects max-width / align / padding-* / gap / min-height / margin-top / border-* for containers at EVERY BP (desktop / tablet / mobile).
  - `src/components/Inspector.test.tsx` — "container slot: hides inner-params" and "container slot: hides inner-params across EVERY BP" — integration tests asserting the rendered DOM has zero "Slot Parameters" / "Slot Area" / "Inner max-width" / "Content align" / "Padding ←→" elements on containers.

### [tablet] Peek / tab trigger pill shows a close (X) sprite alongside the chevron at rest

- **Layout / scope:** `layouts/2132.yaml` (tablet `drawer-trigger: tab`, right sidebar `drawer-trigger-label: theme details`) / `theme`
- **Breakpoint:** tablet (and mobile if peek/tab is used there; generally: any BP where `drawer-trigger` is `peek` or `tab`)
- **Slot:** drawer trigger buttons inside `.drawer-shell`
- **Field:** `grid.{bp}.drawer-trigger: peek | tab`
- **LM claims:** LM canvas (`DrawerPreview.tsx:164-179`) shows the peek/tab pill with ONE icon — only the slot's `drawer-trigger-icon` (chevron by default) inside the circular icon-wrap. Inspector exposes no close-icon field. Canvas is correct.
- **Portal rendered (before fix):** the pill's 26×26 flex icon-wrap rendered BOTH a `>` and an `×` side-by-side. The 13×13 chev and 13×13 close sprite each took half the wrap, so they sat together in the circle — the X was never meant to exist on peek/tab (it belongs to the FAB chev↔close opacity swap).
- **Where the lie lived:** **html-generator + shell**. `renderTrigger` (`html-generator.ts:112-117`) emitted both `.drawer-trigger__icon--chev` AND `.drawer-trigger__icon--close` sprites for **every** variant. Its comment described a shell-driven opacity swap that only exists for FAB — `portal-shell.css:381-389` scopes every close-sprite rule to `.drawer-trigger--fab` alone. Peek / tab / hamburger had zero rules hiding `__icon--close`, so opacity defaulted to 1; and their icon-wrap uses `display: flex` (not grid like FAB), so the two sprites rendered side-by-side instead of stacking.
- **Root cause:** FAB is the only variant that needs a close sprite — peek/tab/hamburger hide themselves when any drawer is open (`portal-shell.css:477-481`), so they have no "open" state to paint. The generator should not emit a sprite the variant's shell rules never consume, and the shell should defensively hide any stray close-sprite that reaches a non-FAB trigger.
- **Repro (before fix):**
  1. Open `layouts/2132.yaml` in LM; confirm `grid.tablet.drawer-trigger: tab`.
  2. Export the layout, upsert to Supabase, revalidate the `theme-*` tag.
  3. Open the theme page in Portal at tablet width (~768–1439 px).
  4. Observe the right-side "THEME DETAILS" pill — the circular icon area paints `>` and `×` together.
- **Fix:**
  1. **Generator:** `renderTrigger` (`html-generator.ts`) now guards the close-sprite `<svg>` behind `if (variant === 'fab')`. Non-fab triggers emit only the chev sprite. Comment updated to state the chev↔close swap is FAB-specific.
  2. **Shell (belt-and-braces):** `portal-shell.css` adds `:is(.drawer-trigger--peek, .drawer-trigger--tab, .drawer-trigger--hamburger) .drawer-trigger__icon--close { display: none }` so a stale exported HTML (pre-fix) still can't paint the X — the sprite is stripped at render time if it sneaks in.
- **Status:** `fixed <this commit>`
- **Contract/test:** `html-generator.test.ts` — three new cases:
  - `emits a chev sprite inside every trigger button` (4 chev sprites for peek × 2 sides + fab × 2 sides).
  - `emits __icon--close only for FAB triggers (not peek / tab / hamburger)` — asserts fab buttons contain both sprites and peek buttons contain only chev.
  - `hamburger and tab triggers do not emit a close sprite either` — negative case for the two remaining non-fab variants.
- **Follow-up / not in scope:** LM canvas `DrawerPreview.tsx` renders a single chev even for FAB — so the canvas does not paint the FAB open-state X. Separate divergence (canvas vs Portal on FAB open state); not this fix's scope.

### [all-bp] Slot container-type enables per-slot responsive variants (WP-024 / ADR-025)

- **Layout / scope:** all layouts / all scopes — generic `.slot-inner` rule
- **Breakpoint:** all
- **Slot:** every leaf slot (container slots unaffected)
- **Field:** `container-type` + `container-name` on the generic `[data-slot] > .slot-inner` rule
- **LM claims:** N/A — this is an additive contract, not a lie
- **Portal renders:** N/A — see below
- **Context:** WP-024 infrastructure phase. ADR-025 establishes that responsive blocks author `@container slot (max-width: …)` rules in their own CSS; for those rules to evaluate, each leaf slot must expose a containment context via `container-type: inline-size`. The `container-name: slot` makes the containment explicit so block CSS can write `@container slot (…)` unambiguously.
- **Where the lie COULD have lived (pre-emptive):** without this, `@container slot (…)` rules in block CSS would silently have no effect — the Inspector and Canvas would say nothing, but Portal would render the base-variant DOM forever regardless of slot width. Adding this declaration is non-destructive (size containment on the block axis only — does NOT affect layout without `@container` queries).
- **Fix:** Added `container-type: inline-size` and `container-name: slot` to the generic `[data-slot] > .slot-inner` rule in `css-generator.ts` (line 246). Container slots remain unaffected — they don't hold `.slot-inner`.
- **Status:** `fixed <this commit>`
- **Contract/test:** `css-generator.test.ts` "WP-024: slot container-type (ADR-025)" describe block — two tests:
  1. generic rule emits both properties alongside the five pre-existing declarations
  2. container-slot outer rules do NOT emit container-type / container-name
- **Related:** ADR-025 (Responsive Blocks), WP-024 (Responsive Blocks — Foundation), `packages/ui/src/theme/tokens.responsive.css` (this phase), `apps/portal/app/_components/block-renderer.tsx` variant wrappers (Phase 3).

### [mobile] Push architecture rework — one-tap FAB, scroll lock, swipe close

- **Layout / scope:** `layouts/2132.yaml` (mobile `sidebars: push`, `drawer-trigger: fab`) / `theme`
- **Breakpoint:** mobile (375px)
- **Symptoms:** (a) FAB trigger grew into a pill on first tap (two-step arm→open flow) instead of opening on one tap; (b) vertical swipes on the opened sidebar scrolled the page underneath instead of the sidebar; (c) horizontal swipe-to-close never fired because it was intercepted by scroll chaining or body overflow: hidden; (d) sidebar width read as full-viewport (100%) because the live shell's `--drawer-push-width` token still defaulted to 100% and hadn't Portal-redeployed yet.
- **Where the lie lived:** **shell JS behavior + shell CSS scroll lock + token default**. Four issues in one system: (1) the FAB arm-then-open flow in `portal-shell.js` was specific to the standalone mockup's UX exploration, not what users expected; (2) `body.drawer-is-open { overflow: hidden }` is known-insufficient on iOS Safari (momentum / rubber-band bleed through, scroll position jumps); (3) the touch-based swipe handler didn't use velocity — only distance — so fast swipes often missed; (4) the shell's `--drawer-push-width` default of `100%` made push look like a modal overlay, not a push.
- **Fixes:**
  1. **One-tap FAB** — removed the armed-then-open flow and all `body.drawer-armed-{side}` CSS rules. Every trigger variant (peek, hamburger, tab, fab) now opens on click and toggles on same-side re-click. `portal-shell.js` simplified; LM canvas mirror updated to match.
  2. **Vaul-style scroll lock** — replaced the CSS `body.drawer-is-open { overflow: hidden }` rule with JS-managed `body { position: fixed; top: -scrollY }` on open, restored with `window.scrollTo(saved)` on close. This is the only mechanism that actually stops iOS momentum and preserves scroll position through the open/close cycle.
  3. **Pointer-based swipe with velocity** — replaced touchstart/end with pointerdown/up. Close when `|dx| > |dy|` AND (`|dx| > 25% of push-width` OR velocity `> 0.35 px/ms`). Matches Vaul's thresholds. Sidebar's `touch-action: pan-y` (from css-generator) keeps horizontal gestures un-captured so they reach the stage handler.
  4. **Push-width override in layout CSS** — css-generator now emits `:root { --drawer-push-width: var(--drawer-panel-width-mobile) }` inside the push @media block. Layout CSS overrides shell default, so the ~300px fix lands on the next layout re-export without needing a Portal redeploy.
- **Architecture decision (researched):** kept the body-margin push (as opposed to the Vaul `transform: translate3d` on a `.push-track` wrapper pattern) because sidebars are DOM-nested inside `.layout-frame > .layout-grid` and restructuring the DOM so sidebars could be siblings of a track wrapper would require html-generator changes that break block JS's single-instance `document.querySelector`. Body margin reaches the same visual outcome (fixed sidebar stays viewport-anchored because body margin doesn't create a containing block for `position: fixed`) with less DOM churn. Documented in the PARITY log so future work reconsidering the swap to transform-based animation has the context.
- **Status:** `fixed <this commit>`
- **Contract/test:** existing `css-generator.test.ts` "push sidebar is offscreen at rest via --drawer-open-{side}" covers the sidebar transform + width + cascade resets. No unit test for the JS controller — trust but verify via the live page at mobile viewport.

### [mobile] Push sidebar paints ABOVE content at rest — sidebar covers header region

- **Layout / scope:** `layouts/2132.yaml` (mobile `sidebars: push`) / `theme`
- **Breakpoint:** mobile (any push BP)
- **Slot:** `sidebar-right` / `sidebar-left` (any push sidebar)
- **Field:** sidebar rest-state visibility
- **LM claims:** Inspector + Canvas show content at rest on mobile; sidebar only appears when drawer is triggered.
- **Portal rendered (before first fix):** sidebar painted above content in the theme region because `.layout-frame { position: relative; z-index: 2 }` created a stacking context containing the sidebar — positioned descendants always paint above non-positioned siblings in a stacking context.
- **First fix (insufficient):** Moved the stacking context off `.layout-frame` and onto each in-flow slot (`.layout-grid > [data-slot="content"] { position: relative; z-index: 2; bg }`). This correctly layered content above sidebar WITHIN the theme area. But the sidebar is `position: fixed` + `width: 100%` = it fills the ENTIRE viewport, and the page header (rendered by the Next.js page template OUTSIDE `.layout-frame`) has no z-index or bg. Result: user saw sidebar content where the header should be.
- **Second fix (final):** Keep the push sidebar OFFSCREEN at rest and slide it in on open. Matches the iOS pattern in `Mobile Drawer _standalone_.html`. The sidebar emits `transform: translateX(calc(var(--drawer-open-{side}, 1) * {closed}%))` — same `--drawer-open-{side}` variable drawer mode uses, flipped by `body.drawer-is-open-{side}`. At rest: sidebar fully off-canvas (clipped by `html { overflow-x: hidden }`). On open: sidebar slides to `translateX(0)` while body's `margin-inline` slides the rest of the page by `--drawer-push-width`. Also changed `--drawer-push-width` default from `100%` to `var(--drawer-panel-width-mobile)` (300px) so a sliver of content stays visible as a tap-to-close affordance, matching the reference.
- **Where the lie lived:** **generator + shell token**. Full-viewport sidebar + in-flow stacking couldn't reach non-theme page chrome. Structural issue — sidebar must be invisible at rest, not "covered" by content.
- **Status:** `fixed <this commit>`
- **Contract/test:**
  - `css-generator.test.ts` "emits body margin + html overflow-clip + backdrop-hide inside the @media" — asserts NO in-flow slot gets `z-index: var(--drawer-z-push-frame)` and `html { overflow-x: hidden }` is present.
  - `css-generator.test.ts` "push sidebar is offscreen at rest via --drawer-open-{side}" — asserts the sidebar transform uses the shared `--drawer-open-{side}` formula and a transform transition is present.

### [mobile] Push mode moves theme frame but not header

- **Layout / scope:** `layouts/2132.yaml` (mobile `sidebars: push`) on the theme scope / header lives in the `header` scope
- **Breakpoint:** mobile (any push BP)
- **Slot:** `.layout-frame` (theme) vs `<header>` (header layout)
- **Field:** push animation target
- **LM claims:** canvas shows the whole page sliding aside on push.
- **Portal rendered (before fix):** only the theme's `.layout-frame` got `margin-inline` when `body.drawer-is-open-right` fired. The header lived in a separate `layout-frame` (scope: header) that never received the margin, so the header stayed pinned while content slid. Visually: half the page moves, half stays — nothing like the iOS push-drawer pattern the user asked for.
- **Where the lie lived:** **generator**. Push margin rules targeted `.layout-frame` — but there are multiple frames on every page (header, theme, footer). Each layout owns its own frame; generator for the theme layout couldn't reach the header frame.
- **Fix:** Move push margin from `.layout-frame` to `body`. `body.drawer-is-open-{side} { margin-inline: ... }` shifts EVERY flow descendant (header + theme + footer alike, since they're all siblings under `<body>`). `position: fixed` sidebars stay anchored to the viewport because body's margin does NOT create a containing block for fixed descendants. Transition also moves to `body`.
- **Status:** `fixed <this commit>`
- **Contract/test:** `css-generator.test.ts` "emits body margin + in-flow stacking + ..." — asserts `body.drawer-is-open-left { margin-left: var(--drawer-push-width) }` and NOT `body.drawer-is-open-left .layout-frame { ... }`. The "drawer@tablet + push@mobile" test was also updated to check the new body-level selector per BP.

### [tablet] Trigger variant stamps as FAB even when YAML says TAB

- **Layout / scope:** `layouts/2132.yaml` (tablet `drawer-trigger: tab`, mobile `drawer-trigger: fab`) / `theme`
- **Breakpoint:** tablet (generally: any BP whose variant wasn't the "last" one declared across the layout)
- **Slot:** drawer trigger buttons inside `.drawer-shell`
- **Field:** `grid.{bp}.drawer-trigger`
- **LM claims:** Inspector showed the trigger variant per BP — tablet row "tab", mobile row "fab".
- **LM canvas:** already correct — DrawerPreview stamps only the currently active variant class per the selected BP.
- **Portal rendered (before fix):** tablet showed the FAB (corner circle), not the vertical peek/tab pill the YAML asked for.
- **Where the lie lived:** **html-generator + css-generator**. html-generator stamped EVERY variant class used across all BPs on a SINGLE button (`drawer-trigger--tab drawer-trigger--fab drawer-trigger--left`). Shell defined `.drawer-trigger--peek/hamburger/fab` rules at equal specificity; with both `--fab` and `--tab` on the same button, source order in `portal-shell.css` picked fab as the winner. css-generator's per-BP `:not()`-based hide rule couldn't recover — when the button carried both classes, `:not(.drawer-trigger--tab)` was false and the rule never hid the fab styles.
- **Fix:** ONE button per (variant × side) — each button carries exactly ONE variant class. css-generator at each @media emits a plain `.drawer-trigger--{v} { display: none }` for the non-active variants; the active variant's button stays visible and clickable. Armed state (FAB-only) moved from a trigger class (`.drawer-trigger--is-armed`) to a body class (`body.drawer-armed-{side}`) so the controller doesn't have to guess which variant button is currently live at the active viewport.
- **Status:** `fixed <this commit>`
- **Contract/test:**
  - `html-generator.test.ts` — "emits one button per (variant × side) — each with exactly ONE variant class" + "emits exactly one button per side when only one variant is used"
  - `css-generator.test.ts` (new `trigger variant is per-BP` describe) — each @media hides non-active variants via plain selector; no `:not()` compounds remain anywhere in the output.

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
