# Conventions — Code Style, Naming, Patterns

> Rules for any agent or developer writing code in this monorepo.

---

## File & directory naming

- Directories: `kebab-case` (`api-client`, `command-center`)
- Files: `kebab-case` for standalone files (`theme-form.tsx`, `audit-log.ts`)
- Components: `PascalCase` export, `kebab-case` filename (`theme-card.tsx` → `export function ThemeCard`)
- Types: `PascalCase` (`UserRole`, `ThemeFormData`)
- Package imports: `@cmsmasters/ui`, `@cmsmasters/db`, `@cmsmasters/auth`, `@cmsmasters/api-client`, `@cmsmasters/validators`
- No `packages/blocks/` — removed in WP-005A architecture pivot. Block content lives in Supabase (WP-005B).

---

## Living Documentation

- **When adding a new source file:** add its path to the correct domain in `src/__arch__/domain-manifest.ts`
- **When deleting/renaming a file:** update the path in `domain-manifest.ts`
- **When adding a new Supabase table:** add it to `owned_tables` of the owning domain
- **Run `npm run arch-test`** after any structural change — it catches manifest drift
- **Domain skills** (`.claude/skills/domains/`) should be updated when invariants or traps change, not after every code change

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

## Forbidden style patterns

These patterns are **banned** in all portal apps (except Command Center). Any agent or developer writing code must follow these rules.

### Never hardcode font-family
The body font is set in each app's `globals.css`. All elements inherit it. Do NOT add `fontFamily` to inline styles or CSS. If an element needs a different family, use the token:
```tsx
// body text — inherited, no declaration needed
// monospace — use token
className="font-[var(--font-family-monospace)]"
```

### Never hardcode colors
No hex (`#xxx`), no `rgb()`/`rgba()`, no Tailwind palette colors (`bg-gray-100`). Use semantic tokens:
```tsx
className="bg-[hsl(var(--bg-surface))]"    // not bg-white
className="text-[hsl(var(--text-muted))]"  // not text-gray-500
className="border-[hsl(var(--border-default))]" // not border-gray-200
```

### Never hardcode shadows
Use composite shadow tokens:
```tsx
className="shadow-[var(--shadow-sm)]"   // cards
className="shadow-[var(--shadow-lg)]"   // modals
className="shadow-[var(--shadow-xl)]"   // elevated panels
```

### Never hardcode overlays
Use alpha tokens for modal backdrops:
```tsx
className="bg-[hsl(var(--black-alpha-60))]"  // not rgba(0,0,0,0.6)
```

### Prefer Tailwind classes over inline styles
`style={{}}` is for dynamic/computed values only. Static styling goes in `className`.

### Use `@cmsmasters/ui` components
Check `packages/ui/src/primitives/` before building a one-off. Import what exists. If a primitive is missing and you need it, note it — don't hand-roll a replacement.

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
R2_BUCKET_NAME
# Future: ENVATO_API_KEY, RESEND_API_KEY, CLAUDE_API_KEY
# NOTE: SUPABASE_JWT_SECRET removed in WP-005C — auth uses supabase.auth.getUser() instead
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
- Auth middleware uses `supabase.auth.getUser(token)` — do NOT use manual JWT crypto (Supabase rotated from HS256 to ES256 in WP-005C; `SUPABASE_JWT_SECRET` was removed)
- Env type: `Env` interface in `src/env.ts`, used as `Hono<{ Bindings: Env }>`
- `.dev.vars` for local secrets (gitignored), `wrangler secret put` for production
- base64UrlDecode returns ArrayBuffer (CF Workers types)

### API route pattern (WP-005B)
```typescript
const blocks = new Hono<AuthEnv>()
blocks.post('/blocks', authMiddleware, requireRole('content_manager', 'admin'), async (c) => {
  const body = await c.req.json()
  const parsed = createBlockSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'Validation failed', details: parsed.error.issues }, 400)
  const supabase = createServiceClient(c.env)
  const data = await createBlock(supabase, { ...parsed.data, created_by: c.get('userId') })
  return c.json({ data }, 201)
})
```
- Auth middleware chain: `authMiddleware` → `requireRole()` → handler
- GET = any authenticated, POST/PUT = content_manager/admin, DELETE = admin only
- Zod validate before DB call — fail fast on bad input
- `created_by` injected from auth context, never from client payload
- Service client via `createServiceClient(c.env)` — bypasses RLS

