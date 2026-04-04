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
