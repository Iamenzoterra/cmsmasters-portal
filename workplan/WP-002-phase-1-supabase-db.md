# WP-002 Phase 1: Supabase Schema + DB Package

> Workplan: WP-002 Layer 0 — Infrastructure
> Phase: 1 of 6
> Priority: P0
> Estimated: 3–4 hours
> Type: Backend
> Previous: Phase 0 ✅ (RECON — monorepo audited, all findings documented)
> Next: Phase 2 (Auth Package)

---

## Context

Phase 0 RECON confirmed:

- `packages/db` exists as empty shell: package.json + .gitkeep, no src/, no tsconfig
- `supabase/` directory does not exist — no config, no migrations, no CLI
- `@supabase/supabase-js` not installed anywhere
- Supabase CLI not installed
- No `.env.example` — only `.env` with FIGMA_TOKEN
- npm workspace resolution works for cross-package imports (no tsconfig paths needed)
- Package.json pattern: `{ "name": "@cmsmasters/db", "main": "./index.ts", "exports": { ".": "./index.ts" } }`
- Supabase project just created by Dmitry — URL and keys available

```
CURRENT:  packages/db = empty shell (package.json + .gitkeep)          ✅
          supabase/ = does not exist                                    ✅
          @supabase/supabase-js = not installed                        ✅
MISSING:  Migration SQL, RLS policies, DB types, query helpers, seed   ❌
```

Reference: `.context/LAYER_0_SPEC.md` §0.1 (Schema) and §0.4 (DB Package) — use as primary source for SQL and code.

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Confirm packages/db current state
ls -la packages/db/
cat packages/db/package.json

# 2. Confirm no supabase/ directory
ls supabase/ 2>/dev/null || echo "supabase/ does not exist — expected"

# 3. Check root package.json workspaces config
grep -A5 '"workspaces"' package.json

# 4. Check what's in .env (don't print secrets — just check keys exist)
grep -oP '^[A-Z_]+' .env 2>/dev/null || echo "No .env or empty"

# 5. Check if Supabase project URL and keys are in .env
grep -c 'SUPABASE' .env 2>/dev/null || echo "No SUPABASE vars in .env"

# 6. Reference: read the schema spec
head -100 .context/LAYER_0_SPEC.md
```

**Document your findings before writing any code.**

**IMPORTANT:** If `.env` does NOT contain SUPABASE_URL and SUPABASE_ANON_KEY — STOP and tell Dmitry. He just created the project and needs to add these vars. The format should be:
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## Task 1.1: Supabase Local Setup

### What to Build

Initialize Supabase local config and create the migration file.

```bash
# Install Supabase CLI as root devDependency
npm install -D supabase --workspace=.

# Initialize supabase directory (creates supabase/config.toml)
npx supabase init
```

After `supabase init`, the directory structure should be:
```
supabase/
├── config.toml
├── migrations/
└── seed.sql
```

Edit `supabase/config.toml` if needed — ensure project_id matches Dmitry's Supabase project.

### Integration

This creates the `supabase/` directory at monorepo root. Migrations will be deployed to the live project via `npx supabase db push` or through the Supabase dashboard SQL editor.

---

## Task 1.2: Migration File — Schema + RLS

### What to Build

Create `supabase/migrations/001_initial_schema.sql` with the full MVP schema from LAYER_0_SPEC §0.1.

The migration must contain (in this order):

1. **Tables** (4):
   - `profiles` — extends auth.users (id UUID FK, email, full_name, avatar_url, role with CHECK constraint, timestamps)
   - `themes` — content table (slug UNIQUE, name, tagline, description, category, price, URLs, JSONB fields for features/plugins/custom_sections, status with CHECK, created_by FK, timestamps)
   - `licenses` — user purchases (user_id FK, theme_id FK, purchase_code UNIQUE, license_type CHECK, envato fields, timestamps)
   - `audit_log` — system audit trail (actor_id FK, action, target_type, target_id, details JSONB, ip_address, timestamp)

2. **Functions** (3):
   - `handle_new_user()` — trigger function, inserts into profiles on auth.users INSERT (SECURITY DEFINER)
   - `get_user_role()` — returns role from profiles for current auth.uid() (SECURITY DEFINER STABLE)
   - `update_updated_at()` — generic trigger function for updated_at columns

3. **Triggers** (3):
   - `on_auth_user_created` — AFTER INSERT on auth.users → handle_new_user()
   - `profiles_updated` — BEFORE UPDATE on profiles → update_updated_at()
   - `themes_updated` — BEFORE UPDATE on themes → update_updated_at()

4. **Indexes** (6):
   - `idx_themes_slug`, `idx_themes_status`
   - `idx_licenses_user`, `idx_licenses_theme`
   - `idx_audit_actor`, `idx_audit_created` (DESC)

5. **RLS** — enable on all 4 tables, then create policies:
   - **profiles:** select_own, select_admin, update_own, update_admin
   - **themes:** select_published (authenticated), select_staff (content_manager + admin), insert_staff, update_staff, select_anon (for Portal SSG — TO anon)
   - **licenses:** select_own, select_admin, insert_admin, update_admin
   - **audit_log:** select_admin, insert_any (authenticated)

**Copy the SQL from `.context/LAYER_0_SPEC.md` §0.1** — it's the source of truth. Adapt only if RECON findings require changes.

---

## Task 1.3: Seed Data

### What to Build

Create `supabase/seed.sql`:

```sql
-- Test theme (Flavor — our most recognizable theme)
INSERT INTO themes (slug, name, tagline, category, price, status, features, included_plugins)
VALUES (
  'flavor',
  'Flavor Theme',
  'Creative Multipurpose WordPress Theme',
  'creative',
  59.00,
  'published',
  '[{"icon": "palette", "title": "Elementor Builder", "description": "Full visual editing experience"}]'::jsonb,
  '[{"name": "CMSMasters Addon", "slug": "cmsmasters-addon", "value": 29}]'::jsonb
);

