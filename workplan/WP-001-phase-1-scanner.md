# WP-001 Phase 1: Scanner Rewrite — Filesystem-Based Component Discovery

> Workplan: WP-001 CC Components Page — Real Data Upgrade
> Phase: 1 of 5
> Priority: P1
> Estimated: 2-3 hours
> Type: Backend
> Previous: Phase 0 ✅ (RECON — codebase audit, log at logs/wp-001/phase-0-recon.md)
> Next: Phase 2 (CC Link + Card Refactor)

---

## Context

The scanner (`apps/command-center/cli/scan.ts`) currently reads `workplan/phases.json` and maps task titles to component cards. This produces 163 entries like "Nx monorepo init" and "Folder structure per ADR-017" — project planning items, not real UI components.

```
CURRENT:  scanComponents() reads phases.json tasks (lines 98-119 of scan.ts)   ✅
CURRENT:  ComponentSummary = { id, name, description, app, status, phase }     ✅
CURRENT:  packages/ui/ is a shell — only .gitkeep + package.json + tokens.css  ⚠️
MISSING:  packages/ui/index.ts barrel export                                    ❌
MISSING:  packages/ui/src/primitives/, domain/, layouts/ directories            ❌
MISSING:  Filesystem-based scanner that walks packages/ui/src/                  ❌
MISSING:  ComponentSummary fields: hasStory, hasTests, usedBy, loc, layer, etc  ❌
```

Phase 1 creates the directory scaffold in `packages/ui/`, extends the type system, and rewrites the scanner to produce real component data. Legacy phases.json scan is kept for infra/content tasks.

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Confirm packages/ui state matches RECON
find packages/ui -type f | sort
# Expected: .gitkeep, package.json, src/theme/tokens.css

# 2. Confirm scan.ts is unchanged since RECON
wc -l apps/command-center/cli/scan.ts
# Expected: 252 lines

# 3. Confirm types.ts Component interface location
grep -n "export interface Component {" apps/command-center/lib/types.ts
# Expected: line 58

# 4. Confirm scanner runs
npm run cc:scan 2>&1 | tail -5
# Expected: "Scan complete" with components.json written

# 5. Check current components.json entry count
node -e "const d = require('./workplan/components.json'); console.log(d.components.length, 'entries')"
# Expected: ~163 entries
```

**Document your findings before writing any code.**

**IMPORTANT:** If scan.ts line count or types.ts interface location differs from expected, note the actual values and adjust line references in this prompt accordingly.

---

## Task 1.1: Scaffold packages/ui Directory Structure

### What to Build

Create the directory structure that the scanner will walk, plus the barrel export that `package.json` already references.

**File:** `packages/ui/src/primitives/.gitkeep` (empty)
**File:** `packages/ui/src/domain/.gitkeep` (empty)
**File:** `packages/ui/src/layouts/.gitkeep` (empty)

**File:** `packages/ui/index.ts`
```typescript
// @cmsmasters/ui — barrel export
// Components are re-exported here as they are implemented in Phase C.
```

This is the minimal scaffold. Phase C will add real components.

### Integration

`packages/ui/package.json` already declares `"main": "./index.ts"`. Creating the file makes the package resolvable.

---

## Task 1.2: Extend ComponentSummary Type

### What to Build

**File:** `apps/command-center/lib/types.ts`

Add new fields to the `Component` interface (line 58) and add a `source` discriminator. Keep all existing fields — this is backward-compatible.

```typescript
// ─── packages/validators/src/components.ts schema ────────────────────────────

export type ComponentStatus = 'planned' | 'in-progress' | 'done' | 'blocked';
export type ComponentLayer = 'primitives' | 'domain' | 'layouts' | 'infrastructure';

