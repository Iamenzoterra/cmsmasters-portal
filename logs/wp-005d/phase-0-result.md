# Execution Log: WP-005D Phase 0 — RECON: Portal Scaffold Readiness
> Epic: WP-005D — Astro Portal + Content Seed
> Executed: 2026-04-01T08:55:00+02:00
> Duration: ~5 minutes
> Status: ✅ COMPLETE

## Findings

### apps/portal/ Status
Does not exist ✅ — ready to scaffold in Phase 1.

### Nx Workspace & Astro Integration
- **Workspaces glob**: `"apps/*"` in root `package.json` — any `apps/portal/` auto-included.
- **nx.json**: Minimal config — `defaultBase: "main"`, `targetDefaults` for build/dev/lint. No `projectsRelationship` or `workspaceLayout` constraints.
- **@nx/astro**: NOT installed. Not needed.
- **Executor pattern**: All apps use `nx:run-commands` (Studio, API). Command Center uses `@nx/next:build` for build but `nx:run-commands` for dev.
- **Recommended project.json for Portal**: `nx:run-commands` with `astro dev --port 4321`, `astro build`, `astro preview`. Matches Studio pattern exactly.

Reference — Studio project.json:
```json
{
  "targets": {
    "dev":   { "executor": "nx:run-commands", "options": { "command": "npx vite --port 5173", "cwd": "apps/studio" }, "continuous": true },
    "build": { "executor": "nx:run-commands", "options": { "command": "npx vite build", "cwd": "apps/studio" } },
    "lint":  { "executor": "nx:run-commands", "options": { "command": "npx tsc --noEmit", "cwd": "apps/studio" } }
  }
}
```

### Environment Variables
- **Root `.env`** contains all four keys:
  - `SUPABASE_URL=<present>`
  - `SUPABASE_ANON_KEY=<present>`
  - `VITE_SUPABASE_URL=<present>`
  - `VITE_SUPABASE_ANON_KEY=<present>`
