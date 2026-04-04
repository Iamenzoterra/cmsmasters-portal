# WP-009: Living Documentation System

> Automated domain manifest, domain skills, and arch tests that enforce documentation ↔ code parity across the entire monorepo.

**Status:** PLANNING
**Priority:** P1 — Important
**Prerequisites:** None (all layers 0-2 done, codebase stable)
**Milestone/Wave:** Developer Experience / Quality Infrastructure
**Estimated effort:** 8-14 hours across 5 phases
**Created:** 2026-04-04
**Completed:** —

---

## Problem Statement

The monorepo has 4 apps, 6 packages, 9 Supabase tables, 18+ API routes, and growing complexity. Knowledge about domain boundaries, ownership, invariants, and traps lives only in developers' heads and scattered `.context/` files that can drift from reality.

When an agent (Claude Code, Codex) or a new contributor touches code, they have no formal way to know: who owns this file? What breaks if I change it? What are the hidden rules? The `.context/` folder helps but isn't enforced — nothing stops it from going stale.

The Orchestrator project solved this with a Living Documentation system: a typed domain manifest as source of truth, domain skills with human knowledge, and arch tests that fail when documentation diverges from code. We adapt this approach for our monorepo.

---

## Solution Overview

### Architecture

```
┌─────────────────────────────────────────────────────┐
│  Layer 3: Arch Tests (vitest enforcement)            │
│  — path existence, no dual ownership, table access,  │
│  — skill ↔ manifest parity, known_gaps severity      │
├─────────────────────────────────────────────────────┤
│  Layer 2: Domain Skills (.claude/skills/domains/)    │
│  — human docs: invariants, traps, blast radius,      │
│  — recipes, start-here, public API per domain        │
├─────────────────────────────────────────────────────┤
│  Layer 1: Domain Manifest (source of truth)          │
│  — src/__arch__/domain-manifest.ts                   │
│  — 11 domains, typed DomainDefinition interface      │
└─────────────────────────────────────────────────────┘
```

Layers 4-7 from Orchestrator (generated artifacts, docSync services, CLI scripts, daily CI) — deferred. We start with Layers 1-3 which deliver 80% of value.

### Key Decisions

| Decision | Chosen | Why | Alternatives considered |
|----------|--------|-----|----------------------|
| Domain granularity | Package/app = domain, Studio split into 2 | Natural boundaries from monorepo structure; block pipeline is complex enough to warrant own domain | Entity-based domains (block/theme/page cross-cutting) — rejected: ownership would span too many packages |
| Manifest location | `src/__arch__/domain-manifest.ts` | Matches Orchestrator convention, keeps arch concerns together | Root-level, `.context/` — rejected: manifest is code, not docs |
| Test runner | vitest | Already used in packages/db tests | jest — not in project |
| Boundary enforcement | Deferred (optional Phase 5) | Package boundaries via TS already enforce most; depcruise adds complexity for marginal gain now | Immediate depcruise — too much setup for current team size |
| Skills location | `.claude/skills/domains/{slug}/SKILL.md` | Alongside existing tool-skills, auto-loaded by Claude Code | Separate `docs/domains/` — wouldn't be loaded by agents |

---

## What This Changes

### New Files

```
src/__arch__/
├── domain-manifest.ts              # Source of truth: 11 domains
├── domain-manifest.test.ts         # Path existence, dual ownership, table access, skill parity
├── helpers.ts                      # getOwnedPaths, getAllClaimedPaths, getOwnerDomain

.claude/skills/domains/
├── pkg-db/SKILL.md                 # 9 tables, query patterns, mappers
├── pkg-auth/SKILL.md               # PKCE flow, guards, session hooks
├── pkg-ui/SKILL.md                 # Token system, Three-Layer, portal-blocks.css
├── pkg-validators/SKILL.md         # Zod schemas, validation patterns
├── pkg-api-client/SKILL.md         # Hono RPC typed client
├── app-portal/SKILL.md             # SSG/ISR, block rendering, revalidation, SEO
├── studio-blocks/SKILL.md          # Block pipeline: editor, import, token scanner, R2 upload, Process panel
├── studio-core/SKILL.md            # CRUD shell, shared components, routing, auth pages
├── app-api/SKILL.md                # Hono routes, middleware, R2, secrets boundary
├── app-command-center/SKILL.md     # Own dark theme, isolated, project management
└── infra-tooling/SKILL.md          # Nx, .context/, workplans, root configs, tools/
```

