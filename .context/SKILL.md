# CMSMasters Portal — Context & Navigation Skill

> **Trigger:** Any new conversation, any agent starting work on cmsmasters-portal, any question about "where are we", "what to do", "how does this project work".
> **Location:** `cmsmasters-portal/.context/`

---

## What this skill does

This skill teaches any AI agent how to orient itself in the CMSMasters Portal project. The project has a layered context system designed so that an agent with a limited context window can get full situational awareness in under 5 minutes without reading the entire codebase or all 22 ADRs.

---

## Context folder: `.context/`

All project context lives in **one folder** at the monorepo root: `cmsmasters-portal/.context/`

```
.context/
├── BRIEF.md          — Project overview, architecture, current state, people
├── ADR_DIGEST.md     — 22 architecture decisions condensed to what affects code
├── LAYER_0_SPEC.md   — Current task: infrastructure (Supabase, Auth, Hono, packages)
├── CONVENTIONS.md    — Code style, naming, token usage, Supabase/Hono patterns
└── ROADMAP.md        — Layers 1–3 specs (Studio, Portal, Dashboard, Admin)
```

**Total size: ~38 KB** — fits in any context window with room to spare.

---

## Reading order (mandatory)

### Step 1: BRIEF.md (always first)
Answers: What is this project? What's the architecture? What exists already? What's the current sprint? Who are the people?

An agent that reads only this file already knows:
- It's a unified customer platform for a WordPress theme company
- Split-stack: Next.js SSG + 4× Vite SPA + Hono API on CF Workers
- Nx monorepo with 6 apps and 6 shared packages
- Command Center is done, design system tokens exist, current task is Layer 0
- Secrets boundary rule (critical for security)

### Step 2: The spec for your current task
- **If building infrastructure** → `LAYER_0_SPEC.md` (SQL schema, RLS policies, auth package, Hono skeleton)
- **If building an app** → `ROADMAP.md` (specs for Studio, Portal, Dashboard, Admin)
- **If making architecture decisions** → `ADR_DIGEST.md` (condensed ADR decisions)

### Step 3: CONVENTIONS.md (before writing code)
Answers: How do we name things? How do tokens work in Tailwind v4? What are the Supabase patterns? How does Hono auth middleware work?

---

## How layers work

The project is built in layers. Each layer depends on the previous one:

```
Layer 0: Infrastructure    ← CURRENT TASK
  │  Supabase schema + RLS
  │  Auth package (PKCE + route guards)
  │  Hono API skeleton (CF Workers)
  │  Shared packages (db, auth, api-client, validators)
  │
  ├─→ Layer 1: Studio (creates data)
  │     Theme CRUD form → writes to Supabase
  │
  ├─→ Layer 2: Portal theme page (renders data)
  │     /themes/[slug] SSG from Supabase
  │
  └─→ Layer 3: Dashboard + Admin (parallel)
        Dashboard: user profile, my themes
        Admin: user management, audit log
```

When Layer 0 is done, update `BRIEF.md` to say "Layer 0 ✅ DONE, current task: Layer 1" and swap `LAYER_0_SPEC.md` for `LAYER_1_SPEC.md`. The context folder is a living document — it evolves with the project.

---

## Other important files in the repo

| File | Purpose | When to read |
|------|---------|--------------|
| `CLAUDE.md` (repo root) | Agent instructions for tokens, Figma sync, conventions | When working on UI/tokens |
| `docs/ARCHITECTURE.md` | Full architecture document (~48 KB) | Deep dive if needed |
| `docs/FIGMA_SYNC_INSTRUCTIONS.md` | How to sync tokens from Figma via MCP | When Dmitry says "sync tokens" |
| `workplan/adr/*.md` (22 files) | Full ADR texts with rationale | When you need the "why" behind a decision |
| `workplan/phases.json` | All project tasks with statuses | For Command Center / progress tracking |

**Rule:** `.context/` is the entry point. These files are for deep dives only — don't read them unless `.context/` doesn't answer your question.

---

## Key architecture rules (quick reference)

1. **Secrets boundary:** Envato key, Resend key, Claude API key, R2 creds, Supabase service_role — ONLY in Hono API (`apps/api/`). NEVER in SPA bundles.

2. **Split-stack:** Portal = Next.js SSG. Dashboard/Support/Studio/Admin = Vite + React Router. API = Hono on CF Workers. Command Center = Next.js (own theme, localhost only).

3. **Three-Layer UI:** Primitives (shadcn, zero business knowledge) → Domain (CMSMasters-specific) → Layouts (thin orchestration). All in `packages/ui/`.

4. **Supabase direct for 90%:** SPAs use anon key + RLS. Hono API uses service_role for the 10% that needs secrets.

5. **Nx monorepo:** Not Turborepo. `nx run-many -t build`, `nx run-many -t dev`.

6. **Tokens:** Single file `packages/ui/src/theme/tokens.css`, auto-generated from Figma MCP. HSL without wrapper (`228 54% 20%`). Don't edit manually.

7. **Command Center is isolated:** Own dark theme (zinc-950), own tokens. Portal DS changes don't affect CC.

---

## Updating context between layers

When a layer is completed:

1. Update `BRIEF.md`: mark layer as done, update "current task"
2. Create `LAYER_N_SPEC.md` for the next layer (or reference `ROADMAP.md` sections)
3. If architecture decisions changed during implementation — update `ADR_DIGEST.md`
4. If new conventions discovered — add to `CONVENTIONS.md`

The person who completes a layer is responsible for updating context for the next agent. This is the handoff mechanism.

---

## For Dmitry

To start any new agent session:
1. Point the agent at `.context/BRIEF.md`
2. Tell it which layer you're working on
3. The agent reads the spec and starts building

No need to re-explain the project history, ADRs, or architecture every time. It's all in `.context/`.
