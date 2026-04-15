# WP-020: Layout Maker — Nested Slots & Slot Assignment

> Introduce the concept of **container slots** that hold other slots (nested-slots). Unlocks per-page-type slot composition — theme pages put `theme-blocks` inside `content`, blog pages put `article`/`related-posts`, etc.

**Status:** PLANNING
**Priority:** P1 — Important (enables other page types; unblocks blog/docs rollout)
**Prerequisites:** WP-019 ✅ (Layout Maker), WP-014 ✅ (Multi-block slots)
**Milestone/Wave:** Portal page-type expansion
**Estimated effort:** 8-12 hours across 6 phases
**Created:** 2026-04-15
**Completed:** —

---

## Problem Statement

Today the portal's `content` slot is **hardcoded to hold theme blocks**. The theme-page renderer renders template positions + theme block_fills directly into the `content` slot. This works for themes but **blocks other page types** — a blog page that wants an article + related posts in its main area can't, because `content` is semantically "theme blocks".

The recent refactor (commit `640faa93`) split this at the **renderer level**: theme-page injects a `theme-blocks` sub-slot inside `content` at runtime. That was a minimum viable fix — `content` is now architecturally a universal container, and `theme-blocks` is a distinct slot.

But the **Layout Maker tooling and the layout data model don't know about this**. Layout Maker treats `content` as a regular slot with inner/outer params. Studio's Slot Assignments panel shows `content` with the hardcoded hint "Template blocks per theme". The layout JSON in the DB has no concept of "this slot contains these slots". So admins can't control the nesting from the UI, and future page types can't be configured without code changes.

This WP closes the gap: the layout data model and Layout Maker UI treat **container slots** (hold other slots) and **leaf slots** (hold blocks) as first-class concepts. Studio's Slot Assignments panel reads this model from the layout row — container cards become informational wrappers that list their nested slots; leaf cards remain the editable surface for block overrides. The hardcoded "Template blocks per theme" hint on `content` moves onto `theme-blocks` (or is driven by a description from the layout).

End state: an admin opens a layout in Layout Maker, assigns `theme-blocks` inside `content`, configures `theme-blocks`'s gap/padding/max-width, saves. Then in Studio, that admin edits a page using this layout — they see `content` as a container card showing its nested slots, and `theme-blocks` as a separate editable card. The portal renders without any runtime hacks.

---

## Solution Overview

### Architecture

```
Layout Maker yaml (source of truth)
  ├── slots:
  │    content:       (container — has nested-slots)
  │      nested-slots: [theme-blocks]
  │    theme-blocks:  (leaf — has visual params, holds blocks)
  │      gap: --spacing-xl
  │      padding-x: --spacing-xl
  │      max-width: 615px
  │    header, footer, sidebar-left, sidebar-right  (leaf)
  │
  ▼
html-generator  →  <main data-slot="content"><div data-slot="theme-blocks"></div></main>
css-generator   →  [data-slot="theme-blocks"] > .slot-inner { gap, padding, mw, ... }
  │
  ▼
DB layouts row:  html + css + slot_config (with nested-slots key where applicable)
  │
  ▼
Portal renderer  →  resolveSlots fills `theme-blocks` naturally. No runtime injection.
```

### Key Decisions

| Decision | Chosen | Why | Alternatives considered |
|----------|--------|-----|----------------------|
| Field name | `nested-slots` | User choice; explicit about semantics | `children` (ambiguous with React), `contains` (less specific), `inner-slots` |
| New-slot creation UI | Modal | User choice; isolates the form, keeps inspector clean | Inline accordion in Inspector (would crowd it) |
| Nesting cardinality | Array (1..N children per container) | User confirmed theme-blocks + related-themes may coexist | Single child (too restrictive) |
| Where `nested-slots` lives | Inside `slot_config[name]` on the layout row | Reuses existing DB column; no schema migration | New `slot_nesting` field (more verbose, yet-another-field) |
| Studio Slot Assignments | **Reads from layout row** (`slot_config[name]['nested-slots']`) — no hardcoded slot-specific hints | Single source of truth — what Layout Maker declares, Studio displays | Keeping the hardcoded `"Template blocks per theme"` branch (drift risk) |
| Container cards in Studio | **Informational only** — list nested slot names, no block overrides | Container doesn't hold blocks by definition; editing happens on its leaves | Make container also editable (semantic overlap, confusing UX) |
| Regex-based runtime injection in portal | **Removed in Phase 3** | No longer needed once layouts emit nested HTML | Keep as belt-and-braces (dead code) |

