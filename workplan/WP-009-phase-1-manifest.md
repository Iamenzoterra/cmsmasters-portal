# WP-009 Phase 1: Domain Manifest — Source of Truth

> Workplan: WP-009 Living Documentation System
> Phase: 1 of 5
> Priority: P1
> Estimated: 2-3 hours
> Type: Config
> Previous: Phase 0 ✅ (RECON — file inventory verified)
> Next: Phase 2 (Domain Skills)

---

## Context

Phase 0 produced a verified file inventory for all 11 domains. Now we create the typed domain manifest — the single source of truth for ownership, boundaries, and contracts.

```
CURRENT:  Verified file inventory in phase-0 log   ✅
CURRENT:  No src/__arch__/ directory                ✅
MISSING:  DomainDefinition TypeScript interface      ❌
MISSING:  11 domains declared in manifest            ❌
MISSING:  Helper functions (getOwnedPaths, etc.)     ❌
```

The manifest is a **declarative contract** — it defines boundaries. Code must conform to the manifest, not the other way around. It's like a DB schema for architecture.

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Read Phase 0 execution log for verified file paths
cat logs/wp-009/phase-0-result.md

# 2. Confirm src/__arch__/ still doesn't exist
ls src/__arch__/ 2>/dev/null || echo "Clean — ready to create"

# 3. Check tsconfig includes src/__arch__/
cat tsconfig.json | head -20
```

**Document your findings before writing any code.**

---

## Task 1.1: DomainDefinition Interface

### What to Build

Create `src/__arch__/domain-manifest.ts` starting with the interface:

```typescript
export interface DomainDefinition {
  name: string                    // "Database Package"
  slug: string                    // "pkg-db"
  description: string             // One-line: what this domain does

  // OWNERSHIP — files this domain is responsible for
  owned_files: string[]           // Monorepo-relative paths: 'packages/db/src/queries/blocks.ts'

  // SUPABASE
  owned_tables: string[]          // ['blocks', 'templates', 'pages', ...]

  // API (Hono routes, replaces owned_edge_functions from Orchestrator)
  owned_routes: string[]          // ['apps/api/src/routes/blocks.ts']

  // CONTRACTS
  public_entrypoints: string[]    // What OTHER domains may import from this one
  allowed_imports_from: string[]  // Domain slugs this domain depends on

