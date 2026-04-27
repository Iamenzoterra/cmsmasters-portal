# WP-033 Phase 5 — Result: Close (OQ fixes + SKILL flips + status flip)

> Epic: WP-033 Block Forge Inspector
> Phase 5 of 5 — **CLOSE**
> Owner: Hands
> Status: ✅ COMPLETE — all sub-sections green, 3 commits landed, smoke verified
> Pre-conditions met: Phase 4 GREEN (a94c2792 + 745a5bbc + 06df405b + c91fc696); Phase 5 task prompt committed at e3e9a1f4

---

## §5.0 — Pre-flight RECON findings

| Probe | Verdict | Notes |
|---|---|---|
| §5.0.1 Baseline | ✅ | arch-test 579/579 GREEN · typecheck exactly 2 baseline errors at `block-editor.tsx:20` + `:392` (NO new from Phase 4) · Phase 4 commit chain intact |
| §5.0.2 OQ1 risk surface | ✅ LOW RISK | `displayBlock` defined `ResponsiveTab.tsx:519`. **Single consumer**: `<ResponsivePreview block={displayBlock} />` at L676. SuggestionList / VariantsDrawer / TweakPanel / Inspector do NOT consume displayBlock. `splitCode` already imported (L601 inspectorBlockSource). `watchedFormCode` already in scope (L60 prop, used L579 + L599). Suggestion-accept path writes to form.code via `applyToFormFromSession → onApplyToForm → form.setValue('code', ...)` — switching displayBlock to follow form.code does NOT regress that flow. |
| §5.0.3 OQ2 errors | ✅ MINIMAL | Error 1: `block-editor.tsx:20` — `VariantAction` imported from ResponsiveTab but ResponsiveTab does NOT re-export it (currently from VariantsDrawer at L32). Fix: 1-line `export type { VariantAction } from './VariantsDrawer'` in ResponsiveTab.tsx. Error 2: `block-editor.tsx:392` — `formDataToPayload` returns `variants: BlockVariants \| null` (intentional NULL sentinel per WP-028 Phase 5 OQ2; backend validator is `nullable().optional()`); `updateBlockApi` signature only types `variants?: BlockVariants`. Fix: widen API client signature to `variants?: BlockVariants \| null` (matches backend schema). |
| §5.0.4 TweakPanel coexistence | ✅ | TweakPanel mounted `ResponsiveTab.tsx:685`, Inspector at `:693` — both populate from `block-forge:element-click`. WP-033 doc §5.2 still says "delete TweakPanel" — Phase 5 §5.7 resolves the contradiction via Brain ruling KEEP. |

**Gate:** ✅ All probes pass. Proceeded to §5.1.

---

## §5.1 — OQ1 fix: Studio iframe live-rerender on form.code

### Implementation

`apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx::displayBlock` derivation rewritten:

```tsx
// WP-033 Phase 5 OQ1: displayBlock follows watchedFormCode so Inspector +
// TweakPanel + SuggestionList tweaks reflect in the visible iframe immediately
// (DevTools mental model). Falls back to suggestions-applied derivation on
// initial mount when no form.code is threaded (e.g. test contexts).
const displayBlock = useMemo(() => {
  if (!block) return block
  const liveCode = watchedFormCode ?? ''
  if (liveCode) {
    const { html: liveHtml, css: liveCss } = splitCode(liveCode)
    return { ...block, html: liveHtml || block.html, css: liveCss || block.css }
  }
  if (session.pending.length === 0) return block
  const accepted = pickAccepted(session, suggestions)
  const applied = applySuggestions(
    { slug: block.slug, html: block.html ?? '', css: block.css ?? '' },
    accepted,
  )
  return { ...block, html: applied.html, css: applied.css }
}, [block, session, suggestions, watchedFormCode])
```

### Test coverage

NEW file `apps/studio/src/pages/block-editor/responsive/__tests__/responsive-tab-live-rerender.test.tsx` — 5 tests, all GREEN:

