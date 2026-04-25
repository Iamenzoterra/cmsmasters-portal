# WP-029 Phase 0 — RECON

**Goal:** Confirm post-WP-028 end-state still holds; inspect Task A + Task B targets; produce 8 carry-overs (a)–(h) for Phase 1+2 consumption. **Read-only — no code written this phase.**

**Budget:** ~1.5h
**Plan reference:** `workplan/WP-029-heuristic-polish.md` §Phase 0 (lines 174–205)
**Saved-memory triggers:** `feedback_preflight_recon_load_bearing.md` (8/8 empirical on WP-028 — RECON catches material issues before code lands)
**Brain rulings carried into this phase:** C1 (reveal-rule audit), C2 (PostCSS exit criteria), C4 (drift detector codification preview)

---

## Background — what this WP exists to do

WP-029 closes two carry-over OQs from WP-028:

- **OQ4 — Variant CSS scoping validator (Task A).** Author writing `.foo { background: red }` inside variant CSS without `[data-variant="NAME"]` scope OR `@container slot (max-width: …)` reveal rule causes the variant styles to leak into the base render. Portal's `renderBlock` inlines variant CSS verbatim — scoping is authors' responsibility per ADR-025. Task A: edit-time non-blocking warning in Studio's `VariantEditor.tsx`.

- **OQ6 — `<App />` render-level regression pins (Task B).** WP-028 Phase 5 introduced `assembleSavePayload` contract-mirror pins (a harness mirroring production `App.tsx::handleSave`). Drift risk: harness passes while production breaks. Task B: real `<App />` mount tests against three save scenarios (tweak-only / variant-only / mixed).

**Task C (real-usage heuristic polish) is OUT OF SCOPE this WP** — explicitly deferred to WP-030 pending 2–4 weeks WP-028 field data. Do not audit, touch, or speculate about heuristic changes in Phase 0.

---

## Tasks

### 0.1 — Skill + OQ context load

Read in full:

- `.claude/skills/domains/studio-blocks/SKILL.md`
- `.claude/skills/domains/infra-tooling/SKILL.md`
- `.claude/skills/domains/pkg-block-forge-core/SKILL.md`
- `logs/wp-028/parked-oqs.md` — entirety; specifically §OQ4 + §OQ6 verbatim quotes for result log

No deliverable; this is context loading.

---

### 0.2 — End-state check (regression gate)

```bash
npm run arch-test
```

**Expected:** 499/0 (per WP-028 close, commit `288281b9`). If drift — record observed count, root-cause, and **stop**. Do not proceed to 0.3 until either confirmed at 499/0 OR drift root-caused with Brain notified.

Record: exact pass/fail counts in result log §0.2.

---

### 0.3 — Task A target inspection

Read `apps/studio/src/pages/block-editor/responsive/VariantEditor.tsx` **in full** (entire file, top to bottom).

Record in result log §0.3:

- Line range where CSS textarea lives + its RHF binding (`form.register('...')` or controlled prop)
- Whether there's an existing warning slot / banner placeholder near the textarea (or empty space we can fill)
- The component's overall structure: imports, props, internal state, rendered tree shape (≤30-line tree summary acceptable)
- Any current debounce or validation pattern already in place — if yes, can we reuse or must we add fresh

This becomes carry-over **(b)**.

---

### 0.3.a — Reveal-rule convention audit (Brain C1)

**Critical: validator correctness depends on this.** Validator that accepts only one syntax = false negatives for authors using the other.

Read in full:

1. `packages/block-forge-core/src/compose/compose-variants.ts` — record the EXACT reveal rule syntax `composeVariants` emits. Look for `@container` literal strings, container-name usage, query-condition patterns. Quote the relevant ≤20-line block verbatim into result log.
2. `workplan/adr/025-responsive-blocks.md` — find the §"variant CSS convention" or equivalent; record the documented authoring syntax verbatim.
3. `.context/CONVENTIONS.md` §responsive-tokens / variant-CSS / any related — same.

