# Command Center — Architecture

## Overview

Command Center is the first app in the CMSMasters Portal monorepo. It is an internal dashboard that provides visibility into the 7-phase build of the portal platform. Zero API, zero database — all data comes from the filesystem.

---

## File Structure

```
apps/command-center/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout: fonts, body bg, Sidebar
│   ├── page.tsx                # Mission Control (/)
│   ├── globals.css             # Tailwind v4 entry (@import + @config)
│   ├── phases/
│   │   ├── page.tsx            # Phase Tracker (/phases)
│   │   └── [id]/
│   │       └── page.tsx        # Phase Detail (/phases/[id])
│   ├── components/
│   │   └── page.tsx            # Components showcase (/components)
│   ├── content/
│   │   └── page.tsx            # Content (/content)
│   ├── architecture/
│   │   └── page.tsx            # Architecture (/architecture)
│   └── dependencies/
│       └── page.tsx            # Dependencies (/dependencies)
├── components/
│   ├── Sidebar.tsx             # Navigation sidebar
│   ├── PhaseTimeline.tsx       # Mission Control — horizontal phase strip
│   ├── AppCard.tsx             # Mission Control — per-app status card
│   ├── DesignSystemProgress.tsx # Mission Control — three-layer progress bars
│   ├── ContentOverview.tsx     # Mission Control — content KPI panel
│   ├── InfraChecklist.tsx      # Mission Control — infra readiness checklist
│   ├── ActivityFeed.tsx        # Mission Control — recent task event timeline
│   ├── PhaseCard.tsx           # Phase Tracker — collapsible phase card with progress + task table
│   ├── TaskTable.tsx           # Phase Tracker — sortable task rows with status and metadata columns
│   ├── TaskFilters.tsx         # Phase Tracker — filter bar (search + 4 dropdowns + active chips)
│   ├── TaskDetailSheet.tsx     # Phase Tracker — slide-in right panel with full task detail
│   ├── TaskBrowser.tsx         # Phase Tracker — client composition: filter state + TaskFilters + TaskTable
│   └── TasksView.tsx           # Phase Tracker — server wrapper that renders TaskBrowser
├── ui/                         # Design system atoms
│   ├── Card.tsx
│   ├── StatusBadge.tsx
│   ├── ProgressBar.tsx
│   ├── DonutChart.tsx
│   ├── Input.tsx
│   ├── Select.tsx
│   ├── Checkbox.tsx
│   ├── Modal.tsx
│   └── AtomsShowcase.tsx       # Dev showcase of all primitives
├── theme/
│   ├── tokens.ts               # Single source of truth for design values
│   └── utils.ts                # cn() helper, getStatusColor(), getStatusBg()
├── lib/
│   └── types.ts                # TypeScript types for all data schemas
├── types/
│   └── tailwindcss.d.ts        # Tailwind CSS v4 type declarations
├── tailwind.config.ts          # Maps tokens → Tailwind utility classes
├── postcss.config.js           # @tailwindcss/postcss plugin
├── next.config.js
└── tsconfig.json
```

---

## Design Token Approach

Design tokens are the **single source of truth** for all visual values (colors, spacing, radii, typography).

### Flow

```
theme/tokens.ts
      ↓
tailwind.config.ts (theme.extend)
      ↓
Tailwind utility classes (bg-surface-card, text-text-primary, …)
      ↓
Components via cn() from theme/utils.ts
```

### tokens.ts

Defines all raw values as a typed const object:

| Category | Keys | Example value |
|----------|------|---------------|
| `surface` | `app`, `card`, `hover` | `#09090b`, `#18181b`, `#27272a` |
| `text` | `primary`, `secondary`, `muted`, `disabled` | `#f4f4f5`, `#a1a1aa` |
| `border` | `default`, `subtle` | `#27272a`, `#1f1f23` |
| `accent` | — | `#3b82f6` (blue — active nav, focus ring) |
| `status` | `success`, `active`, `warning`, `danger`, `orchestrator` | `#22c55e`, `#3b82f6` |
| `spacing` | `card`, `section` | `1.25rem`, `2rem` |
| `borderRadius` | `card`, `badge` | `0.875rem`, `0.375rem` |
| `typography` | `fontFamily`, `fontSize`, `fontWeight` | LINE Seed JP + JetBrains Mono |