1. `reflects form.code mutations in iframe srcdoc IMMEDIATELY` — fingerprint `live-rerender-fingerprint-A` propagates via `watchedFormCode → displayBlock → ResponsivePreview iframe srcdoc`.
2. `falls back to block derivation when no form.code threaded (initial mount)` — `block-css-fingerprint-B` from `block.css` renders in iframe.
3. `empty watchedFormCode falls back to block (post-Reset shape)` — `watchedFormCode=""` triggers fallback path.
4. `form.code with only HTML (no <style>) still drives displayBlock html` — `new-html-fingerprint-D` propagates.
5. `updated watchedFormCode replaces previous fingerprint in iframe srcdoc` — re-render replaces INITIAL → UPDATED; INITIAL gone.

### Manifest

`src/__arch__/domain-manifest.ts` `studio-blocks` domain `+1 owned_files` for the new test file. Arch-test 580/580 GREEN (was 579 + 1).

### Acceptance

- ✅ Studio vitest 245/245 (240 baseline + 5 new); no regressions
- ✅ arch-test 580/580
- ✅ `splitCode` reused (no new helper)
- ✅ Fallback preserves test contexts (props without `watchedFormCode`)

---

## §5.2 — OQ2 fix: Studio typecheck cleanup

### Edit 1 — VariantAction re-export (`ResponsiveTab.tsx`)

```tsx
// WP-033 Phase 5 OQ2: re-export so block-editor.tsx can import VariantAction
// from ResponsiveTab (its actual definition lives in VariantsDrawer).
export type { VariantAction } from './VariantsDrawer'
```

Closes `block-editor.tsx:20` TS2459.

### Edit 2 — `updateBlockApi` signature widening (`block-api.ts`)

```ts
variants?: BlockVariants | null  // was: BlockVariants
```

Matches backend schema `variantsSchema.nullable().optional()` (validator at packages/validators); `null` is intentional NULL sentinel per WP-028 Phase 5 Ruling HH.

Closes `block-editor.tsx:392` TS2345.

### Acceptance

- ✅ `npx tsc --noEmit -p apps/studio/tsconfig.json` returns CLEAN (was 2 errors → 0 errors)
- ✅ No new errors introduced
- ✅ No test regressions

---

## §5.3 — WP-034 cascade-override stub

### Implementation

