# WP-027 Phase 0 — RECON Task Prompt

**For:** Hands agent
**From:** Brain (via planning assistant)
**WP:** `workplan/WP-027-studio-responsive-tab.md`
**Goal of this phase:** Recon-only. Map Studio's block-editor shell, pin exact edit points, verify preconditions, record paths, resolve two minor plan-internal ambiguities. **No source code written.** The only file you create is `logs/wp-027/phase-0-result.md`.

---

## Hard gates (do NOT cross)

- **Zero source code changes.** No edits under `apps/`, `packages/`, `tools/`, `src/__arch__/`.
- **Zero manifest changes.** `src/__arch__/domain-manifest.ts` is read-only in Phase 0.
- **Zero doc edits** (no touching BRIEF, CONVENTIONS, SKILL.md, PARITY.md, BLOCK-ARCHITECTURE-V2).
- The **only** write this phase is `logs/wp-027/phase-0-result.md` (+ later commit of that log).
- If you find a bug in Studio during recon — **do not fix it**. Record in the log, flag as sidequest.
- If your recon uncovers a plan inconsistency beyond the 2 Brain already acknowledged (fixture strategy + composeVariants signature), **stop and surface**. Do not paper over.

---

## Context you must load first

Read these before starting:

1. `workplan/WP-027-studio-responsive-tab.md` — THIS WP's full plan
2. `workplan/WP-026-tools-block-forge-mvp.md` — reference implementation (status ✅ DONE)
3. `tools/block-forge/PARITY.md` — the contract you'll mirror into the Studio tab's PARITY.md in Phase 2
4. `tools/block-forge/README.md` — for the injection contract recap
5. `.claude/skills/domains/studio-core/SKILL.md` — current state of the target domain
6. `.claude/skills/domains/pkg-block-forge-core/SKILL.md` — engine contract (public API, invariants)
7. `.claude/skills/domains/pkg-db/SKILL.md` — trap about types.ts hybrid (WP-024)
8. `.claude/skills/domains/pkg-ui/SKILL.md` — tokens.css / tokens.responsive.css paths
9. `.claude/skills/domains/app-portal/SKILL.md` — parity reference semantics
10. Saved memory references (you should have these loaded):
    - `feedback_arch_test_status_flip.md` — +6 on skeleton → full
    - `feedback_vitest_css_raw.md` — `test: { css: true }` landmine with `?raw` CSS imports
    - `feedback_fixture_snapshot_ground_truth.md` — snapshot.test.ts.snap is authority, not fixture filename
    - `feedback_revalidate_default.md` — bare `/revalidate` POSTs `{}` to invalidate every tag

---

## Brain rulings baked into this prompt (do not second-guess)

1. **Fixture strategy (approved):**
   - Heuristic-trigger integration tests → **reuse WP-025 frozen fixtures verbatim** via `?raw` import with long relative path:
     ```ts
     import blockSpacingFontHtml from '../../../../../packages/block-forge-core/src/__tests__/fixtures/block-spacing-font.html?raw'
     import blockSpacingFontCss  from '../../../../../packages/block-forge-core/src/__tests__/fixtures/block-spacing-font.css?raw'
     ```
   - Do NOT copy fixtures into `apps/studio/**`. Do NOT extract into `@cmsmasters/block-forge-core/testing` in WP-027 — defer to a third-consumer future WP.
   - Variant-display test → **synthesize ONE variant-bearing block inline in `integration.test.tsx`** (engine has no variant-bearing fixture yet; the synthesis is the Studio-display contract, not the heuristic contract).
   - Phase 0 only records the long-path strategy in carry-over (f). Phase 3 implements.

2. **composeVariants signature ambiguity** (plan L206 vs L258):
   - Do NOT improvise. Read `packages/block-forge-core/src/composeVariants.ts` and the engine's `index.ts` public export. Record the **exact** signature in carry-over (e) verbatim. Phase 2 and 3 code against what you record, not what the plan drafted.