### Modified Files

```
package.json                        # Add "arch-test" script
.context/BRIEF.md                   # Add Living Documentation section (Phase 5)
```

### Database Changes

None.

---

## Domain Map

### 11 Domains

| # | Slug | Scope | Owned tables |
|---|------|-------|-------------|
| 1 | `pkg-db` | `packages/db/` | profiles, themes, blocks, templates, pages, page_blocks, global_elements, licenses, audit_log |
| 2 | `pkg-auth` | `packages/auth/` | — (reads profiles via pkg-db) |
| 3 | `pkg-ui` | `packages/ui/` | — |
| 4 | `pkg-validators` | `packages/validators/` | — |
| 5 | `pkg-api-client` | `packages/api-client/` | — |
| 6 | `app-portal` | `apps/portal/` | — |
| 7 | `studio-blocks` | 4 files: `block-editor.tsx`, `block-import-panel.tsx`, `block-processor.ts`, `token-map.ts` (the processing pipeline) | — |
| 8 | `studio-core` | `apps/studio/` (47 files — everything NOT in studio-blocks, incl. block-api.ts, block-picker-modal, block-preview, blocks-list) | — |
| 9 | `app-api` | `apps/api/` | — |
| 10 | `app-command-center` | `apps/command-center/` | — |
| 11 | `infra-tooling` | `tools/`, `.context/`, `workplan/`, root configs | — |

### Shared Infrastructure (no domain owner)

- `packages/db/src/client.ts` — Supabase client init (used by all)
- `packages/db/src/types.ts` — Generated DB types (used by all)
- Root: `nx.json`, `tsconfig.base.json`, `package.json`

### Dependency Graph (allowed_imports_from)

```
pkg-db          ← (base, no deps on other domains)
pkg-auth        ← pkg-db
pkg-validators  ← (standalone)
pkg-api-client  ← (standalone)
pkg-ui          ← (standalone)

app-portal      ← pkg-db, pkg-ui
studio-blocks   ← pkg-db, pkg-validators, pkg-api-client, pkg-ui, studio-core
studio-core     ← pkg-db, pkg-auth, pkg-validators, pkg-api-client, pkg-ui
app-api         ← pkg-db, pkg-validators
app-command-center ← (isolated, own deps)
infra-tooling   ← (meta, no code deps)
```

---

## Implementation Phases

### Phase 0: RECON (0.5h)

**Goal:** Verify all file paths that will go into the manifest actually exist on disk.

**Tasks:**

0.1. **Enumerate all source files** — List every .ts/.tsx in each package and app
0.2. **Verify Studio split** — Confirm which files belong to studio-blocks vs studio-core
0.3. **Check existing arch infrastructure** — Confirm vitest is available, no `src/__arch__/` exists yet

**Verification:** File inventory matches domain map above. No surprises.

---

### Phase 1: Domain Manifest (2-3h)

**Goal:** `src/__arch__/domain-manifest.ts` exists with all 11 domains typed and populated.

**Tasks:**

1.1. **Define DomainDefinition interface** — Adapted for monorepo:
- `owned_files: string[]` — all source files (monorepo-relative paths)
- `owned_tables: string[]` — Supabase tables
- `owned_routes: string[]` — Hono route files (replaces `owned_edge_functions`)
- `public_entrypoints: string[]` — what other domains may import
- `allowed_imports_from: string[]` — domain slugs this domain depends on
- `known_gaps: string[]` — severity-tagged gaps
- `policy?: string` — optional domain policy

