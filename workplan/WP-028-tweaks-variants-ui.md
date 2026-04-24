# WP-028: Tweaks + Variants UI — cross-surface lockstep

> Click-to-edit element → per-BP sliders (padding, font-size, gap, hide/show) + Variants drawer (fork/rename/delete/edit, side-by-side preview) landing IDENTICALLY on both authoring surfaces: `tools/block-forge/` (WP-026) and Studio Responsive tab (WP-027). First WP that tests the dual-PARITY contract under real complexity. Engine support is already shipped (`emitTweak`, `composeVariants` from WP-025); this is pure UI work + first end-to-end variants write path.

**Status:** ✅ DONE
**Priority:** P0 — Critical path (completed ADR-025 Layer 2 + Layer 4 authoring; unblocks WP-029 heuristic polish informed by real tweak/variant usage)
**Prerequisites:** WP-024 ✅, WP-025 ✅, WP-026 ✅, WP-027 ✅
**Milestone/Wave:** Responsive Blocks (ADR-025)
**Estimated effort:** 18–24 hours across 7 phases — actual: 7 phases (0-6) + Phase 3.5 mini-phase closed per `logs/wp-028/phase-{N}-result.md` chain
**Created:** 2026-04-23
**Completed:** 2026-04-24

---

## Problem Statement

WP-024/025/026/027 shipped the "automatic responsive" spine: foundation → engine → file-based surface → DB-backed surface. Authors can open a block, see 3 widths, accept or reject heuristic suggestions, save. That covers **Layer 1 (auto-rules) of ADR-025** end-to-end.

**Layer 2 (visual tweaks) and Layer 4 (variants)** are still inaccessible. When the heuristics miss — or suggest something close but not quite right — the author has no way to say "reduce padding by 4px more at mobile" without editing raw CSS. When a block genuinely needs a different DOM structure at narrow widths (a 4-CTA hero → accordion), the author has no way to create a named variant without editing JSON by hand.

Both tweaks and variants are **pure UI work** — the engine has shipped `emitTweak({ selector, bp, property, value }, css)` and `composeVariants(base, variants[])` since WP-025. What's missing is the interaction surface: a way to click an element in preview, dial per-BP overrides, fork a variant, edit it side-by-side with the base, and save the result through each surface's existing I/O path.

The critical risk — and the reason this WP is important beyond its features — is that two UIs now implementing 10× more complex interactions than WP-026/027 did carry 10× more drift risk. The PARITY contract pattern (two cross-referenced PARITY.md files) was validated on simple injection contracts; it has not been tested on complex UI component behaviour. **This WP is the stress test.**

If drift emerges during implementation, the right answer is to extract the shared UI into `packages/block-forge-ui/` — one implementation consumed by both surfaces. If drift stays cosmetic, the reimplement-in-both strategy can continue. **Phase 0 RECON decides empirically.**

Why now: WP-024–027 complete the "easy path" (auto-rules). Every future authoring need — heuristic polish (WP-029), population of responsive tokens, migration of existing blocks — benefits from having tweaks + variants live in both surfaces simultaneously. This is the last block-authoring WP in the ADR-025 wave.

---

## Solution Overview

### Architecture

```
      Engine (already shipped — WP-025)
      ─────────────────────────────────
      emitTweak({selector, bp, property, value}, css) → patched CSS
      composeVariants(base, variants[]) → composed { html, css, variants }
                                 │                                  │
                 ┌───────────────┴──────────────────────────────────┴──────────────────┐
                 │                                                                     │
                 ▼                                                                     ▼
     ┌──────────────────────────────┐                              ┌──────────────────────────────┐
     │  tools/block-forge/ (WP-026) │                              │  apps/studio (WP-027)        │
     │                              │                              │  Responsive tab              │
     │  Vite, file-based I/O        │                              │  React SPA, DB-backed        │
     │                              │                              │                              │
     │  ┌────────────────────────┐  │                              │  ┌────────────────────────┐  │
     │  │ TweakPanel             │  │                              │  │ TweakPanel             │  │
     │  │  - element click       │  │                              │  │  - element click       │  │
     │  │  - per-BP sliders      │  │                              │  │  - per-BP sliders      │  │
     │  │  - padding/font/gap/   │  │  ← SAME UI BEHAVIOUR →       │  │  - padding/font/gap/   │  │
     │  │    hide/show           │  │    (enforced by PARITY       │  │    hide/show           │  │
     │  │  - dispatch emitTweak  │  │     contract OR shared       │  │  - dispatch emitTweak  │  │
     │  └────────────────────────┘  │     package — Phase 0 rules) │  └────────────────────────┘  │
     │                              │                              │                              │
     │  ┌────────────────────────┐  │                              │  ┌────────────────────────┐  │
     │  │ VariantsDrawer         │  │                              │  │ VariantsDrawer         │  │
     │  │  - fork/rename/delete  │  │                              │  │  - fork/rename/delete  │  │
     │  │  - side-by-side edit   │  │                              │  │  - side-by-side edit   │  │
     │  │  - @container reveal   │  │                              │  │  - @container reveal   │  │
     │  │    preview             │  │                              │  │    preview             │  │
     │  │  - dispatch            │  │                              │  │  - dispatch            │  │
     │  │    composeVariants     │  │                              │  │    composeVariants     │  │
     │  └────────────────────────┘  │                              │  └────────────────────────┘  │
     │                              │                              │                              │
     │  Save: fs.writeFileSync      │                              │  Save: updateBlockApi        │
     │  → block JSON                │                              │  → Hono PUT /blocks/:id      │
     │                              │                              │  → Supabase write            │
     │                              │                              │  → /revalidate { all: true } │
     └──────────────────────────────┘                              └──────────────────────────────┘

   ── What this WP does NOT contain (explicit non-scope) ───────────
     • New heuristics beyond WP-025's six             → WP-029
     • DB schema changes (variants column shipped     → already done in WP-024
       in WP-024)
     • New block rendering code in portal             → no change needed (WP-024 inlines variants)
     • Migration of existing blocks to use tweaks/    → future WP, opt-in per block
       variants
     • Cross-block variant libraries / shared         → out of scope
       variants across blocks
     • Tweak history / multi-level undo beyond the    → WP-026/027 session semantics carry
       session-scoped stack from WP-026/027
```