export interface Component {
  id: string;
  name: string;
  description: string;
  app: App;
  status: ComponentStatus;
  phase: string;
  dependencies?: string[];
  // ── New fields (Phase 1) ──
  /** Where this entry came from */
  source: 'filesystem' | 'phases-json';
  /** Design system layer, derived from directory */
  layer?: ComponentLayer;
  /** Adjacent .stories.tsx exists */
  hasStory?: boolean;
  /** Adjacent .test.tsx exists */
  hasTests?: boolean;
  /** Apps that import this component */
  usedBy?: string[];
  /** Lines of code */
  loc?: number;
  /** Relative path from monorepo root */
  filePath?: string;
  /** Raw TypeScript props interface text */
  propsInterface?: string | null;
}
```

All new fields are optional (`?`) so existing `phases-json` sourced entries don't break. The `source` field is required — update the existing scan code to set it.

Also update `ComponentEntry` (line 68) to match:

```typescript
export interface ComponentEntry {
  id: string;
  name: string;
  description: string;
  app: App;
  status: ComponentStatus;
  layer: ComponentLayer;
  phase: string;
  dependencies?: string[];
  source: 'filesystem' | 'phases-json';
  hasStory?: boolean;
  hasTests?: boolean;
  usedBy?: string[];
  loc?: number;
  filePath?: string;
  propsInterface?: string | null;
}
```

### Integration

The `ComponentSummary` alias at line 143 (`export type ComponentSummary = Component;`) means all consumers automatically get the new fields.

---

## Task 1.3: Rewrite scanComponents() — Filesystem Walker

### What to Build

**File:** `apps/command-center/cli/scan.ts`

Replace `scanComponents()` (lines 98-119) with two functions:

#### A) `scanUIComponents()` — new filesystem-based scanner

```typescript
const UI_PKG_SRC = path.join(monorepoRoot, 'packages', 'ui', 'src');
const LAYER_DIRS: { dir: string; layer: ComponentLayer }[] = [
  { dir: 'primitives', layer: 'primitives' },
  { dir: 'domain',     layer: 'domain' },
  { dir: 'layouts',    layer: 'layouts' },
];

function kebabToPascal(kebab: string): string {
  return kebab.replace(/(^|-)([a-z])/g, (_, __, c) => c.toUpperCase());
}

function countLines(filePath: string): number {
  const content = fs.readFileSync(filePath, 'utf8');
  return content.split('\n').length;
}

function extractPropsInterface(filePath: string): string | null {
  const content = fs.readFileSync(filePath, 'utf8');
  // Match: export interface XxxProps { ... }
  // Also match: interface XxxProps { ... }
  const match = content.match(/(?:export\s+)?interface\s+\w+Props\s*\{[^}]*\}/s);
  return match ? match[0] : null;
}

function detectUsedBy(componentName: string, monorepoRoot: string): string[] {
  const appsDir = path.join(monorepoRoot, 'apps');
  const usedBy: string[] = [];

  if (!fs.existsSync(appsDir)) return usedBy;

  const appDirs = fs.readdirSync(appsDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name !== 'command-center');

  for (const appDir of appDirs) {
    const appPath = path.join(appsDir, appDir.name);
    // Recursively search for imports of this component
    if (hasImportOf(appPath, componentName)) {
      usedBy.push(appDir.name);
    }
  }

  return usedBy;
}

function hasImportOf(dir: string, componentName: string): boolean {
  // Search .ts/.tsx files for @cmsmasters/ui imports containing componentName
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'dist') continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (hasImportOf(fullPath, componentName)) return true;
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      // Match: from '@cmsmasters/ui' or from '@cmsmasters/ui/primitives/button'
      if (content.includes('@cmsmasters/ui') && content.includes(componentName)) {
        return true;
      }
    }
  }

  return false;
}