1.2. **Populate all 11 domains** — Each domain gets its full file list, tables, entrypoints, deps

1.3. **Helper functions** — `getOwnedPaths()`, `getAllClaimedPaths()`, `getOwnerDomain(filePath)` in `helpers.ts`

1.4. **Shared infrastructure declaration** — `SHARED_INFRASTRUCTURE` object for files without domain owner

**Verification:**
```bash
npx tsx -e "import { DOMAINS } from './src/__arch__/domain-manifest'; console.log(Object.keys(DOMAINS).length)"
# → 11
```

---

### Phase 2: Domain Skills (3-4h)

**Goal:** 11 SKILL.md files exist in `.claude/skills/domains/`, each with frontmatter and required sections.

**Tasks:**

2.1. **Create skill template** — YAML frontmatter (domain, description, source_of_truth, status) + required sections

2.2. **Write skills for package domains** (5 files):
- `pkg-db` — 9 tables, query patterns, mapper invariants, Supabase gotchas
- `pkg-auth` — PKCE flow, magic link, guards, session hooks, RLS interaction
- `pkg-ui` — Token architecture, Three-Layer, portal-blocks.css, animate-utils.js, shadcn HSL convention
- `pkg-validators` — Zod schemas, validation patterns, where validation runs (client vs server)
- `pkg-api-client` — Hono RPC, typed routes, how to add new endpoints

2.3. **Write skills for app domains** (4 files):
- `app-portal` — SSG/ISR, block rendering pipeline, hook resolution `{{price}}`, SEO, revalidation, sitemap
- `app-api` — Hono on CF Workers, secrets boundary, R2 upload, middleware chain, auth + role guards
- `app-command-center` — Own dark theme, isolation from Portal DS, 6-page structure
- `infra-tooling` — Nx, .context/ system, workplan conventions, root configs

2.4. **Write skills for Studio sub-domains** (2 files):
- `studio-blocks` — Block editor (941 LOC), Process panel, token scanner (797 LOC), R2 batch upload, import/export, CSS scoping `.block-{slug}`, preview iframe, component detection
- `studio-core` — CRUD pattern (form + list + API wrapper), shared components, routing, layouts, auth pages

Each skill MUST have: Start Here (3 files), Public API, Invariants, Traps & Gotchas, Blast Radius, Recipes, Known Gaps.

**Verification:** All 11 SKILL.md files exist, frontmatter parses correctly, all required sections present.

---

### Phase 3: Arch Tests (2-3h)

**Goal:** `npm run arch-test` passes and enforces manifest ↔ skills ↔ code parity.

**Tasks:**

3.1. **Path existence test** — Every path in `owned_files` exists on disk
```typescript
for (const filePath of domain.owned_files) {
  it(`${slug}: file exists: ${filePath}`, () => {
    expect(fs.existsSync(filePath)).toBe(true)
  })
}
```

3.2. **No dual ownership test** — No file claimed by two domains

3.3. **Table ownership test** — Every table in `owned_tables` has `.from('table')` call in domain's owned files

3.4. **Skill ↔ manifest parity tests:**
- Skill file exists for every domain
- Frontmatter `domain` matches slug
- Frontmatter `source_of_truth` points to manifest
- Status is valid (`full` | `skeleton` | `deprecated`)
- Required sections present for `status: full`
- Public API paths in skill match `public_entrypoints` in manifest

3.5. **Known gaps severity test** — Every `known_gaps` entry starts with `critical:`, `important:`, or `note:`

3.6. **Add npm script:**
```json
"arch-test": "vitest run --reporter=verbose src/__arch__/"
```

**Verification:**
```bash
npm run arch-test
# All tests pass
```

---

### Phase 4: Integration & Smoke Test (0.5-1h)

