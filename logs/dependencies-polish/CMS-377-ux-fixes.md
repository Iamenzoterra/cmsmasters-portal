# CMS-377 Phase 1: Dependencies & Polish UX Fixes

> Workplan: CMS-377 Dependencies & Polish UX Fixes
> Phase: 1 of 1
> Priority: P1
> Estimated: 3 hours
> Type: Frontend
> Previous: CMS-376 — server-side dependency data loading ✅
> Next: QA verification of all acceptance criteria

---

## Context

CMS-376 fixed server-side data loading for the dependency graph. However, QA testing revealed three remaining issues plus a design-system compliance problem. The agents that built `DependencyGraph.tsx` and `GlobalSearch.tsx` created inline SVG and custom overlays instead of using the existing CC Design System atoms (`Card`, `StatusBadge`, `ProgressBar`, `Modal`).

```
CURRENT:  DependencyGraph renders server-loaded data                          ✅
CURRENT:  GlobalSearch opens via Ctrl+K and "/" key                           ✅
CURRENT:  Escape closes GlobalSearch overlay                                  ✅
CURRENT:  Search results navigate to correct pages                            ✅
MISSING:  Number keys 1-5 don't navigate to sidebar pages                    ❌
MISSING:  db/auth appear as APPS (right column) — they are packages only     ❌
MISSING:  DependencyGraph is 433 lines of raw SVG, not using design atoms    ❌
MISSING:  GlobalSearch doesn't use Modal atom for overlay                     ❌
MISSING:  Phase Dependencies tab duplicates PhaseTimeline as crude SVG       ❌
```

**Sidebar navigation order (from Sidebar.tsx NAV_ITEMS):**
1 = Mission Control `/`
2 = Phase Tracker `/phases`
3 = Components `/components`
4 = ADRs `/architecture`
5 = Dependencies `/dependencies`

**Available CC Design System atoms (in `ui/`):**
- `Card` — `bg-surface-card border border-zinc-800 rounded-card p-card` with hover lift
- `StatusBadge` — status pill with proper colors per status
- `ProgressBar` — animated bar with color thresholds + label
- `Modal` — portal overlay with Escape handling, backdrop, proper aria
- `Input`, `Select`, `Checkbox` — form atoms

**Key pattern references:**
- `PhaseTimeline.tsx` — uses Card pattern, ProgressBar, StatusBadge, Link, cn(), Tailwind classes
- `AppCard.tsx` — uses Card, StatusBadge, cn()
- `TaskDetailSheet.tsx` — slide panel with Escape, StatusBadge, proper Tailwind

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Verify which atoms exist and their exports
ls apps/command-center/ui/

# 2. Check DependencyGraph current imports — should NOT import tokens directly
head -10 apps/command-center/components/DependencyGraph.tsx

# 3. Check GlobalSearch overlay implementation
grep -n "fixed inset-0" apps/command-center/components/GlobalSearch.tsx

# 4. Check what loadDependencyGraph returns for apps (the db/auth bug)
grep -A5 "plannedApps" apps/command-center/lib/data.ts

# 5. Verify Sidebar NAV_ITEMS order for keyboard shortcuts
grep -A10 "NAV_ITEMS" apps/command-center/components/Sidebar.tsx

# 6. Check if Content page exists in app router
ls apps/command-center/app/content/
```

**Document your findings before writing any code.**

**IMPORTANT:** The `db` and `auth` appearing as apps is caused by `loadDependencyGraph()` in `lib/data.ts` — the `plannedApps` Set collects task.app values from phases.json, and some tasks have `app: 'db'` or `app: 'auth'` (they're package-related tasks). These should be filtered out since they're packages, not apps.

---

## Task 1.1: Fix db/auth apps bug in loadDependencyGraph

### What to Build

In `lib/data.ts`, the `loadDependencyGraph()` function builds `plannedApps` from phases.json `task.app` values. Tasks with `app: 'db'` or `app: 'auth'` are package tasks, not app tasks. Filter them out.

```typescript
// In loadDependencyGraph(), section 3 — Build app nodes
// Current: only excludes 'infra', 'ui', 'content'
// Fix: also exclude package names that are NOT apps

const PACKAGE_IDS = new Set(SPEC_PACKAGES); // ui, db, auth, api-client, validators, email

