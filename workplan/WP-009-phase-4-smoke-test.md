# WP-009 Phase 4: Smoke Test — Break & Catch

> Workplan: WP-009 Living Documentation System
> Phase: 4 of 5
> Priority: P1
> Estimated: 0.5-1 hour
> Type: Config
> Previous: Phase 3 ✅ (Arch Tests — enforcement layer)
> Next: Phase 5 (Documentation Update)

---

## Context

Phases 1-3 built the manifest, skills, and tests. Phase 4 proves the system works by **deliberately breaking things** and confirming the tests catch each violation.

```
CURRENT:  src/__arch__/domain-manifest.ts — 11 domains      ✅
CURRENT:  .claude/skills/domains/ — 11 SKILL.md files        ✅
CURRENT:  src/__arch__/domain-manifest.test.ts — enforcement  ✅
CURRENT:  npm run arch-test — all green                       ✅
MISSING:  Proof that tests catch violations                   ❌
```

This is the "trust but verify" phase. If we can break something without the tests noticing, the system has a gap.

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Confirm tests are green before we start breaking things
cd "C:/work/cmsmasters portal/app/cmsmasters-portal"
npm run arch-test
echo "(All must pass before proceeding)"
```

**IMPORTANT:** Do NOT proceed if tests are already failing. Fix any failures first.

---

## Task 4.1: Negative Test — File Deleted from Disk

### What to Do

1. Temporarily rename a file that's in the manifest:
```bash
mv packages/validators/src/block.ts packages/validators/src/block.ts.bak
```

2. Run tests:
```bash
npm run arch-test
```

3. **Expected:** Path existence test fails for `pkg-validators: file exists → packages/validators/src/block.ts`

4. Revert:
```bash
mv packages/validators/src/block.ts.bak packages/validators/src/block.ts
```

5. Confirm green:
```bash
npm run arch-test
```

---

## Task 4.2: Negative Test — Dual Ownership

### What to Do

1. Temporarily add a file that already belongs to another domain. Edit `domain-manifest.ts`:
   - Add `'packages/db/src/types.ts'` to `pkg-auth.owned_files` (it already belongs to `pkg-db`)

2. Run tests:
```bash
npm run arch-test
```

3. **Expected:** "no file is owned by two domains" test fails, naming both `pkg-db` and `pkg-auth`

4. Revert the manifest change.

5. Confirm green:
```bash
npm run arch-test
```

---

## Task 4.3: Negative Test — Skill Frontmatter Mismatch

### What to Do

1. Temporarily change frontmatter in `.claude/skills/domains/pkg-db/SKILL.md`:
   - Change `domain: pkg-db` to `domain: wrong-slug`

2. Run tests:
```bash
npm run arch-test
```

3. **Expected:** "frontmatter domain matches slug" test fails for `pkg-db`

4. Revert the skill change.

5. Confirm green:
```bash
npm run arch-test
```

---

## Task 4.4: Negative Test — Missing Skill Section

### What to Do

1. Temporarily remove the `## Invariants` section from a full-status skill (e.g., `pkg-db/SKILL.md`)

2. Run tests:
```bash
npm run arch-test
```

3. **Expected:** "has required section: Invariants" test fails for `pkg-db`

4. Revert the skill change.

5. Confirm green:
```bash
npm run arch-test
```

---

## Task 4.5: Agent Query Test

### What to Do

Verify the manifest is useful for agents by querying it:

```bash
# Who owns block-processor.ts?
npx tsx -e "
  import { getOwnerDomain } from './src/__arch__/helpers'
  console.log('block-processor.ts →', getOwnerDomain('apps/studio/src/lib/block-processor.ts'))
"
# Expected: studio-blocks

# Who owns block-api.ts?
npx tsx -e "
  import { getOwnerDomain } from './src/__arch__/helpers'
  console.log('block-api.ts →', getOwnerDomain('apps/studio/src/lib/block-api.ts'))
"
# Expected: studio-core

# What tables does pkg-db own?
npx tsx -e "
  import { DOMAINS } from './src/__arch__/domain-manifest'
  console.log('pkg-db tables:', DOMAINS['pkg-db'].owned_tables.join(', '))
"
# Expected: all 9 tables

# What can app-portal import from?
npx tsx -e "
  import { DOMAINS } from './src/__arch__/domain-manifest'
  console.log('app-portal imports from:', DOMAINS['app-portal'].allowed_imports_from.join(', '))
"
# Expected: pkg-db, pkg-ui
```

---

## Files to Modify

None permanently. All changes are temporary and reverted.

---

## Acceptance Criteria

- [ ] Task 4.1: File deletion caught by path existence test → reverted → green
- [ ] Task 4.2: Dual ownership caught → reverted → green
- [ ] Task 4.3: Frontmatter mismatch caught → reverted → green
- [ ] Task 4.4: Missing section caught → reverted → green
- [ ] Task 4.5: Agent queries return correct answers
- [ ] Final state: `npm run arch-test` all green (nothing left broken)

---

## Verification (do NOT skip)

```bash
echo "=== Phase 4 Final Verification ==="

# 1. No temp files left behind
[ ! -f "packages/validators/src/block.ts.bak" ] && echo "✅ No .bak files" || echo "❌ block.ts.bak still exists"

# 2. All tests pass (final state)
npm run arch-test
echo "(Must be all green — nothing left broken)"

echo "=== Verification complete ==="
```

---

## MANDATORY: Write Execution Log (do NOT skip)

After verification, create:
`logs/wp-009/phase-4-result.md`

Log MUST include a table of all negative tests with pass/fail results:

```markdown
| Test | Expected failure | Actual | Reverted | Green after |
|------|-----------------|--------|----------|-------------|
| File deleted | ✅ | ✅/❌ | ✅ | ✅ |
| Dual ownership | ✅ | ✅/❌ | ✅ | ✅ |
| Frontmatter mismatch | ✅ | ✅/❌ | ✅ | ✅ |
| Missing section | ✅ | ✅/❌ | ✅ | ✅ |
```

---

## Git

```bash
git add logs/wp-009/phase-4-result.md
git commit -m "test: smoke test confirms arch tests catch all violation types [WP-009 phase 4]"
```

---

## IMPORTANT Notes for CC

- **ALWAYS revert** after each negative test — do not leave the codebase broken
- Run `npm run arch-test` after EVERY revert to confirm green before next test
- If a negative test does NOT fail when it should, that's a **gap** — note it in the log and fix the test
- This phase creates NO new files (except the execution log)
- Do NOT modify the manifest, skills, or tests permanently in this phase
