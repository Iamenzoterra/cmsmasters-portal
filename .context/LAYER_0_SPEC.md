# Layer 0: Infrastructure — Executable Spec

> ~~This is the CURRENT TASK.~~ **✅ COMPLETED — 2026-03-29**
> All 6 deliverables built and integration-verified.
>
> **Deviations from spec:**
> - Auth guard: router-agnostic (callbacks) instead of react-router-dom coupled
> - Auth/authz separated: JWT middleware = authentication only, requireRole = DB profile authorization
> - Supabase CLI: skipped (manual migration file + hand-scaffolded types)
> - zod v4 used (not v3): `z.record(z.string(), z.unknown())` requires 2 args
> - JWT verification: Web Crypto API, no external library
> - base64UrlDecode: returns ArrayBuffer (CF Workers types require it)
> - .env.example: var names aligned with actual wrangler bindings
> - logAction: await + throw (not fire-and-forget)
> - updateProfile: Omit role/id/created_at/updated_at (type-safe)
>
> Source logs: `logs/wp-002/phase-0-result.md` through `phase-5-result.md`

---

## What Layer 0 delivers

1. **Supabase schema** — 4 tables with RLS policies
2. **Auth package** — Supabase PKCE client + route guards + hooks
3. **Hono API skeleton** — CF Workers app with JWT middleware + 3 routes
4. **DB package** — Supabase client factory + auto-generated types + query helpers
5. **API client package** — Hono RPC typed wrapper
6. **Validators package** — Zod schema for theme form validation

After Layer 0, all 4 apps (Studio, Portal, Dashboard, Admin) can be built in parallel.

---

## 0.1 Supabase Schema

### Tables (MVP subset — 4 tables)

```sql
-- ═══ Users & Auth ═══
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'registered'
    CHECK (role IN ('registered', 'licensed', 'admin', 'content_manager', 'support_operator')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ═══ Themes & Content ═══
CREATE TABLE themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  category TEXT,
  price DECIMAL(10,2),
  demo_url TEXT,
  themeforest_url TEXT,
  themeforest_id TEXT,
  thumbnail_url TEXT,
  preview_images JSONB DEFAULT '[]'::jsonb,
  features JSONB DEFAULT '[]'::jsonb,
  included_plugins JSONB DEFAULT '[]'::jsonb,
  custom_sections JSONB DEFAULT '[]'::jsonb,
  seo_title TEXT,
  seo_description TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══ Licenses ═══
CREATE TABLE licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  theme_id UUID NOT NULL REFERENCES themes(id),
  purchase_code TEXT UNIQUE,
  license_type TEXT CHECK (license_type IN ('regular', 'extended')),
  verified_at TIMESTAMPTZ,
  support_until TIMESTAMPTZ,
  envato_item_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══ Audit Log ═══
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(id),
  actor_role TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══ Indexes ═══
CREATE INDEX idx_themes_slug ON themes(slug);
CREATE INDEX idx_themes_status ON themes(status);
CREATE INDEX idx_licenses_user ON licenses(user_id);
CREATE INDEX idx_licenses_theme ON licenses(theme_id);
CREATE INDEX idx_audit_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

-- ═══ Updated_at trigger ═══
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER themes_updated BEFORE UPDATE ON themes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### RLS Policies

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ═══ profiles ═══
-- Everyone can read their own profile
CREATE POLICY profiles_select_own ON profiles FOR SELECT
  USING (id = auth.uid());
-- Admin can read all profiles
CREATE POLICY profiles_select_admin ON profiles FOR SELECT
  USING (get_user_role() = 'admin');
-- Users can update their own profile (except role)
CREATE POLICY profiles_update_own ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
-- Admin can update any profile (including role changes)
CREATE POLICY profiles_update_admin ON profiles FOR UPDATE
  USING (get_user_role() = 'admin');

-- ═══ themes ═══
-- Anyone authenticated can read published themes
CREATE POLICY themes_select_published ON themes FOR SELECT
  USING (status = 'published');
-- Content managers and admin can read all themes (including drafts)
CREATE POLICY themes_select_staff ON themes FOR SELECT
  USING (get_user_role() IN ('content_manager', 'admin'));
-- Content managers and admin can insert/update themes
CREATE POLICY themes_insert_staff ON themes FOR INSERT
  WITH CHECK (get_user_role() IN ('content_manager', 'admin'));
CREATE POLICY themes_update_staff ON themes FOR UPDATE
  USING (get_user_role() IN ('content_manager', 'admin'));
-- Allow anonymous (not logged in) to read published themes (for Portal SSG)
CREATE POLICY themes_select_anon ON themes FOR SELECT TO anon
  USING (status = 'published');

-- ═══ licenses ═══
-- Users can read their own licenses
CREATE POLICY licenses_select_own ON licenses FOR SELECT
  USING (user_id = auth.uid());
-- Admin can read all licenses
CREATE POLICY licenses_select_admin ON licenses FOR SELECT
  USING (get_user_role() = 'admin');
-- Admin can insert/update licenses
CREATE POLICY licenses_insert_admin ON licenses FOR INSERT
  WITH CHECK (get_user_role() = 'admin');
CREATE POLICY licenses_update_admin ON licenses FOR UPDATE
  USING (get_user_role() = 'admin');

-- ═══ audit_log ═══
-- Only admin can read audit log
CREATE POLICY audit_select_admin ON audit_log FOR SELECT
  USING (get_user_role() = 'admin');
-- Any authenticated user can insert (their own actions get logged)
CREATE POLICY audit_insert_any ON audit_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
-- Service role inserts via Hono API don't need policies (bypasses RLS)
```