### tailwind.config.ts

Maps token values to named Tailwind classes. Components use semantic class names, never raw hex:

```tsx
// correct
<div className="bg-surface-card text-text-primary rounded-card p-card">

// wrong — never hardcode colors
<div style={{ background: '#18181b' }}>
```

### theme/utils.ts

- **`cn(...inputs)`** — composes class names via `clsx` + `tailwind-merge`. Use for all conditional class logic.
- **`getStatusColor(status)`** — returns Tailwind text color class for a given status string.
- **`getStatusBg(status)`** — returns Tailwind bg color class (with 10% opacity) for a given status string.

---

## UI Primitives

All primitives are in `ui/`. They follow these rules:
- Named exports only (no default exports)
- Props typed with explicit TypeScript interfaces
- Use `cn()` for class composition
- Use design token classes exclusively — no hardcoded colors

| Primitive | Purpose |
|-----------|---------|
| `Card` | Surface container with `bg-surface-card rounded-card p-card` |
| `StatusBadge` | Colored pill badge for task/phase status |
| `ProgressBar` | Horizontal progress indicator with label and percentage |
| `DonutChart` | Recharts donut chart for phase completion |
| `Input` | Text input with dark theme styling |
| `Select` | Dropdown select with dark theme styling |
| `Checkbox` | Checkbox input with dark theme styling |
| `Modal` | Overlay dialog with backdrop |

### Phase Tracker Components (`components/`)

| Component | Directive | Purpose | Props interface |
|-----------|-----------|---------|-----------------|
| `PhaseCard` | `'use client'` | Collapsible phase card: header shows phase number badge, title, description; `ProgressBar` with `X / Y tasks` count; optional estimatedWeeks/startDate/endDate metadata; clicking header toggles inline task table; `in-progress` phases get blue ring glow | `PhaseCardProps { phase: Phase, tasks: Task[], defaultExpanded?: boolean, estimatedWeeks?: number, startDate?: string, endDate?: string, onTaskSelect?: (task: Task) => void }` |
| `TaskTable` | `'use client'` | Sortable table with 9 columns (Status, ID, Title, Owner, App, Priority, Dependencies, Est. Hours, Act. Hours); sort headers toggle asc/desc; status cells render colored dots via `bg-status-*` tokens; rows fire `onSelect(id)` on click; shows empty state when tasks array is empty | `TaskTableProps { tasks: Task[], onSelect: (id: string) => void, initialSortColumn?: SortColumn, initialSortDirection?: 'asc' \| 'desc' }` |
| `TaskFilters` | `'use client'` | Horizontal filter bar: search `Input` + four `Select` dropdowns (Phase, Status, Owner, App); active non-default filters render as removable chip badges below the bar; fully controlled — parent owns state | `TaskFiltersProps { filters: TaskFilterState, onChange: (f: TaskFilterState) => void, phaseOptions?: string[], appOptions?: App[] }` |
| `TaskDetailSheet` | `'use client'` | Slide-in right panel (CSS `translateX` transition, `duration-300`); displays Description, Details (owner/app/priority pills), Dependencies (clickable, resolved from `allTasks`), Acceptance Criteria (CheckSquare/Square icons), Notes, Timestamps; backdrop overlay closes on click; Escape key closes via `useEffect` | `TaskDetailSheetProps { task: Task \| null, onClose: () => void, onTaskSelect?: (taskId: string) => void, allTasks?: Task[] }` |
| `TaskBrowser` | `'use client'` | Composition root for client-side task browsing: owns `TaskFilterState` via `useState`; computes `filteredTasks` via `useMemo` on every filter/search change; renders `TaskFilters` + `TaskTable` wired together | `TaskBrowserProps { tasks: PhaseTask[] }` where `PhaseTask = Task & { phase: string }` |

### Mission Control Components (`components/`)

