# Command Center — Architecture

## Overview

Command Center is the first app in the CMSMasters Portal monorepo. It is an internal dashboard that provides visibility into the 7-phase build of the portal platform. Zero API, zero database — all data comes from the filesystem.

---

## File Structure

```
apps/command-center/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Root layout (async): fonts, body bg, server-side search index, Sidebar + GlobalSearch
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
│   │   ├── page.tsx            # Architecture (/architecture)
│   │   ├── ArchitectureTabs.tsx # Client tab switcher: ADR Bible · Grand Workplan · Tech Stack
│   │   └── [id]/
│   │       └── page.tsx        # ADR Detail (/architecture/[id])
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
│   ├── TaskBrowser.tsx         # Phase Tracker — client composition: filter state + TaskFilters + TaskTable (flat tasks input)
│   ├── TasksView.tsx           # Phase Tracker — client composition: filter state + TaskFilters + TaskTable (Phase[] input)
│   ├── PhaseTrackerClient.tsx  # Phase Tracker — client composition root: owns filter state + selectedTask, renders TaskFilters + PhaseCard grid + TaskDetailSheet
│   ├── BurndownChart.tsx       # Phase Detail — Recharts AreaChart showing cumulative completed-task count over time
│   ├── ComponentCard.tsx       # Components page — card showing name, layer badge, status badge, app
│   ├── ADRViewer.tsx           # Architecture page — client two-panel ADR browser with search and markdown rendering
│   ├── ThemeStatusTable.tsx    # Content page — client table with search, filter, status dots, and slide-out detail panel
│   ├── DependencyGraph.tsx     # Dependencies page — SVG package/phase dependency viewer with two tabs
│   └── GlobalSearch.tsx        # Global command palette — Cmd/Ctrl+K overlay with type-grouped results
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
| `TasksView` | `'use client'` | Alternative client composition root: owns `TaskFilterState` via `useState`; accepts `Phase[]` directly and flattens tasks internally; renders `TaskFilters` + `TaskTable`; does not use `useMemo` | `TasksViewProps { phases: Phase[] }` |
| `PhaseTrackerClient` | `'use client'` | Primary composition root for the Phase Tracker page: owns `TaskFilterState` and `selectedTask` via `useState`; flattens all tasks via `useMemo`; computes per-phase filtered lists via `useCallback`; renders page header + `TaskFilters` + `PhaseCard` grid + `TaskDetailSheet` wired together | `PhaseTrackerClientProps { project: Project }` |
| `BurndownChart` | `'use client'` | Recharts `AreaChart` wrapped in `ResponsiveContainer` (160px height); groups tasks by `completedAt` date and builds cumulative completion data points via `buildCumulativeData()`; shows empty-state paragraph when no completion dates recorded | `BurndownChartProps { tasks: Task[] }` |

### Mission Control Components (`components/`)

| Component | Directive | Purpose | Props | Navigates to |
|-----------|-----------|---------|-------|--------------|
| `PhaseTimeline` | `'use client'` | Horizontal strip of 7 phase blocks with ChevronRight connectors; active phase gets ring glow | `PhaseTimelineProps { phases: PhaseBlock[], overallLabel: string }` | `/phases/[id]` (via Next.js `Link`) |
| `AppCard` | `'use client'` | Per-app status card: bold name, truncated description, color-coded status dot | `AppCardProps { app: AppCardApp }` | `app.href` (caller encodes `/phases?app=<id>`) |
| `DesignSystemProgress` | `'use client'` | Three stacked progress bars for Primitives / Domain / Layouts layers; each row is clickable | `DesignSystemProgressProps { layers: LayerRow[] \| null }` | `/components?layer=<layer>` (via `useRouter`) |
| `ContentOverview` | `'use client'` | Three KPI tiles (Themes, Docs, Blog Posts) as fraction + ProgressBar; mini list of up to 5 recent themes | `ContentOverviewProps { metrics: ContentMetrics, recentThemes: ThemeItem[] }` | `/content` (whole-card `useRouter().push`) |
| `InfraChecklist` | Server Component | Infra readiness checklist in a Card; CheckCircle2 (done) / Circle (pending) Lucide icons | `InfraChecklistProps { items: InfraItem[] \| null }` | No navigation |
| `ActivityFeed` | `'use client'` | Top-10 recent task events sorted by timestamp; status icons (CheckCircle / Loader2 / XCircle) | `{ tasks: Task[] }` | `/phases?task={id}` (on row click) |

### Page-Specific Components (`components/`)

| Component | Directive | Purpose | Props interface |
|-----------|-----------|---------|-----------------|
| `ComponentCard` | `'use client'` | Card for a single component entry on the Components page: displays name, description (truncated), layer badge (Primitives/Domain/Layouts — color-coded), status badge, and app label in monospace | `{ comp: EnrichedComponent }` (defined inline in `app/components/page.tsx`) |
| `ADRViewer` | `'use client'` | Two-panel ADR browser: left sidebar (`w-72`) lists all 22 ADRs grouped by the 7 V2 categories with a search `Input`; grouping is built via inline `useMemo` (not `groupBy` util) — each ADR's `category` field is the key; sidebar sections render in `CATEGORY_ORDER` = `['core','access','tech-stack','product','roles-security','tooling','data-future']`; within each section ADRs are sorted by numeric ID (`.toSorted((a, b) => Number(a.id) - Number(b.id))`); section headings use `CATEGORY_LABELS` map (e.g. `'roles-security'` → `'Roles & Security'`, `'data-future'` → `'Data & Future'`); right panel renders the selected ADR's full markdown via `react-markdown + remark-gfm`; clicking a related ADR button (`relatedADRs[]`) navigates within the viewer; search filters by title and body | `ADRViewerProps { adrs: ADRMetaWithBody[] }` |
| `ThemeStatusTable` | `'use client'` | Searchable, filterable table of theme entries: columns — status dot, name, docs count, plugins count, features count, hero image indicator, last updated; toolbar has a text search input and a `DotColor` filter dropdown (`all`/`green`/`yellow`/`red`); clicking a row opens a 480px slide-out detail panel with status badge, content counts, hero image, last updated, and Supabase link placeholder; `ThemeEntryStatus` values are `'empty' \| 'draft' \| 'published'`; `computeDotColor()` derives dot color: **green** = `status === 'published' && docsCount >= 5 && hasHeroImage`, **yellow** = `status === 'draft' && (docsCount > 0 \|\| pluginsCount > 0 \|\| featuresCount > 0)`, **red** = all other cases | `ThemeStatusTableProps { themes: ThemeEntry[] }` where `ThemeEntry = { slug, name, status: ThemeEntryStatus, docsCount, pluginsCount, featuresCount, hasHeroImage, lastUpdated }` |

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

## Root Layout

`app/layout.tsx` — shared root layout wrapping all routes. An **async** Server Component.

**Data loading:** Four sources fetched in parallel via `Promise.all`:

| Source | Function | Used for |
|--------|----------|----------|
| Phase data | `getPhases()` | Task entries in the global search index |
| Component data | `getComponents()` | Component entries in the global search index |
| Content data | `getContentStatusEntries()` | Theme entries in the global search index |
| ADR list | `getADRList()` | ADR entries in the global search index |

**Search index construction:** A flat `SearchItem[]` array is assembled from all four sources:

| Type | Derived from | `name` | `context` | `href` |
|------|-------------|--------|-----------|--------|
| `task` | `project.phases[].tasks[]` | `task.title` | `Phase {n} • {status}` | `/phases/{phase.id}` |
| `component` | `components[]` | `comp.name` | `comp.description` | `/components` |
| `theme` | `contentData.recentThemes[]` | `theme.name` | `Last updated: {date}` | `/content` |
| `adr` | `adrs[]` | `adr.title` | `{status} • {date}` | `/architecture` |

The assembled `searchIndex` is passed as a prop to `GlobalSearch`, which filters entirely client-side.

**Render tree:**

```
<html lang="en" className="dark">
  <head>
    <link> — LINE Seed JP from Google Fonts
  </head>
  <body className="... bg-surface-app text-text-primary">
    <GlobalSearch searchIndex={searchIndex} />   ← always mounted, hidden when closed
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto px-8 py-6">
        {children}
      </main>
    </div>
  </body>