### Seed data (for development)

```sql
-- After setting up auth users in Supabase dashboard, update their roles:
-- UPDATE profiles SET role = 'admin' WHERE email = 'dmitry@cmsmasters.com';
-- UPDATE profiles SET role = 'content_manager' WHERE email = 'content@cmsmasters.com';

-- Test theme
INSERT INTO themes (slug, name, tagline, category, price, status, features, included_plugins)
VALUES (
  'flavor',
  'flavor theme',
  'Creative Multipurpose WordPress Theme',
  'creative',
  59.00,
  'published',
  '[{"icon": "palette", "title": "Elementor Builder", "description": "Full visual editing experience"}]'::jsonb,
  '[{"name": "CMSMasters Addon", "slug": "cmsmasters-addon", "value": 29}]'::jsonb
);
```

---

## 0.2 Auth Package

Location: `packages/auth/`

```
packages/auth/
├── src/
│   ├── client.ts          — createBrowserClient() factory
│   ├── guards.tsx         — useRequireAuth(allowedRoles[]) hook
│   ├── hooks.ts           — useUser(), useSession(), useRole()
│   ├── types.ts           — UserRole, AuthState types
│   └── index.ts           — barrel export
├── package.json
└── tsconfig.json
```

### Key implementations

**client.ts**: Creates Supabase browser client. Each SPA calls this independently (per-app sessions).
```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@cmsmasters/db'

export function createBrowserClient() {
  return createClient<Database>(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  )
}
```

**guards.tsx**: React Router route guard. Redirects to /login if unauthorized or wrong role.

**hooks.ts**: `useUser()` returns current user profile with role. `useSession()` returns session. `useRole()` returns role string.

**Dependencies**: `@supabase/supabase-js`, `@cmsmasters/db` (for types)

---

## 0.3 Hono API Skeleton

Location: `apps/api/`

```
apps/api/
├── src/
│   ├── index.ts           — Hono app entry, CORS, routes
│   ├── middleware/
│   │   └── auth.ts        — JWT verification from Supabase
│   ├── routes/
│   │   ├── health.ts      — GET /api/health
│   │   ├── revalidate.ts  — POST /api/content/revalidate
│   │   └── upload.ts      — POST /api/upload (R2 signed URL stub)
│   └── lib/
│       └── supabase.ts    — service_role Supabase client
├── wrangler.toml
├── package.json
└── tsconfig.json
```

### Hono app entry (src/index.ts)
```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authMiddleware } from './middleware/auth'
import { healthRoute } from './routes/health'
import { revalidateRoute } from './routes/revalidate'
import { uploadRoute } from './routes/upload'

const app = new Hono()

app.use('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'],
  credentials: true,
}))

app.route('/api', healthRoute)
app.use('/api/*', authMiddleware)
app.route('/api', revalidateRoute)
app.route('/api', uploadRoute)

export default app
```

### JWT middleware
```typescript
// Verify Supabase JWT from Authorization header
// Extract user_id and role from JWT claims
// Attach to context: c.set('userId', ...), c.set('userRole', ...)
```