-- Role assignment instructions (run after creating test users via Supabase Auth dashboard):
-- UPDATE profiles SET role = 'admin' WHERE email = 'dmitry@cmsmasters.com';
-- UPDATE profiles SET role = 'content_manager' WHERE email = 'content@cmsmasters.com';
```

---

## Task 1.4: DB Package — Full Implementation

### What to Build

Transform `packages/db` from empty shell into working package.

**1. Install dependencies:**
```bash
npm install @supabase/supabase-js --workspace=packages/db
```

**2. Create tsconfig.json** in `packages/db/`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "esModuleInterop": true,
    "jsx": "react-jsx",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "baseUrl": ".",
    "paths": {}
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules", "dist"]
}
```

**3. Create `src/` directory with files:**

**`src/types.ts`** — manually scaffold Database type. Structure:
```typescript
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; email: string | null; full_name: string | null; avatar_url: string | null; role: UserRole; created_at: string; updated_at: string }
        Insert: { id: string; email?: string | null; full_name?: string | null; avatar_url?: string | null; role?: UserRole; created_at?: string; updated_at?: string }
        Update: { id?: string; email?: string | null; full_name?: string | null; avatar_url?: string | null; role?: UserRole; updated_at?: string }
      }
      themes: {
        Row: { /* all columns from migration, with proper TS types */ }
        Insert: { /* required + optional columns */ }
        Update: { /* all optional */ }
      }
      licenses: {
        Row: { /* ... */ }
        Insert: { /* ... */ }
        Update: { /* ... */ }
      }
      audit_log: {
        Row: { /* ... */ }
        Insert: { /* ... */ }
        Update: { /* ... */ }
      }
    }
  }
}

export type UserRole = 'registered' | 'licensed' | 'admin' | 'content_manager' | 'support_operator'

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Theme = Database['public']['Tables']['themes']['Row']
export type License = Database['public']['Tables']['licenses']['Row']
export type AuditEntry = Database['public']['Tables']['audit_log']['Row']
```

**Fill in ALL columns** from the migration SQL. Match types exactly:
- UUID → `string`
- TEXT → `string | null` (if nullable)
- DECIMAL → `number | null`
- TIMESTAMPTZ → `string`
- JSONB → `unknown[] | null` or specific type (e.g., `ThemeFeature[]`)
- BOOLEAN → `boolean`

Define JSONB sub-types:
```typescript
export type ThemeFeature = { icon: string; title: string; description: string }
export type ThemePlugin = { name: string; slug: string; value?: number; icon_url?: string }
export type CustomSection = { type: string; data: Record<string, unknown> }
```

**`src/client.ts`**:
```typescript
import { createClient as supabaseCreateClient } from '@supabase/supabase-js'
import type { Database } from './types'

export function createClient(url: string, key: string) {
  return supabaseCreateClient<Database>(url, key)
}

export type SupabaseClient = ReturnType<typeof createClient>
```