**Cross-check:** does what `composeVariants` *emits* match what ADR-025 *documents authors should write*? If divergent, that's a real ADR drift issue — flag in result log §Open Questions for Brain ruling.

**Produce a definitive list** of accepted reveal-rule syntaxes — every form an author might legitimately write that should pass the validator. Minimum hypothesis (per Brain C1):

- `@container slot (max-width: Npx) { … }` — named container query against `slot`
- `@container (max-width: Npx) { … }` — unnamed container query

Verify both AGAINST production code + ADR. Add or remove from the list per actual evidence. If only one is in production — note that, and Brain rules whether to also accept the other defensively.

This becomes carry-over **(h)**.

---

### 0.4 — Task A parser audit + PostCSS exit criteria (Brain C2)

```bash
grep -rn "from 'postcss'" apps/studio packages/ tools/
grep -rn "postcss\|walkRules" packages/block-forge-core/src/
```

Record in result log §0.4:

- Every PostCSS import site found (path + line)
- Whether `packages/block-forge-core/src/index.ts` (or its public exports barrel) re-exports anything PostCSS-related
- Whether any reusable scoping-aware CSS walker helper exists in block-forge-core that Phase 1 could re-export rather than build fresh
- Read `apps/studio/package.json` — record current `dependencies` + `devDependencies` keys (no need to dump versions, just key list)
- Read `packages/block-forge-core/package.json` — same; record PostCSS version pinned there for Phase 1.0 contingency

**Mandatory exit criteria — pick exactly ONE as a hard call (no hedging):**

- **(a) Re-export path:** `@cmsmasters/block-forge-core` re-exports PostCSS (or a wrapper helper) from its public API → Studio imports via that path. Record the import path Phase 1.1 will use.
- **(b) Transitive path:** Studio resolves PostCSS through an existing workspace dep transitively → `import * as postcss from 'postcss'` works as-is. Record the resolution chain.
- **(c) Direct devDep path:** Neither (a) nor (b) → **Phase 1 grows a new pre-task 1.0** that adds `postcss` as Studio `devDependency` with version pinned to match `block-forge-core`'s. Record the version to pin.

Carry-over **(a)** is this hard call (one of {re-export / transitive / direct devDep}).

---

### 0.5 — Studio warning convention check

Read:

- `apps/studio/src/components/toast.tsx` (if present)
- Any existing validation banner / warning UI pattern Studio already uses (grep `apps/studio/src/` for terms like `Banner`, `Warning`, `Alert`, `validation`, `banner` to surface candidates)
- The Studio design tokens consumed for warning state — confirm there's an amber/warning semantic token in `packages/ui/src/theme/tokens.css` (e.g. `--status-warning-fg/bg/border`)

Record in result log §0.5:

- Whether an existing banner pattern is reusable (path + component name) — Phase 1.3 reuses → no new component
- OR "build fresh" decision with token list to use (must not hardcode colors per `feedback_no_hardcoded_styles.md`)

This becomes carry-over **(c)**.

---

### 0.6 — Task B target inspection

Read in full:

1. `tools/block-forge/src/App.tsx` — focus on `handleSave` (whatever line range it spans). Record verbatim: `composeTweakedCss` integration site, payload assembly shape, the exact object passed to `apiClient.saveBlock`. This is what Phase 2 mounts must exercise.
2. The Phase 5 carve-out pin file (locate via `grep -rn "assembleSavePayload\|contract-mirror" tools/block-forge/src/`). Record:
   - Exact file path
   - Test names (`describe` + `it` strings) for every existing pin
   - What each pin asserts (one-line summary)

Phase 2.4 converts these pins to documentation comments — knowing exact names + intents now means we preserve discipline later.

This becomes carry-over **(d)**.

---

### 0.7 — Task B mock audit

