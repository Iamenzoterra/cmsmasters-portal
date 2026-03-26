# WP-001: CC Components Page — Real Data Upgrade

> Replace fake phases.json-derived component cards with a live scanner that reads actual `packages/ui/src/` files, shows real story/test coverage, and renders components inside the Command Center.

**Status:** PLANNING
**Priority:** P1 — Important
**Prerequisites:** Phase B tokens.css ✅ (done) | Phase C (2-3 primitives implemented in packages/ui)
**Milestone/Wave:** Phase D (from HANDOFF_V2)
**Estimated effort:** 10-14 hours across 6 phases (including Phase 0 RECON)
**Created:** 2026-03-26
**Completed:** —

---

## Problem Statement

The Command Center Components page currently shows 95 passive cards derived from `phases.json` — a project planning file, not real code. `deriveHasStory()` returns `status === 'done'` (line 60-66 of page.tsx), meaning story/test indicators are completely fabricated. The scanner (`cli/scan.ts`) reads task titles, not actual `.tsx` files. There is no component detail page, no live render, no Figma comparison, and no real coverage metrics.

Once Phase C produces real components in `packages/ui/src/primitives/`, the CC needs to reflect reality: which components exist as code, which have stories, which have tests, which apps import them, and what they actually look like.

Without this upgrade, the Command Center is a planning dashboard pretending to be a design system observatory.

---

## Solution Overview

### Architecture

```
packages/ui/src/
  primitives/button.tsx          ← real component files
  primitives/button.stories.tsx  ← adjacent story
  primitives/button.test.tsx     ← adjacent test

          ↓  scan.ts walks filesystem

workplan/components.json         ← enriched: layer, hasStory, hasTests, usedBy, loc

          ↓  CC reads at build/request time

apps/command-center/
  app/components/page.tsx        ← grid/list/coverage (refactored, real data)
  app/components/[id]/page.tsx   ← NEW: detail page with live render
```

### Key Decisions

| Decision | Chosen | Why | Alternatives considered |
|----------|--------|-----|----------------------|
| Props extraction | Regex-based parser | Zero new deps, sufficient for interface parsing | ts-morph (heavy, 8MB), TypeScript compiler API (complex setup) |
| Style isolation for live render | CSS `@layer` + scoped wrapper div | Lightweight, no iframe overhead | iframe (true isolation but breaks interactivity), Shadow DOM (poor SSR) |
| Scanner data source | Filesystem walk of `packages/ui/src/` | Ground truth — code IS the source | Keep phases.json (fake), Figma API (not code truth) |
| usedBy detection | grep imports across `apps/*/` | Simple, accurate, no build step | Nx dep graph (overkill), webpack stats (not available at scan time) |
| Component detail route | `[id]/page.tsx` dynamic route | Standard Next.js pattern, fits existing CC architecture | Modal overlay (loses URL), separate app (overcomplicated) |

---

## What This Changes

### New Files

```
apps/command-center/
  app/components/[id]/page.tsx       # Component detail: live render + props table + code example
  lib/component-registry.ts          # Dynamic import map for live component rendering
  ui/TokenCoveragePanel.tsx          # "335 vars → 222 tokens" status strip
  ui/StatusDots.tsx                  # F✓ C✓ S✓ T○ indicator row

packages/ui/src/
  index.ts                           # Barrel export (needed for CC imports)
```

### Modified Files

```
apps/command-center/cli/scan.ts             # Rewrite scanComponents() — filesystem walker
apps/command-center/app/components/page.tsx  # Refactor cards/coverage to use enriched data
apps/command-center/lib/types.ts            # Extend ComponentSummary with new fields
apps/command-center/package.json            # Add @cmsmasters/ui devDependency
apps/command-center/tailwind.config.ts      # Add packages/ui content path (if needed)
```

---

## Implementation Phases

### Phase 0: RECON — Codebase Audit (0.5-1h)

**Goal:** Ground truth snapshot of everything this WP touches. No code changes — only reading and logging.

**Tasks:**

0.1. **Audit `packages/ui/src/` state** — confirm what exists
- List all directories: `primitives/`, `domain/`, `layouts/` — do they exist? What `.tsx` files are inside?
- If empty → document this as a hard gate for Phases 1-4
- If populated → document component count, file naming pattern, export style