### Key Decisions

| Decision | Chosen | Why | Alternatives considered |
|---|---|---|---|
| UI sharing strategy | **To be resolved by Phase 0 empirical audit** — extract to `packages/block-forge-ui/` IF divergence between WP-026 and WP-027 React components already exceeds a threshold (details in Phase 0); otherwise continue reimplement-in-both-surfaces with tightened PARITY discipline | This WP is the first where component complexity × surface count justifies deciding this deliberately rather than by reflex. Empirical audit beats philosophy. WP-027 Key Decision ("reimplement, don't extract") was correct for simple accept/reject list; may no longer apply for tweaks + variants | Always extract — premature if divergence is cosmetic; always reimplement — guarantees drift at 10× complexity |
| Tweak-panel interaction | Click element in preview iframe → iframe postMessage → panel opens on right side → shows matched element, per-BP slider stack (padding, font-size, gap, hide/show), rationale hint | Matches ADR-025 Layer 2 description; iframe selection via postMessage is the only way that respects sandboxing | Click element directly in React tree — impossible, iframe boundary; global click handler with CSS selector probe — brittle |
| Tweak value writing | Single `emitTweak` call per slider change → patched CSS → debounced preview reload | Engine already does the right thing; debouncing avoids preview thrash | Batch slider changes until "Apply" button — breaks "live feedback" loop; write raw CSS directly — violates ADR-025 never-auto-apply contract |
| Slider granularity | px step sizes: padding/gap 4px, font-size 2px, hide/show boolean toggle. Defaults seeded from current computed value | Matches expected author mental model (most designs are on 4/8 px grids) | Fine-grained (1px) — overwhelming; token-only dropdown — breaks freeform authoring |
| Variants drawer entry | Button in tab header: "+ Variant" opens drawer; existing variants listed as tabs within drawer | Keeps main preview visible; drawer is a well-scoped secondary surface | Modal — hides main preview; inline-below — cramped |
| Variants side-by-side preview | Inside drawer: base column + selected variant column at same panel width. Slider to change panel width (375 default when editing mobile variant) | Author authors variant AGAINST a specific width context | Always show all 3 widths — 6 columns = too wide; single width, toggle — loses comparison |
| Variant naming convention | `sm` / `md` / `lg` (engine's existing convention from WP-025, derived → 480/640/768 BP). Free-form names allowed but flagged with warning if not in convention | Consistency with engine; free-form unblocks edge cases | Only `sm/md/lg` allowed — too restrictive; no convention — chaos; require breakpoint number in name — noisy |
| Variant HTML editing | For MVP: edit raw HTML + CSS as text areas in drawer; no WYSIWYG. Source-style CodeView pattern | WYSIWYG for variants is its own WP; text edit ships the end-to-end flow | No variant editing at all — ships half a feature; full WYSIWYG — 5× scope |
| Delete variant | Explicit confirm dialog per delete; undo via session-state stack within session | Destructive action needs gate; session undo is already established pattern | Soft delete (recycle bin) — complexity without clear win; no undo — hostile |
| Save path per surface | WP-026 tools/block-forge: file write of composed block JSON. WP-027 Studio: `updateBlockApi` with `variants` TS type addition from WP-027 Phase 4 carry-over (already in place) | Reuses existing surface save paths; this WP is the first time Studio actually writes a non-null `variants` column | Cross-surface save service — adds network layer for no UX gain |
| Dirty-state integration | Tweaks dispatch into existing dirty-state slice per surface (session-state in WP-026, RHF `setValue('code', …, { shouldDirty: true })` in WP-027). Variants do same | Continues WP-026/027 pattern; no new dirty system | Per-panel dirty state — confuses author about what save will persist |
| Parity enforcement mechanism | **Component-level snapshot tests** comparing rendered output of WP-026 TweakPanel vs WP-027 TweakPanel for an identical mock block. If extract path chosen (Phase 0), single test set. If reimplement path chosen, parallel tests with byte-compare assertions | PARITY.md is docs; component snapshots are enforceable | Manual parity reviews — don't scale with UI complexity |
| Split this WP? | **Decide after Phase 0.** If scope stays ≤24h estimated, ship as one WP. If Phase 0 reveals more than 30h, split into WP-028 (Tweaks only) + WP-028a (Variants only) | Honest effort estimation beats ego | Always ship one — WP risks rug-pull; always split — premature fragmentation |

---

## Domain Impact

| Domain | Impact | Key Invariants | Traps to Watch |
|---|---|---|---|
| **pkg-block-forge-core** (WP-025) | Third consumer emerges (tweak panel + variants drawer both call engine). Still read-only consumer | Pure-function contract; never auto-applies; opaque suggestion IDs | Assuming `emitTweak` signature stable across engine versions — treat as public API, never read private internals |
| **infra-tooling** (tools/block-forge/) | Gains tweak panel + variants drawer components OR cedes them to new shared package | PARITY discipline; port 7702; file-based I/O contract from WP-026 | Iframe postMessage handlers must cleanup on component unmount; file save must stay opened-file-only |
| **studio-blocks** (apps/studio/src/pages/block-editor/responsive/) | Same gain OR same cede | RHF `isDirty` is canonical; `updateBlockApi` with variants payload; 2-tab bar stays 2-tab | Tweak panel must not conflict with RHF form state; variant save must propagate to RHF code field |
| **pkg-block-forge-ui** (NEW, conditional on Phase 0 ruling) | Created IF extract path chosen. Owns TweakPanel, VariantsDrawer, PreviewTriptych, SuggestionList (migrated from both current surfaces). Depends on `pkg-block-forge-core` + `pkg-ui` (for tokens). No Supabase, no fs, no I/O | Pure component library; no side effects; no Supabase client; no fs imports | Forcing single props API for two different I/O substrates — must accept surface-agnostic props (callbacks for save, not save logic itself) |
| **pkg-ui** | Read-only: tokens consumed for slider / drawer / badge styling. Possibly adds slider primitive if one doesn't exist | Tokens are Figma-synced | Introducing bespoke slider styling instead of using tokens |
| **pkg-db** | No schema change. First WP that actually writes a non-null `blocks.variants` value via Studio save path | types.ts hand-maintained hybrid; `BlockVariants = Record<string, BlockVariant>` | Validators must accept the actual keys author emits (e.g. `sm`, `md`, `lg` + free-form) — audit Zod schema in Phase 0 |
| **app-portal** | No code change. Second WP where real variant-bearing blocks land in production data path | Portal already inlines variants from WP-024; @container CSS reveals correct variant | None new |
| **app-api** (Hono) | No code change expected — WP-027 Phase 4 already extended `/api/content/revalidate` with `{ all: true }`. Variants save goes through unchanged `updateBlockApi` → `PUT /api/blocks/:id` | authMiddleware + requireRole unchanged | Phase 0 audits to confirm Hono block update handler still accepts the full `variants` payload without additional validation |

**Public API boundaries:**
- If extract path: `pkg-block-forge-ui` exports TweakPanel, VariantsDrawer, and supporting hooks. Both surfaces import from `@cmsmasters/block-forge-ui`.
- If reimplement path: no new package boundary; both surfaces continue owning their own components; PARITY.md files cross-reference component APIs explicitly.

**Cross-domain risks:**
- **Component drift at complexity scale.** The primary risk this WP tests. Mitigation: Phase 0 audit gives empirical divergence metric; Phase 1+ landing depends on that metric.
- **First real variants save** lands in production DB. Every prior WP touched the column only structurally. Mitigation: Phase 4 integration tests include full save + read round-trip + portal render verification.
- **Iframe postMessage churn** from click-to-edit. Mitigation: cleanup on unmount; debounce for scroll/resize; no unbounded listeners.
- **Dirty-state coupling across tweaks + variants + existing form.** In Studio, tweaks and variant edits both need to light up RHF `isDirty`. Conflicting edits (author edits Code textarea in Editor tab AND variant HTML in Responsive drawer for same block) — how does save resolve? Phase 0 decides.
- **`?raw` imports for new slider / drawer UI** — if extracted to shared package, cross-workspace resolution needs Vite config verification on both consumers.

---

## What This Changes

### New Files (conditional — depends on Phase 0 extract-vs-reimplement ruling)

**Common (both paths):**

```
apps/studio/src/pages/block-editor/responsive/
  TweakPanel.tsx                     # IF reimplement: full component here
  VariantsDrawer.tsx                 # IF reimplement: full component here
  VariantEditor.tsx                  # IF reimplement: full component here
  hooks/useElementSelection.ts       # iframe postMessage click handler

tools/block-forge/src/
  components/TweakPanel.tsx          # IF reimplement: full component here
  components/VariantsDrawer.tsx      # IF reimplement
  components/VariantEditor.tsx       # IF reimplement
  hooks/useElementSelection.ts       # IF reimplement

apps/studio/src/pages/block-editor/responsive/__tests__/
  tweak-panel.test.tsx
  variants-drawer.test.tsx
  variant-editor.test.tsx
  tweaks-integration.test.tsx        # end-to-end: click → slider → emitTweak → save
  variants-integration.test.tsx      # end-to-end: fork → edit → composeVariants → save → portal verify

tools/block-forge/src/__tests__/
  tweak-panel.test.tsx
  variants-drawer.test.tsx
  variant-editor.test.tsx
  tweaks-integration.test.tsx
  variants-integration.test.tsx

logs/wp-028/
  phase-0-result.md … phase-6-result.md
```

**Extract path only (IF Phase 0 rules for extraction):**

```
packages/block-forge-ui/
  package.json                       # @cmsmasters/block-forge-ui, private, vitest workspace
  tsconfig.json
  vite.config.ts                     # library-mode build OR direct src/ consumption
  src/
    index.ts                         # public API
    TweakPanel.tsx
    VariantsDrawer.tsx
    VariantEditor.tsx
    PreviewTriptych.tsx              # MIGRATED from WP-026/027 duplicates
    PreviewPanel.tsx                 # MIGRATED
    SuggestionList.tsx               # MIGRATED
    SuggestionRow.tsx                # MIGRATED
    hooks/useElementSelection.ts
    hooks/useSessionState.ts         # MIGRATED from WP-026/027 duplicates
    lib/composeSrcDoc.ts             # MIGRATED from preview-assets.ts
    types.ts
  src/__tests__/
    *.test.tsx                       # single test set; no parallel duplication

.claude/skills/domains/pkg-block-forge-ui/SKILL.md   # new domain skill
```

### Modified Files

**Both paths:**

```
apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx   # wire TweakPanel + VariantsDrawer
apps/studio/src/pages/block-editor/responsive/PARITY.md           # add Tweaks + Variants sections
tools/block-forge/src/App.tsx OR equivalent                       # wire TweakPanel + VariantsDrawer
tools/block-forge/PARITY.md                                       # add Tweaks + Variants sections
src/__arch__/domain-manifest.ts                                   # register new files
```

**Extract path additional:**

```
apps/studio/src/pages/block-editor/responsive/ResponsivePreview.tsx     # import from @cmsmasters/block-forge-ui
apps/studio/src/pages/block-editor/responsive/SuggestionList.tsx        # DELETED, re-exported from package
apps/studio/src/pages/block-editor/responsive/SuggestionRow.tsx         # DELETED, re-exported
apps/studio/package.json                                                # +@cmsmasters/block-forge-ui
tools/block-forge/src/components/PreviewTriptych.tsx                    # DELETED (migrated)
tools/block-forge/src/components/PreviewPanel.tsx                       # DELETED (migrated)
tools/block-forge/src/components/SuggestionList.tsx                     # DELETED (migrated)
tools/block-forge/src/components/SuggestionRow.tsx                      # DELETED (migrated)
tools/block-forge/package.json                                          # +@cmsmasters/block-forge-ui
src/__arch__/domain-manifest.ts                                         # new pkg-block-forge-ui domain + re-home migrations
```

### Manifest Updates

**Common:** tweaks/variants component paths registered in respective existing domains (infra-tooling + studio-blocks).

**Extract path:** New domain `pkg-block-forge-ui` appended to manifest with full owned_files + allowed_imports_from (`pkg-block-forge-core`, `pkg-ui`). Migrated files removed from previous domains' lists atomically.

### Database Changes

None. `blocks.variants` column already exists per WP-024.

---

## Implementation Phases

### Phase 0: RECON + extract-vs-reimplement ruling (~2h)

**Goal:** Read relevant skills; audit current component divergence between WP-026 and WP-027; confirm engine API for tweaks/variants; resolve the extract-vs-reimplement question with empirical data; seed carry-overs for Phase 1.

**Tasks:**
0.1. Read domain skills: `pkg-block-forge-core`, `infra-tooling`, `studio-blocks`, `pkg-ui`, `app-portal`. Re-read both PARITY.md files line-by-line.
0.2. **Engine API audit:** read `packages/block-forge-core/src/emit/emit-tweak.ts` verbatim — record signature, supported properties, BP handling, escape semantics. Same for `packages/block-forge-core/src/compose/compose-variants.ts` (already captured in WP-027 Phase 0 §0.6.a — reuse as baseline, re-verify).
0.3. **Component divergence audit** — the empirical input for the extract ruling. For each file pair:
   - `tools/block-forge/src/components/SuggestionList.tsx` vs `apps/studio/src/pages/block-editor/responsive/SuggestionList.tsx`
   - Same for SuggestionRow, PreviewPanel, PreviewTriptych (when WP-027 Phase 2/3 landed), session state primitives

   For each pair, run `diff -u` and record: (a) LOC count of each, (b) how many non-cosmetic differences (logic, props API, state shape, side effects), (c) how many cosmetic (styling, className, token usage). **Metric for extract:** if non-cosmetic differences > 3 per component pair OR >15 total across all pairs, extract is justified. If <3 per pair AND <15 total, reimplement path continues.
0.4. **Variant data-flow audit:** trace what happens when a variant save lands:
   - WP-026: what file format, what merge logic with existing `variants` object in JSON
   - WP-027: what payload shape to `updateBlockApi`, Zod validation path through `packages/validators/src/block.ts`
   - Portal render: is a new variant instantly visible after revalidate? Playwright confirms in Phase 4.
0.5. **Zod validator audit:** `grep -n "variants" packages/validators/src/block.ts` — confirm `createBlockSchema` + `updateBlockSchema` accept `variants` with the key convention WP-028 authors produce (`sm`, `md`, `lg`, + free-form). If schema is too strict (e.g. enum-only names), record as Phase 1 pre-req.
0.6. **Iframe postMessage API audit:** read WP-026/027 preview-assets / PreviewPanel code for existing postMessage contract. Design element-click message shape: `{ type: 'block-forge:element-click', selector, rect, computedStyle }`. Confirm WP-026/027 listener infra can extend cleanly or needs refactor.
0.7. **Tests-as-contract approach:** decide test strategy per path:
   - Extract path: single test set under `packages/block-forge-ui/src/__tests__/` — tested once.
   - Reimplement path: parallel test files in both surfaces + component-level snapshot tests that compare rendered output of WP-026 TweakPanel vs WP-027 TweakPanel for the same mock block. Fail the test if snapshots diverge.
0.8. **Effort estimate recalc:** based on extract-vs-reimplement ruling, re-estimate total WP effort.
   - Extract: ~18–20h (new package overhead offset by single implementation + migration churn front-loaded).
   - Reimplement: ~22–26h (parallel implementations + snapshot tests).
   - If estimate exceeds ~24h, flag for WP-028a split before Phase 1.
0.9. **Arch-test baseline record:** `npm run arch-test` at head of WP-028 branch. WP-027 landed 489 / 0; verify no drift since.
0.10. **SKILL-status-flip projection:** if extract path, new `pkg-block-forge-ui` domain SKILL starts at `skeleton` and flips to `full` during Close → +6 arch-tests (per `feedback_arch_test_status_flip.md`). Factor into Phase 6 target.
0.11. **Browser support check:** slider input accessibility (HTMLInputElement range type is universal), iframe postMessage is universal. No exotic APIs needed.
0.12. **Dirty-state consolidation paper-rehearsal:** Studio tab's RHF form is the canonical dirty source. When tweaks land → `form.setValue('code', newCode, { shouldDirty: true })` (WP-027 pattern). When variants land → `form.setValue('variants', newVariants, { shouldDirty: true })` — confirm `variants` is registered with RHF or register it in Phase 1.
0.13. **Same-block conflicting edits rehearsal:** user edits CSS in Code textarea (Editor tab) AND tweaks an element (Responsive tab). Both write to `form.code` via RHF. Last write wins; no per-tab isolation. Document as Phase 2+ "save order truth" — no new logic needed; just acknowledgement.

**Verification:** `logs/wp-028/phase-0-result.md` with findings. Mandatory carry-overs for Phase 1:
  (a) emitTweak signature verbatim
  (b) composeVariants signature (confirmed from WP-027 or re-read)
  (c) component divergence audit matrix + extract-vs-reimplement ruling
  (d) variants Zod schema accept/reject behaviour for WP-028 keys
  (e) iframe postMessage message shapes
  (f) total effort estimate + WP split decision
  (g) arch-test baseline + projected target
  (h) SKILL-status flip arch-test accounting
  (i) dirty-state propagation for tweaks + variants
  (j) conflict resolution note for concurrent Code textarea + tweak edits

No code written.

---

### Phase 1: Foundation + extract setup (~3–4h)

**Goal:** Depending on Phase 0 ruling — either (a) extract path: scaffold `packages/block-forge-ui/` with migrated PreviewTriptych/PreviewPanel/SuggestionList/SuggestionRow/session-state from WP-026/027 + re-consume from both surfaces, OR (b) reimplement path: scaffold empty TweakPanel + VariantsDrawer placeholders in both surfaces + add component-snapshot parity test harness.

Phase 1 exact task breakdown depends on Phase 0 carry-over (c) and cannot be pre-written. **Brain writes Phase 1 task prompt after reviewing Phase 0 result log.**

**Common invariants either way:**
- Manifest updated in same commit as scaffold
- Arch-test green at end of phase
- TypeScript clean across all workspaces
- No behavioural regression in existing Suggestion/Preview flows
- Both surfaces' existing tests (WP-026 + WP-027) still green

---

### Phase 2: Tweak panel — click-to-select + per-BP sliders (~3–4h)

**Goal:** Click any element in preview iframe → panel opens with the matched selector + per-BP sliders (padding, font-size, gap, hide/show). Slider change → `emitTweak` → debounced preview reload. Save integrates with surface's existing save path.

**Tasks:**
2.1. `useElementSelection` hook: iframe postMessage listener for `block-forge:element-click`. Parent renders selected-element indicator (outline on iframe body via CSS injection).
2.2. Inside iframe srcdoc: add click handler on body that sends `{ type, selector, rect, computedStyle }` up. Selector derivation: walk up DOM tree to first element with id/class; fall back to nth-of-type path.
2.3. TweakPanel component: slider stack for padding (top/right/bottom/left), font-size, gap, hide/show. Each slider has: current computed value (seed), step size per Key Decisions, +/- buttons + text input.
2.4. Per-BP toggle: default BP selected matches current preview panel width. Author can switch to another BP without losing the selected element.
2.5. Slider change dispatch: `emitTweak({ selector, bp, property, value }, currentCss)` → patched CSS → debounced (300ms) preview reload.
2.6. Hide/show toggle: emits `display: none` at BP via `emitTweak`.
2.7. Reset button: removes any emitted tweaks for the current selector+BP combo (re-uses emitTweak with empty value, or engine's reset call if exposed — Phase 0 confirms).
2.8. Unit tests: element selection handler (mock postMessage events); slider → emitTweak dispatch; debounced reload; reset behaviour.
2.9. Integration test: mock block → click element → tweak padding → save → asserted CSS contains the tweak.
2.10. Both surfaces land this in lockstep. Parity snapshot test (reimplement path) or single test (extract path) asserts UI identical.

**Verification:**
- Unit + integration tests green
- Manual: tools/block-forge/ → click element → tweak → preview updates → save → file contains tweak
- Manual: Studio → click element → tweak → RHF isDirty = true → Save → DB row variants still null but css updated
- Both surfaces: tweak a padding at mobile (375 panel) → desktop (1440 panel) unchanged. Cross-BP isolation confirmed.

---

### Phase 3: Variants drawer — fork/rename/delete (~2–3h)

**Goal:** Button in tab "+ Variant" opens drawer. Drawer has tabs for each existing variant. Author can: create new variant (forks from base), rename, delete (with confirm), switch between variants. Drawer does NOT yet edit variant content (Phase 4).

**Tasks:**
3.1. VariantsDrawer component: side drawer (WP-026 layout) or modal (Studio if drawer conflicts with RHF form). Phase 0 decides per surface.
3.2. Variant list state: derived from `block.variants` current object. "New Variant" button prompts for name (default `mobile` if `sm` not taken).
3.3. Name validation: lowercase letters/numbers/dash, 2–50 chars, warn if not in `sm`/`md`/`lg` convention.
3.4. Fork logic: new variant = deep copy of current base `{ html, css }` at creation time. Author then edits (Phase 4).
3.5. Rename: text input on variant tab label.
3.6. Delete: confirm modal, undo via session-state stack within session.
3.7. Empty state: "No variants yet" + "+ Variant" CTA.
3.8. Unit tests: create, rename, delete, undo, name-validation warnings.
3.9. Integration test: fork → assert variant exists in state → delete → assert gone → undo → assert restored.
3.10. Lockstep landing on both surfaces.

**Verification:**
- Unit + integration green
- Manual: drawer opens/closes cleanly in both surfaces
- Manual: variant list survives browser reload (in Studio, after Save; in tools/block-forge/, after file save)

---

### Phase 4: Variant editor — side-by-side edit + @container reveal preview (~3–4h)

**Goal:** Inside variant tab of drawer: edit variant HTML + CSS as text areas. Preview column shows base + variant side-by-side at a chosen panel width (defaults to BP-implied width based on variant name). Live preview uses `composeVariants` + `renderForPreview` with target BP queried.

**Tasks:**
4.1. Variant tab content: two columns. Left = base HTML/CSS read-only (from block). Right = variant HTML/CSS editable text areas.
4.2. Mini-preview column on right side of drawer: a single iframe at variant's default width (375 for mobile, 640 for md, 768 for lg) showing base + variant composed via `composeVariants`, with @container CSS revealing the variant at that width.
4.3. Panel-width slider inside drawer: author can change preview width to see variant at other widths (useful to confirm @container reveal threshold).
4.4. Save flow per surface:
   - tools/block-forge/: file write → composeVariants → new block JSON with updated `variants` field → fs.writeFileSync
   - Studio: form.setValue('variants', newVariants, { shouldDirty: true }) → existing Save flow → updateBlockApi with variants payload → Hono → Supabase → revalidate { all: true }
4.5. Portal render verification (Studio path): after save, navigate to a published theme using this block. Confirm variant renders at expected width via Playwright.
4.6. Unit tests: variant editor renders, edits propagate to state, save calls correct path per surface.
4.7. Integration test on each surface: fork → edit variant CSS → save → re-read → variant persisted correctly.
4.8. **First real variants DB write.** Studio path specifically: confirm `blocks.variants` column now holds non-null JSONB after a Phase 4 save. SELECT query via existing tooling.
4.9. Portal parity verification: block with variant saved through Studio → composed-page block placement → Playwright at 375 shows mobile variant, at 1440 shows base. Prove end-to-end.

**Verification:**
- Unit + integration green
- Manual + Playwright: end-to-end variant save → portal render at different widths → correct variant displayed
- Manual: Hono API logs confirm `PUT /blocks/:id` payload contains variants
- Manual: tools/block-forge/ save → file has updated variants JSONB → reopen in Studio → variant appears intact (cross-surface round-trip)

---

### Phase 5: Dirty-state consolidation + conflict handling (~1–2h)

**Goal:** Tighten dirty-state across tweaks + variants + existing Code textarea. Document last-write-wins behaviour per Phase 0 carry-over (j). Make cross-tab conflicts visible via existing dirty indicator. No new logic unless Phase 0/2/3/4 surface a real bug.

**Tasks:**
5.1. Audit: tweak changes → RHF isDirty? Variant changes → RHF isDirty? Manual Code textarea edit after tweak → tweak lost or preserved?
5.2. If tweak + code-edit concurrency causes real data loss (not just last-write-wins), design mitigation. Otherwise acknowledge as existing pattern and document.
5.3. Studio-specific: confirm Responsive tab's Save applies ALL pending changes (tweaks + variants + textarea edits), not a subset.
5.4. tools/block-forge/ equivalent: single Save writes whole block JSON including new variants + tweaked CSS.
5.5. Phase 5 likely small; if Phase 4 surfaces complications, expand here.

**Verification:**
- Cross-tab edit: Code textarea change + Responsive tweak → Save → DB row has BOTH changes applied
- No silent data drops confirmed via integration tests + manual

---

### Phase 6: Close (~1–1.5h)

**Goal:** Doc propagation under the approval gate pattern (now 4/4 → 5/5 after this WP). All three PARITY.md files synced (tools/block-forge, Studio Responsive, `pkg-block-forge-ui` if extracted). Relevant domain SKILLs updated.

**Tasks:**
6.1. CC reads all phase logs; digests extract-vs-reimplement decision impact, any deviations, first-real-variants-save evidence.
6.2. Propose doc updates — 6+ doc files → explicit approval gate:
   - `.context/BRIEF.md` — WP-028 done; tweaks + variants live on both surfaces; ADR-025 Layer 2 + Layer 4 authoring complete
   - `.context/CONVENTIONS.md` — extract-vs-reimplement decision rule (empirical audit required at complexity threshold); parity snapshot test pattern if that became the enforcement
   - `.claude/skills/domains/infra-tooling/SKILL.md` — new tweaks/variants section
   - `.claude/skills/domains/studio-blocks/SKILL.md` — new tweaks/variants section
   - IF extract: `.claude/skills/domains/pkg-block-forge-ui/SKILL.md` — new domain SKILL (starts full; +6 arch-tests accounted)
   - `tools/block-forge/PARITY.md` — tweaks + variants section + cross-references
   - `apps/studio/src/pages/block-editor/responsive/PARITY.md` — same (AND absorbs the Phase 5 deviation #6 from WP-027 if not already landed — verify)
   - `workplan/BLOCK-ARCHITECTURE-V2.md` — update with WP-028 completion, ADR-025 Layer 2 + Layer 4 status
6.3. **Brain approves** (5/5 on approval gate after this, if ≥3 docs — which is guaranteed).
6.4. CC executes approved doc updates.
6.5. If extract path: confirm pkg-block-forge-ui SKILL status transition (skeleton → full) and +6 arch-tests landed as predicted in Phase 0 carry-over (h).
6.6. Final green:
   ```bash
   npm run arch-test
   npm run typecheck
   npm -w @cmsmasters/block-forge-core run test
   npm -w @cmsmasters/studio test
   # IF extract path:
   npm -w @cmsmasters/block-forge-ui run test
   ```
6.7. Flip WP status to `✅ DONE`, set Completed date.

**Files to update** (extract path — superset):
- `.context/BRIEF.md`
- `.context/CONVENTIONS.md`
- `.claude/skills/domains/infra-tooling/SKILL.md`
- `.claude/skills/domains/studio-blocks/SKILL.md`
- `.claude/skills/domains/pkg-block-forge-ui/SKILL.md` (new, extract path only)
- `tools/block-forge/PARITY.md`
- `apps/studio/src/pages/block-editor/responsive/PARITY.md`
- `workplan/BLOCK-ARCHITECTURE-V2.md`
- `logs/wp-028/phase-*-result.md`

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Component drift at 10× complexity (two implementations diverge during Phases 2–4) | Authors develop different mental models; cross-surface bugs; PARITY.md drifts into fiction | Phase 0 empirical audit gates the extract decision; if reimplement chosen, parallel tests with component-level snapshots compare rendered output and fail on drift |
| Scope creep into 30h+ | WP-028 ships partial or slips | Phase 0 effort re-estimate has explicit split-to-WP-028a trigger; Phase 0 log commits to either "ship as one WP" or "split" before Phase 1 begins |
| First real variants DB write exposes schema gap | Hono rejects payload; Studio save errors | Phase 0.5 audits Zod schema; Phase 0.4 traces the full save path; Phase 4 integration test is the canary |
| Iframe postMessage race conditions (click → debounced reload → rapid second click) | Stale tweaks applied; preview flashes | Debounce on both sides; postMessage sequence numbers; unit tests simulate race |
| Tweak + Code textarea concurrent edit silently drops tweak | Author loses work | Phase 5 audits; documented in CONVENTIONS if last-write-wins acceptable; mitigation otherwise |
| @container reveal in variant preview fails at expected BP (off-by-one CSS) | Author sees variant at wrong width, authors wrong rules | Engine's `composeVariants` already emits the reveal rules; Phase 4 Playwright verifies at exact BP boundaries |
| Extract path creates workspace resolution issues (Vite dev server, vitest, typecheck) | Both consumer apps break on install | Phase 1 integration test: both consumer apps build and test green before any component migration commits |
| Studio RHF form doesn't have `variants` field registered | setValue('variants', …) no-ops; dirty-state doesn't fire | Phase 0.12 paper-rehearsal; Phase 1 registers the field if missing |
| First variants DB row breaks ISR revalidate (Portal cache stale) | Variant invisible in portal until full rebuild | WP-027 Phase 4 shipped `{ all: true }` revalidate; Phase 4 E2E confirms revalidate fires |
| Dual-PARITY enforcement misses a contract drift | Authors ship divergent blocks via one surface that break in the other | Phase 0 carry-over (c) empirical audit establishes baseline; parity snapshot tests (reimplement path) or single test set (extract path) enforces going forward |
| SKILL-status flip on new `pkg-block-forge-ui` domain surprises Phase 6 arch-test target | CI red at Close | Phase 0.10 pre-accounts +6 arch-tests from skeleton → full flip |
| Bulk "Accept all high-confidence" or "Auto-tweak" creeping in | Violates ADR-025 never-auto-apply | Explicit non-scope at top of WP; any reviewer PR-style feedback blocks such additions |
| Visual check skipped at Phase 4 despite memory | Broken end-to-end flow ships | Phase 4 MUST include Playwright verification per `feedback_visual_check_mandatory.md` |

---

## Acceptance Criteria

- [ ] Phase 0 carry-over (c) divergence audit logged; extract-vs-reimplement decision recorded with empirical metric
- [ ] TweakPanel exists on both surfaces (or single shared component if extracted); click-to-edit works; per-BP sliders for padding/font-size/gap/hide/show; reset works
- [ ] `emitTweak` called for every slider change; debounced preview reloads; no stray writes outside the selector+BP scope
- [ ] VariantsDrawer exists on both surfaces (or single shared); fork/rename/delete/undo works; name validation enforces convention with warning
- [ ] VariantEditor shows base + variant side-by-side; @container reveal preview at BP width works; panel-width slider shifts threshold preview
- [ ] Save path on tools/block-forge/ writes updated variants + CSS to file
- [ ] Save path on Studio writes updated variants + CSS via `updateBlockApi` → Supabase, `blocks.variants` column populated
- [ ] `revalidate { all: true }` fires after Studio save (existing WP-027 Phase 4 flow)
- [ ] Portal renders a saved variant-bearing block correctly at the expected BP (Playwright verification in Phase 4)
- [ ] Cross-surface round-trip confirmed: file block saved in tools/block-forge/ with variant → imported into Studio → variant intact in DB
- [ ] RHF `isDirty` fires on tweak change + variant change; Save applies all pending changes
- [ ] Existing WP-026/027 behaviour preserved (suggestion list, 3-panel preview, auto-accept/reject still work)
- [ ] Component-level parity snapshot tests green (reimplement path) OR single test set green (extract path)
- [ ] `npm run arch-test` green at final target (Phase 0 carry-over (g) projection)
- [ ] `npm run typecheck` clean across monorepo
- [ ] `npm -w @cmsmasters/studio run build` clean
- [ ] `npm -w @cmsmasters/block-forge-core run test` green
- [ ] `npm -w @cmsmasters/studio test` green
- [ ] `npm -w @cmsmasters/block-forge-ui run test` green (extract path only)
- [ ] Playwright E2E run at Phase 4 captured screenshots; all scenarios pass
- [ ] All 7 phases logged in `logs/wp-028/phase-*-result.md`
- [ ] Phase 6 Close under explicit approval gate (pattern 5/5 after this WP)
- [ ] Zero changes to `packages/block-forge-core/` (engine frozen); zero changes to `apps/portal/`; zero changes to `packages/ui/` except possibly a slider primitive addition if Phase 0 rules for one
- [ ] No known blockers for WP-029 (heuristic polish informed by real tweak/variant usage)

---

## Dependencies

| Depends on | Status | Blocks |
|---|---|---|
| WP-024 ✅ (Foundation) | Done | Variants column + portal render |
| WP-025 ✅ (Core engine) | Done | emitTweak + composeVariants |
| WP-026 ✅ (tools/block-forge/) | Done | First surface to consume tweaks + variants |
| WP-027 ✅ (Studio tab) | Done | Second surface; variants TS payload extension |
| ADR-025 active | ✅ | Layer 2 + Layer 4 scope contract |

This WP blocks:
- **WP-029** — Heuristic polish (informed by how authors actually use tweaks + variants on real content)
- **Responsive tokens real population** (separate WP, post-029) — informed by clamp/scale patterns that emerge

---

## Notes

- **This WP is the stress test for cross-surface parity discipline.** WP-026 and WP-027 proved the contract on simple UIs; WP-028 proves (or breaks) it at complexity that matters. Phase 0 audit is the decision moment, not a formality.
- **First real variants DB write.** Every prior WP touched `blocks.variants` structurally (column, types, schema, save-path plumbing). WP-028 Phase 4 is where actual author-authored variants land in production Supabase. E2E testing is mandatory.
- **Extract ruling is empirical, not ideological.** If Phase 0 metric says "≤15 non-cosmetic diffs total," reimplement continues. If "≥16," extract. No philosophical preference either way — the metric decides.
- **Snapshot-as-contract** (from saved memory `feedback_fixture_snapshot_ground_truth.md`) extends to component snapshots in the reimplement path. Component snapshot filenames are aspirational; the committed `.snap` is authority.
- **Pre-flight RECON is load-bearing** (saved memory `feedback_preflight_recon_load_bearing.md`) — applied strictly per Phase. Phase 0 for WP-028 is particularly important because the extract ruling depends on empirical data that didn't exist before this WP.
- **Visual verification is mandatory** at Phase 4 per saved memory `feedback_visual_check_mandatory.md`. Playwright verification is non-negotiable; auth walls are solvable.
- **Approval gate pattern** holds (4/4 through WP-027; 5/5 after this WP's Close). 6+ doc files in Phase 6 update list; gate is load-bearing.
- **ADR-025 is the tie-breaker** on all authoring-semantic questions.