### API error contract (WP-005B)
- `400 { error: 'Validation failed', details: zodIssues }` — Zod parse failure
- `404 { error: 'Block not found' }` — PGRST116 (no rows)
- `409 { error: 'Slug already exists' }` — 23505 (unique violation)
- `409 { error: 'Block is used in templates', templates: [...] }` — dependency check on delete
- `500 { error: 'Internal server error' }` — catch-all

### Dependency check pattern (WP-005B)
- `getBlockUsage(client, blockId)` — checks templates.positions jsonb for block references (client-side filter with M2 guard against malformed jsonb)
- `getTemplateUsage(client, templateId)` — checks themes.template_id (simple eq)
- DELETE returns 409 if dependencies exist — never deletes through the head

### Zod patterns
- Version 4 — `z.record(z.string(), z.unknown())` requires 2 args (not 1 like v3)
- `safeParse()` returns `{ success, data?, error? }`
- `ThemeFormData = z.infer<typeof themeSchema>`
- Validator naming: `createFooSchema` (full payload) + `updateFooSchema` (partial, slug immutable)

### Block model (WP-005B)

- **Block** = HTML + scoped CSS asset in `blocks` table. Hooks for dynamic data (price, links). No `packages/blocks/` package.
- **Template** = ordered position grid in `templates` table. `positions: [{ position, block_id: uuid|null }]`. One template → many themes.
- **Theme** = `template_id` (FK→templates, nullable) + `block_fills: [{ position, block_id }]` (per-theme additions)
- `template_id` empty-state contract: form layer = `''`, DB layer = `null`, validator = `z.string().uuid().or(z.literal('')).default('')`, mapper: `row.template_id ?? ''` (DB→form), `form.template_id || null` (form→DB)
- No `sections` field — dropped in WP-005B migration

### DB query pattern (WP-005B)
```typescript
export async function getBlockById(client: SupabaseClient, id: string) {
  const { data, error } = await client.from('blocks').select('*').eq('id', id).single()
  if (error) throw error
  return data
}
```
- Client injection as first parameter
- `if (error) throw error` — no silent failures
- Return raw `data` from Supabase response
- Type-safe: functions typed via `BlockInsert`/`BlockUpdate`/`TemplateInsert`/`TemplateUpdate`

### Boundary mapper pattern (WP-004 → WP-005B)

`packages/db/src/mappers.ts` — the ONLY boundary between DB and form:
- `themeRowToFormData()` — DB row to form state (null to default, `template_id: null` → `''`)
- `formDataToThemeInsert()` — form to DB insert (empty to undefined/null, `template_id: ''` → `null`)
- Thin: form shape mirrors DB shape. No field-by-field translation.

### Nested form convention (WP-004 → WP-005B)

Form shape mirrors DB shape: `{ slug, meta: {...}, template_id, block_fills: [...], seo: {...}, status }`.
react-hook-form paths: `register('meta.name')`, `register('seo.title')`.
Sections builder removed in WP-005B. WP-005C replaced it with template picker + position grid + per-theme block fills (all RHF fields flowing through the existing `formDataToThemeInsert` save pipeline unchanged).

### Studio API fetch pattern (WP-005C)

Studio SPAs call Hono API via raw `fetch` — NOT `hc<AppType>()` from `@cmsmasters/api-client`. Reason: `@cmsmasters/api-client` uses a type-only import from a relative path (`../../../apps/api/src/index`), which the Studio tsconfig doesn't include, causing all types to resolve as `unknown`.

Auth helpers live in `apps/studio/src/lib/block-api.ts` and are re-used by all API modules:
```typescript
// block-api.ts (source of auth helpers)
export function getAuthToken(): string { ... }     // throws if no session
export function authHeaders(): HeadersInit { ... } // { Authorization: Bearer <token> }
export function parseError(res: Response, fallback: string): Promise<never> { ... }

// template-api.ts (consumer)
import { authHeaders, parseError } from './block-api'
```

Raw fetch pattern:
```typescript
export async function fetchAllBlocks(): Promise<Block[]> {
  const res = await fetch(`${API_URL}/api/blocks`, { headers: authHeaders() })
  if (!res.ok) throw await parseError(res, 'Failed to fetch blocks')
  const json = await res.json() as { data: Block[] }
  return json.data
}
```

### BlockPreview component pattern (WP-005C)

