# WP-001 Phase 0: RECON — Codebase Audit

> Workplan: WP-001 CC Components Page — Real Data Upgrade
> Phase: 0 of 5
> Priority: P1
> Estimated: 0.5-1 hours
> Type: Config
> Previous: N/A (first phase)
> Next: Phase 1 (Scanner Rewrite)

---

## Context

The Command Center Components page currently runs on fake data. Before rewriting anything, we need ground truth about every file this WP touches.

```
CURRENT:  95 passive cards derived from phases.json task titles   ✅
CURRENT:  deriveHasStory() = (status === 'done') — a lie          ⚠️
CURRENT:  packages/ui/src/ contains only tokens.css + .gitkeep    ⚠️
MISSING:  Real filesystem-based scanner                            ❌
MISSING:  Component detail page ([id] route)                       ❌
MISSING:  Live component render in CC                              ❌
MISSING:  @cmsmasters/ui workspace link in CC                      ❌
```

This is a read-only phase. No code changes. Produce a RECON log with findings that confirm or update Phases 1-4 of the WP.

---

## PHASE 0: Audit (do FIRST — CRITICAL)

Run every command below. Document the output in your execution log. Do NOT skip any section.

```bash
# ─── 1. packages/ui state ──────────────────────────────────────────────────────

# 1a. What files exist in packages/ui? (expect: .gitkeep, package.json, src/theme/tokens.css)
find packages/ui -type f | head -20

# 1b. Does packages/ui/index.ts exist? (package.json says main: ./index.ts)
cat packages/ui/package.json
ls packages/ui/index.ts 2>/dev/null || echo "MISSING: packages/ui/index.ts"

# 1c. Does packages/ui/src/primitives/ exist?
ls -la packages/ui/src/primitives/ 2>/dev/null || echo "MISSING: packages/ui/src/primitives/"
ls -la packages/ui/src/domain/ 2>/dev/null || echo "MISSING: packages/ui/src/domain/"
ls -la packages/ui/src/layouts/ 2>/dev/null || echo "MISSING: packages/ui/src/layouts/"

# ─── 2. Scanner pipeline ───────────────────────────────────────────────────────

# 2a. Current scan.ts — how does scanComponents() work?
# READ: apps/command-center/cli/scan.ts (lines 98-119)
# Confirm it reads phases.json → maps tasks to ComponentSummary

# 2b. What does components.json look like right now?
head -30 workplan/components.json
wc -l workplan/components.json

# 2c. What type is ComponentSummary currently?
# READ: apps/command-center/lib/types.ts (lines 58-66 Component interface)
# Note which fields exist and which are missing (hasStory, hasTests, usedBy, loc, filePath)

# 2d. How does getComponents() load data?
# READ: apps/command-center/lib/data.ts (lines 155-157)
# Note: it reads raw JSON, returns ComponentSummary[] — no enrichment

# ─── 3. Components page anatomy ────────────────────────────────────────────────

# 3a. Which inline components exist in page.tsx?
grep -n "^function " apps/command-center/app/components/page.tsx

# 3b. Where are the fakes?
grep -n "deriveHasStory\|deriveHasTests\|deriveLayer" apps/command-center/app/components/page.tsx

# 3c. What does EnrichedComponent type look like?
# READ: apps/command-center/app/components/page.tsx (lines 68-72)

# 3d. Does [id] route exist?
ls apps/command-center/app/components/\[id\]/ 2>/dev/null || echo "MISSING: no [id] route"

# ─── 4. Build & theme isolation ─────────────────────────────────────────────────

# 4a. CC tailwind content paths — does it scan packages/ui?
cat apps/command-center/tailwind.config.ts

# 4b. CC tokens — hex-based, not HSL CSS vars
head -30 apps/command-center/theme/tokens.ts

# 4c. Does CC import any global CSS that could clash with tokens.css?
grep -r "tokens.css\|@import" apps/command-center/app/ --include="*.css" --include="*.tsx" | head -10

# 4d. Baseline build — does it work right now?
cd apps/command-center && npx next build 2>&1 | tail -20
cd ../..

# ─── 5. Workspace linking ──────────────────────────────────────────────────────

# 5a. Root tsconfig — any path alias for @cmsmasters/ui?
cat tsconfig.json

# 5b. Root package.json — workspaces config
grep -A 5 '"workspaces"' package.json

# 5c. Is pnpm workspace configured?
cat pnpm-workspace.yaml 2>/dev/null || echo "No pnpm-workspace.yaml"

# 5d. CC package.json — current deps (no @cmsmasters/ui expected)
cat apps/command-center/package.json

# 5e. Try resolving @cmsmasters/ui from CC
node -e "try { require.resolve('@cmsmasters/ui', { paths: ['apps/command-center'] }); console.log('RESOLVES') } catch(e) { console.log('DOES NOT RESOLVE: ' + e.message.split('\\n')[0]) }"

# ─── 6. nx.json — project graph ────────────────────────────────────────────────

# 6a. Does Nx know about packages/ui?
cat nx.json | head -30
ls packages/ui/project.json 2>/dev/null || echo "No packages/ui/project.json"
```

