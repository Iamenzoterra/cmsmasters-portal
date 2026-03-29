---
name: cmsmasters-portal
description: CMSMasters Portal project context and navigation. Use this skill whenever working on the cmsmasters-portal monorepo — creating specs, writing code, reading files, syncing Figma tokens, reviewing architecture, planning sprints, or answering questions about the project. Triggers: any mention of 'portal', 'cmsmasters', 'theme page', 'admin app', 'studio', 'dashboard', 'command center', 'ADR', 'tokens', 'Supabase', 'Hono API', 'Layer 0/1/2/3', design system, or references to files in c:\work\cmsmasters portal\.
---

# CMSMasters Portal — Desktop App Skill

## When to use

Any time Dmitry asks about the CMSMasters Portal project. This includes:
- Planning, specs, sprint work
- Architecture questions, ADR review
- Writing code or reviewing PRs
- Figma token sync
- Creating context files for Claude Code agents
- Checking project status or progress

## Project in one paragraph

CMSMasters is a Ukrainian WordPress theme company (Power Elite on ThemeForest, 95K+ customers, 65+ Elementor themes, founded by Dmitry Smielov). The Portal project replaces 4 fragmented domains with one unified platform. Split-stack: Next.js SSG (public portal) + 4× Vite SPA (Dashboard, Support, Studio, Admin) + Hono API on Cloudflare Workers. Nx monorepo. Supabase for DB + Auth + RLS. Design system via shadcn/ui with Figma-synced tokens.

## File locations

### Monorepo
```
c:\work\cmsmasters portal\app\cmsmasters-portal\
```

### Context folder (for AI agents)
```
c:\work\cmsmasters portal\app\cmsmasters-portal\.context\
├── BRIEF.md          — Full project overview, architecture, state
├── ADR_DIGEST.md     — 22 ADR decisions condensed
├── LAYER_0_SPEC.md   — Current task: infrastructure spec
├── CONVENTIONS.md    — Code style, tokens, patterns
├── ROADMAP.md        — Layers 1–3 specs
└── SKILL.md          — How the context system works
```

### Key project files
```
CLAUDE.md                              — Agent instructions (entry point for Claude Code)
docs/ARCHITECTURE.md                   — Full architecture doc (~48 KB)
docs/FIGMA_SYNC_INSTRUCTIONS.md        — Figma → tokens.css pipeline
packages/ui/src/theme/tokens.css       — Design tokens (auto-generated from Figma)
packages/ui/src/primitives/button.tsx   — First primitive component
workplan/adr/ (22 files)               — Full ADR texts
workplan/phases.json                   — Project tasks and statuses
```

### Reference docs (outside monorepo)
```
c:\work\cmsmasters portal\
├── ADR_Bible_CMSMasters_Portal-v2.md  — Full ADR Bible (latest V2)
├── Grand_Workplan_CMSMasters_Portal (1).md — Original Grand Workplan V1
├── SPEC_Command_Center.md             — CC spec (completed)
├── shadcn-map.md                      — shadcn component mapping
├── Overview Dashboard.png             — Admin dashboard design reference
├── My Themes — Customer Dashboard.png — Dashboard design reference
├── My Account — Customer Dashboard.png — Dashboard design reference
```

## Architecture (quick reference)

```
Portal (Next.js SSG, public)  ─┐
Dashboard (Vite SPA, auth)    ─┤
Studio (Vite SPA, auth)       ─┼─→ packages/ui, db, auth, api-client, validators
Admin (Vite SPA, auth)        ─┤
Support (Vite SPA, deferred)  ─┘
                                │
        ┌───────────────────────┤
        ▼                       ▼
  Supabase (90%)          Hono API (10%)
  anon key + RLS          CF Workers + secrets
  CRUD, reads, realtime   Envato, email, AI, R2
```

**Secrets boundary rule:** Envato key, Resend key, Claude API key, R2 creds, Supabase service_role — ONLY in Hono API. Never in SPA bundles.

## Current state (update this section as work progresses)

### Done ✅
- Nx monorepo configured
- Command Center (6 pages, localhost:4000, own dark theme)
- Design system tokens (tokens.css, 222 lines from Figma MCP)
- Design system structure (Three-Layer: primitives → domain → layouts)
- Button primitive + stories
- 22 ADR files (V2/V3 aligned)
- Homepage wireframe (10 sections)
- .context/ folder with full agent context

### Current task: Layer 0 — Infrastructure
- Supabase schema (4 tables: profiles, themes, licenses, audit_log)
- Auth package (PKCE + magic link + route guards)
- Hono API skeleton (CF Workers, JWT middleware)
- Shared packages (db, auth, api-client, validators)

### Next: Layers 1–3
- Layer 1: Studio (theme CRUD form → Supabase)
- Layer 2: Portal /themes/[slug] (SSG from Supabase)
- Layer 3: Dashboard + Admin (parallel)

### Deferred
- Support App + AI chat
- Envato API verification
- Activation flow (WP → Portal)
- Homepage (10 sections), blog, docs, search

## Key ADR decisions

| ADR | Decision |
|-----|----------|
| 007 V2 | Split-stack: Next.js SSG + Vite SPAs + Hono API |
| 008 V2 | Content in Supabase (not Git files) |
| 010 V2 | Three-Layer DS: Primitives → Domain → Layouts |
| 017 V3 | Nx monorepo (not Turborepo) |
| 022 | Hono API on CF Workers holds all secrets |
| 005 V2 | Entitlement-based access (facts → resolvers) |
| 011 V3 | 5 separate apps, different frameworks per role |

## Figma files

| File | Key | Contents |
|------|-----|----------|
| CMS DS Portal (shadcn Obra) | `PodaGqhhlgh6TLkcyAC5Oi` | semantic colors (light+dark), radii, spacing |
| Portal DS (CMSMasters) | `CLtdO56o9fJCx19EnhH1nI` | brand colors, Bg/Text/Border/Button/Tag semantics |

Token sync: `Figma:use_figma` MCP Plugin API (not REST — needs Enterprise). Say "sync tokens" to trigger.

## Working with this project in desktop Claude

### Reading project files
Use `Windows-MCP:FileSystem` with mode `read` and the full path.

### Creating/updating specs
Write to `.context/` folder for agent-consumable specs. Write to `workplan/` for project tracking.

### Figma operations
Use `Figma:use_figma` with the file keys above. For design context, use `Figma:get_design_context`.

### Reviewing architecture
Read `.context/ADR_DIGEST.md` first. If deeper context needed, read specific ADR from `workplan/adr/`.

### Planning sprints
Read `.context/BRIEF.md` for current state, `.context/ROADMAP.md` for what's next. Update BRIEF.md when layers complete.

## Communication notes

Dmitry communicates concisely in Ukrainian. Corrections are brief — reorient immediately. Eugene (CTO/partner) participates in architectural review. Claude Code agents handle tactical tasks. This desktop app handles strategy, planning, specs, Figma, and orchestration.