`apps/studio/src/components/block-preview.tsx` — renders a block's HTML+CSS in a sandboxed iframe:
- ResizeObserver tracks container width → renders iframe at 2× width, CSS `scale(0.5)` + `transformOrigin: top left`
- `sandbox="allow-same-origin"` only (no scripts)
- `pointerEvents: none` — purely visual, no interaction
- `srcDoc` = concatenated `html + '<style>' + css + '</style>'`
- Animate-reveal classes overridden with `!important` (blocks may use opacity:0 reveal patterns)
- Props: `{ html, css, height?: number }` — height defaults to 160px in list, 120px in picker

### PositionGrid component pattern (WP-005C)

`apps/studio/src/components/position-grid.tsx` — controlled component, no internal state or data fetching:
- Props: `{ positions, blocks, readonlyPositions, onAddBlock, onRemoveBlock }`
- `readonlyPositions: number[]` — positions where [×] is hidden (template-defined slots)
- Readonly positions show: background tint + left border accent + dimmed name + "(template)" label
- Editable filled positions show: block name + [×] remove button
- Empty positions show: dashed border + "+" button → triggers parent's block picker

### TemplatePicker component pattern (WP-005C)

`apps/studio/src/components/template-picker.tsx` — inline (not modal) template selection grid:
- Fetches `fetchAllTemplates()` on mount via `useEffect(fn, [])`
- 2-column grid of template cards with selected highlight
- Used inside theme editor's "Page Layout" section; parent manages selected template state
- Template selection passes full `Template` object (not just ID) to parent callback to avoid re-fetch

---

## Block creation workflow (WP-006, ADR-023, ADR-024)

### Pipeline
1. Figma design → `/block-craft` skill → Claude Code generates HTML+CSS+JS → preview on `localhost:7777`
2. Iterate animations, interactions, layout until approved
3. Studio → Import HTML → Process panel:
   - Token scanner maps hardcoded CSS → `var(--token)` (auto-enabled suggestions, CM unchecks if broken)
   - R2 image upload replaces Figma MCP URLs with permanent CDN URLs (`POST /api/upload/batch`)
   - Component detection suggests `.cms-btn` classes for button-like elements
   - Animation classes (`reveal`, `animate`) preserved — not tokenized
   - JS extracted from `<script>` into separate `js` field
4. Save → block stored in Supabase (`html`, `css`, `js` columns)
5. Portal (Astro SSG) renders blocks at build time

### Block structure rules
- HTML wrapped in `<section class="block-{slug}" data-block>`
- ALL CSS selectors scoped under `.block-{slug}` — no global leaking
- Semantic HTML: `<button>` for actions, `<a>` for links, `<details>` for accordions — never `<div>` for interactive elements
- Button states via `portal-blocks.css` classes: `.cms-btn`, `.cms-btn--primary`, `.cms-btn--secondary`, `.cms-btn--outline`, `.cms-btn--cta`
- Animations: CSS scroll-driven `animation-timeline: view()` for entrance + `animate-utils.js` imports for behavioral (hover parallax, magnetic buttons)
- JS stored in `blocks.js` column, rendered as `<script type="module">` by Portal
- Only animate `transform` and `opacity` — compositor-safe, no layout thrashing
- `@media (prefers-reduced-motion: reduce)` respected

### Shared portal assets
- `packages/ui/src/portal/portal-blocks.css` — `.cms-btn` (4 variants, 3 sizes, all states), `.cms-card`, `[data-tooltip]`
- `packages/ui/src/portal/animate-utils.js` — `trackMouse`, `magnetic`, `stagger`, `spring`, `onVisible`
- `packages/ui/src/theme/tokens.css` — design tokens (Figma source of truth, synced via `/sync-tokens`)

---

## Responsive blocks (WP-024, ADR-025)

### Slot container-type

Layout Maker's css-generator emits `container-type: inline-size; container-name: slot` on the generic `[data-slot] > .slot-inner` rule. Block CSS may author `@container slot (max-width: …) { … }` to react to the block's slot width. Only leaf slots carry containment; container slots (with `nested-slots`) hold nested `<div data-slot>` children and correctly skip the rule.

**Forward-risk — theme-page wrapper:** `apps/portal/app/themes/[slug]/page.tsx` constructs a hand-written `<div class="slot-inner">` (NOT inside `[data-slot]`) for the `theme-blocks` closure. That wrapper does NOT get `container-type` from LM-generated layout CSS, so `@container slot` queries inside those blocks evaluate against the nearest ancestor instead of the theme-blocks slot. Composed pages (`[[...slug]]/page.tsx`) are unaffected. Deferred to a future WP.