</html>
```

---

## Pages (App Router Routes)

| Route | File | Description |
|-------|------|-------------|
| `/` | `app/page.tsx` | Mission Control — top-level project status |
| `/phases` | `app/phases/page.tsx` | Phase Tracker — all 7 phases overview |
| `/phases/[id]` | `app/phases/[id]/page.tsx` | Phase Detail — single phase drill-down |
| `/components` | `app/components/page.tsx` | Design system atom showcase |
| `/content` | `app/content/page.tsx` | Content overview |
| `/architecture` | `app/architecture/page.tsx` | Architecture overview — ADR Bible, Grand Workplan, Tech Stack tabs |
| `/architecture/[id]` | `app/architecture/[id]/page.tsx` | ADR Detail — full content of a single ADR |
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

`app/phases/page.tsx` — the `/phases` route. A pure async Server Component. Reads `phases.json` via `getPhases()`, parses URL search params (Next.js 15 Promise-based `searchParams`), filters tasks server-side, and renders a grid of collapsible phase cards with an optional inline task detail panel.

```
┌──────────────────────────────────────────────────────────────┐
│  Filter bar: status chip <Link> toggles + <form> search      │
├──────────────────────────────────────────────────────────────┤
│  Phase cards grid (expandable <details> per phase)           │
│  ┌─────────────────────┐  ┌─────────────────────┐           │
│  │  Phase 0 ▼          │  │  Phase 1 ▶           │           │
│  │  ████████░░ 80%      │  │  ░░░░░░░░ 0%         │           │
│  │  [task rows…]        │  │                     │           │
│  └─────────────────────┘  └─────────────────────┘           │
├──────────────────────────────────────────────────────────────┤
│  Inline task detail panel (URL ?task=id — server-rendered)   │
└──────────────────────────────────────────────────────────────┘
```

### Component Breakdown

| Panel | Component | Props / State | Data source |
|-------|-----------|---------------|-------------|
| Filter bar | Inline `<Link>` chips + `<form method="get">` | URL params `statuses`, `search` — server-driven, zero JS | URL query string |
| Phase cards | `<details>`/`<summary>` HTML (native expand) | `open` attribute — in-progress phases expanded by default | `getPhases()` |
| Phase progress | `ProgressBar` (per card) | `{ value: donePct }` | derived from `phase.tasks` |
| Phase task rows | Inline `<table>` (5 cols: ID, Status, Title, Owner, Priority) | server-filtered via `filterTasks()` helper | URL-filtered `phase.tasks` |
| Task detail panel | Inline HTML panel with `@starting-style` slide-in | opens when `?task=id` URL param is present | `allTasks.find(id)` |

### Filter System

The page uses **URL-param SSR filtering** only — no client-side filter state:

- `statuses` query param — comma-separated status values (e.g. `done,in-progress`); drives server-side `filterTasks()` call for each phase card's task list
- `search` query param — text search on task title and ID; submitted via `<form method="get">` with a hidden `statuses` input to preserve active status chips
- `task` query param — task ID; causes the inline task detail panel to be server-rendered for the selected task
- Status chips are `<Link>` elements that toggle a status in/out of the `statuses` param — zero JS
- Chevron rotation uses `group-open:rotate-180` via Tailwind `group` on `<details>` — zero JS required
- Clearing all filters navigates to `?` (empty query string)

### Task Detail Panel (inline server implementation)

The `/phases` page renders the task detail panel **inline as a Server Component** — it does not use the `TaskDetailSheet` client component. When `?task=id` is set:

- A fixed backdrop `<Link>` navigates to `buildHref({ task: null }, ...)` to close
- A fixed right panel renders task fields (title, status, owner, app, priority, hours, description, acceptance criteria, dependencies, notes, timestamps)
- **Open animation:** `@starting-style` CSS rule sets `transform: translateX(100%)` before first paint; then transitions to `translateX(0)` via inline `<style>` tag (scoped to `.task-detail-sheet` class — no Tailwind equivalent)
- Closing navigates via URL, not JavaScript

### TaskDetailSheet Component (standalone reusable)

`TaskDetailSheet` (`components/TaskDetailSheet.tsx`) is a standalone `'use client'` component usable outside the `/phases` page:

- **Open:** `translate-x-0` — panel slides in from the right
- **Closed:** `translate-x-full` — panel is off-screen
- **Backdrop:** fixed overlay behind the panel; click closes via `onClose()`
- **Keyboard:** `useEffect` adds `keydown` listener; `Escape` fires `onClose()`
- Controlled by whether `task` prop is non-null (`task === null` → closed)

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
│  Columns: ID · Status · Title · Priority · Hours             │
└──────────────────────────────────────────────────────────────┘
```

