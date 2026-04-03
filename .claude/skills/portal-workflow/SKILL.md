---
name: portal-workflow
description: CMSMasters Portal project workflow and context. USE THIS SKILL for any task on the portal project — before writing code, creating files, or making architecture decisions. Triggers on any mention of portal, cmsmasters, theme page, admin app, studio, dashboard, Layer 0/1/2/3, Supabase schema, Hono API, tokens, ADR, workplan, phase, sprint, or when starting any new piece of work. This skill defines HOW we work (Brain/Hands separation, one phase at a time, mandatory logging) and WHERE everything lives (.context/ folder, monorepo structure, key files).
---

# Portal Workflow — How We Work + Where Things Live

> **Read this before doing anything.** This skill defines the execution protocol AND project context.

---

## PART 1: HOW WE WORK

We separate **Brain** (planning, strategy, specs) from **Hands** (Claude Code execution). This separation is mandatory because reality updates every phase.

### Roles

- **Brain (Desktop Claude / planning chat):** RECON → WP strategy → write *only the next phase prompt* → review logs → adapt.
- **Hands (Claude Code / you):** run audits, implement Phase N, verify, **write execution log**, commit.
- **User (Dmitry):** shuttles prompt/log between Brain and Hands, runs manual checks, approves.

### The Core Loop (always linear)

```
1. RECON first (Phase 0) — audit what's actually in the codebase
2. Execute one phase at a time — Phase 1 prompt → execute → log → commit
3. Review Phase log → THEN write Phase 2 prompt
4. Repeat until all phases complete
5. Docs updated as final phase (based on actual logs)
```

**Non-negotiables:**
- RECON before planning
- One phase at a time (no "Phase 1–5 detailed prompts upfront")
- Everything logged (`logs/` directory)
- Docs last, based on logs

### Execution Log (mandatory per phase)

After completing a phase, create a log file:
```
logs/{task-name}/phase-{N}-result.md
```

Log must contain:
- What was attempted
- What was actually done (files created/modified)
- What worked, what didn't
- Any discoveries or drift from the plan
- Verification results

---

## PART 2: PROJECT CONTEXT

### What this project is

CMSMasters Portal — unified customer platform replacing 4 fragmented domains. WordPress theme company, 95K+ customers, 65+ Elementor themes.

### Architecture

```
Portal (Astro SSG, public)    ─┐
Dashboard (Vite SPA, auth)    ─┤
Studio (Vite SPA, auth)       ─┼─→ packages/ui, db, auth, api-client, validators
Admin (Vite SPA, auth)        ─┤
Support (Vite SPA, deferred)  ─┘
                                │
        ┌───────────────────────┤
        ▼                       ▼
  Supabase (90%)          Hono API (10%)
  anon key + RLS          CF Workers + secrets
```

**Secrets boundary:** Envato key, Resend key, Claude API key, R2 creds, Supabase service_role → ONLY in Hono API. NEVER in SPA bundles.

### Block Model (Architecture V2 — updated 2026-04-02)

```
Block    = HTML + scoped CSS + optional JS in Supabase `blocks` table.
           Created via Figma → Claude Code (/block-craft skill) → Studio import.
           Has hooks for dynamic data (price, links, alt).
           Animations: CSS scroll-driven (entrance) + vanilla JS (behavioral). ADR-023.
           Components: semantic HTML + CSS states (hover/active/focus). ADR-024.

Template = ordered position grid (1–20) in `templates` table.
           Some positions filled with blocks, some empty ("+").
           CRUD in Studio. One template → many themes.

Theme    = template_id + block_fills (CM fills empty positions per-theme).
           Dynamic data (price) lives in theme.meta → hooks inject at render time.
```

Block creation pipeline:
```
Figma → /block-craft → HTML+CSS+JS → preview :7777 → iterate → Studio import →
Process panel (token scan + R2 image upload) → save to DB → Portal renders via Astro SSG
```

Full spec: `workplan/BLOCK-ARCHITECTURE-V2.md`, `workplan/PORTAL-BLOCK-ARCHITECTURE.md`

### Context folder (.context/)