Created `workplan/WP-034-inspector-cascade-override.md` (NEW, ~80 LOC) — status 📋 BACKLOG. Captures problem statement (Phase 3 Issue #3), 3 evaluation paths (multi-tweak emit / cascade-clear / hybrid confirm modal), AC checklist, constraints (engine + tokens locked; cross-surface lockstep), cross-references to PARITY trio + Phase 4 Ruling 2 tooltip mitigation, phase budget estimate.

### Acceptance

- ✅ File exists with status BACKLOG
- ✅ NO implementation work
- ✅ Cross-references intact

---

## §5.4 — SKILL flips

### `.claude/skills/domains/infra-tooling/SKILL.md`

Appended `## Inspector (WP-033, ADR-025 Layer 2)` section (~57 LOC) covering:
- Start Here (5 entry points)
- Invariants (hover/pin protocol, selector strategy, probe iframe wrap discipline, module-scoped cache, emitTweak `bp:0`, single pin per slug, active-cell editable)
- Traps & Gotchas (focusout vs blur, chip cascade override → WP-034, package export migration, byte-identical IIFE)
- Blast Radius (cross-surface coordination, emitTweak ripple, responsive-config schema)
- Recipes (live smoke, add token category, debug probe staleness)

Status remained `full` (no skeleton flip).

### `.claude/skills/domains/studio-blocks/SKILL.md`

Appended `## Inspector cross-surface mirror (WP-033, ADR-025 Layer 2)` section (~45 LOC) covering:
- Start Here (5 entry points; emphasis on Studio-local lib helpers)
- Invariants (1:1 mirror discipline, dispatchInspectorEdit LIVE-read, removeDeclarationFromCss as Studio-local, Inspector IIFE byte-identical, TweakPanel coexistence V1, displayBlock follows watchedFormCode post-Phase 5 OQ1, probe iframe wrap, package export)
- Traps & Gotchas (focusout, displayBlock single consumer surface, integration test regex tightening, tsconfig paths precedence, wrap-LOCATION deviation, watchedFormCode load-bearing)
- Blast Radius (inspector/ cross-surface coordination, displayBlock ripple, dispatchInspectorEdit kind extension, IIFE block byte-identical contract)
- Recipes (Studio live smoke, add edit kind, debug pin postMessage)

Status remained `full` (no skeleton flip).

### Acceptance

- ✅ Both SKILL files updated
- ✅ No `+6 arch-tests` triggered (no skeleton → full flip; both already `full`)
- ✅ Pre-flight check confirmed no SKILL Skeleton state (saved memory `feedback_arch_test_status_flip` did not apply this phase)

---

## §5.5 — CONVENTIONS + BLOCK-ARCH-V2

### `.context/CONVENTIONS.md`

Appended `## Inspector pattern (WP-033, ADR-025 Layer 2)` section (~70 LOC, 8 sub-sections):
1. Hover/pin postMessage protocol table (4 message types)
2. DevTools mental model (single pin, active-cell, empty cells, validation)
3. Per-BP cell sourcing — Option A (3 hidden iframes; renderForPreview wrap discipline)
4. Chip detection — Option B-subset (PostCSS cascade walk; package import path)
5. Emit chains diverge (block-forge `addTweak` reducer vs Studio `dispatchInspectorEdit` form mutation)
6. TweakPanel + Inspector coexistence V1 (locked)
7. Live-rerender contract (Phase 5 OQ1)
8. Known limitation — chip cascade override (WP-034 stub)

References block: 7 cross-refs (PARITY trio + 2 SKILLs + WP-033 + WP-034 stub).

### `workplan/BLOCK-ARCHITECTURE-V2.md`

Inserted 1 annotation row (2026-04-27 / WP-033) after WP-029 in the architecture-update timeline. Captures: cross-surface mirror, postMessage protocol, single-pin model, Option A + B-subset, tooltip pin caveat, TweakPanel coexistence, OQ1 live-rerender, ADR-025 Layer 2 closed alongside.

### Acceptance

- ✅ Both files updated
- ✅ Cross-reference graph closed (CONVENTIONS → SKILLs → WP-033 doc → WP-034 stub)

---

## §5.6 — BRIEF + ROADMAP

### `.context/BRIEF.md`

Inserted 1 status row in the Layer status table (after WP-030 row): `Block Forge Inspector ✅ DONE (WP-033: ...)` — captures 5 phases shipped, ~95 Studio + 63 block-forge new tests, 580/580 arch-test, typecheck CLEAN, live smoke 12/12 GREEN, ADR-025 Layer 2 closure, WP-034 BACKLOG stub.

### `.context/ROADMAP.md`

Added 3 horizon rows after the WP-030 OQ-δ row:
1. WP-034 BACKLOG (cascade-override fix; documented at workplan/WP-034-inspector-cascade-override.md)
2. TweakPanel sunset decision (post-WP-033) — surface field data on Inspector vs TweakPanel preference
3. Inspector e2e Playwright coverage (post-WP-033) — established tier is unit + manual smoke (Phase 5 Ruling 3 DEFER)

### Acceptance

- ✅ BRIEF status table accurate
- ✅ ROADMAP horizon visible

---

## §5.7 — WP-033 doc status flip

### `workplan/WP-033-block-forge-inspector.md`

1. **Status flipped:** 🟡 IN PROGRESS → ✅ DONE
2. **Completed: 2026-04-27** added to header
3. **Effort line:** "5–7 days across 5 phases (~40-55 hours estimated; actual ~28h)"
4. **Outcome Ladder section** added (Bronze / Silver / Gold / Platinum tiers with evidence) — mirrors WP-030 pattern
5. **Commit Ladder section** added (Phase 0–5 SHA history; Phase 5 SHAs filled in §5.10 backfill commit)
6. **§5.2 task rewritten** — superseded "Delete TweakPanel" with Phase 5 Brain ruling KEEP. Inspector + TweakPanel coexist V1; sunset deferred to follow-up after author field data.
7. **AC checklist updated** — TweakPanel deletion AC item struck through with note: "superseded by Phase 5 Brain ruling KEEP (coexistence V1; sunset deferred to follow-up after field data)"

### Acceptance

- ✅ Status flipped
- ✅ Outcome ladder filled
- ✅ Commit ladder framework in place (Phase 5 SHAs to be backfilled in §5.10)
- ✅ §5.2 reflects Brain ruling KEEP coexistence
- ✅ AC strike honest

---

## §5.8 — Doc batch summary (awaiting Brain approval)

**Hands STOPS here per saved memory `feedback_close_phase_approval_gate` + Phase 5 task prompt §5.8.** 8 doc files touched (≥3 threshold fired). Cross-file drift risk audit before atomic commit.

| File | Change | Why | LOC |
|---|---|---|---|
| `.claude/skills/domains/infra-tooling/SKILL.md` | +Inspector section (Start Here / Invariants / Traps / Blast / Recipes) | Phase 5 ruling §5.4 | ~57 |
| `.claude/skills/domains/studio-blocks/SKILL.md` | +Inspector cross-surface mirror section | Phase 5 ruling §5.4 | ~45 |
| `.context/CONVENTIONS.md` | +Inspector pattern section (8 sub-sections) | Phase 5 ruling §5.5 | ~70 |
| `workplan/BLOCK-ARCHITECTURE-V2.md` | +1 annotation row (WP-033 / 2026-04-27 / Layer 2 closed alongside) | Phase 5 ruling §5.5 | +1 |
| `.context/BRIEF.md` | +1 status row WP-033 ✅ DONE | Phase 5 ruling §5.6 | +1 |
| `.context/ROADMAP.md` | +3 horizon rows (WP-034 + TweakPanel sunset + Playwright) | Phase 5 ruling §5.6 | +3 |
| `workplan/WP-033-block-forge-inspector.md` | Status flip 🟡 → ✅ + Completed date + Outcome ladder + Commit ladder + §5.2 rewrite + AC strikethrough | Phase 5 ruling §5.7 | ~30 mod |
| `workplan/WP-034-inspector-cascade-override.md` | **NEW stub** (BACKLOG; problem / paths / AC / refs) | Phase 5 ruling §5.3 | ~80 (NEW) |

**Total:** 8 doc files (≥3 → approval gate fires per saved memory).

### Cross-file drift audit (Hands self-check)

- ✅ TweakPanel coexistence V1 stated identically in: CONVENTIONS §6, infra-tooling SKILL §Invariants, studio-blocks SKILL §Invariants, WP-033 §5.2, WP-033 AC strikethrough.
- ✅ `displayBlock follows watchedFormCode` stated identically in: studio-blocks SKILL §Invariants, CONVENTIONS §7, BRIEF status row, BLOCK-ARCH-V2 annotation, Outcome ladder Platinum.
- ✅ `@cmsmasters/ui/responsive-config.json` package export stated identically in: infra-tooling SKILL §Traps, studio-blocks SKILL §Invariants, CONVENTIONS §4.
- ✅ WP-034 BACKLOG status referenced identically in: ROADMAP, BRIEF status row, BLOCK-ARCH-V2 annotation, CONVENTIONS §8, infra-tooling SKILL §Traps, studio-blocks SKILL §Blast Radius, WP-033 doc.
- ✅ `580/580 arch-test` and `typecheck CLEAN` reported identically across: result.md, BRIEF status row.

**Brain — review + approve OR request edits BEFORE Hands commits §5.10.** No code/doc changes from §5.8 onward until approval signal.

---

## §5.9 — Final verification

### Block-forge regression smoke (`:7702`, `fast-loading-speed`)

Driven via Playwright MCP from a fresh navigation. Steps:

1. Selected `fast-loading-speed` from the picker → triptych iframe loaded.
2. Real `click` event dispatched on `.gauge-score` inside the 1440 iframe → IIFE's `block-forge:inspector-request-pin` posted → Inspector populated with selector `div.slot-inner > div:nth-of-type(1) > section.block-fast-loading-speed > div.gauge-wrap > div.gauge-score`.
3. Active cell at 1440 (font-size, value `60px`) → input edit `60px → 48px` → focusout dispatch → tweak emitted to session.
4. Verification: `iframe.contentDocument.querySelector('.gauge-score')` getComputedStyle font-size = **`48px`**; iframe srcdoc contains `48px` AND `@container slot (max-width: 1440px)` ✅
5. ↗ button on font-size 768 cell clicked → BP switched to 768 → iframe width = `768px`, visible tab → "Tablet 768px" ✅
6. Pin preserved across BP switch ✅

### Studio OQ1 live-rerender smoke (`:5173/blocks/1cbfccdf-927a-43e1-a2b7-0605dc2be954`, `fast-loading-speed`)

**This is the headline Phase 5 deliverable** — proof the visible iframe reflects Inspector edits IMMEDIATELY (no save round-trip).

1. Navigated to block → switched to Responsive tab → 3 visible iframes (1440 / 768 / 375) + Inspector mounted alongside TweakPanel.
2. Real `click` on `.gauge-score` inside the 1440 iframe → Inspector pinned (selector text matches Studio's wrap shape: `div:nth-of-type(1) > div:nth-of-type(1) > section.block-fast-loading-speed > div.gauge-wrap > div.gauge-score`).
3. **BEFORE** measurement: `iframe.contentWindow.getComputedStyle('.gauge-score').fontSize` = **`60px`**.
4. Active cell at 1440 (font-size textbox value `60px`) → edit `60px → 47px` → focusout dispatch.
5. **AFTER** measurement (no save, ~1s wait): `getComputedStyle('.gauge-score').fontSize` = **`47px`** ✅
6. iframe srcdoc contains `47px` AND `@container slot (max-width: 1440px)` ✅
7. Inspector active cell value = `47px` ✅
8. TweakPanel coexists — same selector populated; both live in the right rail ✅
9. "Unsaved changes" + "Save Changes" button visible in footer (form is dirty) ✅
10. Screenshot saved at [logs/wp-033/wp033-p5-smoke-studio-oq1-live-rerender.png](logs/wp-033/wp033-p5-smoke-studio-oq1-live-rerender.png).

### Smoke verdict

| Check | Result |
|---|---|
| block-forge: pin → cell edit → iframe re-render | ✅ |
| block-forge: ↗ BP switch preserves pin | ✅ |
| Studio: pin → cell edit → **iframe reflects 60→47px IMMEDIATELY** (OQ1 fix verified) | ✅ |
| Studio: TweakPanel + Inspector coexistence (same selection) | ✅ |
| Studio: form dirty signal lit (Save Changes enabled) | ✅ |

All Phase 5 acceptance flows GREEN. Pre-existing Phase 3+4 contracts (chip apply / visibility hide-show) untouched by Phase 5 — covered by 275/275 block-forge vitest + 245/245 Studio vitest.

---

## §5.10 — Commits

(in progress — fix commit + doc batch commit + result.md commit + SHA backfill)

---

## Notes for Brain Review

- **OQ1 fix scope** — `displayBlock` derivation now wraps `watchedFormCode`; the suggestions-applied path (handleAccept → applyToFormFromSession → form.setValue) still works because form.code reflects accepted suggestions BEFORE displayBlock reads it. RECON §5.0.2 confirmed the only consumer of `displayBlock` is `<ResponsivePreview>` at L676 — low risk surface.
- **OQ2 fix direction** — widened API client (not narrowed `formDataToPayload`) because `null` is the intentional NULL-sentinel per WP-028 Phase 5 Ruling HH, and backend schema is `nullable().optional()`. The previous client signature was simply tighter than the backend.
- **TweakPanel coexistence** — original WP-033 §5.2 task said "Delete TweakPanel". Phase 0 §0.4 + Phase 4 §4.6 verified coexistence works. Phase 5 ruling KEEPS both; sunset deferred. AC strikethrough preserves history.
- **No `+6 arch-tests`** — saved memory `feedback_arch_test_status_flip` did NOT trigger this phase. Both target SKILLs (infra-tooling + studio-blocks) were already `full`. Arch-test target stays at 580/580 from the OQ1 test addition only.
- **Approval gate enforcement** — saved memory `feedback_close_phase_approval_gate` honoured: 8 doc files ≥3 threshold; Hands posts batch summary above and STOPS until Brain approves.
- **Cascade-override fix** — DEFERRED to WP-034 (BACKLOG). PARITY trio "Known limitations" sections + Phase 4 tooltip pin remain V1 mitigation.

---

## Git

**Phase 5 SHAs:**
- Task prompt: `e3e9a1f4` (Brain pre-handoff)
- Fix commit (OQ1 + OQ2 + WP-034 stub): `841d1c41`
- Doc batch commit (7 doc files atomic): `ff55f868`
- Result.md + SHA backfill commit: TBD (this commit)