### Slot Type Semantics

| Type | How identified | Visual params | Can hold |
|------|----------------|---------------|----------|
| **Container** | `slot_config[name]['nested-slots']` exists and is non-empty | Hidden in Inspector (layout-level only: min-height, grid placement) | Other slots (leaf or container) |
| **Leaf** | No `nested-slots` key | Full: gap, padding-x/top/bottom, align, max-width, min-height, margin-top, background | Blocks (via `layout_slots` overrides or category defaults) |

A slot can be promoted/demoted in place — adding `nested-slots` makes it a container; removing makes it a leaf again.

---

## Domain Impact

| Domain | Impact | Key Invariants | Traps to Watch |
|--------|--------|---------------|----------------|
| `infra-tooling` (Layout Maker lives here) | **Primary.** yaml schema + generators + React UI | Layout Maker is the source of truth for layout HTML/CSS; DB is downstream | css-generator emits per-slot rules via `Object.entries(config.slots)` — new slot types must plug in cleanly |
| `studio-core` | **Primary.** Slot Assignments panel in `apps/studio/src/pages/page-editor.tsx` reads `nested-slots` from the layout row; renders container vs leaf cards differently | Slot Assignments operates on `slots: string[]` derived from layout + GLOBAL_SLOTS. The list source must include container slots (info cards) **and** leaf slots (editable), deduped and ordered consistently with the layout | Currently the panel hardcodes `isContent` branch for the "Template blocks per theme" hint — that branch must be replaced by data-driven descriptions from the layout. Don't leave the old branch alive as fallback. |
| `app-portal` | **Secondary.** Remove runtime injection from `themes/[slug]/page.tsx` | `resolveSlots` is single-pass (no recursion) — nested slots only work if the outer is non-empty before resolveSlots runs; layout HTML from DB must already contain the nested structure | The injected-at-runtime regex in the current code is TEMPORARY. Removing it is the win; don't leave both paths. |
| `pkg-db` | **Low.** `slot_config` type may widen to include `nested-slots?: string[]` | `slot-registry.ts` SLOT_DEFINITIONS stays unchanged — theme-blocks is not a global slot, it's a layout-scoped slot | Don't add theme-blocks to SLOT_DEFINITIONS — that would force it to have category defaults like header/footer |

**Public API boundaries:**
- Layout Maker is internal tooling — no domain imports its source.
- `app-portal` imports from `@cmsmasters/db` (`GLOBAL_SLOT_NAMES`, `SLOT_TO_CATEGORY`) — unchanged.
- `studio-core` imports from `@cmsmasters/db` for GLOBAL_SLOTS; reads layout row via its existing API — no new cross-domain imports.
- `resolveSlots` in `apps/portal/lib/hooks.ts` — stays as-is.

**Cross-domain risks:**
- **Portal renderer simplification (Phase 3)** removes an HTML transform. If Phase 2's generator output is wrong, theme pages go blank. Verify Phase 2 end-to-end before Phase 3.
- **DB layout regeneration** required between Phase 2 and Phase 3. If admin has edits in DB that aren't in yaml, they'll be overwritten — document manual-merge step.
- **Studio render (Phase 5)** depends on DB already having the new layout shape from Phase 4. If Phase 5 lands before Phase 4 push, Studio falls back to old hardcoded behavior — non-breaking but wastes effort. Sequence matters.

---

## What This Changes

### New Files

```
tools/layout-maker/src/components/CreateSlotModal.tsx    # modal to create a new leaf slot
```

### Modified Files

```
tools/layout-maker/runtime/lib/config-schema.ts    # add nested-slots: string[].optional()
tools/layout-maker/runtime/lib/html-generator.ts   # if container, emit nested <div data-slot>s
tools/layout-maker/runtime/lib/css-generator.ts    # skip leaf rules for containers (min-height only)
tools/layout-maker/src/lib/types.ts                # SlotConfig + ExportPayload nested-slots field
tools/layout-maker/src/components/Inspector.tsx    # container-vs-leaf panel; Add Slot / Create Slot buttons
tools/layout-maker/src/components/Canvas.tsx       # visualize nested slot inside container (outlines)
tools/layout-maker/layouts/theme-page-layout.yaml  # reference: content contains theme-blocks
apps/portal/app/themes/[slug]/page.tsx             # remove runtime injection regex
apps/studio/src/pages/page-editor.tsx              # container/leaf card branching; read nested-slots from layout
content/db/layouts/theme-page-layout.json          # re-generated via Layout Maker, pushed to DB
```