| Section | Implementation | Notes |
|---------|---------------|-------|
| Burndown chart | `BurndownChart` client component (`components/BurndownChart.tsx`) — Recharts `AreaChart` with cumulative completed-task data | Replaces earlier `buildBurndownSVG()` SVG approach; requires client bundle |
| Blocked tasks | Resolves dependency titles from `allTasks`; done/not-done colored dots | Uses `project?.phases.flatMap()` for null safety |
| Task table | `<table>` grouped by `task.app`; app groups sorted alphabetically via `.toSorted()` | Columns: ID, Status (`StatusBadge`), Title, Priority, Est. Hours |

---

## Components Page

`app/components/page.tsx` — the `/components` route. A pure async Server Component. Reads `workplan/components.json` via `getComponents()`, enriches each entry with a derived `LayerName` (Primitives/Domain/Layouts via keyword matching), `hasStory`, and `hasTests` (both proxied from `status === 'done'`), applies URL-param filters, and renders one of three views. All navigation is done via `<Link>` elements — zero client-side state.

```
┌────────────────────────────────────────────────────────────┐
│  Tab bar: Grid View · List View · Coverage View            │
│  Filter bar: layer chips (All/Primitives/Domain/Layouts)   │
│              toggle chips (Has Story · Has Tests)          │
├────────────────────────────────────────────────────────────┤
│  Grid View:    ComponentCard cards grouped by layer        │
│  List View:    sortable table (Name/Layer/Story/Tests/…)   │
│  Coverage View: three DonutCharts (Stories/Tests/App Usage)│
└────────────────────────────────────────────────────────────┘
```