function scanUIComponents(monorepoRoot: string): ComponentSummary[] {
  const components: ComponentSummary[] = [];

  for (const { dir, layer } of LAYER_DIRS) {
    const layerDir = path.join(UI_PKG_SRC, dir);
    if (!fs.existsSync(layerDir)) continue;

    const files = fs.readdirSync(layerDir).filter(f =>
      f.endsWith('.tsx') &&
      !f.endsWith('.stories.tsx') &&
      !f.endsWith('.test.tsx') &&
      !f.startsWith('_')
    );

    for (const file of files) {
      const filePath = path.join(layerDir, file);
      const baseName = file.replace(/\.tsx$/, '');
      const componentName = kebabToPascal(baseName);
      const relativePath = path.relative(monorepoRoot, filePath).replace(/\\/g, '/');

      const hasStory = fs.existsSync(path.join(layerDir, `${baseName}.stories.tsx`));
      const hasTests = fs.existsSync(path.join(layerDir, `${baseName}.test.tsx`))
                    || fs.existsSync(path.join(layerDir, '__tests__', `${baseName}.test.tsx`));

      components.push({
        id: `ui-${dir}-${baseName}`,
        name: componentName,
        description: `${layer} component`,
        app: 'ui' as ComponentSummary['app'],
        status: 'done' as ComponentStatus,
        phase: 'C',
        source: 'filesystem',
        layer,
        hasStory,
        hasTests,
        usedBy: detectUsedBy(componentName, monorepoRoot),
        loc: countLines(filePath),
        filePath: relativePath,
        propsInterface: extractPropsInterface(filePath),
      });
    }
  }

  return components;
}
```

#### B) Rename existing `scanComponents()` → `scanLegacyTasks()`

The existing function (lines 98-119) stays intact but is renamed. Add `source: 'phases-json'` to each entry:

```typescript
function scanLegacyTasks(workplanDir: string, ignore: ScanIgnore): ComponentSummary[] {
  const project = readPhasesJson(workplanDir);
  const phases = project.phases ?? [];
  const components: ComponentSummary[] = [];

  for (const phase of phases) {
    const phaseId = String(phase.id);
    for (const task of phase.tasks ?? []) {
      if (isIgnored(task, ignore)) continue;
      components.push({
        id: task.id,
        name: task.title,
        description: task.description ?? '',
        app: (task.app ?? 'infra') as ComponentSummary['app'],
        status: taskStatusToComponentStatus(task.status),
        phase: phaseId,
        source: 'phases-json',
      });
    }
  }

  return components;
}
```

#### C) New combined `scanComponents()`

```typescript
function scanComponents(monorepoRoot: string, workplanDir: string, ignore: ScanIgnore): ComponentSummary[] {
  // 1. Real UI components from filesystem
  const uiComponents = scanUIComponents(monorepoRoot);

  // 2. Legacy tasks from phases.json (infra, content, etc.)
  const legacyTasks = scanLegacyTasks(workplanDir, ignore);

  // 3. Merge: UI components first, then legacy tasks
  return [...uiComponents, ...legacyTasks];
}
```

### Integration

**In the Main block (line 204+):** Update the `scanComponents()` call to pass `monorepoRoot`:

```typescript
// EXISTING (line 221):
const components = scanComponents(workplanDir, ignore);

// REPLACE WITH:
const components = scanComponents(monorepoRoot, workplanDir, ignore);
```

The rest of the Main block (scanContent, calculateProgress, file writes) stays unchanged.

---

## Task 1.4: Add Console Summary for UI Components

### What to Build

After the scan completes in Main, add a summary log line:

```typescript
// After line 222 (after existing console.log for components done):
const uiCount = components.filter(c => c.source === 'filesystem').length;
const legacyCount = components.filter(c => c.source === 'phases-json').length;
console.log(`  → ${uiCount} UI components (filesystem), ${legacyCount} legacy tasks (phases.json)`);
```

This makes it obvious whether the scanner found real components.

---

## Files to Modify

- `packages/ui/index.ts` — **new** — empty barrel export
- `packages/ui/src/primitives/.gitkeep` — **new** — directory scaffold
- `packages/ui/src/domain/.gitkeep` — **new** — directory scaffold
- `packages/ui/src/layouts/.gitkeep` — **new** — directory scaffold
- `apps/command-center/lib/types.ts` — **modify** — extend Component + ComponentEntry interfaces
- `apps/command-center/cli/scan.ts` — **modify** — rewrite scanComponents, add scanUIComponents + scanLegacyTasks

---

## Acceptance Criteria

- [ ] `packages/ui/index.ts` exists and `packages/ui/src/primitives/`, `domain/`, `layouts/` directories exist
- [ ] `ComponentSummary` type has new fields: `source`, `layer?`, `hasStory?`, `hasTests?`, `usedBy?`, `loc?`, `filePath?`, `propsInterface?`
- [ ] `npm run cc:scan` completes without errors
- [ ] `components.json` contains entries with `"source": "phases-json"` for legacy tasks
- [ ] When a `.tsx` file is placed in `packages/ui/src/primitives/`, re-running scan produces an entry with `"source": "filesystem"`, `hasStory`, `hasTests`, `loc`, `filePath`
- [ ] TypeScript compiles with no errors: `npx tsc --noEmit` from `apps/command-center/`
- [ ] No regressions: `components.json` still contains ~163 legacy task entries

---

## ⚠️ MANDATORY: Verification (do NOT skip)

```bash
echo "=== Phase 1 Verification ==="

# 1. Directory scaffold exists
ls packages/ui/index.ts && echo "✓ index.ts"
ls packages/ui/src/primitives/.gitkeep && echo "✓ primitives/"
ls packages/ui/src/domain/.gitkeep && echo "✓ domain/"
ls packages/ui/src/layouts/.gitkeep && echo "✓ layouts/"

# 2. Scanner runs
npm run cc:scan 2>&1 | tail -10
echo "(expect: 0 UI components, ~163 legacy tasks)"