### wrangler.toml
```toml
name = "cmsmasters-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
SUPABASE_URL = ""        # Set in Cloudflare dashboard
# SUPABASE_SERVICE_KEY   # Secret — set via wrangler secret put
# SUPABASE_JWT_SECRET    # Secret — for JWT verification
```

### Dependencies
```json
{
  "dependencies": {
    "hono": "^4",
    "@supabase/supabase-js": "^2"
  },
  "devDependencies": {
    "wrangler": "^3",
    "@cloudflare/workers-types": "^4"
  }
}
```

---

## 0.4 DB Package

Location: `packages/db/`

```
packages/db/
├── src/
│   ├── client.ts      — createClient(url, key) factory
│   ├── types.ts       — Database type (auto-generated from Supabase)
│   ├── queries/
│   │   ├── themes.ts  — getThemes(), getThemeBySlug(), upsertTheme()
│   │   ├── profiles.ts — getProfile(), updateProfile()
│   │   └── audit.ts   — logAction()
│   └── index.ts       — barrel export
├── package.json
└── tsconfig.json
```

**Type generation**: `npx supabase gen types typescript --project-id <id> > src/types.ts`

**Query helpers** are thin wrappers around Supabase client:
```typescript
export async function getThemeBySlug(client: SupabaseClient, slug: string) {
  const { data, error } = await client
    .from('themes')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error) throw error
  return data
}
```

---

## 0.5 API Client Package

Location: `packages/api-client/`

```
packages/api-client/
├── src/
│   ├── client.ts      — Hono RPC typed client
│   └── index.ts
├── package.json
└── tsconfig.json
```

Uses `hono/client` for type-safe API calls from SPAs:
```typescript
import { hc } from 'hono/client'
import type { AppType } from '@cmsmasters/api' // Hono app types

export function createApiClient(token: string) {
  return hc<AppType>(import.meta.env.VITE_API_URL, {
    headers: { Authorization: `Bearer ${token}` }
  })
}
```

---

## 0.6 Validators Package

Location: `packages/validators/`

```
packages/validators/
├── src/
│   ├── theme.ts       — Zod schema for theme form
│   └── index.ts
├── package.json
└── tsconfig.json
```

```typescript
import { z } from 'zod'

export const themeSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(100),
  name: z.string().min(1).max(200),
  tagline: z.string().max(500).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  price: z.number().positive().optional(),
  demo_url: z.string().url().optional().or(z.literal('')),
  themeforest_url: z.string().url().optional().or(z.literal('')),
  thumbnail_url: z.string().optional(),
  preview_images: z.array(z.string().url()).default([]),
  features: z.array(z.object({
    icon: z.string(),
    title: z.string(),
    description: z.string(),
  })).default([]),
  included_plugins: z.array(z.object({
    name: z.string(),
    slug: z.string(),
    value: z.number().optional(),
    icon_url: z.string().optional(),
  })).default([]),
  custom_sections: z.array(z.object({
    type: z.string(),
    data: z.record(z.unknown()),
  })).default([]),
  seo_title: z.string().max(70).optional(),
  seo_description: z.string().max(160).optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
})

export type ThemeFormData = z.infer<typeof themeSchema>
```

---

## Acceptance Criteria

- [ ] Supabase project created, schema deployed (profiles, themes, licenses, audit_log)
- [ ] RLS policies: user sees own data, admin sees all, content_manager sees themes, anon sees published themes
- [ ] `handle_new_user()` trigger creates profile on signup
- [ ] Auth PKCE: magic link → click → session → `useUser()` returns profile with role
- [ ] `useRequireAuth(['admin'])` redirects non-admin to /login
- [ ] Hono API: `GET /api/health` responds 200
- [ ] Hono API: JWT middleware rejects requests without valid Supabase token
- [ ] `POST /api/content/revalidate` stub exists (full implementation in Layer 2)
- [ ] `packages/db` exports typed client and query helpers
- [ ] `packages/api-client` exports typed Hono RPC client
- [ ] `packages/validators` exports themeSchema Zod validator
- [ ] All packages importable via `@cmsmasters/db`, `@cmsmasters/auth`, etc.
- [ ] Dev seed: at least 1 test theme in Supabase, roles assignable via dashboard

---

## After Layer 0

Layer 0 unblocks everything else. See ROADMAP.md for Layers 1–3.
The next task is **Layer 1: Studio** — creating the theme editor SPA that writes to Supabase.