- `.env.local` — does not exist.
- **Studio/auth usage**: `packages/auth/src/client.ts` reads `import.meta.env.VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Vite prefix).
- **Astro prefix decision**: Astro SSG runs at build time (server context), so `import.meta.env.SUPABASE_URL` works without any prefix — no `PUBLIC_` needed. The non-prefixed `SUPABASE_URL` and `SUPABASE_ANON_KEY` already exist in `.env`. Portal should use those directly. No new env vars needed.

### CORS Gap
- **File**: `apps/api/src/index.ts`, lines 16-23
- **Current origins**: `localhost:5173` (Studio), `5174` (Dashboard), `5175` (Admin), `5176` (Support), `4000` (CC), `3000` (Portal Next.js)
- **`localhost:4321` (Astro)**: MISSING
- **`localhost:3000`**: Present but labeled "Portal (Next.js)" — can be replaced or kept alongside `4321`.
- **Action for Phase 1**: Add `'http://localhost:4321'` to the origin array. Update comment from "Portal (Next.js)" to "Portal (Astro)".

### RLS — themes (anon read)
| Policy | Command | Roles | Condition |
|--------|---------|-------|-----------|
| `themes_select_anon` | SELECT | `{anon}` | `status = 'published'` |
| `themes_select_published` | SELECT | `{public}` | `status = 'published'` |
| `themes_select_staff` | SELECT | `{public}` | `get_user_role() IN ('content_manager','admin')` |
| `themes_insert_staff` | INSERT | `{public}` | — |
| `themes_update_staff` | UPDATE | `{public}` | staff role check |
| `themes_delete_staff` | DELETE | `{authenticated}` | staff role check |

**Verdict**: ✅ Anon CAN read published themes. `themes_select_anon` explicitly allows `anon` role with `status = 'published'` filter. No blocker.

### RLS — blocks (anon read)
| Policy | Command | Roles | Condition |
|--------|---------|-------|-----------|
| `blocks_select_auth` | SELECT | `{authenticated}` | `true` |
| `blocks_insert_staff` | INSERT | `{authenticated}` | — |
| `blocks_update_staff` | UPDATE | `{authenticated}` | staff role check |
| `blocks_delete_staff` | DELETE | `{authenticated}` | staff role check |

**Verdict**: ❌ Anon CANNOT read blocks. Only `authenticated` role has SELECT. This is a **blocker** for Portal SSG build-time fetching with anon key.

**Mitigation options**:
1. **Add anon SELECT policy** (`blocks_select_anon`): `CREATE POLICY blocks_select_anon ON blocks FOR SELECT TO anon USING (true);` — simplest, blocks are public content.
2. **Use `SUPABASE_SERVICE_ROLE_KEY` at build time**: bypasses RLS entirely. Safe since Astro SSG runs server-side only, key never shipped to browser. But requires adding the service role key to `.env`.

**Recommended**: Option 1 — add anon SELECT policy. Blocks are public marketing content, no reason to gate behind auth.

### RLS — templates (anon read)
| Policy | Command | Roles | Condition |
|--------|---------|-------|-----------|
| `templates_select_auth` | SELECT | `{authenticated}` | `true` |
| `templates_insert_staff` | INSERT | `{authenticated}` | — |
| `templates_update_staff` | UPDATE | `{authenticated}` | staff role check |
| `templates_delete_staff` | DELETE | `{authenticated}` | staff role check |

**Verdict**: ❌ Anon CANNOT read templates. Same situation as blocks.

**Recommended**: Same as blocks — add `templates_select_anon` policy. Templates define page layout structure, public content.

### DB Content State
| Table | Count |
|-------|-------|
| blocks | 1 |
| templates | 2 |
| published themes | 1 |
| total themes | 1 |

**Existing theme**: slug `456456`, status `published`, `template_id: null`, `has_fills: false` (test data).

Phase 4 content seed will need to create real blocks, a real template with positions, and at least one properly-filled theme. Existing test data can be cleaned up or left.

### packages/db Types
- **Theme type**: `template_id: string | null` and `block_fills: ThemeBlockFill[]` present in Row, Insert, Update variants ✅
- **Block/Template types**: Exported at `types.ts:313-319` — `Block`, `BlockInsert`, `BlockUpdate`, `Template`, `TemplateInsert`, `TemplateUpdate` ✅
- **Query functions**: `packages/db/src/queries/blocks.ts` (getBlocks, getBlockById, getBlockBySlug, createBlock, updateBlock, deleteBlock, getBlockUsage) and `packages/db/src/queries/templates.ts` (getTemplates, getTemplateById, createTemplate, updateTemplate, deleteTemplate, getTemplateUsage) ✅
- **Mappers**: `mappers.ts` handles `template_id` and `block_fills` round-trip (null ↔ empty string, [] ↔ undefined) ✅
- **Supporting interfaces**: `BlockHooks`, `BlockMetadata`, `TemplatePosition`, `ThemeBlockFill` ✅

Portal has everything it needs from `@cmsmasters/db`.

### Figma Accessibility
Skipped — not needed for Phase 0. Phase 4 will handle block generation from Figma if required.

## Key Decisions
| Decision | Chosen | Why |
|----------|--------|-----|
| Nx/Astro executor | `nx:run-commands` (no @nx/astro) | Matches Studio/API pattern; @nx/astro doesn't exist |
| Env var prefix | No prefix — use `SUPABASE_URL` directly | Astro SSG is server-side at build time; no `PUBLIC_` or `VITE_` needed |
| Anon key strategy | Add anon SELECT policies for blocks + templates | Blocks/templates are public marketing content; service_role is overkill |
| CORS update | Add `localhost:4321`, update `3000` comment | Astro default dev port |

## Blockers for Phase 1
1. **RLS blocks/templates**: Anon can't read → add `blocks_select_anon` and `templates_select_anon` SELECT policies in Phase 1 migration
2. **CORS**: `localhost:4321` missing from API origin list → add in Phase 1 alongside scaffold

Both are straightforward Phase 1 changes, not fundamental blockers.

## Open Questions
None — all prerequisites verified. Ready for Phase 1.
