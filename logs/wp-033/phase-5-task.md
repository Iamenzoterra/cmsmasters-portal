# WP-033 Phase 5 — Task Prompt: Close (OQ fixes + SKILL flips + CONVENTIONS + approval gate + status flip)

> Epic: WP-033 Block Forge Inspector
> Phase 5 of 5 — **CLOSE**
> Owner: Hands (separate Claude Code terminal)
> Brain: this prompt
> Operator: Dmytro
> Effort budget: 6–9h
> Status: 📋 PENDING — task prompt drafted, awaiting Operator approval to commit + handoff
> Pre-conditions met: Phase 4 GREEN (arch-test 579/579 · Studio vitest 240 · block-forge vitest 275 · live smoke 12/12 · 5 Brain rulings honored · 5 Open Questions documented for Phase 5)

---

## TL;DR — what Hands ships in Phase 5

**10 sub-sections, 6-9h budget, 4 commits expected:**

1. **§5.0 Pre-flight RECON** (15-30min) — verify post-Phase 4 state + OQ rulings still applicable
2. **§5.1 OQ1 fix** (2-3h) — **Studio iframe live-rerender on form.code** (FIX, not defer)
3. **§5.2 OQ2 fix** (15-30min) — Studio typecheck cleanup (VariantAction + BlockVariants)
4. **§5.3 OQ5 stub** (15min) — WP-034 cascade-override placeholder in workplan/
5. **§5.4 SKILL flips** (1-2h) — `infra-tooling` + `studio-blocks` Inspector sections
6. **§5.5 CONVENTIONS + BLOCK-ARCHITECTURE-V2** (1h) — Inspector pattern documented
7. **§5.6 BRIEF + ROADMAP** (30min) — status table + horizon entry
8. **§5.7 WP-033 doc** (30min) — status flip 🟡 → ✅ + Outcome ladder + TweakPanel coexistence note
9. **§5.8 Approval gate** (instant — `feedback_close_phase_approval_gate`) — Hands STOPS, posts doc batch summary, awaits Brain approval BEFORE doc commit
10. **§5.9-5.10 Final verification + commits** (45min) — arch-test, typecheck, vitest, smoke; 3 commits

**Hard gates — zero touch:**
- ❌ Inspector behavioral changes (Phase 3 + 4 surface LOCKED — Phase 5 is doc + small-fix only)
- ❌ Engine package edits (`packages/block-forge-core/**`)
- ❌ Token system edits (`packages/ui/src/**`)
- ❌ TweakPanel.tsx (KEEP both surfaces; coexistence ruling below)
- ❌ Cascade-override fix (DEFER per Ruling 5; only stub WP-034 in workplan/)
- ❌ Playwright e2e tests (DEFER per Ruling 3)
- ❌ inspectorBp localStorage persistence (DEFER per Ruling 4)
- ❌ block-forge file changes (Phase 4 already finalized the only allowed touch — TokenChip tooltip + useChipDetection import)

**Soft gate — Phase 5 edits:**
- ✅ `apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx` — OQ1 live-rerender fix
- ✅ `apps/studio/src/pages/block-editor.tsx` — OQ2 typecheck cleanup (VariantAction re-export, BlockVariants widening)
- ✅ `workplan/WP-034-inspector-cascade-override.md` — NEW stub
- ✅ `.claude/skills/domains/infra-tooling/SKILL.md` — Inspector additive section
- ✅ `.claude/skills/domains/studio-blocks/SKILL.md` — Inspector additive section
- ✅ `.context/CONVENTIONS.md` — Inspector pattern section
- ✅ `workplan/BLOCK-ARCHITECTURE-V2.md` — Layer 2 cross-ref
- ✅ `.context/BRIEF.md` — status table entry
- ✅ `.context/ROADMAP.md` — WP-034 horizon entry
- ✅ `workplan/WP-033-block-forge-inspector.md` — status flip + Outcome ladder
- ✅ `logs/wp-033/phase-3-result.md` + `phase-4-result.md` — backfill commit SHAs (Phase 4 already partially done; verify)
- ✅ `src/__arch__/domain-manifest.ts` — IF OQ1 fix adds a new test file, +1 owned_file

---

## Brain rulings — 5 OQs from Phase 4 result.md

These rulings are LOCKED for Phase 5 entry. RECON §5.0 verifies + escalates if any pre-condition has shifted.

### 🔔 Ruling 1 — OQ1 Studio iframe live-rerender on form.code: **FIX in Phase 5**

**Decision:** Modify `apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx`'s `displayBlock` derivation to follow `watchedFormCode` so the visible iframe reflects Inspector tweaks immediately.