**`src/queries/themes.ts`**:
```typescript
import type { SupabaseClient } from '../client'

export async function getThemes(client: SupabaseClient) {
  const { data, error } = await client
    .from('themes')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getThemeBySlug(client: SupabaseClient, slug: string) {
  const { data, error } = await client
    .from('themes')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error) throw error
  return data
}

export async function upsertTheme(
  client: SupabaseClient,
  theme: Database['public']['Tables']['themes']['Insert']
) {
  const { data, error } = await client
    .from('themes')
    .upsert(theme, { onConflict: 'slug' })
    .select()
    .single()
  if (error) throw error
  return data
}
```

Import `Database` type where needed for Insert/Update generics.

**`src/queries/profiles.ts`**:
```typescript
// getProfile(client, userId) — select single profile by id
// updateProfile(client, userId, updates) — update profile fields (NOT role)
```

**`src/queries/audit.ts`**:
```typescript
// logAction(client, { actor_id, actor_role, action, target_type, target_id, details, ip_address })
// — inserts into audit_log
```

**`src/index.ts`** — barrel export:
```typescript
export { createClient } from './client'
export type { SupabaseClient } from './client'
export type { Database, UserRole, Profile, Theme, License, AuditEntry, ThemeFeature, ThemePlugin, CustomSection } from './types'
export { getThemes, getThemeBySlug, upsertTheme } from './queries/themes'
export { getProfile, updateProfile } from './queries/profiles'
export { logAction } from './queries/audit'
```

**4. Update `packages/db/package.json`:**
```json
{
  "name": "@cmsmasters/db",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2"
  }
}
```

**Note:** `main` and `exports` point to `./src/index.ts` (NOT `./index.ts` as the current empty shell has). This is important — the current shell points to a non-existent `./index.ts`.

---

## Task 1.5: Env Template

### What to Build

Create `.env.example` at monorepo root:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Vite apps (client-side — safe to expose)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=http://localhost:8787

# Hono API (server-side — secrets)
# These go into wrangler secrets, not .env for production
API_SUPABASE_URL=https://your-project.supabase.co
API_SUPABASE_SERVICE_KEY=eyJ...

# Figma (existing)
FIGMA_TOKEN=figd_...
```

Also update `.gitignore` to ensure `.env` and `.env.local` are ignored (verify — they likely already are).

---

## Files to Modify

- `packages/db/package.json` — update main/exports, add @supabase/supabase-js dep
- `packages/db/src/types.ts` — NEW: Database type + convenience types
- `packages/db/src/client.ts` — NEW: createClient factory
- `packages/db/src/queries/themes.ts` — NEW: theme query helpers
- `packages/db/src/queries/profiles.ts` — NEW: profile query helpers
- `packages/db/src/queries/audit.ts` — NEW: audit log helper
- `packages/db/src/index.ts` — NEW: barrel export
- `packages/db/tsconfig.json` — NEW: TypeScript config
- `supabase/migrations/001_initial_schema.sql` — NEW: full schema + RLS
- `supabase/seed.sql` — NEW: test data
- `supabase/config.toml` — NEW: from `supabase init`
- `.env.example` — NEW: all env vars template
- `package.json` (root) — add supabase CLI devDep

---

## Acceptance Criteria

- [ ] `supabase/migrations/001_initial_schema.sql` contains 4 tables, 3 functions, 3 triggers, 6 indexes, 12+ RLS policies
- [ ] `packages/db/src/types.ts` has complete Database type matching all migration columns
- [ ] `packages/db/src/client.ts` exports createClient with Database generic
- [ ] `packages/db/src/queries/` has themes.ts, profiles.ts, audit.ts with typed helpers
- [ ] `packages/db/package.json` has correct main/exports pointing to src/index.ts
- [ ] `@supabase/supabase-js` installed in packages/db
- [ ] `npx tsc --noEmit -p packages/db/tsconfig.json` passes (zero type errors)
- [ ] Import `{ createClient, Theme, getThemeBySlug } from '@cmsmasters/db'` resolves from another package
- [ ] `.env.example` exists with all required vars documented
- [ ] `supabase/seed.sql` has test theme INSERT

---

## ⚠️ MANDATORY: Verification (do NOT skip)

```bash
echo "=== Phase 1 Verification ==="