**Always read `.context/BRIEF.md` first** when starting work. It has the full picture.

```
.context/
├── BRIEF.md          — Project overview, architecture, current state (READ FIRST)
├── ADR_DIGEST.md     — 24 ADR decisions condensed for implementation
├── LAYER_0_SPEC.md   — Infrastructure spec (✅ DONE — reference only)
├── CONVENTIONS.md    — Code style, naming, token usage, Supabase/Hono patterns
├── ROADMAP.md        — Layers 1–3 specs with block model details
└── SKILL.md          — How the context system works
```

Reading order: **BRIEF.md → ROADMAP.md (current layer) → CONVENTIONS.md** (before writing code).

### Monorepo structure (updated 2 April 2026)

```
cmsmasters-portal/
├── apps/
│   ├── command-center/    ✅ DONE (6 pages, localhost:4000, own dark theme)
│   ├── api/               ✅ DONE (Hono, 18+ routes: health, revalidate, upload+batch, blocks, templates, pages, global-elements CRUD, R2 image upload)
│   ├── studio/            ✅ DONE (login, themes, blocks, templates, pages, global elements, block Process panel with token scanner + R2 upload)
│   ├── portal/            ✅ DONE (Astro SSG: theme pages, composed pages, SEO, sitemap, CF Pages deploy)
│   ├── dashboard/         ⬜ NOT CREATED (Layer 3)
│   └── admin/             ⬜ NOT CREATED (Layer 3)
├── packages/
│   ├── ui/                🟡 tokens.css + button primitive + Three-Layer dirs
│   ├── db/                ✅ client, types (9 tables), queries (themes, blocks, templates, pages, global-elements), mappers
│   ├── auth/              ✅ client, hooks, guards, actions, types
│   ├── api-client/        ✅ Hono RPC typed client
│   ├── validators/        ✅ theme, block, template, page Zod schemas
│   └── email/             ⬜ deferred
├── tools/studio-mockups/  ✅ Block preview HTML files (served on :7777 during /block-craft)
├── workplan/              ✅ WP-005 + WP-006, ADRs 001-024, BLOCK-ARCHITECTURE-V2.md
├── .context/              ✅ 6 context files for agents
├── .claude/skills/        ✅ block-craft, portal-workflow, lint-ds, sync-tokens, figma-component-vars
├── CLAUDE.md              ✅ agent entry point
└── nx.json                ✅ Nx monorepo configured
```

### Supabase (project: yxcqtwuyktbjxstahfqj)

9 tables, all with RLS enabled:
- **profiles**: id, email, full_name, avatar_url, role, timestamps.
- **themes**: slug, status, meta (jsonb), template_id (FK→templates), block_fills (jsonb), seo (jsonb), created_by, timestamps.
- **blocks**: slug, name, html, css, js, hooks (jsonb), metadata (jsonb), created_by, timestamps.
- **templates**: slug, name, description, positions (jsonb), max_positions, created_by, timestamps.
- **pages**: slug, title, type (layout|composed), scope, html, css, seo (jsonb), status, created_by, timestamps.
- **page_blocks**: page_id (FK→pages), block_id (FK→blocks), position, config (jsonb). UNIQUE(page_id, position).
- **global_elements**: slot (header|footer|sidebar-left|sidebar-right), block_id (FK→blocks), scope, priority. UNIQUE(slot, scope).
- **licenses**: user_id, theme_id, purchase_code, license_type, support_until.
- **audit_log**: actor_id, action, target_type, target_id, details.

3 functions: get_user_role, handle_new_user, update_updated_at.

### Current sprint

```
Layer 0: Infrastructure         ✅ DONE
Layer 1: Studio + DB + API      ✅ DONE (WP-005A+B+C+D)
Block Import Pipeline           ✅ DONE (WP-006: token scanner, R2 upload, Process panel, portal-blocks.css, animate-utils.js, component detection)
Layer 2: Portal (Astro SSG)     ✅ DONE (WP-007: layout editor, theme pages, composed pages, SEO, sitemap, CF Pages)
Layer 3: Dashboard + Admin      ⬜ future
```

