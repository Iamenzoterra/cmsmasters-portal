# WP-{NNN}: {Title}

> {One-line description of what this workplan delivers.}

**Status:** PLANNING | IN PROGRESS | BLOCKED | ✅ DONE
**Priority:** P0 — Critical path | P1 — Important | P2 — Improvement
**Prerequisites:** WP-{XXX} ✅ ({name}) | None
**Milestone/Wave:** {optional grouping or release cycle}
**Estimated effort:** {X-Y} hours across {N} phases
**Created:** {YYYY-MM-DD}
**Completed:** —

---

## Problem Statement

{2-3 paragraphs explaining WHY this workplan exists. What's broken, missing, or needed.
Not technical details — the business/user problem.}

---

## Solution Overview

### Architecture

```
{ASCII diagram showing how the components connect.
Keep it simple — show data flow, not implementation details.}
```

### Key Decisions

| Decision | Chosen | Why | Alternatives considered |
|----------|--------|-----|----------------------|
| {decision} | {choice} | {rationale} | {what else was possible} |

---

## Domain Impact

{Which domains does this WP touch? What invariants must be preserved?
Brain fills this from domain skills during RECON.}

| Domain | Impact | Key Invariants | Traps to Watch |
|--------|--------|---------------|----------------|
| {slug} | {what changes} | {from skill} | {from skill} |

**Public API boundaries:**
- {domain-1} public entrypoints used: {list}
- {domain-2} internal — do NOT import from outside

**Cross-domain risks:**
- {e.g., "changing block-api.ts authHeaders affects ALL entity API wrappers in studio-core"}

---

## What This Changes

### New Files

```
{File tree of new files/directories this WP creates.
Annotate with brief comments.}
```

### Modified Files

```
{Existing files that get changed, with brief description of changes.}
```

### Manifest Updates

```
{domain-manifest.ts changes: new owned_files entries.
If adding files to a domain, they must be registered here.}
```

### Database Changes

```sql
-- Supabase migration (if applicable)
{SQL schema}
-- Remember: update packages/db/src/types.ts + domain-manifest.ts owned_tables
```

---

## Implementation Phases

### Phase 0: RECON ({X}h)

**Goal:** Audit actual codebase state. Read domain skills. Identify risks.

**Tasks:**

0.1. **Read domain skills** — `.claude/skills/domains/{slug}/SKILL.md` for each affected domain
0.2. **Check manifest boundaries** — `src/__arch__/domain-manifest.ts`
0.3. **Run audit commands** — {specific commands}
0.4. **Report findings** — document actual state, invariants, traps

**Verification:** RECON report exists with domain analysis. No code written.

---

### Phase 1: {Name} ({X-Y}h)

**Goal:** {One sentence — what's true when this phase is done.}

**Tasks:**

1.1. **{Task name}** — {description}
- {detail}
- {detail}

1.2. **{Task name}** — {description}
- {detail}

**Verification:**
```bash
npm run arch-test              # Path existence, parity, ownership
{domain-specific checks}       # From skill's verification notes
```

---

### Phase 2: {Name} ({X-Y}h)

**Goal:** {One sentence.}

**Tasks:**

2.1. **{Task name}** — {description}

2.2. **{Task name}** — {description}

**Verification:**
```bash
npm run arch-test
{domain-specific verification}
```

---

### Phase N: Close (mandatory, always last)

**Goal:** Update docs, verify final state, close WP.

**Tasks:**

N.1. **CC reads all phase logs** — understands what was done, what deviated from plan
N.2. **CC proposes doc updates** — list of files to update with proposed changes
N.3. **Brain approves** — reviews proposed changes
N.4. **CC executes doc updates** — updates `.context/BRIEF.md`, domain skills if contracts changed
N.5. **Verify everything green:**
  ```bash
  npm run arch-test
  ```
N.6. **Update WP status** — mark WP as ✅ DONE

**Files to update:**
- `.context/BRIEF.md` — if project state changed
- `.context/CONVENTIONS.md` — if new patterns discovered
- `.claude/skills/domains/{slug}/SKILL.md` — if domain contracts changed
- `src/__arch__/domain-manifest.ts` — if new files/tables added
- `logs/wp-{NNN}/phase-*-result.md` — phase evidence (must exist)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| {risk} | {what breaks} | {how to handle} |
| Cross-domain boundary violation | arch-test fails | Check Public API in skills before importing |
| Invariant violated silently | Production bug | Read domain skill Invariants + run arch-test |

---

## Acceptance Criteria (Definition of Done)

- [ ] {Concrete, testable criterion}
- [ ] {Concrete, testable criterion}
- [ ] `npm run arch-test` passes (all tests green, no regressions)
- [ ] Domain invariants preserved (verified against skills)
- [ ] New files registered in `domain-manifest.ts`
- [ ] All phases logged in `logs/wp-{NNN}/`
- [ ] Domain skills updated if contracts changed
- [ ] No known blockers for next WP

---

## Dependencies

| Depends on | Status | Blocks |
|------------|--------|--------|
| {WP or external dep} | {status} | {what can't start without this} |

---

## Notes

{Any additional context, links to discussions, reference materials, etc.}
