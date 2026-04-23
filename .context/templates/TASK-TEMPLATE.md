# {WP-NNN} Phase {X}: {Task Title}

> Workplan: WP-{NNN} {WP Name}
> Phase: {X} of {total}
> Priority: P{0-2}
> Estimated: {X} hours
> Type: {Backend | Frontend | Full-stack | Deploy | Config}
> Previous: Phase {X-1} ✅ ({what was done})
> Next: Phase {X+1} ({what comes next})
> Affected domains: {domain-1, domain-2}

---

## Context

{Explain the current state of the codebase. What exists. What's missing. What this task adds.
Be specific — CC needs to understand where to look and what to change.}

```
CURRENT:  {what works now}   ✅
MISSING:  {what doesn't exist yet}   ❌
```

{If relevant, explain how this task connects to the overall WP and system.}

---

## Domain Context

{For each affected domain, provide the key information from their skills.
Brain extracts this from the domain skills during RECON so CC has it inline.}

**{domain-1}:**
- Key invariants: {from skill's Invariants section}
- Known traps: {from skill's Traps section — relevant ones only}
- Public API: {what can be imported from this domain}
- Blast radius: {who depends on changes here}

**{domain-2}:** (if applicable)
- Key invariants: {from skill}
- Known traps: {from skill}

---

## PHASE 0: Audit (do FIRST — CRITICAL)

{Bash commands for CC to run BEFORE writing any code.
Purpose: understand the actual state, not assumed state.
CC must document findings before proceeding.}

```bash
# 0. Baseline (ALWAYS — do not skip)
npm run arch-test

# 1. Read domain skill(s) for affected area
cat .claude/skills/domains/{domain-1}/SKILL.md

# 2. Check domain ownership and boundaries
grep -A 20 "'{domain-1}'" src/__arch__/domain-manifest.ts | head -30

# 3. {Domain-specific audit — from skill's Start Here files}
{command}

# 4. Verify current test state
npm run arch-test
```

**Document your findings before writing any code.**

{If there are expected findings or gotchas, note them:}

**IMPORTANT:** {Known gotcha or decision point CC will encounter — often from skill's Traps section.}

---

## Task {X.1}: {Name}

### What to Build

{Detailed description. Include:
- Data structures / interfaces
- Logic (pseudocode or real code examples)
- Edge cases to handle
- Where code lives (file paths)}

```typescript
// Example code showing expected implementation
{code}
```

### Integration

{Where this code plugs into existing code. Be specific about file + location.}

```typescript
// EXISTING CODE (in {file}):
// ... {context}

// ADD AFTER:
{new code}
```

### Domain Rules

{Specific rules from the domain skill that apply to this task:}
- {invariant to preserve}
- {trap to avoid}
- {public API boundary to respect}

---

## Task {X.2}: {Name}

{Same structure as X.1}

---

## Files to Modify

- `{path/to/file}` — {what changes}
- `{path/to/new/file}` — {new file, what it contains}
- `src/__arch__/domain-manifest.ts` — {if adding new files to a domain: update owned_files}

---

## Acceptance Criteria

- [ ] {Concrete, testable criterion}
- [ ] {Concrete, testable criterion}
- [ ] `npm run arch-test` passes (all tests green, no regressions)
- [ ] No new boundary violations
- [ ] Domain invariants preserved (list which ones were checked)

---

## MANDATORY: Verification (do NOT skip)

{Bash script that CC must run after implementation to verify everything works.}

```bash
echo "=== Phase {X} Verification ==="

# 1. Arch tests (path existence, parity, ownership)
npm run arch-test
echo "(expect: all tests green, no regressions)"

# 2. {Domain-specific verification}
{command}
echo "({expected result})"

# 3. {Functional verification}
{command}
echo "({expected result})"

echo "=== Verification complete ==="
```

---

## MANDATORY: Write Execution Log (do NOT skip)

After verification (before committing), create the file:
`logs/wp-{NNN}/phase-{N}-result.md`

Structure (fill all sections — write N/A if not applicable, do NOT omit sections):

```markdown
# Execution Log: WP-{NNN} Phase {N} — {task-name}
> Epic: {WP name}
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED
> Domains affected: {domain-1, domain-2}

## What Was Implemented
{2-5 sentences describing what was actually built}

## Key Decisions
| Decision | Chosen | Why |
|----------|--------|-----|
| ... | ... | ... |

## Files Changed
| File | Change | Description |
|------|--------|-------------|
| `path` | created/modified/deleted | brief description |

## Issues & Workarounds
{Problems encountered and resolutions. "None" if clean.}

## Open Questions
{Non-blocking questions. "None" if none.}

## Verification Results
| Check | Result |
|-------|--------|
| arch-test | ✅/❌ ({N} tests) |
| Build | ✅/❌ |
| AC met | ✅/❌ |

## Git
- Commit: `{sha}` — `{message}`
```

Then include `logs/` in your `git add` before committing.

---

## Git

```bash
git add {files}
git commit -m "{description} [WP-{NNN} phase {X}]"
```

---

## IMPORTANT Notes for CC

- **Read domain skill FIRST** — `.claude/skills/domains/{slug}/SKILL.md` before touching any code
- **Use public entrypoints only** — check skill's Public API section for cross-domain imports
- **Add new files to `domain-manifest.ts`** — update `owned_files` array for the correct domain
- **Run `npm run arch-test` before committing** — this is not optional
- {Any task-specific instructions}

---
---

# BRAIN → OPERATOR HANDOFF SUMMARY

> **Audience:** this section is NOT part of the task file handed to CC/Hands.
> It's the short message Brain posts to the Operator (user) AFTER writing
> everything above, as the handoff preamble. The Operator reviews this
> summary → approves commit → passes the full task file to Hands.
>
> **Why codified:** the format proved itself across WP-026 Phases 4–5 and
> WP-027 Phases 0–3. Every new Brain session using this format yields the
> same handoff quality any Operator can act on without re-negotiating the
> protocol.

## Pre-flight checklist (before posting the summary)

Brain runs these quick reads BEFORE posting the handoff — this is what caught
WP-027 Phase 2 double-wrap + Phase 3 token-invention blockers:

1. **Grep real constant values** — any DS token, HEURISTIC_ORDER, engine type
   signature, path depth, snapshot entry the task prompt references MUST be
   verified against source at read-time. Invented constants cause compile/lint
   hard-fails on Hands' first run. Use Read/Grep on:
   - `packages/ui/src/theme/tokens.css` — confirm every `hsl(var(--...))` ref
   - `packages/{relevant}/src/lib/types.ts` — confirm field names + shapes
   - `packages/{relevant}/src/__tests__/__snapshots__/*.snap` — ground truth
     for fixture assertions (saved memory `feedback_fixture_snapshot_ground_truth.md`)
   - `tools/{reference}/src/...` — reference components when the prompt claims
     "mirror verbatim"
2. **Cross-check load-bearing plan amendments** — any Brain rulings locked in
   prior phases should appear in the prompt's rulings section (not just
   referenced by number). Hands reads linearly; don't rely on them chasing refs.
3. **Arch-test target math** — current count via Read on last phase result log +
   delta from new owned_files. If the number doesn't add up, the manifest edit
   plan is wrong.

## Output format (fill in every placeholder)

```markdown
Phase {N} промпт готовий: `logs/wp-{NNN}/phase-{N}-task.md`.

## Структура

**{N} tasks, ~{X}h budget:**

| # | Task | Scope |
|---|------|-------|
| {N}.1 | `{file/artifact}` {verb} | {one-line scope — what changes, with key constraint} |
| {N}.2 | `{file}` {verb} | {scope} |
| ... | ... | ... |
| {N}.last | Gates | arch-test {count} {unchanged|+delta|reasoning}, {test count} green |

## {M} Brain rulings locked

1. **{Decision noun phrase}** — {one-line rationale, reference prior phase/source if inherited}
2. **{Decision}** — {rationale}
...

## Hard gates (inherited + Phase {N} additions)

- Zero touch: `{path1}`, `{path2}`, {...} — {one-line "why" for non-obvious ones}
- Zero manifest edits (if files already registered) OR manifest delta = +{N} (if new files)
- Zero {phase-specific forbidden action, e.g. "Accept/Reject handlers" in Phase 3}
- Zero copy of {reference assets — e.g. fixtures, tokens — when import is the correct path}

## Escalation triggers

Written to catch {load-bearing-assumption-class} up-front:
- {load-bearing assumption} differs from plan → STOP, re-plan {affected artifact}
- {required-constant} doesn't exist in source → can't mirror, surface to Brain
- {snapshot/reality contradicts draft assertion} → adapt to reality before commit
- {external-system shape change} → contract misalignment; don't silently work around

## Arch-test target

**{count} / 0** — {unchanged because no new files | baseline {X} + {Y} new owned_files | +6 from SKILL flip ({domain} skeleton → full)}.

## Git state

- `logs/wp-{NNN}/phase-{N}-task.md` — new untracked
- `workplan/WP-{NNN}-*.md` — modified (if amendments applied) / unchanged
- {other files if any}
- Nothing staged, nothing committed

## Next

1. Review → commit pair (task prompt + workplan if amended) → handoff Hands
2. АБО правки ({optionally name the most likely fork — e.g. "especially ruling N" or "task N.X scope"})
3. АБО self-commit if workflow permits

Чекаю.
```

## Field sizing & tone

- **Structура table:** 3–10 rows typical. Column 3 is ONE concise phrase per row,
  not a paragraph. If you can't compress it, the task is too big — split.
- **Brain rulings:** usually 5–10. Surface decisions that lock cross-surface
  behavior OR override plan assumptions. Don't list every Phase-0 carry-over —
  only load-bearing ones.
- **Hard gates:** explicit forbidden actions. Inherit from prior phases; add
  phase-specific ones. "Do NOT" framing, not "should avoid."
- **Escalation triggers:** 3–7 items. Each must be a concrete trigger condition
  Hands can test, not a vague "surface if concerned." Specifically targets the
  class of blocker that Phase 2/3 catches exposed.
- **Next options:** always 3 — review/edits/self-commit. The "self-commit if
  workflow permits" option is an explicit opt-in, not a default.
- **Final line "Чекаю."** (or equivalent acknowledgment) — signals Brain is
  parked, not running other agents in parallel.

## When to use

- After writing the phase task file (the body of this TASK-TEMPLATE.md).
- BEFORE committing the task prompt or any workplan amendments.
- ALWAYS — not optional. The handoff summary is what makes the Brain session
  auditable + replayable by any Operator.

## When NOT to use

- Bugfix / hotfix phases where the entire scope fits in a 3-line message.
- Result-log or close-phase posts — those have their own format (see
  `logs/wp-026/phase-5-result.md` for the Close canonical).
- Pure question-and-answer exchanges where no task file is written.