### URL Parameters

| Param | Values | Default | Effect |
|-------|--------|---------|--------|
| `view` | `grid` \| `list` \| `coverage` | `grid` | Which view to render |
| `layer` | `all` \| `Primitives` \| `Domain` \| `Layouts` | `all` | Layer filter |
| `story` | `0` \| `1` | `0` | Filter to components with stories only |
| `tests` | `0` \| `1` | `0` | Filter to components with tests only |
| `sort` | `name` \| `layer` \| `usedBy` | `name` | List view sort column |
| `dir` | `asc` \| `desc` | `asc` | List view sort direction |

### View Breakdown

| View | Implementation | Notes |
|------|---------------|-------|
| Grid View | `GridView` — `ComponentCard` cards in a 3-col responsive grid, grouped by layer | Uses derived `LayerName` buckets |
| List View | `ListView` — `<table>` with `SortHeader` links for Name/Layer/UsedBy columns | Sorted via `Array#toSorted()` |
| Coverage View | `CoverageView` — three `DonutChart` atoms for story, test, and app-usage percentages | Counts derived from `hasStory`/`hasTests`/`dependencies.length` |

Empty state (card with guidance text) shown when `components.json` is missing or returns `null`.

---

## Content Page

`app/content/page.tsx` — the `/content` route. An async Server Component. Reads `workplan/content-status.json` directly via `fs.readFile` (not through `lib/data.ts`), derives KPI metrics, delegates theme rows to `ThemeStatusTable`, and checks `packages/validators/src/*.ts` for Zod schema file existence. Empty state shown when the file is missing or `source === 'placeholder'`.

```
┌──────────────────────────────────────────────────────────┐
│  KPI Grid (3 cards): Themes · Docs · Blog Posts          │
│  Each card: monospace fraction + ProgressBar             │
├──────────────────────────────────────────────────────────┤
│  Theme Status section: ThemeStatusTable                  │
├──────────────────────────────────────────────────────────┤
│  Zod Schemas checklist (packages/validators/src/*.ts)    │
│  CheckCircle2 (exists) / Circle (missing) per file       │
└──────────────────────────────────────────────────────────┘
```

### Component Breakdown

| Panel | Component / Implementation | Data source |
|-------|---------------------------|-------------|
| KPI cards | Inline `<a href="#section">` anchors wrapping `Card` + `ProgressBar` | Derived from `content-status.json` entries |
| Theme Status | `ThemeStatusTable` | `buildThemeEntries()` helper transforms `ContentStatus[]` → `ThemeEntry[]`, grouping by `themeId` |
| Schema checklist | `Promise.all(fs.access())` per file in `SCHEMA_FILES` | `packages/validators/src/` — checks `theme.ts`, `doc.ts`, `blog-post.ts`, `plugin.ts`, `collection.ts` |

