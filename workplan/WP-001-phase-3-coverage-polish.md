# WP-001 Phase 3: Coverage & List View Polish

> Workplan: WP-001 CC Components Page — Real Data Upgrade
> Phase: 3 of 5
> Priority: P1
> Estimated: 1-1.5 hours
> Type: Frontend
> Previous: Phase 2 ✅ (CC Link + Card Refactor — StatusDots, TokenCoveragePanel, real enrichment pipeline)
> Next: Phase 4 (Component Detail Page + Live Render)

---

## Context

Phase 2 already implemented the core Phase 3 WP goals (CoverageView with real data, ListView with usedBy/loc columns, HasStory/HasTests filters). However, the metrics are **misleading** because CoverageView counts ALL 163 entries (including legacy phases-json tasks like "Nx monorepo init") in the denominator. When Phase C delivers real components, story coverage will read 5/163 = 3% instead of 5/5 = 100%.

```
DONE:     CoverageView uses real hasStory/hasTests/usedBy data                   ✅
DONE:     ListView has usedBy + loc sortable columns                             ✅
DONE:     FilterBar has Has Story / Has Tests toggles                            ✅
MISSING:  Source filter (filesystem vs phases-json) — can't isolate real UI      ❌
MISSING:  CoverageView metrics scoped to UI components only                      ❌
MISSING:  Per-layer coverage breakdown in CoverageView                           ❌
MISSING:  Status filter (done / in-progress / planned / blocked)                 ❌
```

Phase 3 adds a `source` filter, scopes coverage metrics to real UI components, adds per-layer coverage breakdown, and adds a status filter.

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Confirm Phase 2 commit is HEAD
cd apps/command-center
git log --oneline -3
# Expected: feat(cc): wire real scanner data... [WP-001 phase 2]

# 2. Confirm current page.tsx structure
wc -l app/components/page.tsx
# Expected: ~465 lines

# 3. Check components.json has both source types
node -e "
const d = require('../../workplan/components.json');
const fs = d.components.filter(c => c.source === 'filesystem').length;
const lg = d.components.filter(c => c.source === 'phases-json').length;
console.log('filesystem:', fs, '| legacy:', lg, '| total:', d.components.length);
"
# Expected: filesystem 0, legacy ~163

# 4. Check current filter params in page.tsx
grep -n "PageParams" app/components/page.tsx | head -5
# Expected: view, sort, dir, layer, story, tests

# 5. Confirm DonutChart exists
ls ui/DonutChart.tsx
# Expected: exists

# 6. Confirm build works
npx next build 2>&1 | tail -3
# Expected: no errors
```

**Document findings before writing any code.**

**IMPORTANT:** If page.tsx line count differs significantly from ~465, adjust line references accordingly.

---

## Task 3.1: Add Source Filter to PageParams + FilterBar

### What to Build

**File:** `apps/command-center/app/components/page.tsx`

Add `source` param to `PageParams` and DEFAULTS:

```typescript
// ── In PageParams type (line ~21):
type PageParams = {
  view: string;
  sort: string;
  dir: string;
  layer: string;
  story: string;
  tests: string;
  source: string;   // NEW: 'all' | 'ui' | 'legacy'
  status: string;    // NEW: 'all' | 'done' | 'in-progress' | 'planned' | 'blocked'
};