# 3. components.json has source field
node -e "
const d = require('./workplan/components.json');
const fs = d.components.filter(c => c.source === 'filesystem').length;
const lg = d.components.filter(c => c.source === 'phases-json').length;
const noSrc = d.components.filter(c => !c.source).length;
console.log('filesystem:', fs, '| phases-json:', lg, '| no source:', noSrc);
console.log('(expect: filesystem 0, phases-json ~163, no source 0)');
"

# 4. TypeScript check
cd apps/command-center && npx tsc --noEmit 2>&1 | tail -5
cd ../..
echo "(expect: no errors)"

# 5. Smoke test: add a fake component, scan, verify, then remove
mkdir -p packages/ui/src/primitives
cat > packages/ui/src/primitives/test-button.tsx << 'EOF'
export interface TestButtonProps {
  label: string;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}
export function TestButton({ label }: TestButtonProps) {
  return <button>{label}</button>;
}
EOF

npm run cc:scan 2>&1 | grep "UI components"
node -e "
const d = require('./workplan/components.json');
const ui = d.components.find(c => c.source === 'filesystem');
if (ui) {
  console.log('✓ Found UI component:', ui.name);
  console.log('  layer:', ui.layer);
  console.log('  hasStory:', ui.hasStory);
  console.log('  hasTests:', ui.hasTests);
  console.log('  loc:', ui.loc);
  console.log('  filePath:', ui.filePath);
  console.log('  propsInterface:', ui.propsInterface ? 'found' : 'missing');
} else {
  console.log('✗ No filesystem component found');
}
"

# Clean up smoke test
rm packages/ui/src/primitives/test-button.tsx
npm run cc:scan > /dev/null 2>&1

echo "=== Verification complete ==="
```

---

## ⚠️ MANDATORY: Write Execution Log (do NOT skip)

After verification (before committing), create the file:
`logs/wp-001/phase-1-result.md`

Structure (fill all sections — write N/A if not applicable, do NOT omit sections):

```markdown
# Execution Log: WP-001 Phase 1 — Scanner Rewrite
> Workplan: WP-001 CC Components Page — Real Data Upgrade
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED

## What Was Implemented
{2-5 sentences describing what was actually built}

## Key Decisions
| Decision | Chosen | Why |
|----------|--------|-----|
| ... | ... | ... |

## Files Changed
| File | Change | Description |
|------|--------|-------------|
| `path` | created/modified | brief description |

## Issues & Workarounds
{Problems encountered and resolutions. "None" if clean.}

## Open Questions
{Non-blocking questions. "None" if none.}

## Verification Results
| Check | Result |
|-------|--------|
| Directory scaffold | ✅/❌ |
| Scanner runs | ✅/❌ |
| source field present | ✅/❌ |
| TypeScript compiles | ✅/❌ |
| Smoke test (fake component) | ✅/❌ |

## Git
- Commit: `{sha}` — `{message}`
```

Then include `logs/` in your `git add` before committing.

---

## Git

```bash
git add packages/ui/index.ts packages/ui/src/primitives/.gitkeep packages/ui/src/domain/.gitkeep packages/ui/src/layouts/.gitkeep apps/command-center/cli/scan.ts apps/command-center/lib/types.ts workplan/components.json logs/wp-001/phase-1-result.md
git commit -m "feat(scanner): rewrite to filesystem-based component discovery [WP-001 phase 1]"
```

---

## ⚠️ IMPORTANT Notes for CC

- **Do NOT modify `apps/command-center/app/components/page.tsx`** — that's Phase 2. The page still uses deriveLayer/deriveHasStory/deriveHasTests and that's OK — it will continue to work because the new fields are optional.
- **Do NOT modify `apps/command-center/package.json`** — no @cmsmasters/ui dep yet. That's Phase 2.
- **Do NOT modify `apps/command-center/theme/tokens.ts`** — CC's own tokens are untouched by this WP.
- **Keep scanContent() and calculateProgress() exactly as they are** — they read phases.json and that's correct for their purpose.
- **The `source` field is required (not optional)** in the type — every entry must have it. Set `'phases-json'` for legacy entries in `scanLegacyTasks()`.
- **The smoke test creates and removes a temp file** — make sure it's cleaned up before committing. Do NOT commit `test-button.tsx`.
- **If TypeScript gives errors about the `'ui'` app literal:** the `App` type (line 7) includes `'ui'` already — verify before adding it.
- **Windows paths:** use `.replace(/\\\\/g, '/')` when generating `filePath` to normalize Windows backslashes to forward slashes.
