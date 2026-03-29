# Conventions — Code Style, Naming, Patterns

> Rules for any agent or developer writing code in this monorepo.

---

## File & directory naming

- Directories: `kebab-case` (`api-client`, `command-center`)
- Files: `kebab-case` for standalone files (`theme-form.tsx`, `audit-log.ts`)
- Components: `PascalCase` export, `kebab-case` filename (`theme-card.tsx` → `export function ThemeCard`)
- Types: `PascalCase` (`UserRole`, `ThemeFormData`)
- Package imports: `@cmsmasters/ui`, `@cmsmasters/db`, `@cmsmasters/auth`, `@cmsmasters/api-client`, `@cmsmasters/validators`

---

## TypeScript

- Strict mode everywhere
- Prefer `interface` over `type` for object shapes (better error messages, extendability)
- Use `satisfies` for type-checking without widening
- No `any` — use `unknown` + type guards
- Barrel exports via `index.ts` in each package

---

## React patterns

- Functional components only
- Hooks for state and side effects
- `react-hook-form` + Zod for forms
- CVA (`class-variance-authority`) for component variants
- `cn()` utility (clsx + tailwind-merge) for class composition — from `@cmsmasters/ui`

---

## Design system tokens

### Token file
Single source: `packages/ui/src/theme/tokens.css` (auto-generated from Figma, do NOT edit manually).

### HSL convention
Tokens store raw HSL triplets: `228 54% 20%` (no `hsl()` wrapper). This is shadcn convention.

### Usage in Tailwind v4
```tsx
// Color — need hsl() wrapper because token is raw triplet
className="bg-[hsl(var(--primary))]"
className="text-[hsl(var(--btn-primary-text))]"

// Sizing — token includes px unit
className="h-[--button-height-sm]"          // Tailwind v4 bare var syntax
// NOT: className="h-[var(--button-height-sm)]"  // This breaks TW class generation

// Font size — need length hint
className="text-[length:var(--type-body-size)]"
// NOT: className="text-[var(--type-body-size)]"  // TW interprets as color
```

### Two token namespaces
- **shadcn vars** (`--primary`, `--border`, `--card`, etc.) → power Primitives layer
- **Brand vars** (`--brand-sky`, `--btn-primary-bg`, `--section-hero-bg`, etc.) → power Domain layer

### Command Center exception
CC has its OWN tokens in `apps/command-center/tailwind.config.ts`. Dark zinc-950 aesthetic. Portal DS tokens do NOT apply to CC's own UI. CC only imports tokens.css for rendering `@cmsmasters/ui` components in preview.

---

## Component layers (ADR-010 V2)

### Primitives (`packages/ui/src/primitives/`)
- shadcn/ui components adapted + wrapped
- Zero CMSMasters business knowledge
- Styled only via shadcn vars (--primary, --border, etc.)
- Used by ALL apps
- Example: Button, Input, Badge, Card, Dialog, Select

### Domain (`packages/ui/src/domain/`)
- CMSMasters-specific components
- Know about theme data models, license types, etc.
- Styled via brand vars (--brand-*, --btn-*, --section-*)
- Example: ThemeCard, PluginCard, RatingStars, PriceTag, LockIcon

### Layouts (`packages/ui/src/layouts/`)
- Page shells, navigation patterns
- Thin orchestration — accept data via props, no hardcoded business logic
- Example: DashboardLayout, AdminLayout, StudioLayout

### Rule: NO build step for packages/ui
Consumers import TypeScript directly. No compilation, no bundling of the UI package. Each app bundles it through its own build tool (Vite or Next.js).

---

## Supabase patterns

### Client creation
```typescript
// In SPA (Vite) — uses anon key
import { createBrowserClient } from '@cmsmasters/auth'
const supabase = createBrowserClient()

// In Hono API — uses service_role key (NEVER in SPAs)
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)
```

### Query pattern
```typescript
const { data, error } = await supabase
  .from('themes')
  .select('*')
  .eq('status', 'published')
  .order('created_at', { ascending: false })
if (error) throw error
```

### RLS awareness
- SPAs always operate under anon key + user JWT → RLS filters automatically
- Don't try to bypass RLS from SPAs — it's a feature, not a limitation
- Admin operations that need service_role go through Hono API

---

## Hono API patterns

### Route definition
```typescript
import { Hono } from 'hono'
const route = new Hono()
route.post('/content/revalidate', async (c) => {
  const userId = c.get('userId')
  const role = c.get('userRole')
  // ... business logic
  return c.json({ success: true })
})
export { route as revalidateRoute }
```

### JWT middleware sets context
After auth middleware, every handler has: `c.get('userId')`, `c.get('userRole')`.

---

## Environment variables

### Vite SPAs (.env)
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=http://localhost:8787
```

### Next.js Portal (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...  # For SSG data fetching at build time
```

### Hono API (wrangler secrets)
```
SUPABASE_URL
SUPABASE_SERVICE_KEY
SUPABASE_JWT_SECRET
R2_BUCKET_NAME
# Future: ENVATO_API_KEY, RESEND_API_KEY, CLAUDE_API_KEY
```

---

## Git conventions

- Branch naming: `feature/layer-0-infra`, `fix/rls-policy`
- Commit messages: concise, imperative (`Add Supabase schema`, `Wire auth package`)
- PR per logical unit (one package, one feature)

---

## Package patterns (Layer 0)

### tsconfig
- `noEmit: true` — no build step, consumers import TS directly
- `moduleResolution: "bundler"` — works with npm workspace resolution
- `target: "ES2022"` — consistent across all packages
- No `tsconfig.base.json` — each package has own tsconfig
- `jsx: "react-jsx"` only in packages with JSX (auth, ui)

### package.json
- `"main": "./src/index.ts"` — entry is TS source, not dist
- `"exports": { ".": "./src/index.ts" }` — same
- Workspace deps: `"@cmsmasters/db": "*"` — resolved via npm workspaces
- React: peerDependencies (NOT regular deps)

### Cross-package imports
- npm workspace resolution (no tsconfig path aliases)
- Type-only: `import type { AppType } from '../../../apps/api/src/index'` (relative path for app→package)
- Runtime: `import { createClient } from '@cmsmasters/db'` (workspace)

### Auth patterns
- Router-agnostic guard (callbacks: onUnauthorized, onForbidden)
- Client passed as parameter to hooks — per-app sessions (ADR-022)
- `import.meta.env` for Vite SPAs only
- `hasAllowedRole()` single utility for role checks
- `useUser()` returns `authState` as single source of truth

### Hono API patterns
- JWT = authentication (identity), requireRole = authorization (DB profile) — separate middlewares
- Env type: `Env` interface in `src/env.ts`, used as `Hono<{ Bindings: Env }>`
- `.dev.vars` for local secrets (gitignored), `wrangler secret put` for production
- base64UrlDecode returns ArrayBuffer (CF Workers types)

### Zod patterns
- Version 4 — `z.record(z.string(), z.unknown())` requires 2 args (not 1 like v3)
- `safeParse()` returns `{ success, data?, error? }`
- `ThemeFormData = z.infer<typeof themeSchema>`