0.2. **Audit scanner pipeline** — trace the full data flow
- Read `cli/scan.ts` — document current `scanComponents()` logic, input (phases.json), output schema
- Read `workplan/components.json` — count entries, verify structure matches `ComponentSummary` type
- Read `lib/types.ts` — document current type shape, identify what fields to add
- Read `lib/data.ts` — how does `getComponents()` load data? Any caching? Any transforms?

0.3. **Audit Components page** — map all inline components
- `page.tsx` — identify all inline components (ComponentCard, CoverageView, FilterBar, TabBar, etc.)
- Document which parts read real data vs derive/fake it
- Note line numbers of `deriveHasStory()`, `deriveHasTests()`, `deriveLayer()` — the fakes to replace

0.4. **Audit CC build & theme isolation**
- Run `next build` in command-center — confirm baseline works, note build time
- Check `tailwind.config.ts` — what content paths are scanned? Will adding `packages/ui` cause CSS conflicts?
- Check how CC tokens (`theme/tokens.ts`) are imported — any global CSS that would clash with `tokens.css`?

0.5. **Audit workspace linking**
- Does `packages/ui/package.json` exist? What's the `name` field? (`@cmsmasters/ui`?)
- Does it have a `main`/`exports` field? Can CC actually import from it?
- Check `nx.json` or `tsconfig.base.json` — are path aliases set up for workspace packages?

0.6. **Check for existing `[id]` route** — confirm it doesn't exist
- Verify no `app/components/[id]/` directory
- Check if any dynamic routes exist elsewhere in CC that we can use as a pattern

**Verification:**
- Produce `logs/wp-001/phase-0-recon.md` with findings for each audit point
- Document any blockers or surprises that change the plan
- Confirm or update the estimated effort based on actual state

**Log template:**
```markdown
# WP-001 Phase 0: RECON
Date: {date}

## packages/ui state
{findings}

## Scanner pipeline
{findings}

## Components page anatomy
{findings}

## Build & theme isolation
{findings}

## Workspace linking
{findings}

## Blockers / surprises
{list or "none"}

## Plan adjustments
{any changes to Phases 1-4 based on findings}
```

---

### Phase 1: Scanner Rewrite (2-3h)

**Goal:** `pnpm cc:scan` produces `components.json` with real file-based data instead of phases.json task titles.

**Tasks:**

1.1. **Extend `ComponentSummary` type** — add fields to `lib/types.ts`
- `hasStory: boolean` — adjacent `.stories.tsx` exists
- `hasTests: boolean` — adjacent `.test.tsx` or `__tests__/` exists
- `usedBy: string[]` — apps that import this component
- `loc: number` — lines of code
- `layer: ComponentLayer` — directory-based: `primitives/` | `domain/` | `layouts/`
- `propsInterface: string | null` — raw TypeScript interface text
- `filePath: string` — relative path from monorepo root

1.2. **Rewrite `scanComponents()` in `scan.ts`** — filesystem-based scanner
- Walk `packages/ui/src/primitives/`, `domain/`, `layouts/` directories
- For each `.tsx` file (skip `.stories.tsx`, `.test.tsx`):
  - Extract component name from filename (kebab → PascalCase)
  - Check for adjacent `.stories.tsx` → `hasStory: true`
  - Check for adjacent `.test.tsx` or `__tests__/{name}.test.tsx` → `hasTests: true`
  - Count lines (`wc -l` equivalent)
  - Extract `interface {Name}Props {…}` via regex
  - Assign layer from parent directory name
- Keep legacy `phases.json` scan as fallback for non-UI tasks (infra, content, etc.)

1.3. **Implement `usedBy` detection** — grep `apps/*/` for import patterns
- Search for `from '@cmsmasters/ui'` or `from '@cmsmasters/ui/primitives/button'`
- Map matched files to app names via path prefix
- Store as `usedBy: ['portal', 'dashboard']`

1.4. **Merge data sources** — unified `components.json`
- UI components from filesystem scan (real data)
- Non-UI tasks from phases.json (legacy, filtered to infra/content only)
- Deduplicate by name