// ── In DEFAULTS (line ~30):
const DEFAULTS: PageParams = {
  view:   'grid',
  sort:   'name',
  dir:    'asc',
  layer:  'all',
  story:  '0',
  tests:  '0',
  source: 'all',    // NEW
  status: 'all',    // NEW
};
```

Update `buildHref()` to include both new params:

```typescript
function buildHref(current: PageParams, overrides: Partial<PageParams>): string {
  const merged = { ...current, ...overrides };
  const params = new URLSearchParams({
    view:   merged.view,
    sort:   merged.sort,
    dir:    merged.dir,
    layer:  merged.layer,
    story:  merged.story,
    tests:  merged.tests,
    source: merged.source,
    status: merged.status,
  });
  return `/components?${params.toString()}`;
}
```

Update page `searchParams` parsing (line ~406) to read both new params:

```typescript
const params: PageParams = {
  view:   sp['view']   ?? DEFAULTS.view,
  sort:   sp['sort']   ?? DEFAULTS.sort,
  dir:    sp['dir']    ?? DEFAULTS.dir,
  layer:  sp['layer']  ?? DEFAULTS.layer,
  story:  sp['story']  ?? DEFAULTS.story,
  tests:  sp['tests']  ?? DEFAULTS.tests,
  source: sp['source'] ?? DEFAULTS.source,
  status: sp['status'] ?? DEFAULTS.status,
};
```

Add source + status filters to `FilterBar` — add a second row below existing layer/story/tests filters:

```typescript
function FilterBar({ params }: { params: PageParams }): React.ReactElement {
  const layers = [ /* ...existing... */ ];

  const sources = [
    { label: 'All Sources', value: 'all' },
    { label: 'UI Components', value: 'ui' },
    { label: 'Legacy Tasks', value: 'legacy' },
  ];

  const statuses = [
    { label: 'All',         value: 'all' },
    { label: 'Done',        value: 'done' },
    { label: 'In Progress', value: 'in-progress' },
    { label: 'Planned',     value: 'planned' },
  ];

  return (
    <div className="flex flex-col gap-3 mb-6">
      {/* Row 1: layers + story/tests (existing) */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* ...existing layer chips + story/tests toggles... */}
      </div>
      {/* Row 2: source + status filters (NEW) */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1">
          {sources.map(({ label, value }) => (
            <Link
              key={`src-${value}`}
              href={buildHref(params, { source: value })}
              className={cn(
                'px-3 py-1 text-sm rounded-badge transition-colors',
                params.source === value
                  ? 'bg-surface-card border border-zinc-600 text-text-primary'
                  : 'text-text-muted hover:text-text-secondary',
              )}
            >
              {label}
            </Link>
          ))}
        </div>
        <div className="w-px h-5 bg-border mx-1" />
        <div className="flex gap-1">
          {statuses.map(({ label, value }) => (
            <Link
              key={`st-${value}`}
              href={buildHref(params, { status: value })}
              className={cn(
                'px-3 py-1 text-sm rounded-badge transition-colors',
                params.status === value
                  ? 'bg-surface-card border border-zinc-600 text-text-primary'
                  : 'text-text-muted hover:text-text-secondary',
              )}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### Integration

Add source + status filtering in the main page body (after existing `filtered` logic, line ~424):

```typescript
// Apply filters (EXISTING — modify to add source + status)
let filtered = enriched;
if (params.layer !== 'all') {
  filtered = filtered.filter((c) => c.derivedLayer === params.layer);
}
if (params.story === '1') {
  filtered = filtered.filter((c) => c.hasStory);
}
if (params.tests === '1') {
  filtered = filtered.filter((c) => c.hasTests);
}
// NEW: source filter
if (params.source === 'ui') {
  filtered = filtered.filter((c) => c.source === 'filesystem');
} else if (params.source === 'legacy') {
  filtered = filtered.filter((c) => c.source === 'phases-json');
}
// NEW: status filter
if (params.status !== 'all') {
  filtered = filtered.filter((c) => c.status === params.status);
}
```

---

## Task 3.2: Scope CoverageView Metrics to UI Components

### What to Build

**File:** `apps/command-center/app/components/page.tsx`

The CoverageView currently shows 3 donuts (Stories, Tests, App Usage) counted against ALL components including legacy tasks. Refactor to show **two sections**:

1. **UI Component Coverage** — only `source === 'filesystem'` entries (the real design system)
2. **Project-wide Progress** — legacy tasks by status

Replace the existing CoverageView (lines ~352-378):

```typescript
function CoverageView({ components }: { components: EnrichedComponent[] }): React.ReactElement {
  // Split by source
  const uiComponents = components.filter((c) => c.source === 'filesystem');
  const legacyTasks  = components.filter((c) => c.source === 'phases-json');

  // UI metrics (only real components)
  const uiTotal    = uiComponents.length;
  const storyCount = uiComponents.filter((c) => c.hasStory).length;
  const testCount  = uiComponents.filter((c) => c.hasTests).length;
  const appCount   = uiComponents.filter((c) => (c.usedBy?.length ?? 0) > 0).length;

  const storyCoverage = uiTotal > 0 ? Math.round((storyCount / uiTotal) * 100) : 0;
  const testCoverage  = uiTotal > 0 ? Math.round((testCount  / uiTotal) * 100) : 0;
  const appUsage      = uiTotal > 0 ? Math.round((appCount   / uiTotal) * 100) : 0;

  // Legacy progress
  const legacyTotal = legacyTasks.length;
  const legacyDone  = legacyTasks.filter((c) => c.status === 'done').length;
  const legacyPct   = legacyTotal > 0 ? Math.round((legacyDone / legacyTotal) * 100) : 0;

  return (
    <div className="flex flex-col gap-8 py-8">
      {/* UI Component Coverage */}
      <div>
        <h3 className="text-text-primary font-semibold text-sm mb-4">
          UI Component Coverage
          <span className="text-text-muted font-normal ml-2">({uiTotal} components)</span>
        </h3>
        {uiTotal === 0 ? (
          <p className="text-text-muted text-sm italic">
            No UI components yet — Phase C will deliver primitives to packages/ui/src/
          </p>
        ) : (
          <div className="flex flex-wrap gap-8 justify-center">
            <div className="flex flex-col items-center gap-2">
              <DonutChart value={storyCoverage} label="Stories" color="#3b82f6" />
              <p className="font-mono text-xs text-text-muted">{storyCount} / {uiTotal}</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <DonutChart value={testCoverage} label="Tests" color="#22c55e" />
              <p className="font-mono text-xs text-text-muted">{testCount} / {uiTotal}</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <DonutChart value={appUsage} label="App Usage" color="#f59e0b" />
              <p className="font-mono text-xs text-text-muted">{appCount} / {uiTotal}</p>
            </div>
          </div>
        )}
      </div>

      {/* Per-Layer Breakdown */}
      {uiTotal > 0 && <LayerCoverageTable components={uiComponents} />}

      {/* Legacy Task Progress */}
      <div>
        <h3 className="text-text-primary font-semibold text-sm mb-4">
          Project Task Progress
          <span className="text-text-muted font-normal ml-2">({legacyTotal} tasks)</span>
        </h3>
        <div className="flex flex-wrap gap-8 justify-center">
          <div className="flex flex-col items-center gap-2">
            <DonutChart value={legacyPct} label="Done" color="#a78bfa" />
            <p className="font-mono text-xs text-text-muted">{legacyDone} / {legacyTotal}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## Task 3.3: Per-Layer Coverage Table

### What to Build

**File:** `apps/command-center/app/components/page.tsx`

Add a new `LayerCoverageTable` inline component (place it before `CoverageView`):

```typescript
function LayerCoverageTable({ components }: { components: EnrichedComponent[] }): React.ReactElement {
  const layers: LayerName[] = ['Primitives', 'Domain', 'Layouts'];

  const rows = layers.map((layer) => {
    const comps = components.filter((c) => c.derivedLayer === layer);
    const total = comps.length;
    const stories = comps.filter((c) => c.hasStory).length;
    const tests = comps.filter((c) => c.hasTests).length;
    const avgLoc = total > 0 ? Math.round(comps.reduce((sum, c) => sum + (c.loc ?? 0), 0) / total) : 0;
    return { layer, total, stories, tests, avgLoc };
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm max-w-xl mx-auto">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="pb-2 pr-4 font-medium text-text-muted">Layer</th>
            <th className="pb-2 pr-4 font-medium text-text-muted text-right">Components</th>
            <th className="pb-2 pr-4 font-medium text-text-muted text-right">Stories</th>
            <th className="pb-2 pr-4 font-medium text-text-muted text-right">Tests</th>
            <th className="pb-2 font-medium text-text-muted text-right">Avg LoC</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ layer, total, stories, tests, avgLoc }) => (
            <tr key={layer} className="border-b border-border/50">
              <td className="py-2 pr-4">
                <span className={cn('text-xs px-2 py-0.5 rounded-badge', LAYER_BADGE[layer])}>
                  {layer}
                </span>
              </td>
              <td className="py-2 pr-4 font-mono text-xs text-text-primary text-right">{total}</td>
              <td className="py-2 pr-4 font-mono text-xs text-right">
                {total > 0 ? (
                  <span className={stories === total ? 'text-status-success' : 'text-text-muted'}>
                    {stories}/{total}
                  </span>
                ) : (
                  <span className="text-zinc-600">—</span>
                )}
              </td>
              <td className="py-2 pr-4 font-mono text-xs text-right">
                {total > 0 ? (
                  <span className={tests === total ? 'text-status-success' : 'text-text-muted'}>
                    {tests}/{total}
                  </span>
                ) : (
                  <span className="text-zinc-600">—</span>
                )}
              </td>
              <td className="py-2 font-mono text-xs text-text-muted text-right">{avgLoc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Integration

Used inside `CoverageView` (Task 3.2) — `{uiTotal > 0 && <LayerCoverageTable components={uiComponents} />}`

---

## Task 3.4: Summary Stats Bar

### What to Build

**File:** `apps/command-center/app/components/page.tsx`

Replace the static component count (line ~454) with a richer summary that responds to filters:

```typescript
// In the main page return, replace:
//   <p className="text-text-muted font-mono text-sm mt-1">{components.length} components</p>
// With:

const uiCount = enriched.filter((c) => c.source === 'filesystem').length;
const legacyCount = enriched.filter((c) => c.source === 'phases-json').length;

// ...then in JSX:
<p className="text-text-muted font-mono text-sm mt-1">
  {filtered.length === enriched.length
    ? `${enriched.length} items`
    : `${filtered.length} / ${enriched.length} items`}
  {uiCount > 0 && (
    <span className="ml-2 text-blue-400">
      ({uiCount} UI component{uiCount === 1 ? '' : 's'})
    </span>
  )}
</p>
```

### Integration

Replace only the `<p>` subtitle line. Don't change the `<h1>` or other page structure.

---

## Files to Modify

- `apps/command-center/app/components/page.tsx` — **modify** — add source/status filters, refactor CoverageView, add LayerCoverageTable, update summary stats

---

## Acceptance Criteria

- [ ] Source filter appears in FilterBar: "All Sources" / "UI Components" / "Legacy Tasks"
- [ ] Status filter appears in FilterBar: "All" / "Done" / "In Progress" / "Planned"
- [ ] Clicking "UI Components" filters grid/list to only `source === 'filesystem'` entries
- [ ] Clicking "Legacy Tasks" filters to only `source === 'phases-json'` entries
- [ ] CoverageView splits into two sections: "UI Component Coverage" (3 donuts) + "Project Task Progress" (1 donut)
- [ ] When 0 UI components exist, CoverageView shows "No UI components yet" message instead of 0% donuts
- [ ] Per-layer coverage table shows per Primitives/Domain/Layouts breakdown with stories/tests/avgLoc
- [ ] Summary bar shows filter count: "45 / 163 items" when filtered, "163 items" when unfiltered
- [ ] All URL params round-trip: source=ui&status=done persists through navigation
- [ ] `npx next build` succeeds with no TS errors
- [ ] No visual regression on grid/list views

---

## ⚠️ MANDATORY: Verification (do NOT skip)

```bash
echo "=== Phase 3 Verification ==="

cd apps/command-center

# 1. TypeScript compiles
npx tsc --noEmit 2>&1 | tail -5
echo "(expect: no errors)"

# 2. Build succeeds
npx next build 2>&1 | tail -5
echo "(expect: build success)"

# 3. Verify new URL params are in code
grep -n "source" app/components/page.tsx | head -10
echo "(expect: source param in PageParams, DEFAULTS, buildHref, filter logic)"

grep -n "status.*filter\|params.status" app/components/page.tsx | head -5
echo "(expect: status filter in page logic)"

# 4. Verify CoverageView has two sections
grep -n "UI Component Coverage\|Project Task Progress" app/components/page.tsx
echo "(expect: both headings found)"

# 5. Verify LayerCoverageTable exists
grep -n "LayerCoverageTable" app/components/page.tsx
echo "(expect: function definition + usage)"

# 6. Verify source filter values
grep -n "'ui'\|'legacy'\|'filesystem'" app/components/page.tsx | head -5
echo "(expect: source filter mapping to filesystem/phases-json)"

cd ../..

echo "=== Verification complete ==="
```

---

## ⚠️ MANDATORY: Write Execution Log (do NOT skip)

After verification (before committing), create the file:
`logs/wp-001/phase-3-result.md`

Structure (fill all sections — write N/A if not applicable, do NOT omit sections):

```markdown
# Execution Log: WP-001 Phase 3 — Coverage & List View Polish
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
| TypeScript compiles | ✅/❌ |
| Build succeeds | ✅/❌ |
| Source filter in code | ✅/❌ |
| Status filter in code | ✅/❌ |
| CoverageView two sections | ✅/❌ |
| LayerCoverageTable exists | ✅/❌ |
| No visual regression | ✅/❌ |

## Git
- Commit: `{sha}` — `{message}`
```

Then include `logs/` in your `git add` before committing.

---

## Git

```bash
git add apps/command-center/app/components/page.tsx logs/wp-001/phase-3-result.md
git commit -m "feat(cc): add source/status filters + scoped coverage metrics [WP-001 phase 3]"
```

---

## ⚠️ IMPORTANT Notes for CC

- **Do NOT create new files** — all changes are in `page.tsx` (inline components). StatusDots, TokenCoveragePanel, DonutChart are already extracted to `ui/`.
- **Do NOT touch `data.ts` or `types.ts`** — they're stable from Phases 1-2. The enrichment pipeline (`EnrichedComponent`) is already in page.tsx.
- **Do NOT touch `scan.ts`** — scanner is stable.
- **CoverageView receives `components` prop** which is already filtered by layer/story/tests. The source split (`uiComponents` / `legacyTasks`) must happen INSIDE CoverageView on the passed-in array, not on the full enriched array. This ensures the donuts respect active filters.
- **`source` filter values map differently:** URL param `source=ui` maps to `c.source === 'filesystem'`, and `source=legacy` maps to `c.source === 'phases-json'`. Don't confuse the URL value with the data value.
- **The `status` URL param has a name conflict risk** — `comp.status` is `ComponentStatus` type ('planned' | 'in-progress' | 'done' | 'blocked'). Make sure filter comparison matches these exact strings.
- **Test with `source=ui` when 0 filesystem components exist** — CoverageView should show the "No UI components yet" message, and grid/list should show empty state.
