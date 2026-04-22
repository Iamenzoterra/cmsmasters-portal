# WP-025 Phase 5 — Task (Close — doc propagation under approval gate)

> **Role:** Hands (execution in two steps: propose → await Brain approval → execute)
> **WP:** [workplan/WP-025-block-forge-core.md](../../workplan/WP-025-block-forge-core.md)
> **Phase:** 5 of 5 (Close)
> **Estimated duration:** ~0.5–1h
> **Prerequisites:** Phase 4 ✅ — commits `fc8aa430` (impl) + `07b48cb4` (SHA embed). Code-complete.
> **Baseline (from Phase 4 close):** arch-test **436/0**, typecheck clean, 75 tests across 14 files green, package exports 6 public functions + 11 public types.

---

## Mission

Propagate WP-025 contracts across six top-level docs + one domain skill, flip WP status to ✅ DONE. **Zero code changes.** All implementation landed in Phases 1–4.

This phase is a TWO-STEP workflow with a mandatory approval gate (per the saved "Close phase approval gate" pattern — ≥3 doc files touched). **Do NOT execute diffs until Brain explicitly replies `approved — go` or equivalent.** Silence is not approval.

---

## What's new since the WP was planned — discoveries to route

Phase 4 surfaced three deviations that are load-bearing for future agents:

| # | Discovery | Why it must land in docs |
|---|---|---|
| D1 | Portal renderer uses `<div data-block-shell="{slug}">` + `stripGlobalPageRules` (string-helper path), not `.block-{slug}` prefix-scoping. Engine's `renderForPreview` matches this reality. | Future consumers (WP-026 tools/block-forge, WP-027 Studio tab) will inject engine output into an environment that must provide matching wrap. Divergence with RSC path (`.block-{slug}`) is pre-existing — documented in WP-024 phase 5 close; re-document here so pkg-block-forge-core skill points at it. |
| D2 | Heuristics skip `var(…)`-based values by design — real-world content using `var(--spacing-5xl, 64px)` does NOT trigger spacing/font clamp. `block-spacing-font` fixture name is aspirational; behavior correct per ADR-025. | Invariant in pkg-block-forge-core skill. Plus observed-in-real-content note in CONVENTIONS (so authors know heuristics respect token scope). |
| D3 | Variant name → breakpoint convention locked this phase: `sm` / `/^4\d\d$/` → 480px; `md` / `/^6\d\d$/` → 640px; `lg` / `/^7\d\d$/` → 768px; otherwise warning + skip reveal. | Hard contract for any caller of `composeVariants`. Belongs in CONVENTIONS + skill. |

Also 3 structural facts from phases 1–4 to propagate:

| Fact | Target |
|---|---|
| `bp: 0` is the convention for "no breakpoint" (media-maxwidth unconditional rules) — appliedSuggestions and emit-tweak emit these as top-level rules, not inside `@container` | CONVENTIONS + skill |
| Fixtures under `src/__tests__/fixtures/` are frozen real blocks (hash-verified); unit tests use inline synthetic inputs; snapshot chronicles real-content behavior | skill Recipes section |
| Arch-test baseline is now 436/0 (was 384/0 at WP-025 start); +52 tests across 5 phases (new domain entry + 17 path-existence + smoke + mostly per-test-file assertions) | Not a doc-propagation target — just reality-check context for Phase 5 |

---

## STEP 1 — Propose (write `logs/wp-025/phase-5-proposal.md`, then STOP)

Single file: a full proposal with verbatim current-state quotes + exact diffs for every target doc. Brain reviews this file; Hands DOES NOT touch target docs yet.

### Target docs (6 files)