| Component | Directive | Purpose | Props | Navigates to |
|-----------|-----------|---------|-------|--------------|
| `PhaseTimeline` | `'use client'` | Horizontal strip of 7 phase blocks with ChevronRight connectors; active phase gets ring glow | `PhaseTimelineProps { phases: PhaseBlock[], overallLabel: string }` | `/phases/[id]` (via Next.js `Link`) |
| `AppCard` | `'use client'` | Per-app status card: bold name, truncated description, color-coded status dot | `AppCardProps { app: AppCardApp }` | `app.href` (caller encodes `/phases?app=<id>`) |
| `DesignSystemProgress` | `'use client'` | Three stacked progress bars for Primitives / Domain / Layouts layers; each row is clickable | `DesignSystemProgressProps { layers: LayerRow[] \| null }` | `/components?layer=<layer>` (via `useRouter`) |
| `ContentOverview` | `'use client'` | Three KPI tiles (Themes, Docs, Blog Posts) as fraction + ProgressBar; mini list of up to 5 recent themes | `ContentOverviewProps { metrics: ContentMetrics, recentThemes: ThemeItem[] }` | `/content` (whole-card `useRouter().push`) |
| `InfraChecklist` | Server Component | Infra readiness checklist in a Card; CheckCircle2 (done) / Circle (pending) Lucide icons | `InfraChecklistProps { items: InfraItem[] \| null }` | No navigation |
| `ActivityFeed` | `'use client'` | Top-10 recent task events sorted by timestamp; status icons (CheckCircle / Loader2 / XCircle) | `{ tasks: Task[] }` | `/phases?task={id}` (on row click) |

---

## Sidebar Layout

`components/Sidebar.tsx` is the persistent navigation column rendered in `app/layout.tsx`.

**Directive:** `'use client'` — required for `usePathname()` (Next.js navigation hook).

**Layout:**

```
<nav class="flex h-screen w-16 flex-col border-r border-border-subtle bg-surface-card transition-all xl:w-[210px]">
  Logo section
  Nav items (flex-1, scrollable)
  Bottom section (last scan, rescan button)
</nav>
```

| Breakpoint | Width | Content |
|------------|-------|---------|
| Default (< `xl`) | `w-16` (64px) | Icons only — labels hidden |
| `xl` (≥ 1280px) | `w-[210px]` | Icons + labels visible |

**Active state detection:**

```ts
function isActive(href: string): boolean {
  if (href === '/') return pathname === href;        // exact match for root
  return pathname === href || pathname.startsWith(href + '/');  // prefix for sub-routes
}
```

Active nav items receive `bg-accent/10 text-accent` classes. Inactive items receive `text-text-secondary hover:bg-surface-hover hover:text-text-primary`.

---

## Pages (App Router Routes)

| Route | File | Description |
|-------|------|-------------|
| `/` | `app/page.tsx` | Mission Control — top-level project status |
| `/phases` | `app/phases/page.tsx` | Phase Tracker — all 7 phases overview |
| `/phases/[id]` | `app/phases/[id]/page.tsx` | Phase Detail — single phase drill-down |
| `/components` | `app/components/page.tsx` | Design system atom showcase |
| `/content` | `app/content/page.tsx` | Content overview |
| `/architecture` | `app/architecture/page.tsx` | Architecture overview |
| `/dependencies` | `app/dependencies/page.tsx` | Dependencies overview |

All pages are React Server Components by default. `'use client'` is only used when a component requires browser APIs, event handlers, or React hooks.

---

## Mission Control Page

`app/page.tsx` — the root route (`/`). A pure async Server Component. Fetches all data sources in parallel via `Promise.all` and renders three sections in a vertical `space-y-8` layout:

```
┌──────────────────────────────────────────────────────┐
│  PhaseTimeline   (full-width horizontal phase strip) │
├────────────────┬─────────────────────────────────────┤
│  AppCard grid  │  DesignSystemProgress               │
│  (2×2 or list) │  ContentOverview                    │
├────────────────┴─────────────────────────────────────┤
│  ActivityFeed  (full-width event timeline)           │
└──────────────────────────────────────────────────────┘
```

### Component Breakdown