  // DOCUMENTATION
  known_gaps: string[]            // 'critical: ...' | 'important: ...' | 'note: ...'
  policy?: string                 // Optional: 'isolated' for command-center, 'meta' for infra
}
```

**Key adaptation from Orchestrator:**
- `owned_files` replaces `owned_hooks` + `owned_components` + `owned_services` + `owned_stores` + `owned_types` — our monorepo packages don't need that granularity
- `owned_routes` replaces `owned_edge_functions` — we use Hono, not Supabase Edge Functions
- No `shared_edge_functions` / `shared_stores` / `shared_utils` — our packages handle sharing through exports
- No `guards` / `realtime_channels` — not applicable to our architecture

File: `src/__arch__/domain-manifest.ts`

---

## Task 1.2: Populate All 11 Domains

### What to Build

In the same file, declare the `DOMAINS` record. Use **exact paths from Phase 0 log**.

```typescript
export const DOMAINS: Record<string, DomainDefinition> = {
  'pkg-db': {
    name: 'Database Package',
    slug: 'pkg-db',
    description: 'Supabase client, typed queries, mappers for all 9 tables.',
    owned_files: [
      'packages/db/src/index.ts',
      'packages/db/src/client.ts',
      'packages/db/src/types.ts',
      'packages/db/src/mappers.ts',
      'packages/db/src/queries/themes.ts',
      'packages/db/src/queries/blocks.ts',
      'packages/db/src/queries/templates.ts',
      'packages/db/src/queries/pages.ts',
      'packages/db/src/queries/global-elements.ts',
      'packages/db/src/queries/profiles.ts',
      'packages/db/src/queries/audit.ts',
      // include test files:
      'packages/db/src/__tests__/mappers.test.ts',
      'packages/db/src/__tests__/phase2-smoke.test.ts',
    ],
    owned_tables: [
      'profiles', 'themes', 'blocks', 'templates',
      'pages', 'page_blocks', 'global_elements',
      'licenses', 'audit_log',
    ],
    owned_routes: [],
    public_entrypoints: ['packages/db/src/index.ts'],
    allowed_imports_from: [],
    known_gaps: [
      'note: types.ts is generated from Supabase — manual edits will be overwritten',
      'important: mappers.ts handles snake_case→camelCase but has no runtime validation',
    ],
  },

  'pkg-auth': {
    name: 'Auth Package',
    slug: 'pkg-auth',
    description: 'Supabase PKCE auth: client, hooks, guards, magic link actions.',
    owned_files: [
      'packages/auth/src/index.ts',
      'packages/auth/src/client.ts',
      'packages/auth/src/hooks.ts',
      'packages/auth/src/guards.tsx',
      'packages/auth/src/actions.ts',
      'packages/auth/src/types.ts',
      'packages/auth/src/env.d.ts',
    ],
    owned_tables: [],
    owned_routes: [],
    public_entrypoints: ['packages/auth/src/index.ts'],
    allowed_imports_from: ['pkg-db'],
    known_gaps: [
      'note: guards.tsx depends on useRole from hooks.ts — role comes from profiles table via pkg-db',
    ],
  },

  // ... 9 more domains populated from Phase 0 file inventory
}
```

**CC MUST use the exact file paths from the Phase 0 execution log.** Do not guess paths.

### Domain-specific notes:

| Domain | Notes for CC |
|--------|-------------|
| `pkg-ui` | Include tokens.css, portal-blocks.css, animate-utils.js, button.tsx, button.stories.tsx, utils.ts. Exclude .gitkeep files |
| `pkg-validators` | Include all schema files + index.ts |
| `pkg-api-client` | Only 2 files: client.ts + index.ts |
| `app-portal` | Include app/ route files, lib/ utils, next.config, tailwind.config |
| `studio-blocks` | Exactly 4 files from Phase 0 REVISED inventory: block-editor, block-import-panel, block-processor, token-map |
| `studio-core` | Everything in apps/studio/src/ NOT in studio-blocks (47 files). Includes block-api.ts (shared authHeaders/parseError), block-picker-modal, block-preview, blocks-list |
| `app-api` | Include routes/, middleware/, lib/, index.ts, env.ts |
| `app-command-center` | Include app/, components/, lib/, cli/ — flag as `policy: 'isolated'` |
| `infra-tooling` | Non-code: .context/*.md, workplan/*.md, tools/*, nx.json. Flag as `policy: 'meta'` |

---

## Task 1.3: Helper Functions

### What to Build

Create `src/__arch__/helpers.ts`:

```typescript
import { DOMAINS, type DomainDefinition } from './domain-manifest'

/** All owned file paths for a domain */
export function getOwnedPaths(domain: DomainDefinition): string[] {
  return [...domain.owned_files]
}

/** All file paths claimed by any domain */
export function getAllClaimedPaths(): string[] {
  return Object.values(DOMAINS).flatMap(getOwnedPaths)
}

/** Find which domain owns a given file path */
export function getOwnerDomain(filePath: string): string | null {
  // Normalize path separators for Windows compatibility
  const normalized = filePath.replace(/\\/g, '/')
  for (const [slug, domain] of Object.entries(DOMAINS)) {
    if (getOwnedPaths(domain).some(p => normalized.includes(p))) {
      return slug
    }
  }
  return null
}