### Manifest Updates

```
No domain boundary changes. New file (CreateSlotModal.tsx) stays inside
tools/layout-maker/ which is tracked at directory level under infra-tooling.
```

### Database Changes

```
None. `slot_config: jsonb` already accepts arbitrary per-slot keys.
  `nested-slots: string[]` is an additive key within slot_config[name].
No migration, no types regeneration needed.
```

---

## Implementation Phases

### Phase 0: RECON (0.5h)

**Goal:** Audit Layout Maker's current slot model. Confirm DB layout for scope=theme is the Layout-Maker-generated "the-new" version. Read infra-tooling skill.

**Tasks:**

0.1. Read `.claude/skills/domains/infra-tooling/SKILL.md` and `.claude/skills/domains/app-portal/SKILL.md`
0.2. Cat current layout-maker yaml source: `tools/layout-maker/layouts/theme-page-layout.yaml`
0.3. Pull current DB state: `npm run content:pull -- layouts` — confirm `the-new` layout is live
0.4. Grep for any other layouts that reference `data-slot="content"` to gauge regression surface
0.5. Identify all Layout Maker UI files that mention slot inspector (Inspector.tsx, Canvas.tsx, SlotToggles.tsx)
0.6. Report: which existing slots are used where; what the Inspector flow looks like; any unknowns

**Verification:** RECON report exists. No code written. No changes to yaml or DB.

---

### Phase 1: Schema + Generators (2-3h)

**Goal:** Layout Maker yaml supports `nested-slots`. html-generator emits nested DOM. css-generator treats containers correctly. yaml for theme-page-layout migrated to new shape.

**Tasks:**

