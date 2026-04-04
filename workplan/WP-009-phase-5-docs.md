# WP-009 Phase 5: Documentation Update

> Workplan: WP-009 Living Documentation System
> Phase: 5 of 5
> Priority: P1
> Estimated: 1-2 hours
> Type: Config
> Previous: Phase 4 ✅ (Smoke Test — all violations caught)
> Next: None (WP-009 complete)

---

## Context

Phases 1-4 built and verified the Living Documentation system. Phase 5 updates canonical docs to reflect what was actually built, so the next agent or contributor knows the system exists and how to use it.

```
CURRENT:  src/__arch__/ — manifest + helpers + tests          ✅
CURRENT:  .claude/skills/domains/ — 11 domain skills          ✅
CURRENT:  npm run arch-test — passes, catches violations      ✅
MISSING:  .context/BRIEF.md mentions Living Documentation     ❌
MISSING:  CLAUDE.md references manifest for agents            ❌
MISSING:  .context/CONVENTIONS.md has manifest update rule    ❌
MISSING:  WP-009 marked as DONE                               ❌
```

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Read all phase logs to understand actual vs planned
cd "C:/work/cmsmasters portal/app/cmsmasters-portal"
cat logs/wp-009/phase-0-result.md
cat logs/wp-009/phase-1-result.md
cat logs/wp-009/phase-2-result.md
cat logs/wp-009/phase-3-result.md
cat logs/wp-009/phase-4-result.md

# 2. Confirm current state
npm run arch-test
ls src/__arch__/
ls .claude/skills/domains/
```

**Document any deviations from the plan across all phases.**

---

## Task 5.1: Update `.context/BRIEF.md`

### What to Change

Add a new section after "What's built" → "Shared packages":

```markdown
### Living Documentation ✅
| Component | Status | Details |
|-----------|--------|---------|
| Domain Manifest | ✅ | `src/__arch__/domain-manifest.ts` — 11 domains, typed DomainDefinition interface |
| Domain Skills | ✅ | `.claude/skills/domains/` — 11 SKILL.md files (invariants, traps, blast radius) |
| Arch Tests | ✅ | `src/__arch__/domain-manifest.test.ts` — path existence, dual ownership, table access, skill parity |
| `npm run arch-test` | ✅ | Runs all enforcement tests (~100+ assertions) |
```

Also update the monorepo structure diagram to include `src/__arch__/`.

---

## Task 5.2: Update `CLAUDE.md`

### What to Change

Add a section after "Design System Architecture":

```markdown
## Living Documentation

### Domain Manifest
`src/__arch__/domain-manifest.ts` is the **source of truth** for code ownership.

- 11 domains covering all packages and apps
- Every source file assigned to exactly one domain
- Query ownership: `getOwnerDomain('path/to/file.ts')` from `src/__arch__/helpers.ts`

### Domain Skills
`.claude/skills/domains/{slug}/SKILL.md` — human knowledge per domain:
- **Start Here** — 3 files to read to understand the domain
- **Invariants** — what must ALWAYS be true
- **Traps & Gotchas** — known pitfalls
- **Blast Radius** — what breaks if you change key files

### When Adding or Moving Files
1. Update `owned_files` in `src/__arch__/domain-manifest.ts`
2. Run `npm run arch-test` to verify
3. If domain boundaries change, update the relevant SKILL.md
```

---

## Task 5.3: Update `.context/CONVENTIONS.md`

### What to Change

Add a new convention under an appropriate section:

```markdown
### Living Documentation
- **When adding a new source file:** add its path to the correct domain in `src/__arch__/domain-manifest.ts`
- **When deleting/renaming a file:** update the path in `domain-manifest.ts`
- **When adding a new Supabase table:** add it to `owned_tables` of the owning domain
- **Run `npm run arch-test`** after any structural change — it catches manifest drift
- **Domain skills** (`.claude/skills/domains/`) should be updated when invariants or traps change, not after every code change
```

---

## Task 5.4: Update WP-009 Status

### What to Change

In `workplan/WP-009-living-documentation.md`:
- Change `**Status:** PLANNING` → `**Status:** ✅ DONE`
- Fill in `**Completed:** 2026-04-XX` with actual date

---

## Task 5.5: Source Logs Links

### What to Change

In each updated doc, add a Source Logs reference:

```markdown
> Source: [WP-009 Living Documentation](../workplan/WP-009-living-documentation.md) | Logs: `logs/wp-009/`
```

---

## Files to Modify

- `.context/BRIEF.md` — **MODIFY** — add Living Documentation section
- `CLAUDE.md` — **MODIFY** — add Living Documentation section
- `.context/CONVENTIONS.md` — **MODIFY** — add manifest update convention
- `workplan/WP-009-living-documentation.md` — **MODIFY** — status → DONE

---

## Acceptance Criteria

- [ ] `.context/BRIEF.md` has Living Documentation table
- [ ] `CLAUDE.md` has Living Documentation section with manifest, skills, and "when adding files" instructions
- [ ] `.context/CONVENTIONS.md` has manifest update convention
- [ ] `WP-009-living-documentation.md` status is ✅ DONE with completion date
- [ ] Source Logs links present in updated docs
- [ ] All 5 phase execution logs exist in `logs/wp-009/`
- [ ] `npm run arch-test` still passes after doc updates

---

## Verification (do NOT skip)

```bash
echo "=== Phase 5 Verification ==="

# 1. Key phrases in updated docs
grep -l "Living Documentation" .context/BRIEF.md CLAUDE.md .context/CONVENTIONS.md
echo "(Expected: all 3 files)"

# 2. WP-009 marked done
grep "DONE" workplan/WP-009-living-documentation.md
echo "(Expected: Status: ✅ DONE)"

# 3. All phase logs exist
for i in 0 1 2 3 4 5; do
  f="logs/wp-009/phase-$i-result.md"
  [ -f "$f" ] && echo "  ✅ $f" || echo "  ❌ $f"
done

# 4. Tests still pass
npm run arch-test
echo "(Must still be green after doc updates)"

echo "=== Phase 5 Verification === "
echo "=== WP-009 COMPLETE ==="
```

---

## MANDATORY: Write Execution Log (do NOT skip)

After verification, create:
`logs/wp-009/phase-5-result.md`

---

## Git

```bash
git add .context/BRIEF.md CLAUDE.md .context/CONVENTIONS.md workplan/WP-009-living-documentation.md logs/wp-009/phase-5-result.md
git commit -m "docs: living documentation system complete — manifest, skills, arch tests [WP-009 phase 5]"
```

---

## IMPORTANT Notes for CC

- Read ALL phase logs before writing doc updates — capture what actually happened, not what was planned
- If any phase deviated from the plan, mention the deviation in BRIEF.md or CONVENTIONS.md
- Keep doc additions concise — agents need quick reference, not essays
- Do NOT modify manifest, skills, or tests in this phase — only documentation files
- After this phase, WP-009 is complete. No more phases.