3. **Snapshot-as-ground-truth reminder:**
   - Before any Phase 3+ test asserts `expect(suggestions).toContain(...)` for a reused fixture, cross-reference `packages/block-forge-core/src/__tests__/__snapshots__/snapshot.test.ts.snap` for the authoritative behaviour on that fixture. Fixture filename is aspirational; snapshot is authority (saved memory pattern).
   - This is a trap reminder for carry-over (e) content — make it an explicit bullet Hands-in-Phase-3 must check.

---

## The 13 RECON tasks

### 0.1 Domain skill review
Load and skim the 5 skill files listed above (studio-core, pkg-block-forge-core, pkg-db, pkg-ui, app-portal). In the log, note any invariant or trap that WP-027 Phase 1–4 must respect (specifically anything pkg-db has to say about the `blocks.variants` column and types.ts hand-maintained hybrid, and anything app-portal says about BlockRenderer parity semantics).

### 0.2 Studio block-editor shell map
Locate the block editor in `apps/studio/`. Expected candidates: `apps/studio/src/pages/block-editor.tsx` or `apps/studio/src/pages/block-editor/**`. For the log, record:
- Top-level route path (e.g. `/blocks/:slug`)
- Exact file + line where existing tabs (Basic, Process, or whatever they're called today) are registered
- Tab switcher mechanism (URL-driven? local state? context? shared store?)
- How each tab receives the current block (props? hook? context?)
- Is there a `TabBar` / `TabProvider` / shared tab primitive in pkg-ui or apps/studio? If yes, record path.

This becomes carry-over (a): "exact tab-registration edit point (file + line) + tab order convention".

### 0.3 Existing block-preview.tsx audit
Read `apps/studio/src/components/block-preview.tsx` (or its actual path — grep if needed). Record:
- Current `?raw` imports (list each file + path exactly)
- Whether it injects `tokens.responsive.css` (added in WP-024 Phase 4.7)
- Whether it injects `portal-blocks.css`
- Whether it injects `animate-utils.js` (or equivalent)
- Whether it uses `@layer tokens, reset, shared, block` ordering
- Whether it wraps content in `.slot-inner { container-type: inline-size; container-name: slot }`
- Its current iframe sandbox attributes (if any)

This becomes carry-over (d): "block-preview.tsx current injection state (verbatim contract snapshot) — so Phase 2 knows what NOT to duplicate". **Do not edit this file in Phase 2; new `ResponsivePreview.tsx` replicates the full WP-026 contract independently.**

### 0.4 Save mutation audit
`grep -rn "updateBlock\|update.*block\|block.*update\|useMutation.*block" apps/studio/src/` and follow the chain. Record:
- Exact import path + function name of the mutation the current block editor uses for saves
- Its payload shape (`{ id, html, css }` or full `Block` or `Partial<Block>`?)
- **Does it accept `variants` field?** (Per WP-024 the column exists; the mutation may or may not thread it through.) If not, Phase 4 adds a one-line patch to thread it — flag as expected in carry-over (b).
- Does it trigger `/revalidate` internally after success? If yes — what body? If no — Phase 4 adds explicit call with `{}` body (per saved memory).
- Does it batch concurrent clicks? Debounce? Or fire-and-hope?
- Where does it surface errors (toast system)?

This becomes carry-over (b): "existing save mutation signature + variants support + auto-revalidate behaviour + error surface".

### 0.5 Dirty-state audit
Determine whether Studio's block editor has a **canonical** unsaved-changes pattern:
- Search for hooks/context named like `useDirtyState`, `useUnsavedChanges`, `formState.isDirty`, `hasChanges`, etc.
- Check how Basic / Process tabs plug in (if at all)
- Check for `beforeunload` / route-guard patterns in the block-editor subtree

Three outcomes and which to record:
- **(c1) Canonical pattern exists** → record its hook/API; Phase 4 plugs in.
- **(c2) Partial pattern (some tabs use it, others don't)** → record what exists; Phase 4 plugs into the existing one, flags inconsistency for a followup UX WP.
- **(c3) No pattern** → record; Phase 4 uses tab-local dirty indicator and documents the gap in `apps/studio/src/pages/block-editor/responsive/PARITY.md`.

This becomes carry-over (c): "dirty-state integration path — one of c1/c2/c3 plus concrete next action for Phase 4".

### 0.6 Variant-display call-sequence rehearsal (on paper)
**This task has a sub-audit. Do both.**

**Sub-task 0.6.a — composeVariants signature verbatim:**
Read `packages/block-forge-core/src/composeVariants.ts` AND the engine public entry (`packages/block-forge-core/src/index.ts`). Record:
- Exact TypeScript signature of `composeVariants`
- The shape of the `variants` input (array? record? tuple?)
- The shape of the output

**Sub-task 0.6.b — rehearse the full call chain:**
Given a Block from DB with shape:
```ts
{ id, slug, html: string, css: string, variants: { mobile: { html, css } } | null, ... }
```
Write out in the log the exact sequence:
1. How the tab reads the block (from Studio's existing block-editor state / prop — refer 0.2)
2. If `block.variants` is non-null, the exact call to `composeVariants(...)` using the signature you recorded in 0.6.a
3. The output shape, and how `renderForPreview(...)` takes that output
4. The srcdoc final shape (paste the expected wrapper structure — `@layer` stack + `.slot-inner` + block shell)

**Sub-task 0.6.c — snapshot-as-ground-truth trap reminder:**
In the log, pre-write the carry-over (e) paragraph ending with: "Phase 3 MUST cross-reference `packages/block-forge-core/src/__tests__/__snapshots__/snapshot.test.ts.snap` before asserting `expect(suggestions).toContain(...)` for any reused fixture. Fixture filename is aspirational; snapshot is authority."

This becomes carry-over (e): "composeVariants exact signature + variant-display call sequence + snapshot-as-ground-truth reminder for Phase 3 assertions".

### 0.7 Revalidate behaviour confirmation
Either:
- Save mutation (from 0.4) already calls `/revalidate` with `{}` body → Phase 4 does nothing extra.
- OR Studio has a separate publish button/step → record how it works.
- OR Studio does not revalidate at all → Phase 4 adds explicit `fetch('/revalidate', { method: 'POST', body: JSON.stringify({}) })` call after successful mutation (per saved memory `feedback_revalidate_default.md`).

Pick one outcome; document in log. This feeds into carry-over (b).

### 0.8 Arch-test baseline
```bash
npm run arch-test
```
Record exact count (expected ~477 after WP-026 close with +1 from unrelated `b5ccfb32`; confirm). Then grep for hardcoded domain-count assertions:
```bash
# in src/__arch__/
```
(Use Grep tool, not raw grep.) WP-027 adds **no new domain** (studio-core pre-existing), so no domain-count bump is needed. But arch-test count WILL grow by exactly the number of new `owned_files` registered in Phase 1 (expected: 8 — the 7 responsive/ source files + 1 PARITY.md). Record the expected Phase-1 target: `baseline + 8`.

This becomes carry-over (g): "arch-test baseline count + expected Phase-1 target + confirmation no domain-count bump needed".

### 0.9 studio-core SKILL status
Read the frontmatter of `.claude/skills/domains/studio-core/SKILL.md`. Record `status: skeleton | partial | full`.
- If `full` → no +6 bump in Phase 5 Close.
- If `skeleton` or `partial` → Phase 5 Close will need to factor a possible flip; record whether a flip-to-full is in WP-027's Close scope or deferred.

This becomes carry-over (h): "studio-core SKILL status + Phase 5 flip implication".

### 0.10 Auth + RLS path quick-check
Verify the Responsive tab will reuse the same authenticated Studio Supabase client that Basic / Process tabs use. One-line confirmation in log. No new auth plumbing expected.

### 0.11 Cross-surface PARITY seed
Read `tools/block-forge/PARITY.md` line-by-line. Copy the content into the log as a draft for the new `apps/studio/src/pages/block-editor/responsive/PARITY.md` (to be seeded in Phase 2). Flag any Studio-specific deviations you can anticipate (e.g. iframe sandbox attribute differences, auth cookies, path depth for `?raw`).

This becomes carry-over (i): "PARITY seed draft — verbatim copy of tools/block-forge/PARITY.md + flagged Studio-specific deviations".

### 0.12 Studio vitest config audit (NEW — saved-memory landmine guard)
Open `apps/studio/vite.config.ts` (or vitest.config.ts if separate). Record:
- Does Studio already have vitest configured? (Presence of `test: {...}` block.)
- Does the config set `test: { css: true }`? (**Critical** — without it, `?raw` CSS imports in tests load as empty strings, assertions pass on nothing — saved memory `feedback_vitest_css_raw.md`.)
- What test environment is the default? `node`? `jsdom`? (Responsive tab tests need `jsdom` at least per-file via `@vitest-environment jsdom` pragma, since preview assets and suggestion rows hit DOM/React Testing Library.)
- What's the existing test script? `npm -w @cmsmasters/studio test` or something else?

Three outcomes:
- **(j1)** Studio has vitest configured with `css: true` → Phase 1/2 needs no config changes. Log "vitest-ready".
- **(j2)** Studio has vitest but no `css: true` → Phase 1 adds `css: true` as a pre-requisite change (tiny but mandatory).
- **(j3)** Studio has no vitest config at all → Phase 1 adds vitest config from scratch (larger scope; flag for possible Phase-1 split).

This becomes carry-over (j): "Studio vitest config state + any Phase-1 config prep required".

### 0.13 Studio dev port record (informational, no carry-over)
From `apps/studio/vite.config.ts` or `package.json` scripts — record the dev port Studio uses (5173? other?). This is informational: iframe sandbox/CORS posture plus future README/PARITY cross-references. Not a separate carry-over, just a one-line fact in the log.

---

## Log structure

Write to `logs/wp-027/phase-0-task.md` (this file — commit first, then phase-0-result.md below) and `logs/wp-027/phase-0-result.md`. Use this template for the result log:

```markdown
# WP-027 Phase 0 — RECON Result

**Date:** 2026-04-23
**Duration:** ~Xh
**Commits:**
- Task prompt: <SHA> — `logs/wp-027/phase-0-task.md`
- Result: <SHA> — this log

**Arch-test baseline:** <count> / 0
**No code written.** No source or manifest changes.

---

## Task-by-task findings

### 0.1 Domain skills
<findings>

### 0.2 Studio block-editor shell
- Route: ...
- Tab registration file + line: ...
- Tab switcher mechanism: ...
- Block-to-tab passing: ...
- Shared tab primitive: yes/no, path

### 0.3 block-preview.tsx current state
- `?raw` imports: ...
- @layer order: ...
- .slot-inner wrapper: yes/no
- tokens.responsive.css injection: yes/no
- portal-blocks.css injection: yes/no
- animate-utils injection: yes/no
- iframe sandbox: ...

### 0.4 Save mutation
- Import path + function: ...
- Payload shape: ...
- Variants field supported: yes/no
- Auto-revalidate: yes/no (+ body)
- Debounce: yes/no
- Error toast mechanism: ...

### 0.5 Dirty-state
- Outcome: c1 | c2 | c3
- Details: ...
- Phase 4 action: ...

### 0.6 Variant-display rehearsal
- 0.6.a composeVariants signature:
  ```ts
  <verbatim TS signature>
  ```
- 0.6.b Call sequence:
  1. ...
  2. ...
- 0.6.c Trap reminder prewritten for Phase 3: (see carry-over (e))

### 0.7 Revalidate
- Outcome: auto | manual-step | absent
- Phase 4 action: ...

### 0.8 Arch-test baseline
- Current count: <N> / 0
- Hardcoded-domain-count assertions found: yes/no
- Phase 1 target: <N + 8>

### 0.9 studio-core SKILL status
- Current: skeleton | partial | full
- Phase 5 flip in WP-027 scope: yes/no

### 0.10 Auth + RLS
- Confirmed reuse of existing Studio client: yes/no

### 0.11 PARITY seed
- See carry-over (i)

### 0.12 Studio vitest config
- Outcome: j1 | j2 | j3
- Details: ...
- Phase 1 action: ...

### 0.13 Studio dev port
- Port: ...

---

## Carry-overs for Phase 1 (and later)

(a) **Tab-registration edit point:** <file + line>, tab order: <after Process | elsewhere>
(b) **Save mutation:** <signature>, variants field: <supported/not>, auto-revalidate: <yes/no>, Phase 4 implication: <none | thread variants | add explicit /revalidate>
(c) **Dirty-state:** <c1/c2/c3>, Phase 4 action: <plug in | defer + document gap>
(d) **block-preview.tsx verbatim contract snapshot:** <paste key excerpt>; Phase 2 builds NEW file not touching this
(e) **composeVariants signature + call sequence + snapshot-as-ground-truth reminder for Phase 3:** (as prewritten above)
(f) **`?raw` paths from apps/studio/src/pages/block-editor/responsive/ perspective:**
  - tokens.css: `<path>`
  - tokens.responsive.css: `<path>`
  - portal-blocks.css: `<path>`
  - animate-utils.js: `<path>`
  - **For WP-025 fixtures reuse (Phase 3):**
    - block-spacing-font.html: `<long path>`
    - block-spacing-font.css: `<long path>`
    - (enumerate others as needed)
(g) **Arch-test baseline / target:** baseline <N>, Phase 1 target <N + 8>, no domain-count bump
(h) **studio-core SKILL status:** <status>, Phase 5 flip: <in scope | out of scope>
(i) **PARITY seed draft:** (pasted verbatim copy of tools/block-forge/PARITY.md + flagged Studio deviations)
(j) **Studio vitest config:** <j1/j2/j3>, Phase 1 action: <none | add css: true | add full vitest config>

---

## Open Questions for Brain (if any)

<Only list items that truly need Brain ruling before Phase 1. If none — say "None.">

---

## Plan Corrections (Phase-0-discovered)

<Any plan edits discovered during recon. Minor inconsistencies with the plan text get patched here by Brain before Phase 1 prompt. List with line numbers and suggested fix.>

---

## Ready for Phase 1

Summary bullet list of what Phase 1 will do based on carry-overs above.
```

---

## Verification

- `logs/wp-027/phase-0-result.md` exists and filled per template
- `npm run arch-test` passes (you only ran it for baseline; count unchanged)
- `git status` shows exactly two untracked/changed files: `logs/wp-027/phase-0-task.md` (this prompt — commit first) and `logs/wp-027/phase-0-result.md` (your finding log — commit second)
- No source-code diff anywhere else

### Commit sequence
```bash
# 1. Commit the task prompt first (this file)
git add logs/wp-027/phase-0-task.md
git commit -m "chore(logs): WP-027 Phase 0 task prompt"

# 2. Do the recon, write phase-0-result.md, then:
git add logs/wp-027/phase-0-result.md
git commit -m "chore(logs): WP-027 Phase 0 RECON result"

# 3. SHA-embed amend — amend the result log to reference its own commit SHA
#    (standard Phase-0 close pattern; inspect WP-026 phase-0-result for shape)
```

---

## Ambiguity list & escalation protocol

Brain has pre-ruled on:
- **fixture strategy** (reuse WP-025 fixtures verbatim via long `?raw` path; synthesize ONE variant-bearing block inline in `integration.test.tsx`)
- **composeVariants signature** (read engine source, record verbatim in carry-over (e); do not improvise)

If recon uncovers a **third** ambiguity of comparable scope (e.g. Studio has no block-editor page at all, or the save mutation is actually split across 3 hooks, or studio-core SKILL has zero Block Forge content), **stop and surface** in "Open Questions for Brain" before Phase 1 prompt generation.

**/ac** gate applies at the end of this phase. Run it once `phase-0-result.md` is committed.

---

## Estimated effort

~1.5h focused recon + ~30min log write-up. Target: Phase 0 complete within 2 hours wall-time.

---

## Forward-reference

Phase 1 scaffolds `apps/studio/src/pages/block-editor/responsive/**` (7 source files + 1 PARITY seed + 1 test file for `session-state.ts`), registers the tab at carry-over (a) edit point, adds new `owned_files` to studio-core manifest entry, runs arch-test green at baseline + 8. No engine calls, no preview, no save — that's Phases 2–4.

**Phase 0 output is LOG ONLY. No code. No manifest. No docs.** Let's go.