| Panel | Component | Props interface | Data source |
|-------|-----------|-----------------|-------------|
| Phase strip | `PhaseTimeline` | `PhaseTimelineProps { phases: PhaseBlock[], overallLabel }` | `getPhases()` → mapped to `PhaseBlock[]` |
| App status | `AppCard` (×5) | `AppCardProps { app: AppCardApp }` | `getAppCards()` |
| Design system | `DesignSystemProgress` | `DesignSystemProgressProps { layers: LayerRow[] \| null }` | `getDesignSystemLayers()` |
| Content KPIs | `ContentOverview` | `ContentOverviewProps { metrics: ContentMetrics, recentThemes: ThemeItem[] }` | `getContentStatusEntries()` |
| Infra readiness | `InfraChecklist` | `InfraChecklistProps { items: InfraItem[] \| null }` | `getInfraItems()` |
| Activity feed | `ActivityFeed` | `{ tasks: Task[] }` | `getPhases()` (all tasks flattened) |

---

## Phase Tracker Page

`app/phases/page.tsx` — the `/phases` route. A pure async Server Component. Reads `phases.json` via `getPhases()`, parses URL search params (Next.js 15 Promise-based `searchParams`), filters tasks server-side, and renders a grid of collapsible phase cards plus an "All Tasks" browser section.

```
┌──────────────────────────────────────────────────────────────┐
│  Filter bar: status chips (SSR form GET) + search input      │
├──────────────────────────────────────────────────────────────┤
│  Phase cards grid (expandable <details> per phase)           │
│  ┌─────────────────────┐  ┌─────────────────────┐           │
│  │  Phase 0 ▼          │  │  Phase 1 ▶           │           │
│  │  ████████░░ 80%      │  │  ░░░░░░░░ 0%         │           │
│  │  [task rows…]        │  │                     │           │
│  └─────────────────────┘  └─────────────────────┘           │
├──────────────────────────────────────────────────────────────┤
│  All Tasks (TaskBrowser — client component)                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  TaskFilters: search + Phase / Status / Owner / App  │   │
│  │  TaskTable: sortable rows, click → TaskDetailSheet   │   │
│  └──────────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────────┤
│  TaskDetailSheet overlay (slide-in from right, URL ?task=id) │
└──────────────────────────────────────────────────────────────┘
```

### Component Breakdown

| Panel | Component | Props / State | Data source |
|-------|-----------|---------------|-------------|
| Phase cards | `<details>`/`<summary>` HTML (native expand) | `open` attribute — no JS | `getPhases()` |
| Phase progress | `ProgressBar` (per card) | `{ value: donePct, label: 'X / Y tasks' }` | derived from `phase.tasks` |
| All Tasks browser | `TaskBrowser` | `{ tasks: PhaseTask[] }` | all tasks flattened from `getPhases()` |
| Filter bar (inside browser) | `TaskFilters` | controlled via `useState` inside `TaskBrowser` | client state |
| Task rows | `TaskTable` | filtered via `useMemo` inside `TaskBrowser` | filtered `PhaseTask[]` |
| Task detail | `TaskDetailSheet` | `{ task, onClose, allTasks }` wired in `TaskBrowser` | selected row |

### Filter System

The page uses **two separate filter mechanisms**:

1. **URL-param SSR filters** (status chips + search form in the phase cards section):
   - `statuses` query param — comma-separated status values; drives server-side `phase.tasks` filtering for the cards grid
   - `search` query param — text search on task title; submitted via `<form method="get">` with a hidden `statuses` input to preserve active status chips
   - `task` query param — task ID; opens `TaskDetailSheet` overlay (also server-rendered as a pre-selected task)
   - Chevron rotation uses `group-open:rotate-180` via Tailwind `group` on `<details>` — zero JS required

2. **Client-state `TaskBrowser`** (All Tasks section):
   - `TaskFilterState { phase, status, owner, app, search }` owned via `useState` inside `TaskBrowser`
   - `filteredTasks` computed via `useMemo` on every filter/search change
   - Instantly reactive — no URL round-trip needed for the flat task list

### TaskDetailSheet Slide-in Behavior

`TaskDetailSheet` is a `'use client'` component that uses a CSS `translateX` transition (`duration-300`) controlled by whether `task` prop is non-null:

- **Open:** `translateX(0)` — panel slides in from the right
- **Closed:** `translateX(100%)` — panel is off-screen
- **Backdrop:** fixed overlay behind the panel; click closes via `onClose()`
- **Keyboard:** `useEffect` adds `keydown` listener; `Escape` fires `onClose()`
- **Slide-in animation:** `@starting-style` CSS rule in an inline `<style>` tag (scoped to `.task-detail-sheet` class — no Tailwind equivalent)

### Phase Detail Page (`/phases/[id]`)

`app/phases/[id]/page.tsx` — the phase drill-down route. A pure async Server Component.

```
┌──────────────────────────────────────────────────────────────┐
│  Header: P{n} badge · Phase title · Description              │
│  Large monospace progress % · full-width ProgressBar         │
├──────────────────────────────────────────────────────────────┤
│  Burndown chart (inline SVG — server-generated)              │
├──────────────────────────────────────────────────────────────┤
│  Blocked tasks section                                       │
│  Dependency name + done/not-done colored dot per blocker     │
├──────────────────────────────────────────────────────────────┤
│  Task table grouped by app                                   │
│  Columns: ID · Title · Status · Owner · Priority             │
└──────────────────────────────────────────────────────────────┘
```

| Section | Implementation | Notes |
|---------|---------------|-------|
| Burndown chart | `buildBurndownSVG()` server helper — cumulative completion area chart as inline SVG string | No Recharts/client bundle; fully server-rendered |
| Blocked tasks | Resolves dependency titles from `allTasks`; done/not-done colored dots | Uses `project?.phases.flatMap()` for null safety |
| Task table | `<table>` grouped by `task.app`; `.toSorted()` for sort | Rows use status dot + `StatusBadge` equivalent |

---

## Tailwind CSS v4

Command Center uses Tailwind CSS v4. Key differences from v3:

- **`globals.css`** uses `@import "tailwindcss"` and `@config "../tailwind.config.ts"` instead of `@tailwind base/components/utilities`
- **PostCSS** uses `@tailwindcss/postcss` plugin (not `tailwindcss` directly)
- Config is still in `tailwind.config.ts` via `theme.extend`

---

## Typography

Command Center uses two fonts:

| Font | Role | Source |
|------|------|--------|
| **LINE Seed JP** | Primary sans-serif (`font-sans`) | Google Fonts CDN via `<link>` in `layout.tsx` |
| **JetBrains Mono** | Monospace (`font-mono`) | `next/font/google` in `layout.tsx` |

**Loading strategy:**

- **LINE Seed JP** is loaded via a `<link rel="stylesheet">` tag in the `<head>` of `app/layout.tsx`, pointing to Google Fonts CSS API. Weights: 100, 400, 700, 800. Not available in `next/font/google` so cannot use the Next.js font optimizer.
- **JetBrains Mono** is loaded via `next/font/google` with `variable: '--font-mono'`, which enables automatic font optimization and self-hosting by Next.js.

**CSS variable wiring:**

```
globals.css  →  :root { --font-sans: 'LINE Seed JP', …; --font-mono: 'JetBrains Mono', …; }
                         ↓
tailwind.config.ts  →  fontFamily.sans: ['var(--font-sans)', …]
                       fontFamily.mono: ['var(--font-mono)', …]
                         ↓
Components use Tailwind classes: font-sans (default), font-mono
```

To change the primary font, update the `<link>` in `layout.tsx` and the `--font-sans` variable in `globals.css`.

---

## Data Layer

All filesystem reads go through `lib/data.ts`. Components never read files directly. Missing data files return `null` or `[]` — never crash.

### Path Constants

| Constant | Resolved Path |
|----------|--------------|
| `PHASES_PATH` | `workplan/phases.json` |
| `COMPONENTS_PATH` | `workplan/components.json` |
| `CONTENT_STATUS_PATH` | `workplan/content-status.json` |
| `PROGRESS_PATH` | `workplan/progress.json` |
| `ADR_DIR` | `workplan/adr/` |

Paths are resolved with `path.join(process.cwd(), ...)` so they work from any CWD Next.js uses.

### Reader Functions (lib/data.ts)

