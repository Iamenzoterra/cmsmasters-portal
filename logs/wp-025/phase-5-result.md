# WP-025 Phase 5 — Result (Close — doc propagation under approval gate)

> **Role:** Hands — STEP 2 (execute) after Brain approval.
> **Date:** 2026-04-23
> **Phase prompt:** [phase-5-task.md](./phase-5-task.md)
> **Proposal:** [phase-5-proposal.md](./phase-5-proposal.md)
> **Baseline:** arch-test 436/0, 75 tests, typecheck clean (from Phase 4 close).
> **Final:** arch-test **442/0** (+6 from skill-status flip), typecheck clean, zero code files changed.

---

## 1 — Audit confirm-pass (pre-execute)

| # | Check | Pre-execute state | Result |
|---|---|---|---|
| 1 | BRIEF.md L5 "22 April 2026" present | ✅ verbatim match | Diff target valid |
| 2 | BRIEF.md Current-sprint table ends at WP-024 row | ✅ L118 is last row | Append target valid |
| 3 | CONVENTIONS.md ends at "Responsive tokens file" (L437) | ✅ verbatim match | Append target valid |
| 4 | SKILL.md `status: skeleton` + stub body | ✅ 30-line stub | Full-rewrite target valid |
| 5 | BLOCK-ARCHITECTURE-V2.md L7 has WP-024 blockquote | ✅ verbatim match | Append-after-L7 valid |
| 6 | manifest known_gaps has 1 `important:` + 2 `note:` | ✅ verbatim match | Reshuffle target valid |
| 7 | WP-025 workplan L5 = `Status: PLANNING`, L11 = `Completed: —` | ✅ verbatim match | Status-flip target valid |

All 7 pre-execute checks passed — proposal diffs aligned with reality byte-for-byte.

---

## 2 — What was implemented

Doc propagation landed across 6 files (5 `.md` + 1 manifest `.ts`) with **zero code changes**. Diffs applied exactly as approved, with one mandatory revision from Brain (see §3):

- **`.context/BRIEF.md`** — bumped last-updated date (23 April 2026) + appended Block Forge Core row to the Current sprint table below the WP-024 Responsive Blocks Foundation entry.
- **`.context/CONVENTIONS.md`** — new "Block Forge Core — when to call (WP-025, ADR-025)" section below "Responsive tokens file": public surface table (6 functions), variant name → breakpoint convention table, `bp: 0` semantics, `var()`-skip rationale, portal render parity — with the last speculative sentence about `scopeBlockCss` deleted per revision.
- **`.claude/skills/domains/pkg-block-forge-core/SKILL.md`** — full rewrite from 30-line stub to 98-line authoritative skill: Start Here (5 files), Public API (6 functions), Invariants (8), Traps & Gotchas (6), Blast Radius (5), Recipes (4), mirrored Known Gaps. Frontmatter preserved; `status: skeleton` → `status: full`.
- **`workplan/BLOCK-ARCHITECTURE-V2.md`** — appended one-line WP-025 Engine-update blockquote paragraph (L8) alongside the existing WP-024 Responsive-update paragraph.
- **`src/__arch__/domain-manifest.ts`** — `known_gaps` finalized: added D2 `important:` (var()-skip invariant); removed phase-progress `note:` scaffolding. Net: 2 `important:` + 1 `note:`, arch-test-visible.
- **`workplan/WP-025-block-forge-core.md`** — `Status: PLANNING` → `Status: ✅ DONE`; `Completed: —` → `Completed: 2026-04-23`.

Single-place routing held: each D1/D2/D3 discovery lives in exactly one authoritative doc; cross-refs only where two audiences genuinely need different lenses (e.g., var()-skip in SKILL Invariants for engine-authors + CONVENTIONS brief for block-authors; fixtures-frozen in SKILL Recipes for humans + manifest `known_gaps` for arch-test).

---

## 3 — Approval record

Brain approval received verbatim:

> "approved — go (після single revision)
>
> Застосовуй diffs exactly як в proposal, з одним виправленням: CONVENTIONS.md 'Portal render parity' — видали останнє речення про scopeBlockCss. Потім verify (436/0 arch-test, typecheck clean, only .md + manifest + WP-025 file in commit, status ✅ DONE + 2026-04-23), потім phase-5-result.md з цією approval цитатою verbatim + applied-revision note, потім commit + SHA embed."

### Applied revision

**File:** `.context/CONVENTIONS.md`
**Fix:** Deleted the last sentence of the "Portal render parity" subsection.

BEFORE (as proposed):
```
It does NOT prefix-scope with `.block-{slug}` — portal relies on authored `.block-{slug}` selectors already present in block CSS. If a future consumer embeds multiple blocks in one document (no iframe), use the exported `scopeBlockCss(css, slug)` helper for runtime isolation.
```

AFTER (as shipped):
```
It does NOT prefix-scope with `.block-{slug}` — portal relies on authored `.block-{slug}` selectors already present in block CSS.
```

**Rationale for revision:** `scopeBlockCss` is NOT publicly exported. Phase 4 task 4.8 added only the 4 compose functions (`applySuggestions`, `emitTweak`, `composeVariants`, `renderForPreview`) to `src/index.ts`; lib helpers (`container-query.ts`, `css-scoping.ts`) remained internal. Claiming an "exported helper" was a doc bug + speculation about future WP-026/027 use cases. Close-phase docs should not anticipate consumer-WP decisions.

### Brain's advisories (noted, non-blocking)

- **Advisory 1 (nx typecheck fallback):** Proposal verification used `npx nx run-many -t typecheck`. Fallback to per-tsconfig `npx tsc -p … --noEmit` + `npm -w @cmsmasters/block-forge-core run typecheck` was held in reserve. Not needed — nx target resolved for `@cmsmasters/block-forge-core`; no monorepo-wide typecheck target exists, so single-package verification is sufficient (mirrors Phase 4 verification scope).
- **Advisory 2 (routing-table text hygiene):** Proposal's routing table listed "No duplicate" for D1 and `bp:0` while those facts actually have content in both SKILL and CONVENTIONS (engine-author vs block-author lenses). Actual placements are correct; table text could have said "✅ two lenses" consistently with D2/fixtures/applySuggestions entries. Noted as doc-hygiene nit, not a routing error.

---

## 4 — Files Changed

| File | Δ | Summary |
|---|---|---|
| `.context/BRIEF.md` | +2 / −1 | Bumped date, added Block Forge Core row in sprint table |
| `.context/CONVENTIONS.md` | +40 / 0 | New "Block Forge Core — when to call" subsection (public surface, variant convention, bp:0, var()-skip, portal parity) |
| `.claude/skills/domains/pkg-block-forge-core/SKILL.md` | +103 / −24 | Full rewrite: 8 Invariants, 6 Traps, 5 Blast Radius, 4 Recipes; `status: skeleton → full` |
| `workplan/BLOCK-ARCHITECTURE-V2.md` | +1 / 0 | One-line WP-025 Engine-update blockquote paragraph |
| `src/__arch__/domain-manifest.ts` | +1 / −1 | `known_gaps` reshuffle: +D2 `important:` invariant, −phase-progress `note:` |
| `workplan/WP-025-block-forge-core.md` | +2 / −2 | `Status: PLANNING → ✅ DONE`; `Completed: — → 2026-04-23` (file tracked in this commit — previously untracked) |

**Total:** 6 files, +149 / −28 lines.
**Code files changed:** 0. Sanity-check: `git diff --stat HEAD` lists zero `packages/block-forge-core/src/…` paths.

---

## 5 — Forward-risks / discoveries — single-place routing (where they landed)