// When building plannedApps from phases.json:
if (app && !['infra', 'content'].includes(app) && !PACKAGE_IDS.has(app)) {
  plannedApps.add(app);
}
```

Note: `'ui'` was already excluded, but the filter should exclude ALL package IDs since packages are not apps.

### Integration

File: `apps/command-center/lib/data.ts`, inside `loadDependencyGraph()`, around line 496.

Replace:
```typescript
if (app && !['infra', 'ui', 'content'].includes(app)) {
```

With:
```typescript
const pkgIdSet = new Set(SPEC_PACKAGES);
// ... inside loop:
if (app && !['infra', 'content'].includes(app) && !pkgIdSet.has(app)) {
```

---

## Task 1.2: Add keyboard shortcuts 1-5 for page navigation

### What to Build

Add a `useEffect` in `GlobalSearch.tsx` (or a new `KeyboardNav` component in layout) that listens for number keys 1-5 when:
- No input/textarea is focused
- GlobalSearch overlay is NOT open

Map keys to Sidebar NAV_ITEMS hrefs:
```typescript
const PAGE_SHORTCUTS: Record<string, string> = {
  '1': '/',
  '2': '/phases',
  '3': '/components',
  '4': '/architecture',
  '5': '/dependencies',
};
```

```typescript
// Inside the existing keydown handler in GlobalSearch.tsx:
// Add BEFORE the Ctrl+K check:
if (!isOpen && PAGE_SHORTCUTS[e.key]) {
  const target = e.target as HTMLElement;
  const tag = target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || target.isContentEditable) return;
  e.preventDefault();
  router.push(PAGE_SHORTCUTS[e.key]);
  return;
}
```

### Integration

File: `apps/command-center/components/GlobalSearch.tsx`, inside the `useEffect` keydown handler (line ~55).

**IMPORTANT:** The `router` is already available (line 43: `const router = useRouter()`). Add the shortcut logic inside the existing `handleKeyDown` function, before other checks. Only fire when `isOpen === false`.

---

## Task 1.3: Rewrite DependencyGraph Package tab with HTML + design atoms

### What to Build

Replace the raw SVG package dependency view with proper HTML using CC design atoms. The Phase Dependencies tab should reuse the existing `PhaseTimeline` component instead of duplicating it as SVG.

**Package Dependencies tab — new design:**

Two-column layout using CSS Grid, with `Card` atoms for each node and colored connection lines via CSS.

```
┌─────────────────────────────────────────────────────┐
│ PACKAGES (left col)          APPS (right col)       │
│                                                      │
│  [Card: @cmsmasters/ui]  ──── [Card: command-center]│
│  [Card: @cmsmasters/db]  ──── [Card: portal]        │
│  [Card: @cmsmasters/auth]──── [Card: dashboard]     │
│  ...                          ...                    │
│                                                      │
│  Click a node → tooltip shows affected/depends-on   │
└─────────────────────────────────────────────────────┘
```

Implementation approach:
- Two columns with `flex` or `grid` layout
- Each node is a `<button>` styled with Card-like classes (`bg-surface-card border border-border-default rounded-card`)
- Connections rendered as a middle SVG column (thin polylines only) OR as colored border highlights on click
- Selected state: `ring-2 ring-blue-500` (same pattern as PhaseTimeline)
- Tooltip below graph: uses Card + StatusBadge-style pills for affected apps
- ALL colors via Tailwind classes (`bg-surface-card`, `text-text-primary`, `border-border-default`), NOT `tokens.ts` hex values

**Phase Dependencies tab — replace SVG with PhaseTimeline:**

```typescript
import { PhaseTimeline } from './PhaseTimeline';

// In the phases tab:
{activeTab === 'phases' && phases.length > 0 && (
  <PhaseTimeline phases={phases} overallLabel={`${phases.length} phases`} />
)}
```

This eliminates ~120 lines of SVG phase rendering code.

### Key constraints

- Remove ALL `tokens.ts` imports — use only Tailwind classes
- Remove ALL raw SVG for nodes (keep minimal SVG only for edge lines if needed)
- Use `cn()` for all conditional classes
- Package node click → show "Affects: [app1, app2, ...]" as StatusBadge-style pills
- App node click → show "Depends on: [pkg1, pkg2, ...]" as pills
- Keep the tab bar (Package Dependencies | Phase Dependencies)

---

## Task 1.4: Refactor GlobalSearch to use Modal atom

### What to Build

Replace the inline overlay in GlobalSearch with the `Modal` atom from `ui/Modal.tsx`.

```typescript
import { Modal } from '../ui/Modal';

// Replace the fixed div overlay with:
<Modal open={isOpen} title="" onClose={close} className="max-w-xl">
  {/* Search input + results */}
</Modal>
```

**Note:** Modal has its own Escape handler, so remove the duplicate Escape logic from GlobalSearch's keydown handler. Keep Ctrl+K and "/" handlers.

Modal's default header has a title + close button. For GlobalSearch, we want the search input AS the header. Options:
1. Pass empty title and put input in children
2. Extend Modal to accept custom header (don't do this — keep it simple)
3. Keep GlobalSearch's own overlay but match Modal's styling exactly

**Recommended:** Option 3 — keep GlobalSearch's own overlay but ensure it uses the same classes as Modal (`bg-surface-app/80` backdrop, `bg-zinc-900 border border-zinc-800 rounded-card` panel). The search input replaces the title, which Modal doesn't support. Just align the styles.

---

## Files to Modify

- `apps/command-center/lib/data.ts` — filter package IDs from plannedApps (Task 1.1)
- `apps/command-center/components/GlobalSearch.tsx` — add 1-5 shortcuts, align overlay styles with Modal (Tasks 1.2, 1.4)
- `apps/command-center/components/DependencyGraph.tsx` — full rewrite: HTML+atoms for packages, PhaseTimeline for phases (Task 1.3)

---

## Acceptance Criteria

- [ ] Number keys 1-5 navigate to corresponding sidebar pages when not in input
- [ ] `db` and `auth` do NOT appear in the APPS column of the dependency graph
- [ ] DependencyGraph Package tab uses Tailwind classes (no `tokens.ts` hex imports)
- [ ] DependencyGraph Phase tab reuses `PhaseTimeline` component
- [ ] Package/app nodes are clickable and show tooltip with affected/dependent items
- [ ] GlobalSearch overlay styles match Modal atom conventions
- [ ] Ctrl+K, "/" open search; Escape closes search
- [ ] `npm run build` — no errors
- [ ] `npx tsc --noEmit` — no errors

---

## MANDATORY: Verification (do NOT skip)

```bash
echo "=== CMS-377 Verification ==="

# 1. TypeScript check
npx tsc --noEmit -p apps/command-center/tsconfig.json
echo "(expect: no errors)"

# 2. Build check
cd apps/command-center && npx next build 2>&1 | tail -15
echo "(expect: all routes compile)"

# 3. Verify no tokens.ts import in DependencyGraph
grep "tokens" apps/command-center/components/DependencyGraph.tsx
echo "(expect: no matches — all colors via Tailwind)"

# 4. Verify PhaseTimeline import in DependencyGraph
grep "PhaseTimeline" apps/command-center/components/DependencyGraph.tsx
echo "(expect: import from ./PhaseTimeline)"

# 5. Verify keyboard shortcuts exist
grep "PAGE_SHORTCUTS\|'1'.*'\/'" apps/command-center/components/GlobalSearch.tsx
echo "(expect: shortcut mapping found)"

# 6. Verify db/auth filtered from apps
grep "pkgIdSet\|PACKAGE_IDS\|SPEC_PACKAGES" apps/command-center/lib/data.ts
echo "(expect: package filtering in loadDependencyGraph)"

echo "=== Verification complete ==="
```

---

## MANDATORY: Write Execution Log (do NOT skip)

After verification (before committing), create the file:
`logs/dependencies-polish/CMS-377.md`

Structure (fill all sections — write N/A if not applicable, do NOT omit sections):

```markdown
# Execution Log: CMS-377 — Dependencies & Polish UX Fixes
> Epic: Dependencies & Polish
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
| `path` | created/modified/deleted | brief description |

## Issues & Workarounds
{Problems encountered and resolutions. "None" if clean.}

## Open Questions
{Non-blocking questions. "None" if none.}

## Verification Results
| Check | Result |
|-------|--------|
| Build | ✅/❌ |
| TypeScript | ✅/❌ |
| AC met | ✅/❌ |

## Git
- Commit: `{sha}` — `{message}`
```

Then include `logs/` in your `git add` before committing.

---

## Git

```bash
git add apps/command-center/lib/data.ts apps/command-center/components/DependencyGraph.tsx apps/command-center/components/GlobalSearch.tsx logs/dependencies-polish/CMS-377.md
git commit -m "fix(CMS-377): UX fixes — keyboard nav, db/auth filter, design-system atoms [Dependencies & Polish]"
```

---

## IMPORTANT Notes for CC

- Do NOT modify `ui/*.tsx` atoms — they are the design system, use them as-is
- Do NOT modify `PhaseTimeline.tsx` — reuse it in DependencyGraph Phase tab
- Do NOT add new dependencies — everything needed is already installed
- The `tokens.ts` file should NOT be imported in DependencyGraph after refactor — use Tailwind classes only
- `Sidebar.tsx` has 5 nav items, not 6 — keyboard shortcuts are 1-5
- If PhaseTimeline needs `overallLabel` prop and you don't have overall %, pass `"{N} phases"` as label
- TaskDetailSheet already exists and handles Escape — it's used in phase detail pages, not on Dependencies page