# 1. Migration file exists and has content
echo "--- Migration file ---"
test -f supabase/migrations/001_initial_schema.sql && echo "✅ Migration exists" || echo "❌ Migration missing"
grep -c "CREATE TABLE" supabase/migrations/001_initial_schema.sql
echo "(expect 4 tables)"

grep -c "CREATE POLICY" supabase/migrations/001_initial_schema.sql
echo "(expect 12+ policies)"

# 2. DB package structure
echo "--- DB package structure ---"
ls packages/db/src/
ls packages/db/src/queries/
echo "(expect: client.ts, types.ts, index.ts, queries/themes.ts, queries/profiles.ts, queries/audit.ts)"

# 3. TypeScript compiles
echo "--- TypeScript check ---"
npx tsc --noEmit -p packages/db/tsconfig.json 2>&1
echo "(expect: zero errors)"

# 4. Package.json correct
echo "--- Package.json ---"
cat packages/db/package.json
echo "(expect: main → ./src/index.ts, @supabase/supabase-js in deps)"

# 5. Cross-package import test
echo "--- Import test ---"
node -e "
try {
  // This tests that the package resolves — not runtime, just module resolution
  const path = require.resolve('@cmsmasters/db', { paths: [process.cwd()] });
  console.log('✅ @cmsmasters/db resolves to:', path);
} catch(e) {
  console.log('❌ @cmsmasters/db does not resolve:', e.message);
}
"

# 6. Env template exists
echo "--- Env template ---"
test -f .env.example && echo "✅ .env.example exists" || echo "❌ .env.example missing"
grep -c "SUPABASE" .env.example
echo "(expect: 5+ SUPABASE-related vars)"

# 7. Seed file
echo "--- Seed ---"
test -f supabase/seed.sql && echo "✅ seed.sql exists" || echo "❌ seed.sql missing"

echo "=== Verification complete ==="
```

---

## ⚠️ MANDATORY: Write Execution Log (do NOT skip)

After verification, create the file:
`logs/wp-002/phase-1-result.md`

Structure (fill all sections — write N/A if not applicable, do NOT omit sections):

```markdown
# Execution Log: WP-002 Phase 1 — Supabase Schema + DB Package
> Epic: Layer 0 Infrastructure
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED

## What Was Implemented
{2-5 sentences describing what was actually built}

## Key Decisions
| Decision | Chosen | Why |
|----------|--------|-----|
| ... | ... | ... |

## Files Changed
| File | Change | Description |
|------|--------|-------------|
| `path` | created/modified/deleted | brief description |

## Issues & Workarounds
{Problems encountered and resolutions. "None" if clean.}

## Open Questions
{Non-blocking questions. "None" if none.}

## Verification Results
| Check | Result |
|-------|--------|
| Migration file (4 tables, 12+ policies) | ✅/❌ |
| DB package structure | ✅/❌ |
| TypeScript compiles | ✅/❌ |
| Package.json correct | ✅/❌ |
| Cross-package import resolves | ✅/❌ |
| .env.example exists | ✅/❌ |
| seed.sql exists | ✅/❌ |

## Git
- Commit: `{sha}` — `{message}`
```

---

## Git

```bash
git add supabase/ packages/db/ .env.example package.json logs/wp-002/phase-1-result.md
git commit -m "feat: supabase schema + @cmsmasters/db package [WP-002 phase 1]"
```

---

## ⚠️ IMPORTANT Notes for CC

- **Read `.context/LAYER_0_SPEC.md` §0.1 and §0.4 FIRST** — it has the exact SQL and code structures. Use it as primary source.
- **Do NOT deploy migration to Supabase yet.** Just create the file. Dmitry will run it via dashboard or `supabase db push` after review.
- **Do NOT create `.env` or `.env.local`** — only `.env.example`. Dmitry will create his own .env with real keys.
- **Database type in `src/types.ts` must match migration EXACTLY** — every column, every type, every nullable field. This is the contract between DB and all apps.
- **Package resolution:** `main` and `exports` in package.json must point to `./src/index.ts` (not `./index.ts` as the old shell had). This is how npm workspace resolution finds the entry point.
- **Do NOT touch packages/ui, packages/auth, or apps/command-center** — they're not part of this phase.
- **Supabase JS v2** — use `@supabase/supabase-js` v2 (latest stable), NOT v3 beta.