| Discovery | Authoritative doc + placement | Cross-ref (two-lens)? |
|---|---|---|
| D1 — `data-block-shell` + `stripGlobalPageRules` parity (NOT `.block-{slug}` prefix-scoping) | `SKILL.md` → Traps bullet 1 ("Portal render parity uses `data-block-shell`…") | ✅ CONVENTIONS "Portal render parity" subsection — block-author lens |
| D2 — heuristics skip `var()`/`calc()`/`clamp()`/`min()`/`max()`/`%`/`vw/vh/em` (rem allowed) | `SKILL.md` → Invariants bullet 2 + `domain-manifest` `known_gaps[1]` as `important:` | ✅ CONVENTIONS "Why tokenized content doesn't trigger clamp suggestions" — block-author lens |
| D3 — variant name → breakpoint convention (sm/md/lg + /^[467]\d\d$/; else warn+skip) | `CONVENTIONS.md` "Variant name → breakpoint convention (locked)" table | No duplicate — block-author is the only relevant audience |
| `bp: 0` = top-level rule (no `@container` wrap) | `SKILL.md` → Invariants bullet 5 | ✅ CONVENTIONS "`bp: 0` — unconditional rules" subsection — engine-user lens |
| Fixtures frozen (sha256-baseline, no `/content-pull`) | `SKILL.md` → Invariants bullet 8 + `fixtures/README.md` + `__tests__/README.md` (shipped Phase 4) | ✅ `domain-manifest` `known_gaps[2]` as `note:` — arch-test-visible machine lens |
| `applySuggestions(block, []) === block` ("never auto-apply", ADR-025) | `SKILL.md` → Invariants bullet 1 + `domain-manifest` `known_gaps[0]` as `important:` | ✅ two lenses (human reading the skill + arch-test surfacing severity) |
| Public surface (6 functions + 11 types) | `CONVENTIONS.md` "Public surface" table + `SKILL.md` "Start Here" + "Public API" | No duplicate — CONVENTIONS is name+intent only; SKILL is file-map + one-line-purpose |

Every load-bearing contract has exactly one authoritative home. Cross-refs are intentional and address distinct audiences (engine-author vs block-author, human vs machine) — not copy-paste drift.

---

## 6 — Verification Results

| Check | Expected | Actual | Pass? |
|---|---|---|---|
| `npm run arch-test` | 436/0 (per proposal) | **442/0** | ⚠ Count differs from proposal, all pass — see below |
| `npx nx run @cmsmasters/block-forge-core:typecheck` | clean | clean | ✅ |
| `git diff --stat HEAD` — zero `packages/` paths | yes | yes — `M .context/BRIEF.md`, `M .context/CONVENTIONS.md`, `M .claude/skills/domains/pkg-block-forge-core/SKILL.md`, `M src/__arch__/domain-manifest.ts`, `M workplan/BLOCK-ARCHITECTURE-V2.md`, `?? workplan/WP-025-block-forge-core.md` | ✅ |
| WP-025 header: Status ✅ DONE + Completed 2026-04-23 | confirmed | `head -13` shows both | ✅ |
| SKILL.md frontmatter: `status: full` | confirmed | `head -6` shows `status: full` | ✅ |
| manifest known_gaps: 2 `important:` + 1 `note:` | confirmed | matches | ✅ |

### Arch-test count: +6 delta explained

**Root cause:** `src/__arch__/domain-manifest.test.ts` contains a `describe('Full-Status Skill Sections', …)` block (L135) that iterates domains whose SKILL.md frontmatter has `status: 'full'` and emits one test per `REQUIRED_SECTIONS` entry (6 sections: Start Here, Public API, Invariants, Traps, Blast Radius, Recipes).

Before Phase 5: `pkg-block-forge-core` SKILL.md had `status: skeleton` → the test block **skipped** this domain entirely. Count: 436.

After Phase 5: SKILL.md status flipped to `full` → 6 new section-existence tests activated, one per REQUIRED_SECTION. Count: 442.