| Function | Return type | Description |
|----------|-------------|-------------|
| `getPhases()` | `Promise<Project \| null>` | Reads `workplan/phases.json` |
| `getComponents()` | `Promise<ComponentSummary[] \| null>` | Reads `workplan/components.json` |
| `getContentStatus()` | `Promise<ContentStatus \| null>` | Reads `workplan/content-status.json` |
| `getProgress()` | `Promise<ProgressData \| null>` | Reads `workplan/progress.json` |
| `getADRList()` | `Promise<ADRMeta[]>` | Lists all ADR files, parses frontmatter |
| `getADRContent(idOrSlug)` | `Promise<ADRMetaWithBody \| null>` | Returns single ADR frontmatter + body |
| `getAppCards()` | `Promise<AppCardApp[]>` | Derives per-app status from `phases.json` task groups |
| `getDesignSystemLayers()` | `Promise<LayerRow[]>` | Reads `components.json` wrapper object and groups entries by layer |
| `getContentStatusEntries()` | `Promise<ContentMetrics>` | Reads `content-status.json` wrapper object and aggregates KPI totals |
| `getInfraItems()` | `Promise<InfraItem[]>` | Matches 12 static infra definitions against `phases.json` task titles |

> **Runtime caveat — wrapper objects:** `components.json` and `content-status.json` are written by `cli/scan.ts` as wrapper objects `{ lastScanned, components: [] }` and `{ lastScanned, entries: [] }` respectively. The legacy functions `getComponents()` and `getContentStatus()` have incorrect generic types at runtime. The new functions `getDesignSystemLayers()` and `getContentStatusEntries()` read the wrapper shape directly via `readJson<{ components: ComponentSummary[] }>` / `readJson<{ entries: ContentStatus[] }>` to avoid mistyping. Do not edit the output files by hand — they are regenerated on every `cc:scan` run.

### Mission Control Types (lib/types.ts)

| Type | Shape | Description |
|------|-------|-------------|
| `AppStatus` | `'not-started' \| 'in-progress' \| 'beta' \| 'live'` | Per-app build status |
| `AppCardApp` | `{ id, name, description, status: AppStatus, href }` | Data shape for each app card; `href` is caller-encoded filter URL |
| `LayerName` | `'Primitives' \| 'Domain' \| 'Layouts'` | Three design-system layer names per ADR-010 |
| `LayerRow` | `{ layer: LayerName, completed: number, total: number, href: string }` | One row in `DesignSystemProgress`; `completed` (not `done`) counts finished components |
| `ContentMetrics` | `{ themesPublished, themesTotal, docsPublished, docsTarget, blogPosts, blogTarget }` | Flat KPI counts for `ContentOverview` |
| `ThemeItem` | `{ id, name, lastUpdated }` | Single theme entry in `ContentOverview` recent-themes mini list |
| `InfraItem` | `{ label, done, taskTitle? }` | Single infra checklist row; `taskTitle` used as native tooltip |
| `PhaseBlock` | `{ id, name, subtitle, status, progressPct, estimatedWeeks, isCurrent?, href }` | One phase card in `PhaseTimeline`; defined in `components/PhaseTimeline.tsx` |

### phases.json Schema

**Project-level fields:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Project name |
| `started` | `string` (ISO date) | Project start date |
| `targetLaunch` | `string` (ISO date) | Target launch date |
| `currentPhase` | `number` | Index of the active phase (0–6) |
| `phases` | `Phase[]` | Array of 7 phase objects |

**Task fields (inside each phase):**

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique task ID, e.g. `P0-T1` |
| `phase` | `number` | Phase index this task belongs to |
| `title` | `string` | Short task title |
| `status` | `string` | `todo` \| `in-progress` \| `done` \| `blocked` |
| `app` | `string` | Target app: `portal`, `dashboard`, `support`, `studio`, `admin`, `api`, `command-center`, `ui`, `infra` |
| `group` | `string` | Logical task group within the phase |
| `description` | `string` | Full task description |

### ADR Files (workplan/adr/)

22 ADR Markdown files live in `workplan/adr/`. All are hand-edited and use V2 frontmatter (`version: 2`).

