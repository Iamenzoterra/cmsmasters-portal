# WP-009 Phase 0: RECON — Audit Codebase for Domain Manifest

> Workplan: WP-009 Living Documentation System
> Phase: 0 of 5
> Priority: P1
> Estimated: 0.5 hours
> Type: Config
> Previous: None (first phase)
> Next: Phase 1 (Domain Manifest creation)

---

## Context

We're building a Living Documentation system for the entire monorepo. Before writing the domain manifest, we need to verify that our proposed domain map (11 domains) matches reality — every file path must be accurate.

```
CURRENT:  11-domain map exists in WP-009 workplan   ✅
MISSING:  Verified file inventory per domain          ❌
MISSING:  Confirmation that Studio split is correct   ❌
MISSING:  vitest availability for arch tests          ❌
```

The manifest will contain literal file paths. If a path is wrong, the arch test will fail on day one. RECON prevents this.

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. List ALL source files in each package
for pkg in db auth ui validators api-client; do
  echo "=== packages/$pkg ==="
  find "packages/$pkg/src" -name "*.ts" -o -name "*.tsx" | sort
done

# 2. List ALL source files in apps/studio (need exact split for studio-blocks vs studio-core)
echo "=== apps/studio ==="
find "apps/studio/src" -name "*.ts" -o -name "*.tsx" | sort

# 3. List ALL source files in apps/portal
echo "=== apps/portal ==="
find "apps/portal" -name "*.ts" -o -name "*.tsx" | sort

# 4. List ALL source files in apps/api
echo "=== apps/api ==="
find "apps/api/src" -name "*.ts" -o -name "*.tsx" | sort

# 5. List ALL source files in apps/command-center
echo "=== apps/command-center ==="
find "apps/command-center" -name "*.ts" -o -name "*.tsx" | sort

# 6. Check vitest availability
npx vitest --version 2>/dev/null || echo "vitest NOT found"

# 7. Check if src/__arch__/ already exists
ls src/__arch__/ 2>/dev/null || echo "src/__arch__/ does not exist yet"

# 8. List existing .claude/skills/ to understand current structure
ls -la .claude/skills/

# 9. Verify Supabase tables match our 9-table assumption
# (check packages/db/src/types.ts for table names)
grep -n "Row\b" packages/db/src/types.ts | head -20
```

**Document your findings before writing any code.**

**IMPORTANT:** The Studio split is the riskiest part. Confirm these 7 files belong to `studio-blocks`:
- `apps/studio/src/pages/block-editor.tsx`
- `apps/studio/src/pages/blocks-list.tsx`
- `apps/studio/src/components/block-import-panel.tsx`
- `apps/studio/src/components/block-preview.tsx`
- `apps/studio/src/lib/block-api.ts`
- `apps/studio/src/lib/block-processor.ts`
- `apps/studio/src/lib/token-map.ts`

Everything else in `apps/studio/src/` belongs to `studio-core`.

---

## Task 0.1: Generate File Inventory

### What to Build

No code. Run the audit commands above and capture output. Organize into a table per domain:

```markdown
| Domain | File count | Files |
|--------|-----------|-------|
| pkg-db | N | path1, path2, ... |
| ...    | N | ... |
```

### Integration

Output goes into execution log only. This data feeds Phase 1.

---

## Task 0.2: Verify Studio Split

### What to Build

No code. Confirm:
1. All 7 studio-blocks files exist at expected paths
2. No other files in Studio have block-specific logic that should be in studio-blocks
3. Shared components used by both sub-domains (toast, form-section, etc.) stay in studio-core

```bash
# Check for block-specific imports in files NOT assigned to studio-blocks
grep -rn "block-processor\|token-map\|BlockImport" apps/studio/src/ \
  --include="*.tsx" --include="*.ts" \
  | grep -v "block-editor\|blocks-list\|block-import-panel\|block-preview\|block-api\|block-processor\|token-map"
```

If any non-studio-blocks file imports block-processor or token-map, it needs to move to studio-blocks or the split needs adjustment.

---

## Task 0.3: Verify Test Infrastructure

### What to Build

No code. Confirm:
1. vitest is installed and runnable
2. No existing `src/__arch__/` directory
3. Identify vitest config file location (root or per-package)

```bash
# Check vitest config
find . -name "vitest.config.*" -maxdepth 3 | head -10
cat package.json | grep -A2 '"vitest"'
```

---

## Files to Modify

None. This is audit-only.

---

## Acceptance Criteria

- [ ] Complete file inventory for all 11 domains documented in execution log
- [ ] Studio split confirmed — 7 files in studio-blocks, rest in studio-core
- [ ] No cross-contamination (block-processor/token-map not imported outside studio-blocks boundary)
- [ ] vitest availability confirmed
- [ ] `src/__arch__/` confirmed not existing
- [ ] Supabase table names verified (9 tables)

---

## Verification (do NOT skip)

```bash
echo "=== Phase 0 Verification ==="

# 1. All studio-blocks files exist
for f in \
  apps/studio/src/pages/block-editor.tsx \
  apps/studio/src/pages/blocks-list.tsx \
  apps/studio/src/components/block-import-panel.tsx \
  apps/studio/src/components/block-preview.tsx \
  apps/studio/src/lib/block-api.ts \
  apps/studio/src/lib/block-processor.ts \
  apps/studio/src/lib/token-map.ts; do
  [ -f "$f" ] && echo "  ✅ $f" || echo "  ❌ MISSING: $f"
done

# 2. No src/__arch__/ yet
[ ! -d "src/__arch__" ] && echo "✅ src/__arch__/ does not exist" || echo "⚠️ src/__arch__/ already exists"

# 3. vitest available
npx vitest --version 2>/dev/null && echo "✅ vitest available" || echo "❌ vitest NOT available"

echo "=== Verification complete ==="
```

---

## MANDATORY: Write Execution Log (do NOT skip)

After verification, create:
`logs/wp-009/phase-0-result.md`

---

## Git

```bash
git add logs/wp-009/phase-0-result.md
git commit -m "recon: audit codebase for living documentation domains [WP-009 phase 0]"
```

---

## IMPORTANT Notes for CC

- Do NOT create any files in `src/__arch__/` during this phase
- Do NOT create any skill files during this phase
- This is read-only reconnaissance — document findings, nothing more
- If the Studio split doesn't hold (block-processor imported by non-block files), STOP and report to Brain