### Data Transform

`buildThemeEntries(entries: ContentStatus[]): ThemeEntry[]` — groups entries by `themeId` into a `Map`, accumulates `docsCount`, picks the most recent `updatedAt` as `lastUpdated`, maps status via `mapStatus()` (`'published'/'approved'` → `'published'`, `'empty'` → `'empty'`, else `'draft'`). Result is sorted alphabetically by `slug`.

---

## Architecture Page

`app/architecture/page.tsx` — the `/architecture` route. An async Server Component. Loads all 22 ADRs via `getADRList()` + `getADRContent()` (falling back to `{ ...meta, body: '' }` for any failed parse), reads the Grand Workplan markdown file with a try/catch fallback to `null`, and passes everything to `ArchitectureTabs`.

```
┌──────────────────────────────────────────────────────────┐
│  Tab bar: ADR Bible · Grand Workplan · Tech Stack        │
├──────────────────────────────────────────────────────────┤
│  ADR Bible tab:      ADRViewer (two-panel client browser) │
│  Grand Workplan tab: ReactMarkdown render of .md file     │
│                      (empty state when file not found)    │
│  Tech Stack tab:     2×2 grid of layer cards              │
│                      (Frontend/Data/Services/Infra)       │
└──────────────────────────────────────────────────────────┘
```

### ArchitectureTabs (`app/architecture/ArchitectureTabs.tsx`)

`'use client'` component. Owns `activeTab: ActiveTab` state via `useState` (values: `'adr' | 'workplan' | 'techstack'`). Tab buttons call `setActiveTab()` on click.

| Tab | Content |
|-----|---------|
| ADR Bible | `<ADRViewer adrs={adrs} />` — full two-panel browser |
| Grand Workplan | `<ReactMarkdown remarkPlugins={[remarkGfm]}>` with full component mapping (h1–h4, p, code, pre, a, table, ul, ol, li, blockquote, hr, strong); empty state shows missing file path |
| Tech Stack | 2-column grid of `TechStackLayer` cards — each card has a category heading and a list of `{ name, description }` items |

Props: `ArchitectureTabsProps { adrs: ADRMetaWithBody[], workplanMarkdown: string | null, workplanPath: string, techStackLayers: TechStackLayer[] }`

Exports: `TechStackItem` interface, `TechStackLayer` interface, `ArchitectureTabs` component.

### Tech Stack Layers (hardcoded in `page.tsx`)

| Layer | Key items |
|-------|-----------|
| Frontend | Next.js 15, React 19, Tailwind CSS 4, Recharts, Lucide React, react-markdown |
| Data | JSON files in workplan/, Markdown ADRs in workplan/adr/, Node.js fs, Zero database |
| Services | cc:scan, cc:report, cc:dev |
| Infrastructure | Nx Monorepo, TypeScript strict mode, Localhost port 4000, No auth |

---

## Architecture Detail Page (`/architecture/[id]`)

`app/architecture/[id]/page.tsx` — the ADR drill-down route. A pure async Server Component. Awaits `params` (Next.js 15 Promise-based), calls `getADRContent(id)`, and renders the full ADR.

```
┌──────────────────────────────────────────────────────────┐
│  ← Back to ADRs link                                     │
│  ADR-NNN  vX  <status>  <category>  <date>               │
│  Title                                                    │
├──────────────────────────────────────────────────────────┤
│  Card body: rendered markdown via renderMarkdown()        │
│  Supports: h1/h2/h3, li (disc), p, blank-line spacer     │
│  Inline bold via inlineBold() (**text** → <strong>)       │
└──────────────────────────────────────────────────────────┘
```

| Section | Implementation | Notes |
|---------|---------------|-------|
| Metadata header | Inline flex row — `ADR-NNN` monospace, version blue pill, status green pill, category zinc pill, date via `formatDate()` | All pills are `text-[10px]` colored rounded-md spans |
| Card body | `renderMarkdown(body)` — splits body on `\n`, maps each line to a React element by prefix (`###`, `##`, `#`, `- `, blank, else `<p>`) | No external markdown parser — lightweight inline renderer |
| Inline bold | `inlineBold(text)` — regex-replaces `**text**` with `<strong>` nodes in a `ReactNode[]` | Used by all renderMarkdown line types |
| Not-found state | Back link + `"ADR not found"` heading when `getADRContent()` returns `null` | Graceful degradation for invalid IDs |