**Rationale:**
- Inspector's UX promise IS "edit and see immediately" (DevTools mental model). Without live-rerender, Phase 4 ships an Inspector that LOOKS right but performs wrong — same disappointment as the Phase 0 RECON-flagged WP-028 anti-pattern.
- Probe iframes (the 3 hidden ones in `useInspectorPerBpValues`) ALREADY source from `splitCode(watchedFormCode)` (Phase 4 result.md §Issue #1). Probe values DO reflect live form state. The visible iframe inconsistency is the bug.
- TweakPanel's slider UX is debounced (300ms); aligning visible iframe to form.code does NOT break TweakPanel — TweakPanel writes to form.code via `dispatchTweakToForm` exactly the same way as Inspector. Both surfaces benefit.
- Risk: VariantsDrawer + SuggestionList may consume `displayBlock` differently. RECON §5.0 verifies.

**Implementation contract:**

```tsx
// CURRENT in ResponsiveTab.tsx ~L463-471:
const displayBlock = useMemo(() => {
  if (!session.fluidModeOverride && (block.html === '...' || ...)) return block
  return { ...block, html: composedHtml, css: composedCss }
}, [block, session, ...])

// NEW Phase 5 — live-rerender on form.code:
const displayBlock = useMemo(() => {
  const liveCode = watchedFormCode ?? ''
  const { html: liveHtml, css: liveCss } = splitCode(liveCode)
  // If form.code has content, use it; otherwise fall back to derived state
  if (liveHtml || liveCss) {
    return { ...block, html: liveHtml || block.html, css: liveCss || block.css }
  }
  return /* existing fallback */
}, [block, session, watchedFormCode, ...])
```

Hands MAY refine this shape during implementation — the contract is "visible iframe sees form.code mutations live". Document final shape in result.md §5.1.

**Test coverage targets (§5.1):**

NEW test file `apps/studio/src/pages/block-editor/responsive/__tests__/responsive-tab-live-rerender.test.tsx` — ~5 tests:
1. After dispatchTweakToForm commits new value → displayBlock reflects update
2. Initial mount with no form.code → displayBlock derives from block (existing fallback)
3. Reset clears form.code → displayBlock falls back to block
4. SuggestionList accept → form.code update → displayBlock reflects (verifies coexistence with existing emit paths)
5. VariantsDrawer fork → form.code variants update → displayBlock reflects

**Live smoke verification:** pin element → cell-edit `60px` → `48px` → blur → visible iframe shows 48px IMMEDIATELY (not after Save).

**Escalation triggers:**
- If RECON §5.0.2 reveals SuggestionList or VariantsDrawer broke from displayBlock change → halt; document; await Brain ruling on revert vs adapt
- If 5 new tests reveal a regression in existing TweakPanel test suite → halt; document

### 🔔 Ruling 2 — OQ2 Pre-existing typecheck errors: **FIX in Phase 5 Close**

**Decision:** Fix the 2 baseline typecheck errors at `apps/studio/src/pages/block-editor.tsx:20` and `:392`.

**Rationale:**
- Small, no-risk edits (VariantAction re-export from ResponsiveTab.tsx; BlockVariants null → undefined widening).
- Phase 5 Close should leave the project in CLEAN state. "Close" means tying off loose ends. Pre-existing errors in adjacent code count.
- Verifies typecheck cleanliness post-Phase 5 — establishes future regression baseline.

**Implementation:**

1. **VariantAction re-export:** Read current `ResponsiveTab.tsx` exports. Add a `export type { VariantAction } from './VariantsDrawer'` line (re-export pattern). Block-editor.tsx imports stay unchanged.

2. **BlockVariants null|undefined widening:** Read line 392. Likely a `?? null` → `?? undefined` or signature widening. Minimal edit; verify no test regression.

**Acceptance:** `npm run typecheck` clean post-fix. No new errors introduced.

### 🔔 Ruling 3 — OQ3 Inspector live integration tests (Playwright): **DEFER**

**Decision:** Phase 5 does NOT add Playwright e2e tests. Unit vitest (Phase 3 + 4) + manual live smoke (per phase) is the established testing tier.

**Rationale:**
- Adding Playwright is its own infrastructure investment (browser test runner, fixtures, CI integration). Out of WP-033 scope.
- WP-028 Phase 4 used one-shot manual smoke shots (not Playwright); Inspector inherits same pattern.
- If/when Inspector regression bites in production, scope a dedicated WP for e2e investment. Not now.

### 🔔 Ruling 4 — OQ4 `inspectorBp` localStorage persistence: **DEFER**

**Decision:** Phase 5 does NOT add localStorage persistence. In-memory state matches block-forge.

**Rationale:**
- YAGNI. No user feedback yet that resets-on-reload is painful.
- Block-forge has the same in-memory behavior — coordinated decision: both stay or both add. Both stay.
- If user demand emerges, scope a follow-up WP for both surfaces simultaneously.

### 🔔 Ruling 5 — OQ5 Cascade-override fix WP scoping: **Stub `workplan/WP-034-inspector-cascade-override.md`; do NOT implement**

**Decision:** Phase 5 creates a placeholder/scaffold WP doc in `workplan/` describing the cascade-override fix (chip apply with @container clearing). Status: 📋 BACKLOG. NOT executed in Phase 5.

**Rationale:**
- The limitation is real but the fix is non-trivial (multi-tweak emit + cascade detection).
- WP-033 was specifically scoped to NOT include behavior changes around chip cascade. Tooltip + PARITY docs from Ruling 2 (Phase 4) is the V1 mitigation.
- Scoping a follow-up WP keeps the work visible without expanding WP-033.
- WP-034 stub in workplan/ ensures the issue isn't lost.

**WP-034 stub minimum content:**

```markdown
# WP-034 — Inspector Cascade-Override Fix

> **Status:** 📋 BACKLOG (not started)
> **Origin:** WP-033 Phase 4 Open Question 5; Phase 3 Issue #3
> **Estimated effort:** 1-2 phases

## Problem
[Describe cascade-override symptom from Phase 3 result.md §Issue #3]

## Acceptance criteria
- Chip apply on a property with pre-existing @container rules: token visibly applies at all 3 BPs
- No regression in chip-apply behavior for properties without @container conflicts
- Cross-surface (block-forge + Studio) coordinated update

## Notes
[Reference WP-033 PARITY trio "Known limitations" sections]
```

Phase 5 ships this scaffold. Implementation is a future WP execution.

---

## TweakPanel coexistence resolution (Phase 0 ↔ WP §5.2 contradiction)

**Brain ruling: KEEP BOTH surfaces. TweakPanel + Inspector coexist V1.**

The original WP-033 §5.2 task list said "Delete TweakPanel.tsx from both surfaces". But:
- Phase 0 §0.4 ruled coexistence (both can listen to `block-forge:element-click` without conflict)
- Phase 4 §4.6 verified coexistence works in live smoke (TweakPanel + Inspector both populate; both emit against same form.code)
- Removing TweakPanel is destructive (breaks muscle memory, removes WP-029 polish)

**Phase 5 action:** UPDATE `workplan/WP-033-block-forge-inspector.md` §5.2 — remove the "delete TweakPanel" task; document coexistence rationale. Schedule TweakPanel sunset as a follow-up WP after usage data shows redundancy.

**CONVENTIONS.md note:** "TweakPanel + Inspector coexist V1; Inspector is preferred for discrete property edits + token-aware suggestions; TweakPanel is preferred for continuous-drag value tweaking. Sunset decision deferred."

---

## §5.0 — Pre-flight RECON (mandatory, 15-30min, zero code)

Per saved memory `feedback_preflight_recon_load_bearing` — even Close phases benefit from RECON. Phase 4 had 1 RECON gap (Inspector IIFE missing in Studio preview-assets) — Phase 5 RECON probes verify post-Phase 4 state + ruling pre-conditions.

### §5.0.1 — Post-Phase 4 baseline verification

Confirm:
- `git log --oneline | head -10` shows 4 Phase 4 commits (a94c2792 + 745a5bbc + 06df405b + c91fc696)
- `npm run arch-test` → 579/579 GREEN
- `npm run typecheck` → 2 baseline errors confirmed at `block-editor.tsx:20` + `:392` (NO new ones from Phase 4)
- `npm run test` (block-forge) → 275 GREEN
- Studio vitest baseline → 240 GREEN
- All Phase 4 result.md commit SHAs filled in (per c91fc696 backfill)

### §5.0.2 — Ruling 1 (OQ1) impact analysis

Read:
- `apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx` line ~463-471 (`displayBlock` useMemo definition)
- `apps/studio/src/pages/block-editor/responsive/ResponsivePreview.tsx` line ~31-65 (consumer of displayBlock)
- All consumers of `displayBlock` (grep within ResponsiveTab.tsx + adjacent files)

Document:
- Current useMemo deps for displayBlock
- All consumers of displayBlock (TweakPanel? VariantsDrawer? SuggestionList? PreviewPanel? ResponsivePreview?)
- Risk surface: which consumers may break if displayBlock follows watchedFormCode
- Test coverage at each consumer (do they verify displayBlock-derived state?)

### §5.0.3 — Ruling 2 (OQ2) typecheck error confirmation

Read:
- `apps/studio/src/pages/block-editor.tsx:20` (VariantAction import)
- `apps/studio/src/pages/block-editor.tsx:392` (BlockVariants null|undefined site)
- `apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx` exports list (does VariantAction need re-export?)
- `apps/studio/src/pages/block-editor/responsive/VariantsDrawer.tsx` (where VariantAction lives currently)

Document:
- Exact error messages from `npm run typecheck`
- Minimal patch path (probably 1-line re-export + 1-line type widening)

### §5.0.4 — TweakPanel coexistence current state

`grep -rn "TweakPanel" tools/block-forge/src apps/studio/src/pages/block-editor` and confirm:
- TweakPanel.tsx still mounted in both surfaces
- Tests still pass with TweakPanel present
- WP-033 §5.2 still says "delete" (this is the contradiction Phase 5 §5.7 resolves)

### §5.0.5 — RECON output requirements

Output: a `logs/wp-033/phase-5-result.md §5.0` section with:
- ✅/⚠️/❌ verdict per probe (4 probes)
- Documented current state of each baseline check
- Risk surface for OQ1 fix (which consumers may break)
- Pass/fail gate: if §5.0.1 baseline shows MORE than 2 typecheck errors OR less than 579 arch-test → ESCALATE; do NOT proceed.

---

## §5.1 — OQ1 fix: Studio iframe live-rerender on form.code

(Per Ruling 1 above. ~2-3h.)

### Implementation

Read current `displayBlock` derivation in ResponsiveTab.tsx (around line 463). The existing pattern likely is:

```tsx
const displayBlock = useMemo(() => {
  // some derivation from block + session + composed*
  return { ...block, html, css }
}, [block, session, composedHtml, composedCss])
```

Phase 5 changes the derivation to also follow `watchedFormCode`:

```tsx
const watchedFormCode = useWatch({ control: form.control, name: 'code' })

const displayBlock = useMemo(() => {
  // First, try to use live form.code (Inspector + TweakPanel + SuggestionList all write here)
  const { html: liveHtml, css: liveCss } = splitCode(watchedFormCode ?? '')
  if (liveHtml || liveCss) {
    return { ...block, html: liveHtml || block.html, css: liveCss || block.css }
  }
  // Fallback to existing block-derived state
  return /* existing logic */
}, [block, session, watchedFormCode, /* existing deps */])
```

`splitCode` already exists in ResponsiveTab.tsx — reuse the existing function (no new helper).

`useWatch` may already be in scope (TweakPanel slider seeding uses watched form values per WP-029). Verify or add.

### Test coverage (~5 tests in NEW file `responsive-tab-live-rerender.test.tsx`)

Per Ruling 1 §Test coverage targets — 5 tests covering:
1. Tweak-driven form.code update → displayBlock reflects
2. Initial mount fallback to block-derived state
3. Reset clears form.code → fallback fires
4. SuggestionList accept → live update
5. VariantsDrawer fork → live update (variants flow)

### Smoke check

Run Studio dev server. Pin `.gauge-score` on fast-loading-speed (or equivalent). Cell-edit font-size 60→48. **Visible iframe shows 48px IMMEDIATELY (no Save required).**

### Escalation

Per Ruling 1 §Escalation triggers — if RECON §5.0.2 reveals risk surface that's load-bearing for SuggestionList / VariantsDrawer behavior, halt + escalate. Do NOT silently break those flows.

---

## §5.2 — OQ2 fix: Studio typecheck cleanup

(Per Ruling 2 above. ~15-30min.)

### Implementation

Two minimal edits:

1. **`apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx`** — add re-export:

```tsx
export type { VariantAction } from './VariantsDrawer'
```

(Or wherever VariantAction currently lives; RECON §5.0.3 confirms.)

2. **`apps/studio/src/pages/block-editor.tsx:392`** — widen the type:

```tsx
// IF currently:
const variants: BlockVariants | null = ...

// CHANGE TO:
const variants: BlockVariants | undefined = ...
```

Or whichever direction RECON §5.0.3 reveals the assignment goes.

### Acceptance

`npm run typecheck` from repo root → clean. NO new errors introduced.

### Test coverage

No new tests required — typecheck IS the verification surface.

---

## §5.3 — OQ5 stub: WP-034 cascade-override placeholder

(Per Ruling 5 above. ~15min.)

### Implementation

Create `workplan/WP-034-inspector-cascade-override.md` with the minimum content from Ruling 5 §WP-034 stub above.

Mark as 📋 BACKLOG (NOT started).

Reference WP-033 Phase 3 Issue #3 + Phase 4 Ruling 2 + PARITY trio "Known limitations" sections.

### Acceptance

File exists at `workplan/WP-034-inspector-cascade-override.md` with status 📋 BACKLOG. No implementation work.

---

## §5.4 — SKILL flips (`infra-tooling` + `studio-blocks` Inspector sections)

(~1-2h.)

### `.claude/skills/domains/infra-tooling/SKILL.md` — add Inspector section

Read the file's existing structure (Skeleton vs Full status, existing sections). Add a new section under appropriate header:

```markdown
### Inspector (WP-033)

**Owned files:**
- `tools/block-forge/src/components/{Inspector,InspectorPanel,PropertyRow,BreadcrumbNav,TokenChip}.tsx`
- `tools/block-forge/src/hooks/{useInspectorPerBpValues,useChipDetection}.ts`
- `tools/block-forge/src/__tests__/...` (8 test files)

**Invariants:**
- Hover/pin protocol via `block-forge:inspector-{hover,unhover,request-pin,pin-applied}` postMessage types
- rAF throttle on hover events; cleanup on iframe re-mount
- Selector strategy: id > stable-class > tag.class > nth-of-type fallback (depth 5; UTILITY_PREFIXES filtered)
- Probe iframes (3 hidden) MUST run html through `renderForPreview` before `composeSrcDoc` (matches visible iframe DOM with `<div data-block-shell="{slug}">` wrap)
- Module-scoped cache by `(selector, cssHash)`; cleanup on unmount + pin clear
- emitTweak `{bp: 0}` = top-level rule (no @container wrap); empirical pin in slider-bug-regression.test.ts

**Traps & Gotchas:**
- `<input>` blur events don't bubble in browser; React listens to `focusout`. Live tests use `fireEvent.blur` (testing-library); native code paths must dispatch `focusout` not `blur`.
- Chip-apply emits at bp:0 but pre-existing @container rules may override (see PARITY trio "Known limitations"). WP-034 follow-up addresses.
- TokenChip `responsive-config.json` import uses `@cmsmasters/ui/responsive-config.json` package export (post-WP-033 Phase 4 Ruling 5 migration); not relative path.

**Blast Radius:**
- Hover/pin protocol changes affect both block-forge AND Studio Inspector — coordinated edit required (see studio-blocks SKILL).
- emit-tweak engine changes ripple to TweakPanel + Inspector + Studio mirror simultaneously.
```

### `.claude/skills/domains/studio-blocks/SKILL.md` — add Inspector cross-surface mirror section

Read existing structure. Add:

```markdown
### Inspector cross-surface mirror (WP-033 Phase 4)

**Owned files:**
- `apps/studio/src/pages/block-editor/responsive/inspector/{Inspector,InspectorPanel,PropertyRow,BreadcrumbNav,TokenChip}.tsx`
- `apps/studio/src/pages/block-editor/responsive/inspector/hooks/{useInspectorPerBpValues,useChipDetection}.ts`
- `apps/studio/src/pages/block-editor/responsive/inspector/lib/{dispatchInspectorEdit,css-mutate}.ts`
- `apps/studio/src/pages/block-editor/responsive/inspector/__tests__/...` (10 test files)

**Invariants:**
- 1:1 mirror of block-forge Inspector internals; emit-boundary diverges (block-forge: `addTweak` reducer; Studio: `dispatchInspectorEdit(form, edit)` form mutation)
- `dispatchInspectorEdit` uses LIVE-read `form.getValues('code')` at dispatch time (no closure cache; matches `dispatchTweakToForm` invariant from WP-028 Phase 2)
- Studio's `preview-assets.ts` MUST mirror block-forge's Inspector IIFE block byte-identically (Phase 4 Issue #2)
- TweakPanel + Inspector coexist V1 (Phase 0 §0.4 + Phase 4 §4.6 verified); both write to form.code

**Traps & Gotchas:**
- `removeDeclarationFromCss` (Studio-local) handles visibility uncheck; mirrors inverse of emitTweak's create-if-missing logic (cleans empty rules + empty @container blocks)
- `displayBlock` follows `watchedFormCode` post-WP-033 Phase 5 OQ1 fix — Inspector tweaks visible in iframe immediately
- Studio's PARITY.md §7 wrap-LOCATION deviation (data-block-shell emitted by composeSrcDoc, not renderForPreview) is documented; Inspector probe iframes pass through renderForPreview to match the visible DOM

**Blast Radius:**
- Inspector hooks/components changes: same coordination as block-forge surface (see infra-tooling SKILL)
- ResponsiveTab `displayBlock` derivation affects ALL preview consumers (ResponsivePreview, VariantsDrawer, SuggestionList) — coordinated test
```

### Acceptance

Both SKILL.md files committed with Inspector sections. No SKILL Skeleton→Full status flip (per Phase 0 §0.1 reading: infra-tooling already past Skeleton; studio-blocks already Full).

If RECON §5.0 reveals one of these IS Skeleton, escalate — saved memory `feedback_arch_test_status_flip` triggers +6 arch-tests on flip; need to update target.

---

## §5.5 — CONVENTIONS + BLOCK-ARCHITECTURE-V2

(~1h.)

### `.context/CONVENTIONS.md` — add "Inspector pattern (WP-033)" section

Document the canonical Inspector authoring pattern:

- Hover/pin postMessage protocol (4 types in `block-forge:` namespace)
- DevTools-style mental model (single pin per slug; ↗ for inactive cells; active cell editable)
- 3-hidden-iframe approach for per-BP cell sourcing (Option A; Phase 0 §0.9)
- PostCSS rule lookup for chip detection (Option B-subset)
- emit chains: block-forge `addTweak` reducer; Studio `dispatchInspectorEdit` form mutation
- TweakPanel + Inspector V1 coexistence rationale + sunset deferred
- Known limitation: chip cascade override (WP-034 stub)

### `workplan/BLOCK-ARCHITECTURE-V2.md` — Layer 2 cross-ref

Add Inspector entry under Layer 2 (authoring tools layer):

```markdown
### Layer 2 — Authoring tools (closed by WP-033)

- **TweakPanel** (WP-028) — slider-driven discrete-bp tweak emission
- **Inspector** (WP-033) — DevTools-style hover/pin + per-property cell edit + token-aware chip suggestions
  - Cross-surface: block-forge (tools/block-forge) + Studio (apps/studio/.../responsive/inspector)
  - Engine 6-fn API contract reused (analyzeBlock + emitTweak + composeVariants); no engine changes
  - Per-BP sourcing via 3 hidden iframes (Option A); chip detection via PostCSS walk (Option B-subset)
- **VariantsDrawer** (WP-029) — fork/rename/delete variant flows
- **SuggestionList + heuristic chips** (WP-026) — engine-emitted token suggestions

ADR-025 Layer 2 status: ✅ CLOSED (WP-033 ships Inspector authoring tool).
```

### Acceptance

Both files committed with Inspector additions. CONVENTIONS clearly explains the WP-033 contribution; BLOCK-ARCHITECTURE-V2 marks Layer 2 closed.

---

## §5.6 — BRIEF + ROADMAP

(~30min.)

### `.context/BRIEF.md` — status table entry

Update the WP status table to mark WP-033 ✅ DONE with completion date:

```markdown
| WP-033 | Block Forge Inspector | ✅ DONE | 2026-04-XX | DevTools-style authoring tool replacing TweakPanel V1 (coexist) |
```

Update ADR-025 status row: Layer 2 closed.

If "tools list" section exists, add Inspector mention.

### `.context/ROADMAP.md` — WP-034 horizon entry

Add to ROADMAP:

```markdown
- **WP-034** (BACKLOG) — Inspector cascade-override fix; chip apply with @container clearing
- **WP-035** horizon (heuristic confidence tuning) — pending field data from WP-033 Inspector adoption
```

### Acceptance

Both files committed. Status table accurate; ROADMAP horizon visible.

---

## §5.7 — WP-033 doc: status flip + Outcome ladder + TweakPanel coexistence note

(~30min.)

### `workplan/WP-033-block-forge-inspector.md` — final updates

1. **Status flip:** `🟡 IN PROGRESS` → `✅ DONE`
2. **Add Completed: 2026-04-XX**
3. **Update §5.2:** Remove "Delete TweakPanel" task. Document coexistence:

```markdown
5.2. **TweakPanel coexistence (Phase 0 §0.4 + Phase 4 §4.6 ruling):** TweakPanel + Inspector coexist V1. Inspector is preferred for discrete property edits + token-aware suggestions; TweakPanel is preferred for continuous-drag value tweaking. Sunset decision deferred to follow-up after usage data emerges.
```

4. **Add Outcome ladder section** (mirror WP-030 pattern):

```markdown
## Outcome Ladder (WP-033 final)

| Tier | Outcome | Evidence |
|---|---|---|
| Bronze | Inspector ships in both surfaces; arch-test + typecheck + vitest GREEN | Phase 0-5 commits; 579/579 arch-test |
| Silver | Live smoke 12+ checks GREEN at both surfaces; cross-surface PARITY trio synced | Phase 4 §4.6 result.md + PARITY trio |
| Gold | Slider-bug regression pinned; per-BP cell sourcing Option A + chip detection Option B-subset working in production | Phase 3 + 4 result.md; WP-028 architectural ghost laid to rest |
| Platinum | Inspector mental model ratified by RECON Product trap pass (§0.11 7Q caught 3 V1 caveats — addressed in Phase 2 + 4); TweakPanel coexists per intentional V1 design | Phase 0 §0.11 + result.md trail |
```

5. **Add commit ladder section** (SHA history per phase):

```markdown
## Commit Ladder

| Phase | Task prompt | Implementation | Result.md |
|---|---|---|---|
| 0 | e7e1e3ea | (RECON-only) | 6d6c1c66 |
| 1 | d3fc2ad2 | 547bb79d | 68709466 |
| 2 | a9fbe665 | 6bf32ee0 | f84cea1b |
| 3 | 83102a10 | 936101a6 | a7fac58f (+SHA backfill) |
| 4 | a94c2792 | 745a5bbc | 06df405b (+SHA backfill c91fc696) |
| 5 | TBD | TBD | TBD |
```

(Hands fills Phase 5 SHAs in the final SHA-backfill commit per WP-030 pattern.)

### Acceptance

WP-033 doc shows ✅ DONE status, Outcome ladder filled, Commit ladder filled, §5.2 reflects coexistence. Doc is the canonical record of WP-033.

---

## §5.8 — Approval gate (per `feedback_close_phase_approval_gate`)

**Hands STOPS here.** Posts to Brain a doc batch summary listing every doc file changed in §5.4 + §5.5 + §5.6 + §5.7. Awaits explicit Brain approval.

### Doc batch summary template (Hands writes to result.md §5.8)

```markdown
## §5.8 — Doc batch summary (awaiting Brain approval)

| File | Change | Why |
|---|---|---|
| .claude/skills/domains/infra-tooling/SKILL.md | +Inspector section (~XX LOC) | Phase 5 ruling §5.4 |
| .claude/skills/domains/studio-blocks/SKILL.md | +Inspector mirror section (~XX LOC) | Phase 5 ruling §5.4 |
| .context/CONVENTIONS.md | +Inspector pattern section (~XX LOC) | Phase 5 ruling §5.5 |
| workplan/BLOCK-ARCHITECTURE-V2.md | Layer 2 closed entry | Phase 5 ruling §5.5 |
| .context/BRIEF.md | WP-033 ✅ DONE row | Phase 5 ruling §5.6 |
| .context/ROADMAP.md | WP-034 + WP-035 horizon | Phase 5 ruling §5.6 |
| workplan/WP-033-block-forge-inspector.md | Status flip + Outcome ladder + Commit ladder | Phase 5 ruling §5.7 |
| workplan/WP-034-inspector-cascade-override.md | NEW stub | Phase 5 ruling §5.3 |

Total: 8 doc files (≥3 → approval gate fires per saved memory)

Brain: review + approve OR request edits BEFORE Hands commits.
```

### Brain → Hands handoff

After Brain approves (explicit "approve" message), Hands proceeds to §5.9 final verification + atomic doc commit.

If Brain requests edits: Hands applies edits, re-posts updated batch summary, awaits re-approval. Loop until approval.

### Why this gate matters

Saved memory `feedback_close_phase_approval_gate`: Phase 5 doc batch touches ≥3 doc files; approval gate catches cross-file drift. Without the explicit pause, doc atomicity drifts (e.g., CONVENTIONS says one thing, SKILL says another).

---

## §5.9 — Final verification

(~30min.)

After Brain approves §5.8 doc batch:

```bash
npm run arch-test                    # 579/579 (or 580 if OQ1 added a test file)
npm run typecheck                    # CLEAN (Phase 5 fixed Issue #3 baseline errors)
npm run test                         # ALL GREEN — block-forge 275 + Studio Phase 4 baseline + Phase 5 deltas
```

Manual smoke at both surfaces:
- block-forge :7702 → pin → cell edit → chip apply → visibility hide → ↗ BP switch (regression smoke; should still work post-Phase 5)
- Studio /block-editor → pin → cell edit → **visible iframe shows update IMMEDIATELY** (OQ1 fix verification) → chip apply → visibility hide → coexistence with TweakPanel + SuggestionList intact

Document live smoke evidence in result.md §5.9.

---

## §5.10 — Final commits (3 expected)

After §5.9 GREEN:

1. **Fix commit** (OQ1 + OQ2 + OQ5 stub):
   ```
   feat(studio): WP-033 phase 5 — OQ fixes (live-rerender + typecheck cleanup) + WP-034 stub [WP-033 phase 5]
   ```

2. **Doc batch commit** (atomic per WP §5.5):
   ```
   docs(wp-033): WP-033 phase 5 close — SKILL flips + CONVENTIONS + BRIEF + WP doc status flip [WP-033 phase 5]
   ```

3. **Status flip commit** (per WP-030 pattern):
   ```
   docs(wp-033): WP-033 phase 5 result + commit SHA backfill [WP-033 phase 5 followup]
   ```

(Plus this task prompt commit by Brain BEFORE handoff — total 4 commits including prompt.)

---

## What success looks like (Hands' result.md table)

| Gate | Target |
|---|---|
| arch-test | 579/579 (or 580 if OQ1 added test file) |
| typecheck | **CLEAN** (post-OQ2 fix; Issue #3 baseline cleared) |
| block-forge vitest | 275/275 (no behavior change Phase 5) |
| Studio vitest | 240+ (Phase 4 baseline + ~5 OQ1 test deltas) |
| Live smoke block-forge | regression smoke GREEN |
| Live smoke Studio | OQ1 live-rerender verified + chip + visibility + ↗ all green |
| All 5 Brain rulings honored (Phase 5 OQs) | ✅ |
| Approval gate fired §5.8 → Brain approved | ✅ |
| Doc batch atomic in single commit | ✅ |
| WP-033 status flipped ✅ DONE | ✅ |
| WP-034 stub created BACKLOG | ✅ |
| Commit SHAs backfilled in WP-033 doc + result.md | ✅ |

---

## Phase 5 deliverables

1. **4 commits on main:**
   - This task prompt (committed by Brain BEFORE handoff)
   - Fix commit (OQ1 + OQ2 + OQ5 stub)
   - Doc batch commit (atomic; SKILL × 2 + CONVENTIONS + BLOCK-ARCH-V2 + BRIEF + ROADMAP + WP-033 doc + WP-034 stub)
   - Result.md commit (with SHA backfill)

2. **Files touched (expected ~10-12):**
   - `apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx` — OQ1
   - `apps/studio/src/pages/block-editor.tsx` — OQ2
   - `apps/studio/src/pages/block-editor/responsive/__tests__/responsive-tab-live-rerender.test.tsx` — NEW
   - `workplan/WP-034-inspector-cascade-override.md` — NEW stub
   - `.claude/skills/domains/infra-tooling/SKILL.md` — Inspector section
   - `.claude/skills/domains/studio-blocks/SKILL.md` — Inspector section
   - `.context/CONVENTIONS.md` — Inspector pattern
   - `workplan/BLOCK-ARCHITECTURE-V2.md` — Layer 2 closed
   - `.context/BRIEF.md` — status table
   - `.context/ROADMAP.md` — WP-034/035 horizon
   - `workplan/WP-033-block-forge-inspector.md` — status flip + Outcome + Commit ladders
   - `src/__arch__/domain-manifest.ts` — IF OQ1 test file added; +1 owned_file in studio-blocks

3. **Result.md sections (mandatory):**
   - §5.0 RECON pre-flight findings
   - §5.1-5.7 implementation sub-sections
   - §5.8 Doc batch summary (Hands posts; awaits Brain approval)
   - §5.9 Final verification table
   - §5.10 Commit ladder
   - Issues & Workarounds (if any)
   - Notes for Brain Review
   - Git (final commit SHAs; backfilled)

---

## Out-of-scope this phase (DO NOT do)

- ❌ Cascade-override fix (WP-034 stub only; not implemented)
- ❌ Playwright e2e tests (Ruling 3 — DEFER)
- ❌ inspectorBp localStorage persistence (Ruling 4 — DEFER)
- ❌ TweakPanel removal (Brain ruling — KEEP both V1)
- ❌ Engine package edits
- ❌ Token system edits beyond what's already shipped
- ❌ packages/block-forge-core edits
- ❌ block-forge file changes (Phase 4 already finalized; Phase 5 zero-touch)
- ❌ Inspector behavior changes beyond OQ1 (no new features; this is Close phase)
- ❌ New SKILL Skeleton→Full flips (existing flips assumed Phase 0 §0.1 reading; verify in §5.0)

---

## Escalation triggers (surface to Brain immediately)

1. **§5.0 RECON drift** — baseline shows different arch-test or typecheck count than expected → halt; document; await Brain ruling
2. **OQ1 fix breaks SuggestionList or VariantsDrawer** — halt; document affected tests; Brain rules on revert vs adapt
3. **OQ2 fix surfaces additional typecheck cascade** — halt; widen scope or punt to follow-up
4. **TweakPanel removal accidentally triggered** by some test cleanup — halt; restore (Brain ruling locked: KEEP)
5. **§5.8 approval gate skipped** — saved memory violation; if Hands forgets the gate and proceeds to commit, REVERT and post for approval
6. **WP-033 status flip without Outcome ladder filled** — incomplete close; halt; fill before commit
7. **arch-test regression Phase 5** — investigate; do NOT silently update manifest schema

---

## Acceptance criteria (Hands MUST satisfy ALL)

- [ ] §5.0 RECON pre-flight committed BEFORE §5.1 code
- [ ] OQ1 live-rerender fix lands; visible iframe reflects form.code mutations IMMEDIATELY
- [ ] OQ2 typecheck baseline errors cleared
- [ ] OQ5 WP-034 stub created in `workplan/`
- [ ] `npm run arch-test` from repo root → 579 or 580 (depending on test-file delta)
- [ ] `npm run typecheck` from repo root → **CLEAN** (Phase 5 success criterion: 0 errors)
- [ ] `npm run test` (block-forge) → 275 GREEN
- [ ] Studio vitest GREEN (Phase 4 baseline + Phase 5 OQ1 deltas)
- [ ] Live smoke at BOTH surfaces — Inspector flows still GREEN; OQ1 fix verified at Studio
- [ ] All 5 Brain rulings honored, deviations explicitly escalated
- [ ] §5.8 doc batch summary posted; Brain approved BEFORE doc commit
- [ ] WP-033 doc flipped 🟡 → ✅ with Outcome + Commit ladders
- [ ] WP-034 stub at 📋 BACKLOG status
- [ ] All commit SHAs backfilled in WP-033 doc and Phase 5 result.md
- [ ] No diffs in `tools/block-forge/src/**`, `packages/**`, TweakPanel.tsx — Phase 5 zero-touch on those

---

## Brain → Operator handoff
Phase 5 Close task prompt drafted. 10 sub-sections, 6-9h budget, 5 Brain rulings (OQ1 FIX / OQ2 FIX / OQ3 DEFER / OQ4 DEFER / OQ5 STUB), TweakPanel coexistence locked KEEP, approval gate at §5.8 enforced (per saved memory). 4 commits expected. Phase 5 closes WP-033; ADR-025 Layer 2 closes alongside.

Awaiting Operator approval to commit prompt + handoff to Hands.