/** All Supabase tables claimed by any domain */
export function getAllClaimedTables(): string[] {
  return Object.values(DOMAINS).flatMap(d => d.owned_tables)
}
```

---

## Task 1.4: Shared Infrastructure Declaration

### What to Build

Add to `domain-manifest.ts` after `DOMAINS`:

```typescript
/** Files used by multiple domains but not exclusively owned */
export const SHARED_INFRASTRUCTURE = {
  root_configs: [
    'nx.json',
    'package.json',
    'tsconfig.base.json',
    '.eslintrc.cjs',
  ],
  // Add any other shared files discovered in Phase 0
}
```

Keep this minimal. Most files should be owned by a domain.

---

## Files to Modify

- `src/__arch__/domain-manifest.ts` — **NEW** — Interface + 11 domains + SHARED_INFRASTRUCTURE
- `src/__arch__/helpers.ts` — **NEW** — Utility functions for manifest queries

---

## Acceptance Criteria

- [ ] `src/__arch__/domain-manifest.ts` compiles without errors
- [ ] `DomainDefinition` interface has: name, slug, description, owned_files, owned_tables, owned_routes, public_entrypoints, allowed_imports_from, known_gaps, policy?
- [ ] `DOMAINS` record has exactly 11 entries
- [ ] Every `owned_files` path uses forward slashes and is monorepo-relative
- [ ] `pkg-db` has all 9 tables in `owned_tables`
- [ ] `studio-blocks` has exactly 4 files: block-editor, block-import-panel, block-processor, token-map
- [ ] `helpers.ts` exports: getOwnedPaths, getAllClaimedPaths, getOwnerDomain, getAllClaimedTables
- [ ] TypeScript compiles: `npx tsc --noEmit src/__arch__/domain-manifest.ts src/__arch__/helpers.ts`

---

## Verification (do NOT skip)

```bash
echo "=== Phase 1 Verification ==="

# 1. Files exist
[ -f "src/__arch__/domain-manifest.ts" ] && echo "✅ domain-manifest.ts" || echo "❌ domain-manifest.ts"
[ -f "src/__arch__/helpers.ts" ] && echo "✅ helpers.ts" || echo "❌ helpers.ts"

# 2. Domain count
npx tsx -e "
  import { DOMAINS } from './src/__arch__/domain-manifest'
  const count = Object.keys(DOMAINS).length
  console.log(count === 11 ? '✅ 11 domains' : '❌ ' + count + ' domains (expected 11)')
"

# 3. All domain slugs
npx tsx -e "
  import { DOMAINS } from './src/__arch__/domain-manifest'
  console.log(Object.keys(DOMAINS).join(', '))
"

# 4. Table count (should be 9 unique)
npx tsx -e "
  import { DOMAINS } from './src/__arch__/domain-manifest'
  const tables = Object.values(DOMAINS).flatMap(d => d.owned_tables)
  console.log(tables.length === 9 ? '✅ 9 tables' : '❌ ' + tables.length + ' tables')
  console.log(tables.join(', '))
"

# 5. studio-blocks file count (revised: 4 files)
npx tsx -e "
  import { DOMAINS } from './src/__arch__/domain-manifest'
  const count = DOMAINS['studio-blocks'].owned_files.length
  console.log(count === 4 ? '✅ studio-blocks: 4 files' : '❌ studio-blocks: ' + count + ' files')
"

# 6. Helper functions work
npx tsx -e "
  import { getOwnerDomain } from './src/__arch__/helpers'
  const owner = getOwnerDomain('packages/db/src/queries/blocks.ts')
  console.log(owner === 'pkg-db' ? '✅ getOwnerDomain works' : '❌ got: ' + owner)
"

echo "=== Verification complete ==="
```

---

## MANDATORY: Write Execution Log (do NOT skip)

After verification, create:
`logs/wp-009/phase-1-result.md`

---

## Git

```bash
git add src/__arch__/domain-manifest.ts src/__arch__/helpers.ts logs/wp-009/phase-1-result.md
git commit -m "feat: domain manifest with 11 domains — living documentation foundation [WP-009 phase 1]"
```

---

## IMPORTANT Notes for CC

- Use **exact paths from Phase 0 log** — do not infer or guess file paths
- Forward slashes only in paths (even on Windows) — consistency for tests
- Do NOT create skill files in this phase — that's Phase 2
- Do NOT create test files in this phase — that's Phase 3
- If a file from Phase 0 no longer exists (deleted between phases), remove it from the domain and note in log
- `infra-tooling` domain tracks non-code files (.md, .json configs) — this is intentional