**Verification:**
- Run `pnpm cc:scan` with at least 1 real component in `packages/ui/src/primitives/`
- `components.json` contains entry with `hasStory`, `hasTests`, `usedBy`, `loc` fields
- Entry has `filePath` pointing to actual `.tsx` file
- Legacy infra tasks still appear

---

### Phase 2: CC Link + Card Refactor (1.5-2h)

**Goal:** Component cards show real F/C/S/T status dots and enriched data. CC can import from `@cmsmasters/ui`.

**Tasks:**

2.1. **Add workspace dependency** — `apps/command-center/package.json`
```json
"devDependencies": {
  "@cmsmasters/ui": "workspace:*"
}
```
- Run `pnpm install` to link
- Verify `next build` still works (no CSS conflict)

2.2. **Create `StatusDots` component** — `apps/command-center/ui/StatusDots.tsx`
- 4-dot indicator: Figma (F) | Code (C) | Story (S) | Test (T)
- Green dot = present, zinc-600 dot = missing
- Props: `{ hasFigma: boolean; hasCode: boolean; hasStory: boolean; hasTests: boolean }`

2.3. **Refactor inline `ComponentCard`** — extract from page.tsx, use enriched data
- Replace `deriveHasStory()`/`deriveHasTests()` fakes with real `hasStory`/`hasTests` from data
- Replace `deriveLayer()` keyword heuristic with `layer` field from scanner
- Add `usedBy` apps list
- Add `loc` line count
- Use `StatusDots` component
- Show layer from data, not from keyword guessing

2.4. **Create `TokenCoveragePanel`** — `apps/command-center/ui/TokenCoveragePanel.tsx`
- Parse `tokens.css` header comment for "Updated: {date}"
- Count CSS custom properties in `:root` block
- Display: "{N} Figma Variables → {M} CSS tokens | Last synced: {date}"

**Verification:**
- CC builds without errors after adding `@cmsmasters/ui` dep
- Component cards show real status dots (at least Code dot green for existing components)
- Token coverage panel renders with correct count from tokens.css
- No visual regression on existing zinc-950 CC theme

---

### Phase 3: Coverage View + List View Upgrade (1-1.5h)

**Goal:** Coverage donut charts and list view reflect real scanner data instead of derived fakes.

**Tasks:**

3.1. **Refactor `CoverageView`** — replace mock calculations
- Story coverage: count components where `hasStory === true` / total
- Test coverage: count where `hasTests === true` / total
- App usage: average `usedBy.length` across components
- Use real data from enriched `components.json`

3.2. **Upgrade List View sort/filter** — leverage new fields
- Sort by `loc` (lines of code)
- Sort by `usedBy.length` (most imported first)
- Filter by `hasStory`/`hasTests` uses real booleans, not derived

**Verification:**
- Coverage view shows 0% story/test coverage when no `.stories.tsx`/`.test.tsx` exist
- After adding a story file, re-scan shows updated percentage
- List view sort by LoC works correctly

---

### Phase 4: Component Detail Page + Live Render (3-4h)

**Goal:** Clicking a component card opens a detail page with live render, props table, and code example.

**Tasks:**

4.1. **Create dynamic route** — `app/components/[id]/page.tsx`
- Read component data from `components.json` by id
- 404 if not found
- Back link to components list

4.2. **Create component registry** — `lib/component-registry.ts`
- Map of component id → dynamic import path
- `const registry: Record<string, () => Promise<ComponentType>> = { 'button': () => import('@cmsmasters/ui/primitives/button') }`
- Auto-generate from scanner output, or maintain manually initially

4.3. **Live render panel** — isolated brand-themed container
- White background wrapper div with `@layer` CSS isolation
- Import tokens.css variables scoped to `.preview-container` class
- Render component with default props inside container
- If import fails → graceful fallback: "Component not yet available for preview"

4.4. **Props table** — parsed from `propsInterface` field
- Regex parse: extract prop name, type, optional flag, default value
- Render as table: Name | Type | Required | Default
- If no interface found → "Props not yet documented"

4.5. **Code example panel** — static code block
- Generate example JSX: `<Button variant="primary" size="lg">Click me</Button>`
- Template-based: use component name + common props from interface
- Syntax highlighted with `<pre><code>` (no heavy lib needed in CC)

4.6. **Storybook link** — external link
- Pattern: `http://localhost:6006/?path=/story/{layer}-{name}--default`
- Only show if `hasStory === true`