**Forward-risk — lazy re-export rollout:** the `container-type` contract only lands on a theme when its layout CSS is regenerated and republished. Existing themes keep serving pre-WP-024 layout CSS until someone opens the layout in LM and hits Export. WP-024 does not batch-re-export — rollout is edit-driven.

### Block variants

`blocks.variants` is a nullable JSONB column of shape `Record<string, { html: string; css: string }> | null`. Null means "no variants" — renderer output is byte-identical to pre-WP-024. When present, `BlockRenderer` / `renderBlock()` inline all variants as sibling `<div data-variant="base">` + `<div data-variant="{name}" hidden>` elements; base + variant CSS concatenate into one `<style>` tag; `@container` rules inside block CSS reveal the matching variant at each slot width. Variant keys regex-gated by validators (`/^[a-z0-9-]+$/`); CSS content is not sanitized at render time — variant CSS MUST scope under `.block-{slug}` (authoring convention, enforced by block author).

### Responsive tokens file

`packages/ui/src/theme/tokens.responsive.css` is a hand-maintained companion to `tokens.css`. `/sync-tokens` does NOT touch it. Currently two clamp-based scaffold tokens (`--space-section`, `--text-display`); real population is deferred to WP-029 so design choices can be informed by real use in WP-025/026. Import order in portal globals: `tokens.css` before `tokens.responsive.css` before `portal-blocks.css`.

---

## Block Forge Core — when to call (WP-025, ADR-025)

`@cmsmasters/block-forge-core` is the pure-function engine behind responsive block authoring. Consumed by `tools/block-forge` (WP-026) and Studio Responsive tab (WP-027); never by portal at render time.

### Public surface (6 functions)

| Function | Returns | Purpose |
|---|---|---|
| `analyzeBlock({html, css})` | `BlockAnalysis` | PostCSS-AST parse → flat rules list + element tree + warnings |
| `generateSuggestions(analysis)` | `Suggestion[]` | Six ADR-025 heuristics in fixed order; IDs are deterministic djb2 hashes |
| `applySuggestions(block, accepted)` | `BlockOutput` | Emit accepted suggestions as `@container slot (max-width:Npx)` chunks (or top-level for `bp:0`). `accepted: []` → identity |
| `emitTweak(tweak, css)` | `string` | PostCSS mutation — append chunk / add inner rule / update decl |
| `composeVariants(base, variants)` | `BlockOutput` | Scope variant CSS under `[data-variant="{name}"]` + reveal-rule in `@container` |
| `renderForPreview(block, opts?)` | `PreviewResult` | Portal-parity preview — `<div data-block-shell="{slug}">…</div>` + `stripGlobalPageRules` CSS |

Types: `BlockInput`, `BlockOutput`, `BlockAnalysis`, `Rule`, `Element`, `Suggestion`, `Heuristic`, `Confidence`, `Tweak`, `Variant`, `PreviewResult` — from `packages/block-forge-core/src/lib/types.ts`.

### Variant name → breakpoint convention (locked)

| Variant name | Reveal breakpoint |
|---|---|
| `sm` or `/^4\d\d$/` | `(max-width: 480px)` |
| `md` or `/^6\d\d$/` | `(max-width: 640px)` |
| `lg` or `/^7\d\d$/` | `(max-width: 768px)` |
| anything else | no reveal rule — `onWarning` fires, variant CSS still inlined |

`composeVariants` warns (via optional callback) for unknown names; it never throws. Block authors pick names from this table or document a new one here.

### `bp: 0` — unconditional rules

`media-maxwidth` heuristic emits suggestions with `bp: 0`. In `applySuggestions` and `emitTweak` this is a branch: `bp === 0` → top-level rule, NOT wrapped in `@container`. Other heuristics never emit `bp: 0`.

### Why tokenized content doesn't trigger clamp suggestions

Heuristics intentionally skip values containing `var(…)`, `calc(…)`, `clamp(…)`, `min(…)`, `max(…)`, `%`, `vw/vh/em` (but NOT `rem`). Token-driven padding like `var(--spacing-5xl, 64px)` is already a design-system decision — rewriting it into `clamp()` would fight the token layer. Feature, not bug.

To get a clamp suggestion, author raw `px`/`rem` at ≥40px spacing or ≥24px font-size. If you see a block you expected to light up and didn't, check the CSS for `var(` first.

### Portal render parity