---

## Dependencies Page

`app/dependencies/page.tsx` — the `/dependencies` route. An async Server Component.

**Data loading:** Two sources fetched in parallel via `Promise.all`:

| Source | Function | Returns |
|--------|----------|---------|
| Phase blocks | `getPhaseBlocks()` | `PhaseBlock[] \| null` |
| Dependency graph | `loadDependencyGraph()` | `{ packages, apps, edges, foundCount, totalExpected, isFallback }` |

**States:**

| Condition | UI |
|-----------|-----|
| `phaseData === null && graphData.foundCount === 0` | Centered empty-state card — instructions to run `cc:scan` or create `package.json` files |
| `graphData.isFallback` | Amber left-bordered notice showing `{foundCount}` of `{totalExpected}` package.json files found |
| Normal | Page header with phase count subtitle + `DependencyGraph` client component |

The `DependencyGraph` client component receives `phases`, `packages`, `apps`, and `edges` and owns its own tab state.

### DependencyGraph (`components/DependencyGraph.tsx`)

`'use client'` component. Renders an SVG dependency visualization with two switchable tabs.

**Props:**

```ts
interface DependencyGraphProps {
  phases: PhaseBlock[];
  packages: PackageNode[];
  apps: AppNode[];
  edges: DependencyEdge[];
}
```

**Tab: Package Dependencies (default)**

900px-wide SVG. Packages column at x=20 (left), Apps column at x=720 (right). Edges are right-angle polylines routing through a midpoint at x=450. Clicking a node selects it: its connected edges become fully opaque, all others fade to 5% opacity. A tooltip card below the SVG lists "Affects:" (package nodes) or "Depends on:" (app nodes) with the related node labels.

**Tab: Phase Dependencies**

860×180px SVG. Phase bars are sized proportionally by `estimatedWeeks` relative to total weeks. Bar colors:

| Status | Fill | Stroke |
|--------|------|--------|
| `done` | green at 20% opacity | green |
| `in-progress` | blue at 20% opacity | blue |
| `todo` | zinc (opaque) | zinc |

A full-width "Content" track spans all phases below the phase bars. Arrow markers (`<marker id="arrow">`) connect consecutive phase bars when bar gap ≥ 4px. Empty-state paragraph shown when `phases.length === 0`.

All color values are derived from `tokens.ts` via module-level `COLOR_*` constants — no inline hex strings in SVG attributes.

---

## Global Search

`GlobalSearch` (`components/GlobalSearch.tsx`) — a `'use client'` command palette rendered in `app/layout.tsx`. Available on every page without re-mounting.

**Props:**

```ts
interface GlobalSearchProps {
  searchIndex: SearchItem[];
}
```

**Exported types:**

```ts
export type SearchItemType = 'task' | 'component' | 'theme' | 'adr';

export interface SearchItem {
  id: string;
  type: SearchItemType;
  name: string;     // display name (title row)
  context: string;  // subtitle / secondary info
  href: string;     // navigation target on click
}
```

**Keyboard triggers:**

| Key | Condition | Effect |
|-----|-----------|--------|
| `Cmd/Ctrl+K` | Any | Toggles open/closed |
| `/` | Focused element is not `input`, `textarea`, or `contenteditable` | Opens |
| `Escape` | Open | Closes and clears query |
| Backdrop click | Open | Closes and clears query |

**Behavior:**

- Fixed overlay (`z-50`) centered horizontally, positioned 15vh from the top with a `bg-black/60` backdrop.
- Auto-focuses the search input on open via `useEffect`.
- Filters `searchIndex` client-side via `useMemo`; matches on `item.name` or `item.context` (case-insensitive).
- Results grouped by type in `TYPE_ORDER = ['task', 'component', 'theme', 'adr']` order; each group capped at 5 items.
- "No results" message shown only when `query.trim() !== ''` to avoid false empties on initial open.
- On item click: `useRouter().push(item.href)` then close.
- Returns `null` (renders nothing) when closed — zero DOM overhead.

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
| `status` | `string` | `todo` \| `in-progress` \| `review` \| `done` \| `blocked` |
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