**Verification:**
- Navigate to `/components/button` → see live rendered Button component
- Props table shows actual interface fields
- Code example is valid JSX
- Zinc-950 CC chrome does NOT bleed into white preview container
- Back button returns to components list with filters preserved

---

### Phase 5: Documentation Update (1h) — mandatory final phase

**Goal:** All docs reflect what was actually built.

**Tasks:**

5.1. **CC reads all phase logs** — understands what was done, what deviated from plan
5.2. **CC proposes doc updates** — list of files to update with proposed changes
5.3. **Brain approves** — reviews proposed changes
5.4. **CC executes doc updates** — updates canonical docs where relevant
5.5. **Update HANDOFF_V2.md** — mark Phase D as complete, update repo state section
5.6. **Update WP status** — mark WP-001 as DONE

**Files to update:**
- `workplan/WP-001-cc-components-upgrade.md` — status → DONE
- `HANDOFF_V2.md` — Phase D marked complete, repo state updated
- `logs/wp-001/phase-*-result.md` — phase evidence (must exist)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| `packages/ui/src/` is empty when WP starts | Scanner returns 0 components, cards are blank | **Gate:** don't start until Phase C delivers 2-3 primitives. Keep phases.json fallback for non-UI items |
| CSS leak: brand tokens.css pollutes zinc-950 CC | CC visual regression, broken dark theme | Scope tokens.css import to `.preview-container` only via `@layer`. Test: CC pages without preview must look identical before/after |
| `next build` breaks with workspace dep | CC can't deploy | Test build in Phase 2.1 before proceeding. Rollback: remove dep, keep scanner-only mode |
| Dynamic import SSR hydration mismatch | React error on component detail page | Use `next/dynamic` with `ssr: false` for preview panel. Server renders placeholder, client hydrates real component |
| Props regex parser fails on complex types | Empty props table for some components | Accept graceful degradation: "Props not documented". Upgrade to ts-morph later if pattern breaks >30% of components |
| Figma status check requires MCP runtime | F dot always empty when Claude Code isn't running | Cache Figma component keys in `components.json` during scan (when MCP available). Fallback: F dot shows "unknown" |

---

## Acceptance Criteria (Definition of Done)

- [ ] `pnpm cc:scan` reads real `.tsx` files from `packages/ui/src/` and produces enriched `components.json`
- [ ] Component cards show real F/C/S/T status (no more `status === 'done'` fake)
- [ ] Coverage view shows real story/test percentages from filesystem
- [ ] Token coverage panel shows var count and sync date from `tokens.css`
- [ ] `/components/[id]` detail page renders live component in brand-themed container
- [ ] CC zinc-950 theme is unaffected (no brand CSS leak)
- [ ] `next build` succeeds with `@cmsmasters/ui` workspace dep
- [ ] All phases logged in `logs/wp-001/`
- [ ] Core docs updated (Phase 5)
- [ ] No known blockers for next WP

---

## Dependencies

| Depends on | Status | Blocks |
|------------|--------|--------|
| Phase B: tokens.css generated | ✅ Done | Phase 4 live render needs tokens |
| Phase C: 2-3 primitives in packages/ui | Not started | Phase 1 scanner needs real files, Phase 4 needs importable components |
| ADR-010: Three-Layer Model | ✅ Accepted | Scanner directory structure (primitives/domain/layouts) |
| Nx workspace linking | ✅ Working | Phase 2 devDependency resolution |

---

## Notes

- **Phase ordering within this WP is strict:** 0 → 1 → 2 → 3 → 4 → 5. Each phase depends on the previous. Phase 0 RECON must complete before any code changes.
- **Figma preview panel (D4 from HANDOFF_V2) is deferred** to a follow-up WP. It requires MCP runtime and screenshot caching — orthogonal to the core upgrade. The F dot in StatusDots can be populated later.
- **The 6-8h estimate from HANDOFF_V2 was optimistic.** This WP budgets 10-14h based on CSS isolation complexity and the detail page build. If CSS `@layer` approach works first try, the lower bound is achievable.
- **Scanner backward compatibility:** phases.json scan is preserved for infra/content tasks that have no corresponding `.tsx` file. The two sources merge into one `components.json`.