```bash
grep -rn "apiClient\." tools/block-forge/src/
grep -rn "BlockPicker" tools/block-forge/src/
grep -rn "fetchSourceDir\|fs middleware\|fs/source" tools/block-forge/src/
```

Record in result log §0.7:

- `apiClient` import path (exact module specifier) + the named exports tools/block-forge actually consumes (e.g. `saveBlock`, `getBlock`, `fetchSourceDir`)
- For each consumed export: signature `(args) → returnType` quoted from the source
- `BlockPicker` data fetch shape (where does it source the block list?) + what Phase 2 needs to mock to pre-resolve a single fixture block
- fs middleware (if any — e.g. dev-server file fallback) — does Phase 2 need to mock it?

This becomes carry-over **(e)**.

---

### 0.8 — jsdom stubs audit

```bash
grep -rn "ResizeObserver\|setPointerCapture\|releasePointerCapture" tools/block-forge/src/__tests__/
grep -rn "ResizeObserver\|setPointerCapture\|releasePointerCapture" tools/block-forge/src/test-utils
```

(Adjust the test-utils path per actual structure if different.)

Record in result log §0.8:

- Are these polyfilled globally already (e.g. in `vitest.setup.ts` or equivalent)?
- If yes: Phase 2 reuses the global, no new stubs
- If no: Phase 2 stubs at file-level inside `app-save-regression.test.tsx` (NOT global — risk of cross-test pollution)
- Record any other DOM API likely needed for `<App />` mount that jsdom doesn't have natively (e.g. `IntersectionObserver`, `URL.createObjectURL`)

This becomes carry-over **(f)**.

---

### 0.9 — Baseline test counts

```bash
npm -w @cmsmasters/studio test 2>&1 | tail -20
npm -w tools/block-forge test 2>&1 | tail -20
```

Record in result log §0.9:

- Exact pass/fail/skipped counts for both packages
- Approximate runtime
- Any pre-existing failures or skips (these become Phase 1/2 baseline — don't be alarmed if Phase 1 lands and counts shift only by the NEW additions)

This becomes carry-over **(g)**.

---

### 0.10 — Deferred-C confirmation

Explicitly record in result log §0.10:

> Task C (real-usage heuristic polish) is deferred to WP-030 per `workplan/WP-029-heuristic-polish.md` §Not in scope. Phase 0 RECON did NOT audit `packages/block-forge-core/src/heuristics/` and did NOT inspect heuristic confidence scoring. Any phase 1/2/3 prompt that proposes touching `packages/block-forge-core/src/heuristics/` is a stop-and-Brain-review trigger.

This is a discipline anchor, not a finding.

---

## Output deliverable

`logs/wp-029/phase-0-result.md` — structure:

```markdown
# WP-029 Phase 0 RECON — Result Log

**Phase:** 0 — RECON
**Status:** ✅ COMPLETE / ⚠️ DRIFT-FOUND / ❌ BLOCKED
**Commit SHA:** <embed after commit>
**Duration:** <actual>
**Brain rulings consumed:** C1, C2, (C4 preview)

---

## §0.1 — Context load

(Brief: skills read; OQ4 + OQ6 verbatim quotes pasted)

## §0.2 — End-state check

arch-test result: <count>/<failures>. Drift? Y/N.

## §0.3 — VariantEditor.tsx inspection

(Findings per task instructions)

## §0.3.a — Reveal-rule convention audit (C1)

composeVariants emits: <verbatim ≤20-line quote>
ADR-025 documents: <verbatim quote>
CONVENTIONS.md says: <verbatim quote>
Cross-check verdict: ALIGNED / DIVERGENT
**Accepted reveal-rule syntaxes (carry-over h):**
- <syntax 1> — evidence: <where>
- <syntax 2> — evidence: <where>
- <…>

## §0.4 — PostCSS audit + exit criteria (C2)

Findings: <import sites, re-exports, walker helpers>
**Hard call (carry-over a):** (a) re-export / (b) transitive / (c) direct devDep
Justification: <one paragraph>
If (c): version to pin = <semver>

## §0.5 — Warning banner convention

(Findings + reuse vs build-fresh decision; carry-over c)

## §0.6 — handleSave + Phase 5 pins

(handleSave shape + pin file path + pin names + assertion summaries; carry-over d)

## §0.7 — apiClient + BlockPicker + fs middleware mocks

(Import paths + signatures + mock shapes; carry-over e)

## §0.8 — jsdom stubs

(Global vs file-level decision; carry-over f)

## §0.9 — Baseline test counts

Studio: <pass>/<fail>/<skip>, ~<runtime>
block-forge: <pass>/<fail>/<skip>, ~<runtime>
(carry-over g)

## §0.10 — Task C deferral anchor

(Verbatim disciplinary statement)

---

## Carry-overs summary (Phase 1+2 input)

| ID | Carry-over | Decision / Value |
|---|---|---|
| (a) | PostCSS resolution path | (a)/(b)/(c) — <chosen> |
| (b) | VariantEditor integration point | <line + binding> |
| (c) | Studio banner pattern | reuse `<path>` / build fresh with `<tokens>` |
| (d) | handleSave shape + Phase 5 pin file | <file path> + <pin names> |
| (e) | apiClient/BlockPicker/fs mock shapes | <signatures> |
| (f) | jsdom stubs scope | global / file-level @ <APIs> |
| (g) | Baseline test counts | Studio <X/Y/Z>, block-forge <X/Y/Z> |
| (h) | Accepted reveal-rule syntaxes | <list> |

---

## Open Questions for Brain (if any)

(Empty if all 10 tasks closed cleanly; populate if cross-check found ADR drift, ambiguous syntax, blocking issue)

---

## Phase 1 + Phase 2 readiness

- [ ] All 10 tasks executed
- [ ] All 8 carry-overs (a)–(h) recorded
- [ ] No code written
- [ ] arch-test confirmed at WP-028 baseline (or drift root-caused)
- [ ] Brain unblocked to write Phase 1 prompt

---

## Commit

(After Brain reviews phase-0-result.md → commit message `docs(logs): WP-029 Phase 0 RECON result log [WP-029 phase 0]`)
```

---

## Rulings + invariants

- **No code written this phase.** Read-only RECON. If you find yourself wanting to edit a `.ts` / `.tsx` / `.css` file — stop. That's Phase 1.
- **All 8 carry-overs (a)–(h) MUST land in result log.** Phase 1 prompt blocks on (a), (b), (c), (h); Phase 2 prompt blocks on (d), (e), (f); both phases share (g) for delta math.
- **Hard calls, not hedges.** §0.4 picks ONE of (a)/(b)/(c). §0.5 picks ONE of reuse/build-fresh. §0.8 picks ONE of global/file-level. If genuinely ambiguous, escalate to Brain in §Open Questions — don't punt to "Phase 1 will decide".
- **C1 ADR drift escalation:** if `composeVariants` emits a syntax NOT documented in ADR-025 (or vice versa), that's a real finding — surface to Brain in §Open Questions, do not silently reconcile.
- **No Task C audit.** §0.10 is the disciplinary anchor; respect it.
- **Saved-memory `feedback_preflight_recon_load_bearing.md`:** Phase 0 catches material issues empirically 8/8 phases on WP-028. Treat thoroughness here as load-bearing, not bureaucratic.

---

## Done signal

When `logs/wp-029/phase-0-result.md` is written + committed, ping Brain with:

- Status: ✅ COMPLETE / ⚠️ DRIFT-FOUND / ❌ BLOCKED
- Commit SHA
- 8-row carry-overs summary table (markdown)
- Any §Open Questions for Brain ruling

Brain returns Phase 1 prompt (Task A — validator) sized against carry-overs.
