# WP-024: Responsive Blocks — Foundation

> Infrastructure for responsive block authoring: `variants` DB column, renderer support, slot container-type, responsive tokens scaffold. No UI.

**Status:** ✅ DONE
**Priority:** P0 — Critical path (unblocks WP-025/026/027/028/029)
**Prerequisites:** None
**Milestone/Wave:** Responsive Blocks (ADR-025)
**Estimated effort:** 6–9 hours across 5 phases
**Created:** 2026-04-22
**Completed:** 2026-04-22

---

## Problem Statement

Blocks today are authored for desktop only. On tablet and mobile they look oversized (paddings sized for 1440px, multi-column grids that don't collapse, display type that overflows). Simple blocks need visual tuning per breakpoint; complex blocks need structural changes. ADR-025 establishes the model: `@container` rules inside block CSS react to slot container width for 70% of cases, and inlined named **variants** (revealed by `@container` CSS) cover the remaining structural cases.

This workplan delivers the **infrastructure only** — the plumbing that lets subsequent WPs build authoring UI on top. After this WP, authors still can't create adaptive blocks easily, but every moving part needed downstream exists, is tested, and is backwards-compatible.

Why now: unblocks WP-025/026/027/028. No migration of existing blocks in scope — they keep working unchanged.

---

## Solution Overview

### Architecture

```
  Studio / tools/block-forge              Portal (Next.js SSG+ISR)
  (future WPs — not this one)
         │                                      │
         │ block { html, css, js,              │
         │   variants: { mobile, tablet } }    │
         ▼                                      ▼
   ┌───────────────┐                   ┌────────────────────┐
   │ Supabase      │                   │ BlockRenderer RSC  │
   │ blocks table  │ ───────────────▶  │ renderBlock() util │
   │ + variants    │                   │                    │
   │   JSONB col   │                   │ inlines variants:  │
   └───────────────┘                   │ <div data-variant= │
                                       │  "base">…</div>    │
                                       │ <div data-variant= │
                                       │  "mobile" hidden>  │
                                       │   …</div>          │
                                       └────────┬───────────┘
                                                │
                                                ▼
                               ┌─────────────────────────────┐
                               │ Layout CSS (LM-generated)   │
                               │ [data-slot] > .slot-inner { │
                               │   container-type:inline-size│
                               │   container-name: slot      │
                               │ }                           │
                               └────────┬────────────────────┘
                                        │
                                        ▼
                               ┌─────────────────────────────┐
                               │ Block's own CSS             │
                               │ @container slot (max-width: │
                               │   480px) {                  │
                               │   [data-variant="base"]     │
                               │     { display: none }       │
                               │   [data-variant="mobile"]   │
                               │     { display: block }      │
                               │ }                           │
                               └─────────────────────────────┘

  + packages/ui/src/theme/tokens.responsive.css (shared clamp() rhythm)
    imported alongside tokens.css in portal globals.
```

### Key Decisions

| Decision | Chosen | Why | Alternatives considered |
|---|---|---|---|
| Variants shape | JSONB column `variants: { [name]: { html, css } } \| null` | Additive, nullable, backwards-compatible, flexible for new BPs | Multi-row (one block per BP); separate `block_variants` table — both break current `block_fills` model |
| Variant selection | Server-inlined; revealed by `@container` CSS | SSG/ISR-compatible; zero client JS; no hydration CLS | Client-side JS switcher; server-side UA sniffing — both break SSG or introduce flicker |
| Slot container-type | On `.slot-inner` (leaf slots only), via layout CSS generator | Every block inside a leaf slot gets width awareness; container slots (nested-slots) don't hold blocks | On `[data-slot]` directly — conflicts with grid child sizing; on block root — requires touching every block |
| Container name | `slot` (global) | Block CSS can write `@container slot (max-width: …)` unambiguously | Unnamed `@container` — works, but named is explicit and future-proof |
| Responsive tokens | New file `tokens.responsive.css`, hand-maintained | Does not disturb Figma-sync pipeline writing to `tokens.css` | Merge into `tokens.css` — breaks `/sync-tokens` invariant |
| Migration strategy | Additive only — existing blocks render identically | Zero-risk rollout; opt-in per block downstream | Big-bang migration — unnecessary risk |

---

## Domain Impact

| Domain | Impact | Key Invariants | Traps to Watch |
|---|---|---|---|
| **pkg-db** | New column on `blocks` table; `types.ts` regenerated | types.ts is auto-generated; JSON cols typed via branded types | Running `supabase gen types` overwrites types.ts — must also add branded `BlockVariants` type alongside |
| **pkg-validators** | `createBlockSchema` + `updateBlockSchema` gain optional `variants` field | Validators are the only write-path check; DB has no runtime validation | Default value must be `undefined` (not `{}`) to keep null semantics |
| **app-portal** | `BlockRenderer` RSC + `renderBlock()` util inline variants when present | Block CSS scoping (`.block-{slug}`); hook resolution is build-time | Two render paths must stay in sync (RSC and string helper). `stripGlobalPageRules` must not nuke `@container` rules |
| **pkg-ui** | New file `tokens.responsive.css`; NOT added to Figma sync | `tokens.css` auto-generated and must stay so; CC does not use these tokens | Portal globals must import the new file; Studio preview iframes already use `?raw` — update paths |
| **infra-tooling** (layout-maker) | `css-generator.ts` emits `container-type: inline-size; container-name: slot` on `.slot-inner` generic rule | PARITY-LOG discipline: any css-generator change needs a contract test | `@layer` ordering and overriding rules that reset `container-type` |

**Public API boundaries:**
- `packages/db` public entrypoint (`index.ts`) — may export `BlockVariants` type if consumers need it
- `packages/validators` public entrypoint — exports updated schemas and `CreateBlockPayload` / `UpdateBlockPayload` types
- `packages/ui` — new token file is a sibling of `tokens.css`; consumers opt-in via explicit import
- `apps/portal/app/_components/block-renderer.tsx` — consumer-facing signature gains optional `variants` prop
- `apps/portal/lib/hooks.ts` — `renderBlock()` gains optional `variants` parameter

**Cross-domain risks:**
- Changing `types.ts` affects every consumer of `@cmsmasters/db` (studio, portal, api, dashboard, admin, validators) — **additive only; no breaking changes**
- Changing `BlockRenderer` signature (optional param) requires updating both call sites in `app/[[...slug]]/page.tsx`
- Changing `css-generator.ts` affects every published layout — verified via PARITY-LOG + contract test; no runtime behavior change for blocks without `@container` rules
- `renderBlock()` is called during hook resolution (`resolveSlots`); must preserve exact current output shape for non-variant blocks

---

## What This Changes

### New Files

```
supabase/migrations/
  016_blocks_variants.sql             -- ALTER TABLE blocks ADD COLUMN variants jsonb

packages/ui/src/theme/
  tokens.responsive.css               -- shared clamp() rhythm (scaffold only; one or two values for proof)

apps/portal/app/
  globals.css                         -- MODIFIED (imports tokens.responsive.css)
                                         — OR a dedicated import in layout.tsx if existing pattern differs

logs/wp-024/
  phase-0-result.md … phase-4-result.md
```

### Modified Files

```
packages/db/src/types.ts                              -- regenerated, adds variants col + BlockVariants branded type
packages/db/src/index.ts                              -- re-export BlockVariants if needed by consumers
packages/validators/src/block.ts                      -- variants field on create + update schemas

apps/portal/app/_components/block-renderer.tsx        -- accepts optional variants; emits data-variant wrappers
apps/portal/lib/hooks.ts                              -- renderBlock() accepts optional variants; same shape
apps/portal/app/[[...slug]]/page.tsx                  -- pass variants through to BlockRenderer
apps/portal/app/themes/[slug]/page.tsx                -- same if it calls BlockRenderer directly

tools/layout-maker/runtime/lib/css-generator.ts       -- add container-type + container-name to .slot-inner generic rule
tools/layout-maker/runtime/lib/css-generator.test.ts  -- contract test asserting the new properties are emitted
tools/layout-maker/PARITY-LOG.md                      -- new "Fixed" entry for container-type addition (pre-emptive; not a lie fix but a contract addition)

src/__arch__/domain-manifest.ts                       -- register tokens.responsive.css under pkg-ui; no new table (column-only)
```

### Manifest Updates

```ts
// pkg-ui.owned_files — ADD:
'packages/ui/src/theme/tokens.responsive.css'

// pkg-db.owned_files — unchanged (types.ts already listed)
// pkg-validators.owned_files — unchanged
// app-portal.owned_files — unchanged (modifying existing files)
// infra-tooling.owned_files — unchanged (modifying existing files)

// pkg-db.owned_tables — unchanged (blocks table already listed; column additions don't require manifest edit)
```

### Database Changes

```sql
-- supabase/migrations/016_blocks_variants.sql

ALTER TABLE blocks
  ADD COLUMN variants jsonb;

COMMENT ON COLUMN blocks.variants IS
  'Optional named structural variants, e.g. { "mobile": { "html": "...", "css": "..." } }. Portal inlines all variants into one artifact; @container CSS reveals the matching one. Null = block has no variants. See ADR-025.';

-- NO default. NO NOT NULL. Existing rows remain NULL — fully backwards-compatible.
-- RLS unchanged (column inherits table RLS).
```

After migration:
```bash
npx supabase gen types typescript --linked > packages/db/src/types.ts
# Then add BlockVariants branded type manually (see Phase 1 task)
```

---

## Implementation Phases

### Phase 0: RECON (~1h)

**Goal:** Verify current state, read domain skills, identify edge cases.

**Tasks:**

0.1. **Read domain skills** — `.claude/skills/domains/pkg-db/SKILL.md`, `pkg-validators/SKILL.md`, `app-portal/SKILL.md`, `pkg-ui/SKILL.md`, `infra-tooling/SKILL.md`
0.2. **Check manifest boundaries** — confirm owners of every file to be touched via `src/__arch__/helpers.ts::getOwnerDomain`
0.3. **Audit current blocks table**:
```bash
grep -n "blocks:" packages/db/src/types.ts
grep -rn "blocks.variants\|block.variants" packages/ apps/
```
Expected: zero matches for variants. If any found, log conflict.
0.4. **Audit BlockRenderer callers**:
```bash
grep -rn "BlockRenderer\|renderBlock(" apps/portal/ packages/
```
Confirm only the known 2 RSC call sites + `renderBlock()` helper in hooks.ts.
0.5. **Audit layout CSS output** — pick one published theme's `layout.css` from recent prod output (or regenerate via LM). Confirm no existing `container-type` rule. Record the current `.slot-inner` generic rule verbatim for the contract test baseline.
0.6. **Audit tokens.responsive.css conflicts** — `ls packages/ui/src/theme/` to confirm name is free.
0.7. **Check PARITY-LOG** for open entries touching css-generator `.slot-inner` — if any open, their fix may overlap.

**Verification:** `logs/wp-024/phase-0-result.md` exists with findings; no code changed.

---

### Phase 1: Schema + Types (~1.5h)

**Goal:** `blocks.variants` column exists; TypeScript types updated; consumers still compile.

**Tasks:**

1.1. **Write migration** — `supabase/migrations/016_blocks_variants.sql` (spec in Database Changes).
1.2. **Apply migration** — via `npx supabase db push --linked` (or Studio's migration tool — document whichever is current in project). Confirm row count unchanged.
1.3. **Regenerate types.ts** — `npx supabase gen types typescript --linked > packages/db/src/types.ts`. Diff carefully: expect `variants: Json | null` on Row/Insert/Update for `blocks`.
1.4. **Add branded type** — in `packages/db/src/types.ts` add alongside existing branded types:
```ts
export type BlockVariants = Record<string, { html: string; css: string }>
```
and retype the `blocks.Row.variants` via module augmentation, OR add a typed reader helper in `queries/blocks.ts` that casts `Json` to `BlockVariants | null`. Pick whichever mirrors how `BlockHooks`/`BlockMetadata` are currently handled.
1.5. **Export** `BlockVariants` from `packages/db/src/index.ts` if branded types are exported today.
1.6. **Typecheck all apps** — `npm run typecheck` or the repo-wide equivalent. Expected: pass with zero changes needed elsewhere (field is optional, nullable).

**Verification:**
```bash
npm run arch-test                # path existence, ownership
npm run typecheck                # no type errors anywhere
psql -c "SELECT column_name FROM information_schema.columns WHERE table_name='blocks' AND column_name='variants'"
                                 # returns 1 row
```

---

### Phase 2: Validators (~0.5h)

**Goal:** `createBlockSchema` and `updateBlockSchema` accept `variants`.

**Tasks:**

2.1. **Extend block.ts** — add:
```ts
const variantPayloadSchema = z.object({
  html: z.string().min(1),
  css: z.string().default(''),
})

const variantsSchema = z.record(z.string().regex(/^[a-z0-9-]+$/), variantPayloadSchema)
```
2.2. **Add `variants: variantsSchema.optional()`** to both `createBlockSchema` and `updateBlockSchema`. No default value — absence means null in DB.
2.3. **Export** the new schemas and payload types from the package index.
2.4. **Unit tests** — if a validators test harness exists, cover: (a) missing variants passes; (b) malformed variant name fails; (c) variant without html fails.

**Verification:**
```bash
npm run arch-test
npm run -w @cmsmasters/validators test   # if tests exist
```

---

### Phase 3: Renderer (~2h)

**Goal:** Portal renders variants inline when present; non-variant blocks render byte-identically to today.

**Tasks:**

3.1. **Extend `BlockRenderer` RSC** (`apps/portal/app/_components/block-renderer.tsx`) — accept optional `variants?: BlockVariants`. When present:
- Concatenate all variant CSS after base CSS into the `<style>` tag.
- Wrap `html` in `<div data-variant="base">…</div>`.
- For each variant, emit `<div data-variant="{name}" hidden>{variant.html}</div>` after the base.
- `js` handling unchanged.
- When `variants` is undefined/null/empty, output MUST be byte-identical to current. Add an explicit test fixture for this.

3.2. **Extend `renderBlock()` helper** (`apps/portal/lib/hooks.ts`) — same semantics as RSC, emitting an HTML string. Two paths must stay in sync.

3.3. **Update call sites**:
- `app/[[...slug]]/page.tsx` — pass `variants={b.variants}` in both `<BlockRenderer />` invocations.
- `app/themes/[slug]/page.tsx` — same if it also renders blocks directly.
- Any caller of `renderBlock()` that has the block object — pass `block.variants`.

3.4. **Scoping safety check** — verify that variant CSS still lives under `.block-{slug}`. The variant editor (future WPs) will enforce this; for now, document the invariant in a code comment and a Phase 3 log entry.

3.5. **Ensure `stripGlobalPageRules` does not nuke `@container` rules** — review the function; add a regression test that `@container slot (…) { … }` survives the strip.

**Verification:**
```bash
npm run arch-test
npm run -w @cmsmasters/portal build     # portal still builds
# Smoke test: a block with variants={ mobile: { html, css } } renders both wrappers in the output HTML
# Smoke test: a block without variants renders byte-identical HTML to pre-WP-024 output
```

---

### Phase 4: Slot container-type + Responsive tokens (~1.5h)

**Goal:** Leaf slots expose their width via `container-type`; responsive tokens file exists and is imported; non-variant blocks still render unchanged visually.

**Tasks:**

4.1. **Amend `css-generator.ts`** — in the generic `[data-slot] > .slot-inner { ... }` rule (line ~246), add:
```css
container-type: inline-size;
container-name: slot;
```

4.2. **Add contract test** — in `css-generator.test.ts`, assert that generated CSS for any leaf-slot-bearing config contains exactly `container-type: inline-size` and `container-name: slot` inside the `.slot-inner` block, and that container slots do NOT get these properties on their outer rule.

4.3. **PARITY-LOG entry** — add a "Fixed" section entry explaining this is an additive contract (not a lie-fix), linking to ADR-025 and this WP. Reference the contract test.

4.4. **Create `tokens.responsive.css`** scaffold:
```css
/* tokens.responsive.css
 * Hand-maintained responsive rhythm tokens.
 * Decoupled from tokens.css — Figma sync does NOT touch this file.
 * See ADR-025. */
:root {
  /* Section-level vertical rhythm */
  --space-section: clamp(1.5rem, 4vw, 6rem);
  /* Display / heading sizes that scale with viewport */
  --text-display: clamp(1.75rem, 3.5vw, 4rem);
}
```
Keep the scaffold minimal (2–3 tokens). Real population is WP-029.

4.5. **Import in portal globals** — add `@import './tokens.responsive.css';` (or the existing import pattern) alongside `tokens.css` in portal globals. Document the order: responsive tokens load after base tokens so later rules can reference them.

4.6. **Update layout-maker iframe srcdoc** — `tools/layout-maker/CLAUDE.md` lists Vite `?raw` imports. Add `tokens.responsive.css` to the injected `@layer tokens { … }` block so preview iframes match portal reality.

4.7. **Update Studio block-preview** (`apps/studio/src/components/block-preview.tsx`) — same injection update.

4.8. **Regenerate a published theme layout CSS** — pick one theme, regenerate via LM, confirm the new `.slot-inner` rule appears and nothing else changed. Do NOT publish (verification only).

**Verification:**
```bash
npm run arch-test
npm run -w tools/layout-maker test    # contract test passes
# Manual: open one theme page in dev, inspect a slot → DevTools shows container-type: inline-size
# Manual: existing block in that slot renders unchanged
```

---

### Phase 5: Close (~0.5h)

**Goal:** Docs reflect the new contracts; WP marked done; nothing left dangling.

**Tasks:**

5.1. **CC reads all phase logs** — digest discoveries / drift.
5.2. **Propose doc updates** — list:
   - `.context/BRIEF.md` — note WP-024 done; ADR-025 active; responsive infra in place
   - `.context/CONVENTIONS.md` — new section: "Responsive tokens in tokens.responsive.css (not tokens.css)" + "Block CSS may use `@container slot (…)` — slots expose `container-type: inline-size`"
   - `.claude/skills/domains/pkg-ui/SKILL.md` — add invariant: "tokens.responsive.css is hand-maintained, NOT Figma-synced"
   - `.claude/skills/domains/app-portal/SKILL.md` — add invariant: "BlockRenderer inlines variants when present; `@container slot` rules scoped under `.block-{slug}` reveal the right variant at each slot width"
   - `.claude/skills/domains/infra-tooling/SKILL.md` — add invariant: "css-generator emits `container-type: inline-size; container-name: slot` on `.slot-inner` generic rule"
   - `workplan/BLOCK-ARCHITECTURE-V2.md` — cross-reference ADR-025 + this WP
5.3. **Brain approves** — reviews proposed changes.
5.4. **CC executes doc updates**.
5.5. **Verify green**:
```bash
npm run arch-test
npm run typecheck
```
5.6. **Update WP status** — flip to `✅ DONE` at top of this file; set Completed date.

**Files to update:**
- `.context/BRIEF.md`
- `.context/CONVENTIONS.md`
- `.claude/skills/domains/pkg-ui/SKILL.md`
- `.claude/skills/domains/app-portal/SKILL.md`
- `.claude/skills/domains/infra-tooling/SKILL.md`
- `workplan/BLOCK-ARCHITECTURE-V2.md` (cross-ref)
- `src/__arch__/domain-manifest.ts` (already updated in earlier phases; confirm consistency)
- `logs/wp-024/phase-*-result.md` (evidence must exist)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| `supabase gen types` overwrites manual branded types | BlockVariants type disappears; silent `any` | Regenerate first, then re-apply branded types in a separate commit. Document the re-apply step in Phase 1 log |
| Adding `container-type: inline-size` triggers unexpected layout shifts in existing blocks | Visual regression on prod themes | `container-type: inline-size` only changes block size containment (not inline-axis); does NOT affect visual rendering without `@container` rules in play. Verify via screenshot of one published theme before/after. If shift observed, scope `container-type` to slots that opt in (unlikely needed) |
| `@container` rules accidentally stripped by `stripGlobalPageRules` | Variants won't reveal correctly | Add explicit regression test in Phase 3.5. If stripped, adjust the helper to whitelist `@container` |
| `renderBlock()` string output and `BlockRenderer` RSC drift in shape | Slot-embedded blocks vs. directly-rendered blocks behave differently | Phase 3 adds parallel test fixtures for both paths comparing variant-present output structurally |
| Existing blocks' CSS contains `@media` rules that now compete with future `@container` rules from WP-026 | Specificity fights | Out of scope for this WP — blocks unchanged. Will surface during WP-026 auto-rules; documented now as a known forward-risk |
| layout-maker preview iframe vs. portal render divergence after css-generator change | PARITY-LOG lie | Contract test (Phase 4.2) + explicit PARITY-LOG entry (Phase 4.3) |
| New import order in portal globals breaks Tailwind layer ordering | Utilities stop applying | Import `tokens.responsive.css` in the same `@layer tokens` as `tokens.css`; no other layer touched |
| Cross-domain boundary violation | arch-test fails | Manifest updated in Phase 4.1 before committing the new file |
| Invariant violated silently | Production bug | Phase 0 reads all five relevant domain skills; Phase 5 updates skills with new invariants |

---

## Acceptance Criteria (Definition of Done)

- [ ] Migration `016_blocks_variants.sql` applied; `blocks.variants jsonb NULL` column exists in the linked DB
- [ ] `packages/db/src/types.ts` reflects the new column; `BlockVariants` branded type exported
- [ ] `createBlockSchema` and `updateBlockSchema` accept an optional `variants` field; malformed variants rejected
- [ ] `BlockRenderer` RSC emits `data-variant="base"` + per-variant wrappers when `variants` prop present; emits byte-identical output when absent
- [ ] `renderBlock()` helper in `hooks.ts` does the same for string-returning code paths
- [ ] Both portal call sites pass `variants` through
- [ ] `stripGlobalPageRules` preserves `@container` rules (regression test in place)
- [ ] Layout CSS generator emits `container-type: inline-size; container-name: slot` on the `.slot-inner` generic rule; container slots unaffected
- [ ] `css-generator.test.ts` has a contract test asserting the new properties
- [ ] `PARITY-LOG.md` has a "Fixed"-section entry referencing ADR-025 + this WP
- [ ] `packages/ui/src/theme/tokens.responsive.css` exists with 2–3 scaffold tokens and a header comment explaining it is hand-maintained
- [ ] Portal globals import the new token file in the correct layer
- [ ] Layout-maker and Studio block-preview iframes inject the new token file alongside `tokens.css`
- [ ] One existing published theme re-rendered in dev shows zero visual diff vs. pre-WP state
- [ ] `npm run arch-test` passes (no regressions)
- [ ] `npm run typecheck` passes across the monorepo
- [ ] `domain-manifest.ts` registers `tokens.responsive.css` under `pkg-ui.owned_files`
- [ ] All five phases logged in `logs/wp-024/`
- [ ] Domain skills updated (pkg-ui, app-portal, infra-tooling) with new invariants
- [ ] `.context/BRIEF.md` and `.context/CONVENTIONS.md` updated
- [ ] No known blockers for WP-025 (Block Forge Core)

---

## Dependencies

| Depends on | Status | Blocks |
|---|---|---|
| ADR-025 active | ✅ | All WPs 023–028 |
| `/sync-tokens` skill invariants | ✅ (no change — decoupled by design) | — |
| Supabase linked + migration tooling available | ✅ (existing migrations 001–015 work) | Phase 1 |
| PARITY-LOG discipline enforced in layout-maker | ✅ (documented in `tools/layout-maker/CLAUDE.md`) | Phase 4.3 |

This WP blocks:
- **WP-025** — Block Forge Core engine (needs `variants` shape and renderer contract)
- **WP-026** — tools/block-forge/ (consumes core + renderer)
- **WP-027** — Studio Responsive Tab (consumes core + renderer + DB column)
- **WP-028** — Tweaks + Variants UI (consumes variants column)

---

## Notes

- **Scope discipline.** This WP does NOT add: auto-rules engine, any UI, any real responsive token values beyond a scaffold, migration of existing blocks, or per-BP slot behaviour (that's layout-maker's concern and already exists). Resist scope creep — each item belongs to a later WP.
- **Backwards compatibility is the hard acceptance gate.** Every existing block must render identically. The visual-diff check on one published theme in Phase 4.8 is the canary. If it fails, stop and investigate before proceeding.
- **Two rendering paths stay parallel.** Portal has `BlockRenderer` RSC AND `renderBlock()` string helper. They were introduced for different reasons (RSC vs. slot interpolation). Do not collapse them in this WP — just keep them in sync. Unification is a separate, optional refactor.
- **PARITY-LOG is non-negotiable.** The LM `CLAUDE.md` mandates it for any css-generator change. Phase 4.3 is not optional.
- **Responsive tokens population** is deliberately deferred to WP-029 so that design choices (what rhythm values actually belong there) can be informed by real use in WP-025/026.
- **ADR-025 reference** — any ambiguity during phases should be resolved by reading `workplan/adr/025-responsive-blocks.md` first.