All 6 new tests pass because the new SKILL.md body contains all 6 required sections:

```
$ npm run arch-test 2>&1 | grep "pkg-block-forge-core (full)"
 ✓ pkg-block-forge-core (full) > has section: "Start Here"
 ✓ pkg-block-forge-core (full) > has section: "Public API"
 ✓ pkg-block-forge-core (full) > has section: "Invariants"
 ✓ pkg-block-forge-core (full) > has section: "Traps"
 ✓ pkg-block-forge-core (full) > has section: "Blast Radius"
 ✓ pkg-block-forge-core (full) > has section: "Recipes"
```

**Proposal prediction error, not a regression.** My proposal §5 claimed "Arch-test count stays 436/0 — zero new `owned_files`, zero new known_gaps-severity entries beyond the one reshuffle." This missed that the `skeleton → full` status flip activates 6 dormant tests. The prediction was wrong by +6; the contract (all arch-test green, zero regressions) was satisfied. Documented here for transparency; future close phases flipping a skill to `full` should anticipate +6 in arch-test count.

---

## 7 — Two-phase approval gate post-mortem

The gate held. Execution was strictly sequential:

1. **STEP 1 (propose):** Wrote `phase-5-proposal.md` with verbatim quotes + exact diffs + routing table + SKILL.md full body + verification plan. Ended with literal `STOP — awaiting Brain approval`. Did NOT touch any target doc.
2. **Brain reviewed** and replied with explicit `approved — go (після single revision)` plus one mandatory fix + two advisories.
3. **STEP 2 (execute):** Only then applied diffs. Revision threaded through the CONVENTIONS.md edit in the same pass.

### Did the gate catch anything?

**Yes — one factual error.** The proposal stated that `scopeBlockCss` was an "exported helper" available for future consumers. Brain caught this against the Phase 4 export list (`applySuggestions` + `emitTweak` + `composeVariants` + `renderForPreview` only — lib helpers internal). Without the gate, this doc bug would have shipped as an authoritative claim inside CONVENTIONS.md. The two-phase pattern earned its keep.

The gate also surfaced the two advisory nits (typecheck fallback, routing-table text hygiene) — smaller in impact, but the deliberate review moment surfaced them in a low-friction forum rather than after-the-fact.

---

## 8 — Issues & Workarounds

**None.** Execution was linear: 6 Edit calls succeeded first attempt, revision Edit succeeded first attempt, verification was green on first pass (modulo the +6 arch-test count investigation, which was diagnostic, not a failure).

---

## 9 — Open Questions

**None.** WP-025 is code-complete (Phase 4) and docs-complete (Phase 5). Phase 5 explicitly shipped no code — the package is frozen at the Phase 4 surface.

---

## 10 — WP-025 final status

### Phase summary

| Phase | Scope | Commit(s) | Outcome |
|---|---|---|---|
| Phase 0 — RECON | Audit infra, freeze fixtures, set baseline | [phase-0-task.md](./phase-0-task.md), [phase-0-result.md](./phase-0-result.md) | arch-test 384 → 402 (+18 infra paths); fixture sha256 baseline pinned |
| Phase 1 — Type backbone + smoke | `lib/types.ts`, `index.ts`, `smoke.test.ts`, scaffold manifest | Phase 1 commits | arch-test 402; 11 public types, 0 impl |
| Phase 2 — Analyzer | `analyze/parse-css.ts`, `analyze/parse-html.ts`, `analyze/analyze-block.ts` | Phase 2 commits | arch-test 402; `analyzeBlock` export ships; 15 tests |
| Phase 3 — Rule engine | 6 heuristics + `rules/index.ts` dispatcher + `lib/hash.ts` + 7 tests | `7c0fde92` (impl) + `b0f020f8` (SHA embed) | arch-test 417; 43 tests; dispatcher determinism locked |
| Phase 4 — Compose path + fixtures + snapshot | 4 compose fns + 2 lib helpers + 5 tests + 3 frozen fixtures + E2E snapshot | `fc8aa430` (impl) + `07b48cb4` (SHA embed) | arch-test 436; 75 tests; nested-row NO-trigger locked E2E |
| Phase 5 — Close (docs) | 6 docs propagated, WP-025 status flipped | `<TBD>` (this phase) + `chore(logs)` follow-up | arch-test 442; zero code changes; skill `status: full` |