1.1. **Extend yaml schema** — add `'nested-slots': z.array(z.string()).optional()` to `slotSchema` in `config-schema.ts`. Strict object, rejects unknown keys.
1.2. **Extend cross-field validation** — in `validateConfig`: for every entry in `nested-slots`, verify it references an existing `config.slots[name]`. Error otherwise.
1.3. **html-generator** — when emitting a column slot, if `slot['nested-slots']` exists, emit `<tag data-slot="X">` wrapping `<div data-slot="Y"></div>` per nested child. When emitting top/bottom slots same logic.
1.4. **css-generator** — when a slot has `nested-slots`, emit only role-level outer rules (min-height, sticky, background, margin-top). Skip the inner `[data-slot="X"] > .slot-inner` block (there is no .slot-inner child — there's a nested data-slot instead).
1.5. **Update `theme-page-layout.yaml`** — set `content.nested-slots: [theme-blocks]`; add `theme-blocks` leaf slot with visual params matching current behavior.
1.6. **Types** — update `tools/layout-maker/src/lib/types.ts` `SlotConfig` and `ExportPayload.slot_config[slot]` to include `'nested-slots'?: string[]`.

**Verification:**
```bash
# Schema validates
cd tools/layout-maker && npm run build         # tsc + vite build

# Round-trip: yaml → generated HTML/CSS matches expected
# Smoke-test with the existing layout file
npx tsx tests/generator.test.ts                # if exists; otherwise ad-hoc node script
```

**Expected diff**: `theme-page-layout.yaml` gains `theme-blocks` slot + `content.nested-slots`. Generator output for content column becomes `<main data-slot="content"><div data-slot="theme-blocks"></div></main>`.

---

### Phase 2: Layout Maker UI (2-3h)

**Goal:** Admin can mark any slot as a container, pick which existing leaves go inside, and create new leaf slots via modal — all reflected in yaml + generated HTML/CSS.

**Tasks:**

2.1. **Inspector — container vs leaf branching**
   - If selected slot has `nested-slots` array (non-empty): show **Container** panel:
     - Header: "Container — contains slots"
     - Chip list of current nested children (each with ✕ to remove)
     - `[+ Add slot]` dropdown listing *existing* leaf slots not yet nested anywhere
     - `[+ Create slot]` button — opens CreateSlotModal
     - Role-level params only (min-height, background if applicable)
   - Else: current leaf inspector (gap, padding, max-width, align, etc.)
   - "Convert to container" button on leaf inspector (and vice versa for empty containers)

2.2. **CreateSlotModal** (new component) — form: slot name (slugified lowercase-hyphen), visual params (prefilled sensible defaults). On submit: append to `config.slots`, auto-add to the currently-selected container's `nested-slots`, close.

2.3. **Canvas visualization** — when hovering or selecting a container, outline the nested data-slot rectangle(s) inside the container's box (dashed border, label "nested").

2.4. **Validation** — Inspector blocks saving if a nested-slot reference is broken (slot was deleted elsewhere). Toast error.

2.5. **Keyboard/UX** — ESC closes modal; Enter submits; autofocus name input.

**Verification:**
```bash
cd tools/layout-maker && npm run dev
# Manual:
# 1. Open theme-page-layout
# 2. Click content → see container panel with "theme-blocks" chip
# 3. Click theme-blocks → see leaf inspector with gap/padding/etc.
# 4. Create new slot via modal → appears in content's nested list
# 5. Save → yaml updated correctly; regenerated HTML has new nested data-slot
```

---

### Phase 3: Portal renderer cleanup (0.5h)

**Goal:** Remove the runtime regex injection. Theme page rendering flows entirely through `resolveSlots` on layout HTML that already contains the nested structure.

**Tasks:**

3.1. **Delete the `cleanLayout.replace(...)` block** in `apps/portal/app/themes/[slug]/page.tsx` (Phase 1 of WP-020 or whenever layout HTML is guaranteed nested in the DB).
3.2. Keep the `'theme-blocks': <div class="slot-inner">${themeBlocksHTML}</div>` slot value — now it's resolved from the actual `<div data-slot="theme-blocks">` in layout HTML (from Phase 1 generator output).
3.3. **Fallback path** (when `layoutPage?.html` is absent): leave the hand-assembled structure as-is — it still wraps content+theme-blocks correctly.
3.4. Run typecheck + lint.

**Verification:**
```bash
npm run arch-test                              # full arch tests
cd apps/portal && npx tsc --noEmit             # typecheck passes
cd apps/portal && npm run lint                 # zero warnings
```

---

### Phase 4: DB migration + visual QA (1-1.5h)

**Goal:** Re-generate theme-page-layout via Layout Maker, push to DB, revalidate, verify theme pages render identically.

**Tasks:**

4.1. **Run Layout Maker**: regenerate theme-page-layout.yaml → HTML + CSS → export as JSON.
4.2. **Diff** the regenerated `content/db/layouts/theme-page-layout.json` vs live DB. Expect: `html` now contains `<main data-slot="content"><div data-slot="theme-blocks"></div></main>`; `slot_config.content.nested-slots = ["theme-blocks"]`; `slot_config.theme-blocks` has gap/padding/max-width.
4.3. **Push**: `npm run content:push -- layouts`.
4.4. **Revalidate**: POST `/api/revalidate` with `{"tags":["themes","layouts"]}`.
4.5. **Visual QA**: screenshot a deployed theme page (e.g. `/themes/456456`) via Playwright at desktop (1440), tablet (1024), mobile (375). Compare against pre-WP-020 screenshot. Expect: no visual diff.
4.6. **Regression scan**: check for other layouts with scope=theme (should be only one). Check for composed pages using the layout shell.

**Verification:**
```bash
curl -sL https://portal.cmsmasters.studio/themes/456456 | grep -o 'data-slot="[^"]*"' | sort -u
# Expect: content, footer, header, sidebar-left, sidebar-right, theme-blocks
```

---

### Phase 5: Studio Slot Assignments panel (2-3h)

**Goal:** Studio's `page-editor.tsx` Slot Assignments panel reads `nested-slots` from the layout row and renders container vs leaf cards differently. The hardcoded `"Template blocks per theme"` hint on `content` is removed — replaced by data-driven behaviour keyed off the layout.

**Tasks:**

5.1. **Read layout shape** — within the page-editor data load, ensure the layout row's `slot_config` is available (likely already is; confirm in Phase 0/5 audit). Derive two maps:
   - `containerSlots: Record<string, string[]>` — from `slot_config[name]['nested-slots']`
   - `leafSlots: string[]` — slots with no `nested-slots` key (all other slots in the layout)

5.2. **Expand the `slots` list** — the panel currently iterates `slots` (leaf-only today, derived from GLOBAL_SLOTS + layout custom). Expand the list to include container slots too, preserving the layout's declared order. A leaf nested inside a container still appears as its own card — nesting is informational in the UI, not a grouping.

5.3. **Container card** — when `containerSlots[slot]` exists:
   - Render the slot name + tag "container" (visual distinction: muted background, different icon or border)
   - Below the header: inline list of nested slot names as small chips → `theme-blocks`, `related-themes`, …
   - **No "Add block" button**, **no per-card `Gap` input** (containers don't hold blocks)
   - Description: from layout (`slot_config[slot].description` if we add that) or a generic "Contains: {list}"

5.4. **Leaf card** — existing behaviour for non-container slots:
   - Block override controls (add/remove/reorder blocks)
   - Gap input (when applicable)
   - Description: for global slots (header/footer/sidebars) keep the "Custom slot" / meta behaviour. For layout-scoped leaves (e.g. `theme-blocks`): description = `"Template blocks per theme"` on `theme-blocks` (or generic "Custom slot" until we add a description field).

5.5. **Remove hardcoded `isContent` branch** — the current line in page-editor.tsx:
   ```ts
   {isContent ? 'Template blocks per theme' : isMeta ? 'Resolved from theme.meta' : 'Custom slot'}
   ```
   Replace with a branch that checks: container → list-of-nested. leaf + isMeta → current meta message. leaf + `theme-blocks` (or a pattern) → "Template blocks per theme". leaf → "Custom slot". Actual string resolution TBD after Phase 0/5 audit — we want a rule that doesn't re-hardcode slot names.

5.6. **Regression check** — for composed pages (non-theme), which do not use `content`-as-container, the panel must render as today. Snapshot a composed page's editor view before/after.

**Verification:**
```bash
# Studio typecheck + lint
cd apps/studio && npx tsc --noEmit
cd apps/studio && npm run lint

# Manual
npx nx run studio:dev                # start Studio
# Open the theme that uses theme-page-layout → Slot Assignments panel:
#  - content card: container style, chip "theme-blocks", no block list
#  - theme-blocks card: leaf style, block override controls, hint "Template blocks per theme"
#  - header/footer/sidebars: unchanged
# Open a composed page: Slot Assignments unchanged from before WP-020
```

---

### Phase 6: Close (mandatory, always last) (0.5h)

**Goal:** Update docs, verify final state, close WP.

**Tasks:**

6.1. Read all phase logs (`logs/wp-020/phase-*-result.md`) — understand actual deviations.
6.2. Propose doc updates:
  - `.context/BRIEF.md` — mention container/leaf slot types under portal architecture
  - `.claude/skills/domains/app-portal/SKILL.md` — add trap about `resolveSlots` being single-pass; invariant that nested slots work because layout HTML already contains the outer
  - `.claude/skills/domains/studio-core/SKILL.md` — add invariant: Slot Assignments reads container-vs-leaf from the layout row; no slot-name hardcoding
  - `.claude/skills/domains/infra-tooling/SKILL.md` (if exists) or equivalent — document Layout Maker's nested-slots concept
  - Layout Maker CLAUDE.md — mention container vs leaf distinction
6.3. Brain approves doc plan.
6.4. CC executes doc updates.
6.5. Verify green:
  ```bash
  npm run arch-test
  cd tools/layout-maker && npm run build
  cd apps/studio && npx tsc --noEmit
  ```
6.6. Update this WP status → ✅ DONE.

**Files to update:**
- `.context/BRIEF.md`
- `.claude/skills/domains/app-portal/SKILL.md`
- `.claude/skills/domains/studio-core/SKILL.md`
- `tools/layout-maker/CLAUDE.md`
- `logs/wp-020/phase-0..6-result.md` (evidence)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Generator emits nested HTML but admin has hand-edited the DB layout (bypassing yaml) | Phase 4 push overwrites hand-edits | Phase 0 audits live DB vs yaml; Phase 4 diff step surfaces drift before push |
| `resolveSlots` regex fails to match nested empty `<div data-slot="theme-blocks"></div>` because of whitespace quirks in generator output | theme-blocks never filled → blank content area | Phase 2 end-of-phase check: curl local dev, grep for filled theme-blocks |
| Container CSS (min-height 600px) loses effect because content is no longer flex with slot-inner directly | theme page layout collapses | css-generator Phase 1.4 rule: containers keep display:flex; flex-direction:column so nested slot stretches |
| Runtime injection removed in Phase 3 before Phase 4 DB push completes → brief prod breakage | Theme pages blank during deploy window | **Phase 3 MUST land after Phase 4 DB push + revalidate**. Re-sequence if needed. |
| Layout Maker Inspector UI becomes crowded with two modes | Admin confusion | Phase 2 UX: clear visual distinction (color/icon) between container and leaf panels |
| Admin creates a circular nesting (slot A contains B contains A) | Validator catches infinite loop | Phase 1.2 cross-field validation rejects cycles |
| Studio panel removes hardcoded `isContent` branch but layout lacks the new `nested-slots` key for composed (non-theme) pages | Generic "Custom slot" label where theme pages used to say "Template blocks per theme" | Phase 5 logic: leaf + name matches `theme-blocks` pattern (or a description field if added) → correct hint. Composed pages unaffected because they don't use `content` as container at all. |
| Phase 5 lands before Phase 4 DB push completes | Studio shows stale container/leaf classification | Sequence: Phase 4 push + revalidate **before** Phase 5 UI change goes live. Phase 5 can be developed in parallel but merged after Phase 4. |

---

## Acceptance Criteria (Definition of Done)

- [ ] `tools/layout-maker/layouts/theme-page-layout.yaml` has `content.nested-slots: [theme-blocks]` and a `theme-blocks` leaf slot definition
- [ ] Layout Maker yaml schema accepts `nested-slots` and rejects cyclic/broken references
- [ ] html-generator emits `<main data-slot="content"><div data-slot="theme-blocks"></div></main>` for theme-page-layout
- [ ] css-generator emits `[data-slot="theme-blocks"] > .slot-inner { ... }` with visual params from yaml
- [ ] Layout Maker Inspector shows distinct Container vs Leaf panels
- [ ] "Add slot" dropdown and "Create slot" modal both functional, modal submits create a leaf + adds to container
- [ ] Theme page in prod renders with `<div data-slot="theme-blocks">` present in HTML source
- [ ] `apps/portal/app/themes/[slug]/page.tsx` no longer contains the `cleanLayout.replace(/.../, ...)` injection
- [ ] Visual parity: screenshot of `/themes/456456` post-WP matches pre-WP (pixel-level, desktop + tablet + mobile)
- [ ] Studio Slot Assignments panel renders `content` as a container card (info-only, with chip list of nested slots) and `theme-blocks` as a leaf card with block overrides
- [ ] Hardcoded `"Template blocks per theme"` hint on `content` (page-editor.tsx line ~975) removed; hint now appears on `theme-blocks`
- [ ] Composed (non-theme) pages' Slot Assignments panel unchanged vs before WP-020 (verified by screenshot)
- [ ] `npm run arch-test` passes with no regressions
- [ ] `cd tools/layout-maker && npm run build` passes
- [ ] `cd apps/studio && npx tsc --noEmit` passes
- [ ] All phases logged in `logs/wp-020/phase-*-result.md`
- [ ] Domain skills updated where contracts changed (app-portal, studio-core, infra-tooling)

---

## Dependencies

| Depends on | Status | Blocks |
|------------|--------|--------|
| WP-019 (Layout Maker) | ✅ DONE | base tool exists |
| WP-014 (Multi-block slots) | ✅ DONE | `layout_slots` accepts `string[]` per slot |
| commit 640faa93 (theme-blocks runtime injection) | ✅ landed | baseline for removal in Phase 3 |

---

## Notes

- Commit `640faa93` is the "Phase 0" of this architecture — it proved the nesting works end-to-end at the renderer level. This WP elevates it to a first-class concept in the tooling + data model + Studio UI.
- The `nested-slots` field name was chosen by the user over `children` to avoid confusion with React children semantics.
- Studio's container cards are **informational only** (list nested slot names; no block controls). Admins edit blocks on leaf cards. Rationale: a container by definition doesn't hold blocks — conflating the two would confuse the UX. If a user needs to override "what goes inside content", they do that by editing the leaves (`theme-blocks`, etc.).
- The Layout Maker runtime validator's existing special-case for `content` being "implicit" in grid columns (config-schema.ts line 111) should be revisited — with nested-slots formalized, `content` can become a first-class leaf-or-container slot in the slots dict like any other. Scope-check for Phase 1.
