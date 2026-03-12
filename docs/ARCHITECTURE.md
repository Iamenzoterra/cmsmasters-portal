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
│   └── Sidebar.tsx             # Navigation sidebar
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