**V2 Frontmatter Schema:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Numeric string, e.g. `"1"` |
| `title` | `string` | Human-readable ADR title |
| `version` | `number` | Always `2` for V2 files |
| `status` | `string` | `active` \| `accepted` \| `superseded` |
| `category` | `string` | See category list below |
| `relatedADRs` | `number[]` | IDs of related ADRs |
| `supersededBy` | `number \| null` | ADR that supersedes this one |
| `date` | `string` (ISO date) | Decision date |

**Categories:**

| Category | ADRs |
|----------|------|
| `core` | 001, 002, 003 |
| `access` | 004, 005, 006 |
| `tech-stack` | 007, 008 |
| `product` | 009, 010, 015 |
| `roles-security` | 011, 012, 013 |
| `tooling` | 014, 016, 017 |
| `data-future` | 018, 019, 020, 021, 022 |

**All 22 V2 filenames:**

```
001-unified-portal.md
002-elementor-only.md
003-themeforest-exclusive.md
004-elements-users.md
005-entitlement-based-access.md
006-activation-flow.md
007-split-stack.md
008-structured-content-supabase.md
009-component-theme-pages.md
010-design-system-shadcn.md
011-five-roles-six-apps.md
012-security-architecture.md
013-ai-support-agent.md
014-content-studio.md
015-search-first-homepage.md
016-seo-ai-discovery.md
017-monorepo-nx.md
018-supabase-backbone.md
019-orchestrator-role.md
020-database-schema.md
021-subscription-architecture.md
022-auth-api-dataflow.md
```

### Content Model

There is **no `/content` directory**. Structured content (themes, docs, blog posts) lives in Supabase PostgreSQL tables per **ADR-008** (`008-structured-content-supabase.md`). The old `content/schemas/` JSON Schema files have been replaced by **Zod schemas** in `packages/validators` (`@cmsmasters/validators`).

---

## Scanner CLI

The Scanner CLI consists of one library module and two CLI entry points. All scripts use `npx tsx` — no build step required. Run all commands from the monorepo root.

### lib/scanner.ts

A reusable TypeScript module at `apps/command-center/lib/scanner.ts` with three exported async functions.

**Exported types:**

| Type | Description |
|------|-------------|
| `ComponentLayer` | `'primitives' \| 'domain' \| 'layouts'` |
| `ComponentEntry` | `{ name, layer, hasStory, hasTest }` |
| `ComponentScanSummary` | `{ entries, counts, total }` |
| `ContentScanResult` | `{ source, themes, docs, counts }` |
| `ScannerApp` | `App \| 'api'` — extends `types.ts` App union with `'api'` |
| `ProgressScanResult` | `{ phases, byApp, overallPercent }` |

**Exported functions:**