**Document your findings before writing any code.**

**IMPORTANT:** This phase is READ-ONLY. Do not create files, modify code, or install dependencies. Your only output is the execution log.

**IMPORTANT:** If `next build` fails, document the error but do NOT try to fix it. This is baseline state.

---

## Task 0.1: Audit packages/ui State

### What to Do

Run commands 1a-1c. Document:
- Exact file listing of `packages/ui/`
- Whether `index.ts` barrel export exists (expected: NO — `package.json` references it but it's not created yet)
- Whether `primitives/`, `domain/`, `layouts/` directories exist (expected: NO)
- **Conclusion:** Is packages/ui ready for Phase C components, or does Phase 1 need to create the directory structure?

---

## Task 0.2: Audit Scanner Pipeline

### What to Do

Read `scan.ts`, `types.ts`, `data.ts`. Document:
- Current `scanComponents()` logic: reads phases.json → pushes task titles as components
- Current `ComponentSummary` shape: `{ id, name, description, app, status, phase, dependencies? }`
- Missing fields needed for Phase 1: `hasStory`, `hasTests`, `usedBy`, `loc`, `layer`, `propsInterface`, `filePath`
- How `getComponents()` reads `components.json` — confirm it's raw JSON, no enrichment
- **Conclusion:** How much of scan.ts needs rewriting vs extending?

---

## Task 0.3: Audit Components Page Anatomy

### What to Do

Run commands 3a-3d. Document:
- List all inline functions in `page.tsx` (expect: `deriveLayer`, `deriveHasStory`, `deriveHasTests`, `buildHref`, `TabBar`, `FilterBar`, `SortableHeader`, `ComponentCard` inline, `CoverageView` inline, `ComponentsPage`)
- Line numbers of the three fake derivation functions
- `EnrichedComponent` type and what needs to change
- **Conclusion:** Which inline components should be extracted to separate files vs refactored in-place?

---

## Task 0.4: Audit Build & Theme Isolation

### What to Do

Run commands 4a-4d. Document:
- CC tailwind content paths (expected: only `./app/`, `./ui/`, `./theme/`, `./components/` — no `packages/ui`)
- CC tokens format (expected: hex strings in JS object, NOT CSS vars)
- Any existing CSS imports that could clash
- `next build` result (pass/fail, build time, any warnings)
- **Conclusion:** What's the CSS conflict risk when adding `@cmsmasters/ui` content path to tailwind? Will brand HSL vars leak into zinc-950 theme?

---

## Task 0.5: Audit Workspace Linking

### What to Do

Run commands 5a-5e. Document:
- Root tsconfig path aliases (expected: only `tailwindcss` alias, no `@cmsmasters/*`)
- Workspace config (pnpm-workspace.yaml or package.json workspaces)
- Whether `@cmsmasters/ui` resolves from CC directory (expected: NO — not in deps yet)
- **Conclusion:** What's needed to make `import { Button } from '@cmsmasters/ui'` work in CC? Just adding devDep, or also tsconfig paths?

---

## Task 0.6: Audit Nx Project Graph

### What to Do

Run command 6a. Document:
- Whether `nx.json` exists and what it configures
- Whether `packages/ui/project.json` exists
- **Conclusion:** Will Nx auto-detect the workspace dep, or do we need explicit project config?

---

## Files to Modify

None. This is a read-only audit.

---

## Acceptance Criteria

- [ ] All 6 audit sections completed with real command output
- [ ] Each section has a **Conclusion** sentence
- [ ] Execution log written to `logs/wp-001/phase-0-recon.md`
- [ ] No files created or modified (except the log)
- [ ] If any finding contradicts WP-001 assumptions, document it in "Plan Adjustments" section

---

## ⚠️ MANDATORY: Verification (do NOT skip)

```bash
echo "=== Phase 0 Verification ==="

# 1. Log file exists
ls logs/wp-001/phase-0-recon.md && echo "✓ Log exists" || echo "✗ Log missing"

# 2. No files were modified (git should show only the log as untracked)
git status --short
echo "(expect: only logs/wp-001/phase-0-recon.md as untracked, zero modified files)"

echo "=== Verification complete ==="
```

---

## ⚠️ MANDATORY: Write Execution Log (do NOT skip)

After verification, create the file:
`logs/wp-001/phase-0-recon.md`

Structure (fill all sections — write N/A if not applicable, do NOT omit sections):

```markdown
# Execution Log: WP-001 Phase 0 — RECON
> Workplan: WP-001 CC Components Page — Real Data Upgrade
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED

## 1. packages/ui State
{exact file listing}
{index.ts exists? primitives/ exists?}
**Conclusion:** {ready or not}

## 2. Scanner Pipeline
{scanComponents() logic summary}
{ComponentSummary current shape}
{missing fields list}
**Conclusion:** {rewrite scope}

## 3. Components Page Anatomy
{inline functions list with line numbers}
{fake derivation locations}
**Conclusion:** {extraction plan}

## 4. Build & Theme Isolation
{tailwind content paths}
{tokens format}
{build result: pass/fail, time, warnings}
**Conclusion:** {CSS conflict risk: low/medium/high}

## 5. Workspace Linking
{tsconfig paths}
{workspace config}
{resolve test result}
**Conclusion:** {what's needed}

## 6. Nx Project Graph
{nx.json status}
{project.json status}
**Conclusion:** {auto-detect or manual config}

## Blockers / Surprises
{anything unexpected, or "none"}

## Plan Adjustments
{changes to WP-001 Phases 1-4 based on findings, or "none — plan confirmed"}

## Verification Results
| Check | Result |
|-------|--------|
| All sections filled | ✅/❌ |
| No files modified | ✅/❌ |
| Log written | ✅/❌ |
```

Then include `logs/` in your `git add` before committing.

---

## Git

```bash
git add logs/wp-001/phase-0-recon.md
git commit -m "audit: WP-001 Phase 0 RECON — codebase snapshot [WP-001 phase 0]"
```

---

## ⚠️ IMPORTANT Notes for CC

- **Do NOT modify any files** — this is a read-only audit. The only file you create is the log.
- **Do NOT try to fix build errors** — just document them as baseline state.
- **Do NOT install dependencies** — just check what resolves and what doesn't.
- **Do NOT create directories** in packages/ui — Phase 1 will handle that.
- **If `next build` takes >2 minutes**, cancel it and note "build timed out" — we don't need a full production build, just confirmation it starts.
- **The `logs/wp-001/` directory already exists** — just write the file there.