### Arch-test journey

```
WP start     384 /   0
Phase 0     +18 paths (infra scaffold)
Phase 1     402 /   0  (types + smoke; no new owned_files)
Phase 2     402 /   0  (analyze path; path-existence tests already counted in manifest)
Phase 3     417 /   0  (+15: 6 heuristics + 6 tests + dispatcher + dispatcher test + hash.ts)
Phase 4     436 /   0  (+19: 4 compose + 2 lib + 5 tests + 6 fixtures + 2 READMEs)
Phase 5     442 /   0  (+6: Full-Status Skill Sections activates on status: skeleton → full)
```

Net journey: 384 → 442 (+58 across 5 phases). All green every phase.

### Commit list

```
7c0fde92  feat(pkg-block-forge-core): six heuristics + generateSuggestions dispatcher [WP-025 phase 3]
b0f020f8  chore(logs): embed phase-3 commit SHA in result log
fc8aa430  feat(pkg-block-forge-core): compose path + fixtures + E2E snapshot [WP-025 phase 4]
07b48cb4  chore(logs): embed phase-4 commit SHA in result log
<TBD>     docs: WP-025 close — propagate block-forge-core contracts [WP-025 phase 5]
<TBD>     chore(logs): embed phase-5 commit SHA in result log
```

(Plus earlier Phase 0–2 commits from prior session.)

### Public surface (final)

```ts
// packages/block-forge-core/src/index.ts
export type {
  BlockInput, BlockOutput, BlockAnalysis,
  Rule, Element,
  Suggestion, Heuristic, Confidence,
  Tweak, Variant, PreviewResult,
} from './lib/types'

export { analyzeBlock } from './analyze/analyze-block'
export { generateSuggestions } from './rules'
export { applySuggestions } from './compose/apply-suggestions'
export { emitTweak } from './compose/emit-tweak'
export { composeVariants } from './compose/compose-variants'
export { renderForPreview } from './compose/render-preview'
```

**6 functions + 11 types. Zero types.ts changes across all 5 phases.**

### Unblocks

- **WP-026 — tools/block-forge Vite app.** Standalone authoring surface consuming `@cmsmasters/block-forge-core` directly. Clean foundation; docs (this phase) tell it how to consume the engine.
- **WP-027 — Studio Responsive tab.** Embedded authoring surface inside Studio. Same engine, different shell. Shares the full public API + SKILL.md contracts.
- **Future responsive token rollout (WP-029).** `tokens.responsive.css` can now be populated against real use cases surfaced through WP-025 consumers. The `var()`-skip invariant (D2) codifies that responsive tokens stay in the design-system layer, not the engine.

---

## 11 — Git section

**Stage list:**

```
.context/BRIEF.md
.context/CONVENTIONS.md
.claude/skills/domains/pkg-block-forge-core/SKILL.md
workplan/BLOCK-ARCHITECTURE-V2.md
src/__arch__/domain-manifest.ts
workplan/WP-025-block-forge-core.md
logs/wp-025/phase-5-task.md
logs/wp-025/phase-5-proposal.md
logs/wp-025/phase-5-result.md
```

**Commit message:**

```
docs: WP-025 close — propagate block-forge-core contracts [WP-025 phase 5]
```

**Final SHA:** `<embed after commit>`

---

## 12 — WP-025 READY FOR ARCHIVE

Code complete. Docs complete. Status `✅ DONE`. No follow-ups. No deferred scope. WP-026 and WP-027 open to a self-contained, tested, documented foundation.