| # | File | What to add | Placement |
|---|---|---|---|
| 1 | `.context/BRIEF.md` | Update last-updated date to 2026-04-23. Add `Block Forge Core ✅ DONE (WP-025 — …)` row in Current sprint table. | Mirror WP-024's BRIEF row shape. |
| 2 | `.context/CONVENTIONS.md` | New subsection "Block Forge Core — when to call" under whichever parent section fits (likely near existing responsive/tokens sections, below "Responsive blocks (WP-024, ADR-025)"). Subsections: (a) when consumers must use `@cmsmasters/block-forge-core`, (b) the 6 public functions + one-line each, (c) variant-name→bp convention, (d) `bp: 0` meaning, (e) `stripGlobalPageRules` parity note. | Just below the WP-024 "Responsive blocks" section. Keep concise — authoritative contracts, not tutorial. |
| 3 | `.claude/skills/domains/pkg-block-forge-core/SKILL.md` | Replace stub content with full skill: Start Here (5 files), Invariants (4–6), Traps (3–5), Blast Radius, Recipes (2–3). | Full rewrite of the skill body; keep YAML frontmatter (`domain`/`source_of_truth`/`status`) from Phase 1 — just flip `status: scaffold` → `status: stable` or equivalent. |
| 4 | `workplan/BLOCK-ARCHITECTURE-V2.md` | Add one-line cross-reference to WP-025 alongside the existing WP-024 reference in the header blockquote. | Header blockquote, alongside "Responsive update 2026-04-22 (WP-024 / ADR-025)…" |
| 5 | `src/__arch__/domain-manifest.ts` | Finalize `pkg-block-forge-core.known_gaps`: remove the phase-progress note; keep only the two ADR-025 contracts (never-auto-apply + fixtures-frozen); optionally add the new D2 invariant (`heuristics respect var() — token-driven content does not trigger`). | Edit the `known_gaps` array in-place; preserve prefixes (`important:` / `note:`). |
| 6 | `workplan/WP-025-block-forge-core.md` | Flip `Status: PLANNING` → `Status: ✅ DONE`. Set `Completed: 2026-04-23`. | Header metadata block (around L5, L11). |

### Single-place-routing discipline

Each forward-risk / invariant lives in exactly ONE authoritative doc. Cross-refs OK; duplicate content NOT OK. Exception warranted only when two genuinely different lenses need the same fact. Use the same routing table shape as WP-024 phase 5 result:

| Fact | Target doc | Placement | Rationale |
|---|---|---|---|
| `data-block-shell` + `stripGlobalPageRules` parity | `.claude/skills/domains/pkg-block-forge-core/SKILL.md` Traps | "renderForPreview matches string-helper path (data-block-shell + stripGlobalPageRules); divergence from RSC `.block-{slug}` path is pre-existing — WP-024" | Skill is where future pkg-block-forge-core agents look first; CONVENTIONS authors don't need this daily. |
| Heuristics skip var() — token-driven content does NOT trigger | `.claude/skills/domains/pkg-block-forge-core/SKILL.md` Invariants + `.context/CONVENTIONS.md` brief mention | Skill is authoritative; CONVENTIONS note is for authors who wonder why their tokenized block doesn't get clamp suggestions | Two lenses: engine-author + block-author |
| Variant name→bp convention | `.context/CONVENTIONS.md` "Block Forge Core" subsection | Authored by block-author, not engine-author — CONVENTIONS is the correct home | — |
| `bp: 0` = top-level rule | `.claude/skills/domains/pkg-block-forge-core/SKILL.md` Invariants | Engine-internal convention | — |
| fixtures-frozen contract | `.claude/skills/domains/pkg-block-forge-core/SKILL.md` Recipes + manifest `known_gaps` | Skill is the day-one reference; manifest gap is the arch-test-visible contract | Two lenses: human-facing + arch-test-facing |

### Proposal document shape

`logs/wp-025/phase-5-proposal.md` contents:

1. **Audit pass** — verbatim quotes from each of the 6 target files' current state (specifically the lines that will change). Preserve exact whitespace. Cite line numbers. This is what Brain reviews to confirm diffs land where claimed.
2. **Routing table** (the one above, filled in with specific anchor points for each doc).
3. **Exact diffs** per file — full before/after blocks, not descriptions. Format:

   ```
   ### File: .context/BRIEF.md

   BEFORE (L12-15 verbatim):
   > <exact current lines>

   AFTER:
   > <exact new lines>
   ```

4. **SKILL.md full content** — since it's a full rewrite, paste the complete new body (not a diff).
5. **Expected totals**: N files edited, +X/-Y lines, exclusively `.md` + `.ts` (manifest) — zero code files in `packages/`.
6. **Verification plan** for step 2 (execute): the exact checks you'll run after applying diffs — `arch-test`, `typecheck`, `git diff --stat` over tracked files, `head` of WP-025 file to confirm status flip.