Support + AI chat — deferred.

---

## PART 3: EXECUTION PROTOCOL FOR CLAUDE CODE

### Before starting any task

1. Read `.context/BRIEF.md` — understand project state
2. Read `.context/ROADMAP.md` — find your current layer spec
3. Read `.context/CONVENTIONS.md` — know the patterns before writing code
4. Run RECON: check actual file state vs what the spec expects

### During execution

5. Implement ONE phase at a time
6. After each phase: verify (run tests, check types, manual smoke test)
7. Write execution log to `logs/{task}/phase-{N}-result.md`
8. Commit with descriptive message

### After completing a layer

9. Update `.context/BRIEF.md` — mark layer done, update current task
10. Create/update next layer spec if needed
11. Update `CONVENTIONS.md` if new patterns discovered
12. Final commit with context updates

---

## PART 4: KEY DECISIONS (quick reference)

| Rule | Detail |
|------|--------|
| **Monorepo** | Nx (not Turborepo) |
| **Portal** | Astro SSG, public, 0 JS framework output |
| **Internal apps** | Vite + React Router SPA |
| **API** | Hono on Cloudflare Workers, 18+ routes (incl. R2 image upload) |
| **DB** | Supabase (Postgres + Auth + RLS), 9 tables |
| **Auth** | Supabase PKCE, magic link, per-app sessions |
| **Block model** | HTML+CSS+JS in DB, hooks for dynamic data, templates as position grids, themes reference template_id + block_fills |
| **Block creation** | Figma → /block-craft skill → preview :7777 → Studio import → Process panel → DB |
| **Block animations** | 3-layer: CSS scroll-driven (entrance) + shared micro-utils (1.5KB) + per-block inline JS (ADR-023) |
| **Block components** | Semantic HTML + CSS states, native elements (button, details, dialog), no framework (ADR-024) |
| **R2 assets** | Cloudflare R2 bucket `cmsmasters-assets` for block images, uploaded via API batch endpoint |
| **Theme page** | Portal renders blocks from DB at build time via template positions + block fills + global elements |
| **Design system** | Three-Layer: Primitives → Domain → Layouts |
| **Tokens** | Single file: `packages/ui/src/theme/tokens.css` (Figma MCP sync) |
| **CC isolation** | Command Center has own dark theme, not affected by Portal DS |
| **Secrets** | ONLY in Hono API, never in SPA bundles |
| **CSS scoping** | `.block-{slug}` class prefix per block — no leaking between blocks |
| **Hook resolution** | Compile-time string replacement in Astro (`{{price}}` → theme.meta.price) |

### Token conventions (critical for UI code)

```tsx
// HSL without wrapper (shadcn convention): 228 54% 20%
className="bg-[hsl(var(--primary))]"   // Color — need hsl() wrapper
className="h-[--button-height-sm]"     // Sizing — bare var in TW v4
className="text-[length:var(--type-body-size)]"  // Font — need length hint
```

### Figma files (for token sync)

| File | Key |
|------|-----|
| CMS DS Portal (shadcn Obra) | `PodaGqhhlgh6TLkcyAC5Oi` |
| Portal DS (CMSMasters brand) | `CLtdO56o9fJCx19EnhH1nI` |

---

## PART 5: WHAT NOT TO DO

1. **Don't write multiple phase prompts upfront** — one phase at a time
2. **Don't skip RECON** — audit before implementing
3. **Don't put secrets in SPA bundles** — Hono API only
4. **Don't touch Command Center tokens** — it has its own theme
5. **Don't edit tokens.css manually** — use `/sync-tokens` skill
6. **Don't build speculative components** — extract from real designs
7. **Don't skip execution logs** — they're evidence for the next phase
8. **Don't use Turborepo** — we use Nx
9. **Don't use Next.js for internal apps** — Vite + React Router
10. **Don't store content in Git files** — Supabase tables
11. **Don't hardcode block IDs or schemas** — blocks are dynamic DB assets, not compile-time constants
12. **Don't create .astro files per block** — blocks are HTML+CSS in DB, rendered at build time via BlockRenderer