| Function | Return type | Description |
|----------|-------------|-------------|
| `scanComponents()` | `Promise<ComponentScanSummary>` | Scans `packages/ui/src/{primitives,domain,layouts}` for `.tsx` files; checks for co-located `.stories.tsx` and `.test.tsx`/`.spec.tsx` |
| `scanContent(useSupabase?)` | `Promise<ContentScanResult>` | Queries Supabase `themes` and `docs` tables when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` env vars are set; returns placeholder with empty arrays otherwise |
| `calculateProgress()` | `Promise<ProgressScanResult>` | Reads `workplan/phases.json` and aggregates task counts per phase and per app |

All three functions return empty/placeholder results on missing files or network failures — never throw.

### cli/scan.ts

Entry point: `apps/command-center/cli/scan.ts`
npm script: `cc:scan` → `npx tsx apps/command-center/cli/scan.ts`

Self-contained CLI that reads `workplan/phases.json` synchronously and writes three JSON output files. Scanner logic is implemented inline (independent from `lib/scanner.ts`).

**What it scans:**

- Tasks from `workplan/phases.json` → component inventory (one entry per task)
- Per-app task groups per phase → content status entries tagged `'blog'` or `'doc'`
- Task status counts per phase → progress metrics

**Output files written to `workplan/`:**

| File | Top-level keys | Description |
|------|----------------|-------------|
| `components.json` | `lastScanned`, `components[]` | One entry per task; maps task status to `ComponentStatus` |
| `content-status.json` | `lastScanned`, `entries[]` | One entry per app per phase; includes `type: 'blog' \| 'doc'` |
| `progress.json` | `lastUpdated`, `phases[]` | Per-phase `tasksDone`, `tasksInProgress`, `tasksBlocked`, `percentComplete` |

**Console output:**

```
→ Scanning components...
✓ components done (Xms)
→ Scanning content...
✓ content done (Xms)
→ Calculating progress...
✓ progress done (Xms)
Scan complete in X.XXs
```

Exit code `0` on success, `1` if `phases.json` is missing or unreadable (caught by the outer handler). All three scan steps share a single error boundary — if `phases.json` is unreadable, all steps fail and only the error message is logged. Output files are overwritten on every run — do not edit by hand.

### cli/report.ts

Entry point: `apps/command-center/cli/report.ts`
npm script: `cc:report` → `npx tsx apps/command-center/cli/report.ts`

Reads the four workplan JSON files and prints a formatted ASCII progress report to `stdout`. Falls back to `phases.json` data when `progress.json` is missing.

**Input files:**

| File | Required | Fallback |
|------|----------|----------|
| `workplan/phases.json` | Yes | Exits with error |
| `workplan/progress.json` | No | Recomputes stats from `phases.json` |
| `workplan/components.json` | No | Shows `0/0/0` for component layer counts |
| `workplan/content-status.json` | No | Shows `0` for all content counts |

**Report sections:**

| Section | Description |
|---------|-------------|
| OVERALL | Total done/total tasks and percentage |
| CURRENT PHASE | Active phase title and completion percentage |
| BY PHASE | Per-phase 10-char ASCII progress bar (`█░`), task counts, percentage |
| CONTENT | themes count, approved docs count, blog posts count (separate lines) |
| COMPONENTS | Count by layer: primitives / domain / layouts |
| BLOCKED | Each blocked task with dependency names (from `dependencies` or `blockedBy` fields) |

Exit code `0` in all cases. If `phases.json` is missing, an error message is written to stdout and the process exits cleanly (code `0`). Only an unhandled exception produces exit code `1`.

---

## lib/utils.ts

Five pure utility functions exported from `apps/command-center/lib/utils.ts`. Zero external dependencies.

| Function | Signature | Description |
|----------|-----------|-------------|
| `formatDate` | `(iso: string) => string` | Formats ISO date to `Mon DD, YYYY` via `Intl.DateTimeFormat` |
| `formatHours` | `(decimal: number) => string` | Formats decimal hours to `Xh Ym`, omitting zero units |
| `calculateProgress` | `(done: number, total: number) => number` | Returns integer percentage (0 when total is 0) |
| `getRelativeTime` | `(iso: string) => string` | Returns human-readable relative time (`5m ago`, `2d ago`, etc.) |
| `groupBy` | `<T>(array: T[], key: keyof T) => Record<string, T[]>` | Groups array items by any key |

---

## Monorepo Packages

Build system: **Nx** with **pnpm workspaces** (per ADR-017: `017-monorepo-nx.md`).

| Package | Name | Purpose |
|---------|------|---------|
| `packages/ui` | `@cmsmasters/ui` | Shared UI components |
| `packages/db` | `@cmsmasters/db` | Database client (Supabase) |
| `packages/auth` | `@cmsmasters/auth` | Auth utilities + entitlement resolvers |
| `packages/validators` | `@cmsmasters/validators` | Shared Zod schemas (replaces JSON Schema) |
| `packages/email` | `@cmsmasters/email` | Email templates |
| `packages/api-client` | `@cmsmasters/api-client` | Typed Hono RPC client (`hono/client`) |

---

## Conventions

- **TypeScript strict mode** — no `any`, explicit return types on exported functions
- **Functional components only** — no class components
- **PascalCase** components, **camelCase** functions/variables
- **Server Components by default** — `'use client'` only when needed
- **No default exports** except Next.js page files (`layout.tsx`, `page.tsx`)
- **Monospace font** for all numbers, IDs, timestamps (`font-mono`)
- **Outcome-based naming** — files named by what they show, not what they do