End the proposal with this line, literal and alone:

```
STOP — awaiting Brain approval (do not proceed without explicit `approved — go`).
```

---

## STEP 2 — Execute (only after Brain approval)

Hands receives an explicit approval quote from Brain (e.g., `approved — go` or similar). Then:

1. **Apply diffs exactly as approved.** Each `Edit` call matches the proposal byte-for-byte. If an Edit fails (e.g., `old_string` mismatch because file drifted), STOP — re-read, re-propose that single diff.
2. **Run verification:**

   ```bash
   npm run arch-test               # expect 436/0 (no code changes → no test delta)
   npm run typecheck               # expect clean monorepo
   git diff --stat HEAD            # expect only .md files + domain-manifest.ts + WP-025 workplan file
   head -15 workplan/WP-025-block-forge-core.md   # expect Status: ✅ DONE, Completed: 2026-04-23
   ```

3. **Write `logs/wp-025/phase-5-result.md`** with these sections:
   - Audit confirm-pass table (each pre-execute check ✅)
   - What was implemented summary (~2 paragraphs)
   - Approval record — verbatim Brain quote
   - Files Changed table (file | +/- | summary)
   - Forward-risks / discoveries documented (single-place-routing table — filled with WHERE each D1/D2/D3 landed)
   - Verification Results (each check with expected vs actual)
   - Two-phase approval gate post-mortem (did the gate hold? did it catch anything?)
   - Issues & Workarounds (probably empty)
   - Open Questions (probably "None.")
   - WP-025 final status section mirroring WP-024's shape — phases summary + arch-test journey + commit list + unblocks
   - Git section — commit SHA + staged files list

4. **Commit:**

   ```
   docs: WP-025 close — propagate block-forge-core contracts [WP-025 phase 5]
   ```

   Stage:
   - `.context/BRIEF.md`
   - `.context/CONVENTIONS.md`
   - `.claude/skills/domains/pkg-block-forge-core/SKILL.md`
   - `workplan/BLOCK-ARCHITECTURE-V2.md`
   - `src/__arch__/domain-manifest.ts`
   - `workplan/WP-025-block-forge-core.md`
   - `logs/wp-025/phase-5-task.md` (this file)
   - `logs/wp-025/phase-5-proposal.md`
   - `logs/wp-025/phase-5-result.md`

5. **Embed final SHA** into `phase-5-result.md` via follow-up `chore(logs)` commit — same pattern as Phases 0/1/2/3/4.

---

## Hard gates

- **Step 1 (propose) ends with `STOP — awaiting Brain approval`.** Silence is NOT approval.
- **Step 2 (execute) starts only after Brain replies with explicit go.** Interpreting absence of response as permission = gate broken. Past precedent (WP-024 Phase 5) holds the pattern; don't re-open it.
- **Zero code files in the commit.** `.md` + `src/__arch__/domain-manifest.ts` only. Sanity-check via `git diff --stat HEAD`.
- **Arch-test stays at 436/0.** Phase 5 adds no owned files. If arch-test count changes, something's wrong.
- **Typecheck clean across monorepo** — unchanged from Phase 4, but verify.
- **Single-place-routing discipline** — use the routing table. Don't duplicate content.
- **SKILL.md frontmatter preserved** — YAML block at top (`domain` / `source_of_truth` / `status`) from Phase 1 stays; only `status` field updates.
- **WP-025 file: status + date flip** — both fields update in one pass. No half-flips.

---

## What success looks like

A future agent opens any one of the 6 target docs and finds the WP-025 contract authoritatively stated exactly once. The pkg-block-forge-core skill points at the 5 most useful source files, codifies the 4–6 invariants (var()-skip, bp:0 convention, data-block-shell parity, fixtures-frozen, `applySuggestions(block, []) === block`), and lists the 3 likely traps. CONVENTIONS gives block-authors the variant-name convention they'll actually need. BRIEF reflects sprint reality. Manifest known_gaps carries exactly the ADR-025 contracts that arch-test surfaces. WP-025 reads `✅ DONE`.

WP-026 (tools/block-forge Vite app) and WP-027 (Studio Responsive tab) open to a clean foundation with docs that tell them how to consume the engine.