`renderForPreview` matches `apps/portal/lib/hooks.ts` → `renderBlock()` non-variant output: wrap in `<div data-block-shell="{slug}">`, pass CSS through `stripGlobalPageRules`. It does NOT prefix-scope with `.block-{slug}` — portal relies on authored `.block-{slug}` selectors already present in block CSS.

---

## Block-forge dev tool conventions (WP-026, ADR-025)

`tools/block-forge/` is the first consumer of `@cmsmasters/block-forge-core`. These rules apply to block-forge specifically; other Vite-based dev tools (layout-maker, studio-mockups) are free to pick their own patterns unless explicitly called out.

### 1. File I/O contract (save safety)

Six non-negotiable rules from the WP-026 Phase 0 / `tools/block-forge/src/lib/file-io.ts`:

1. **Read guards.** `readBlock` rejects missing/empty `html` or `slug` with a typed `BlockIoError`. The renderer never sees invalid input.
2. **Write scope.** Writes are restricted to the exact file path that was opened. No new-file creation, no directory traversal — the POST handler in `vite.config.ts` (`blocksApiPlugin`) checks `access(filepath, W_OK)` before write.
3. **First-save-per-session backup.** First save in a session writes `<path>.bak` with the pre-overwrite bytes verbatim. Client tracks `session.backedUp: boolean` in `src/lib/session.ts`; POST body carries `requestBackup: boolean` so the server stays stateless.
4. **Dirty-state guards.** `beforeunload` prompts on tab close while the session has pending accepts; picker-switch confirms discard via `window.confirm`.
5. **No-op Save.** Save button is disabled when `session.pending.length === 0 || saveInFlight`.
6. **No deletes.** Block-forge never removes `.json` or `.bak` files. Clean-up is out-of-band (manual).

Reference: `tools/block-forge/PARITY.md` for the preview-side contract; `tools/block-forge/README.md` for the end-user explanation.

### 2. Preview parity with portal

Block-forge's iframe MUST match `apps/portal/lib/hooks.ts` → `renderBlock()` non-variant output byte-for-byte (modulo theme-page chrome, which block-forge omits by design):

- **Token injection:** `packages/ui/src/theme/tokens.css` and `tokens.responsive.css` inside `@layer tokens`.
- **Slot wrapper:** `<div class="slot-inner"><div data-block-shell="{slug}">…</div></div>`. The outer `.slot-inner` carries `container-type: inline-size; container-name: slot` (set in `@layer shared`), matching LM's `css-generator.ts:254-255`.
- **`@layer` order:** `tokens, reset, shared, block`. Non-negotiable — authored block CSS may rely on cascade order.
- **Change discipline:** ANY change to token injection, slot wrapper, or `@layer` order MUST update `tools/block-forge/PARITY.md` in the same commit. See PARITY.md "Discipline" section.

LM does NOT wrap its iframe this way (legacy blocks use `@media`, not `@container slot`). Do not copy LM's iframe pattern into block-forge.

### 3. Vitest config for Vite tools

When a Vite-based tool imports `?raw` CSS (block-forge's `preview-assets.ts` does), `vite.config.ts` MUST include `test: { css: true }`:

```ts
test: {
  css: true,  // required — ?raw imports load as empty strings otherwise
  environment: 'node',
  // ...
}
```

Without it, assertions that scan the CSS content silently run on empty strings and pass on nothing. Reference saved memory `feedback_vitest_css_raw.md`.

### 4. `data-*` test hooks for dev tools

Dev tools use stable DOM selectors via `data-*` attributes (non-presentational, zero CSS impact) rather than text content or Tailwind class chains. Block-forge's reserved hooks:

- `data-action="save"` — Save button in `StatusBar`.
- `data-action="accept" | "reject" | "undo"` — Suggestion row buttons.
- `data-role="source-path" | "pending-count" | "last-saved" | "save-error"` — Status bar readouts.
- `data-role="warnings"` — SuggestionList warnings region.
- `data-pending="true"` — Row in pending state.
- `data-suggestion-id="{id}"` — Row identity for targeting one of many.
- `data-region="triptych" | "suggestions" | "status"` — Top-level app regions.

Browser QA (Chrome DevTools, Playwright) and integration tests (`src/__tests__/integration.test.tsx`) consume these. Renaming any hook requires a test sweep.

Apps (portal / dashboard / studio / admin) continue to prefer semantic ARIA roles first; `data-*` is for dev-tool surfaces where test-only hooks don't leak into production UX.