**Goal:** The system works end-to-end. Deliberately break something and confirm the test catches it.

**Tasks:**

4.1. **Positive test** — Run `npm run arch-test`, all green

4.2. **Negative tests** — Temporarily:
- Remove a file from disk that's in manifest → test fails ✗
- Add same file to two domains → test fails ✗
- Delete a required skill section → test fails ✗
- Change frontmatter domain slug → test fails ✗
- Revert all deliberate breaks

4.3. **Agent test** — Ask Claude Code "who owns block-processor.ts?" → should find via manifest

**Verification:** All 4 negative scenarios caught by tests. All reverted. Green suite.

---

### Phase 5: Documentation Update (1-2h)

**Goal:** All docs reflect what was actually built.

**Tasks:**

5.1. **CC reads all phase logs** — understands what was done, what deviated from plan
5.2. **Update `.context/BRIEF.md`** — Add "Living Documentation" section describing the system
5.3. **Update `CLAUDE.md`** — Reference domain manifest for agents
5.4. **Update `.context/CONVENTIONS.md`** — Add convention: "when adding a new file, update domain-manifest.ts"
5.5. **Link source logs** — add Source Logs section in touched docs
5.6. **Mark WP-009 as DONE**

**Files to update:**
- `.context/BRIEF.md` — add Living Docs section
- `.context/CONVENTIONS.md` — add manifest update convention
- `CLAUDE.md` — reference manifest
- `workplan/WP-009-living-documentation.md` — status → DONE
- `logs/wp-009/phase-*-result.md` — must exist for all phases

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Manifest becomes stale when files are added/moved | Tests fail, blocking other work | Arch tests run fast (<5s), easy to fix. Convention in CONVENTIONS.md |
| Skills are low-quality boilerplate | Agents get wrong info, worse than no info | Phase 2 writes real invariants from code reading, not placeholder text |
| Over-engineered for current team size (1 dev) | Maintenance overhead without payoff | Only Layers 1-3 (minimal set). Layers 4-7 deferred. 11 domains is lean |
| Studio split wrong (files assigned to wrong sub-domain) | Ownership confusion | Phase 0 RECON verifies file lists before manifest creation |
| vitest config conflicts with existing test setup | Can't run arch tests | Separate vitest config for `src/__arch__/` if needed |

---

## Acceptance Criteria (Definition of Done)

- [ ] `src/__arch__/domain-manifest.ts` declares 11 domains with typed interface
- [ ] `src/__arch__/helpers.ts` exports `getOwnedPaths`, `getAllClaimedPaths`, `getOwnerDomain`
- [ ] 11 SKILL.md files in `.claude/skills/domains/` with correct frontmatter and all required sections
- [ ] `src/__arch__/domain-manifest.test.ts` covers: path existence, no dual ownership, table access, skill parity, known_gaps severity
- [ ] `npm run arch-test` passes
- [ ] Negative tests confirmed (break → catch → revert)
- [ ] All phases logged in `logs/wp-009/`
- [ ] `.context/BRIEF.md` and `CLAUDE.md` updated (Phase 5)
- [ ] No known blockers for next WP

---

## Dependencies

| Depends on | Status | Blocks |
|------------|--------|--------|
| WP-008 (global elements v2) | ✅ DONE | None — manifest references existing files |
| Stable file structure | ✅ | If major refactor happens mid-WP, manifest paths break |

---

## Notes

- Concept adapted from [Seaside Project Orchestrator Living Documentation](C:\work\Seaside\project-orchestrator\System-docs\CONCEPT-living-documentation.md)
- Layers 4-7 (generated artifacts, docSync services, CLI scripts, daily CI) can be added as WP-010+ if Layers 1-3 prove valuable
- Command Center is isolated but still gets a domain + skill for completeness — agents should know it has its own theme
- `infra-tooling` domain is meta — it owns non-code files (workplans, context docs, tools). Its skill explains the project workflow itself
