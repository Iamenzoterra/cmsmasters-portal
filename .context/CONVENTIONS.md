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

### Vite env file resolution (WP-028 Phase 6 / OQ3)

**`apps/studio/vite.config.ts:7` sets `envDir: '../..'`** — Vite loads env
files from REPO ROOT, not from `apps/studio/`. Putting `.env` or `.env.local`
inside `apps/studio/` has NO EFFECT; those files are silently ignored.

All Studio env vars (`VITE_API_URL`, `VITE_SUPABASE_URL`, etc.) live in:
- `/.env` — committed defaults (prod URLs)
- `/.env.local` — gitignored local overrides (localhost URLs)

**Workaround for local dev:** append `VITE_API_URL=http://localhost:8787` to
`/.env.local` (already contains Supabase dev keys etc.).

**Why `envDir: '../..'`:** shared monorepo env across apps (dashboard, admin,
studio, command-center) — single source of truth at repo root. Do NOT change
this without auditing all app consumers.

See `logs/wp-028/parked-oqs.md` §OQ3 for the Phase 4 symptom + Phase 6 fix.

### Extract-vs-reimplement empirical metric (WP-028 Phase 0)

WP-028 validated the **reimplement-in-both** cross-surface discipline at 10× complexity vs WP-026/027. Phase 0 RECON measured non-cosmetic diff counts between surface bodies; threshold for "extract to shared package" kicks in at **~15 non-cosmetic diffs**. WP-028 stayed REIMPLEMENT at ~4 diffs post-close (cross-surface bodies byte-identical modulo 3-line header + surface-specific `composeSrcDoc` import path per Ruling GG).

**Rule:** if adding a new UI pattern would push the diff count above ~15, extract to `packages/block-forge-ui/` instead. Below that, byte-identical reimplement is cheaper than the package overhead (install dance, build step, version churn).

Reference: `logs/wp-028/phase-0-result.md` empirical metric section + `tools/block-forge/PARITY.md` §Variant Editor discipline note.

### Byte-identical cross-surface component body discipline

When a component ships on both `tools/block-forge` and `apps/studio/src/pages/block-editor/responsive`, the `.tsx` body MUST be byte-identical modulo:

1. **3-line JSDoc header** — references each surface's wiring context
2. **Surface-specific imports only** — e.g. block-forge `../lib/preview-assets` vs Studio `./preview-assets` (Ruling GG explicit exception)

Any divergence beyond these two axes = drift. The PARITY.md files (both surfaces) track this contract; cross-commit discipline requires byte-identical body landings in the same commit (same-commit discipline).

Reference: `tools/block-forge/PARITY.md` + `apps/studio/src/pages/block-editor/responsive/PARITY.md` (cross-mirror files).

### Cross-tab concurrency (block-editor surfaces)

Studio's `block-editor.tsx` integrates 3 editing surfaces (Editor textarea, Responsive suggestion list, Responsive tweak/variant drawer) against one RHF form instance. **Last-write-wins semantics** — no per-tab isolation, no conflict UI. Enumerated in both PARITY.md files §Cross-tab concurrency.

No new logic added unless real data loss is observed. WP-028 Phase 4 smoke + Phase 5 integration pins confirmed no data loss; the contract is documentation-only.

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

## Block creation workflow (WP-006, ADR-023, ADR-024, WP-035, WP-038)

### Pipeline (post-WP-038 — 2026-04-28)
1. Figma design → `/block-craft` skill → Claude Code generates HTML+CSS+JS → preview at `localhost:7777`
2. Iterate animations, interactions, layout in `tools/studio-mockups/<name>.html` until approved (many cycles)
3. User signals FINALIZE in natural language ("забираю", "готово", "ship", etc. — see `feedback_block_craft_finalize_protocol`); skill confirms slug + name (filename-first proposal); SPLIT contract assembles 11-key BlockJson and writes to `tools/block-forge/blocks/<slug>.json`. `id` field omitted (Studio Import server-resolves). `studio-mockups/<name>.html` stays on disk for further iterate cycles.
4. User refreshes Forge `:7702` → block appears in picker → polish responsive variants, fluid mode, Inspector tweaks (WP-019/028/033 surfaces)
5. Forge `[Export]` → Download JSON or Copy payload → Studio `[Import JSON]` → `POST /api/blocks/import` (Hono upserts by slug) → server-side fire-and-forget revalidate
6. Process panel runs on Studio side post-Import only when needed for image upload (R2) — token scanning is no longer required for block-craft output (skill emits scoped tokens already). Component detection (`.cms-btn` classes) is still a Studio Process step for legacy HTML imports.
7. Portal (Next.js, post-WP-007) renders blocks at request time via `BlockRenderer`; revalidate from step 5 flushes cache so the next request picks up the new HTML/CSS/JS.

### Re-finalize loop (post-Phase 1 broadening)

After step 5 lands the block in DB, the user may return to step 2 for desktop tweaks in `studio-mockups/<name>.html`. Re-finalize is idempotent: skill re-extracts html/css/js from updated mockup; preserves all other 8 fields (`slug`, `name`, `block_type`, `is_default`, `sort_order`, `hooks`, `metadata`, `variants`) from existing `tools/block-forge/blocks/<slug>.json`. Forge UI mutations (e.g. responsive variants, Inspector edits, slot-category overrides) are durable across re-finalize cycles. Mental model: studio-mockups HTML owns *content*; Forge sandbox JSON owns *about* the block.

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

`packages/ui/src/theme/tokens.responsive.css` is a **machine-generated** companion to `tokens.css` — produced by `tools/responsive-tokens-editor/` (`:7703`). Source of truth: `packages/ui/src/theme/responsive-config.json` (sibling file in the same dir, hand-edited via the editor's UI, written by the same Save flow). `/sync-tokens` does NOT touch either file. WP-024 shipped a 2-token scaffold (`--space-section`, `--text-display`); WP-030 (✅ DONE 2026-04-26) populated the file with the full fluid scale (10 typography + 11 spacing + 1 special + 3 container BPs = 22 fluid tokens + 3 discrete container @media blocks). **Edit convention:** open the editor, change values, click Save — NEVER edit `tokens.responsive.css` directly (next Save overwrites). Import order in portal globals: `tokens.css` before `tokens.responsive.css` before `portal-blocks.css`.

---

## Responsive tokens authoring (WP-030, ADR-025 Layer 1)

`tools/responsive-tokens-editor/` (`:7703`) is the canonical authoring surface for `packages/ui/src/theme/tokens.responsive.css`. Built per ADR-025 Layer 1 (auto tokens) — Utopia full-system fluid scale config drives auto-generated `clamp()` values; per-token override available for outliers.

### Cascade-override pattern

Token resolution order at runtime:
1. `tokens.css` (Figma-synced static values; e.g. `--h1-font-size: 54px`)
2. `tokens.responsive.css` (machine-generated `clamp()` overrides; same custom-property names)
3. Container `@media` blocks (mobile-first cascade for `--container-max-w` + `--container-px`)

The cascade ensures: blocks authoring against `var(--h1-font-size)` get the FLUID value at runtime (same custom-property name), but the static fallback survives if `tokens.responsive.css` is missing (e.g. dev tooling that imports only `tokens.css`).

### Conservative-defaults rule (Phase 0 ruling 1)

V1 defaults preserve current desktop static rendering — `clamp(minPx, slope, maxPx)` resolves to `maxPx` at the editor's `maxViewport` (1440 by default). Result: existing blocks render IDENTICALLY on desktop post-WP-030 vs pre-WP-030. Mobile fluidity is the only NEW behavior. This is the deliberate trade-off between "introduce graceful mobile fluidity" and "do not regress desktop rendering on 4500+ themes in the wild".

### When to add token vs override

| Scenario | Action |
|----------|--------|
| Author wants a new fluid token at a Type Scale step (e.g. between `--text-base` and `--text-lg`) | **Add token at scale step** — extend `stepMap` in `responsive-config.json` (via editor's Type Scale UI). Generates `clamp()` from scale math at min/max viewports. |
| Author wants to tighten/loosen the clamp range for an existing token (e.g. `--h1-font-size` mobile floor 32px instead of 44px) | **Override** — edit `overrides[--h1-font-size].minPx/maxPx` in `responsive-config.json` (via editor's Token Preview Grid override modal). Reason field documents why. |
| Author wants to disable fluidity entirely for a token | **Override with `minPx === maxPx`** — clamp degenerates to constant. |
| Author wants discrete per-BP container widths (NOT fluid clamp) | **Container Widths Editor** — `containers.{mobile,tablet,desktop}.{maxWidth,px}`. Generator emits `:root + 2 @media` blocks. |

### Editor save flow

1. Click Save in `:7703` → POST to Vite dev-server middleware `/api/save-config`
2. Server writes BOTH files (`responsive-config.json` SOT + `tokens.responsive.css` cascade-override)
3. First save per session creates `.bak` siblings (preserves pre-edit bytes for rollback)
4. Toast "Saved. Run `git commit` to deploy." confirms — author commits manually (no auto-deploy)
5. Cross-surface activation is automatic: `apps/portal/app/globals.css:3` + `tools/block-forge/src/globals.css:2` + 2 `preview-assets.ts` `?raw` imports re-resolve on next request / Vite HMR

### WCAG override gate (1.4.4)

Editor validates each fluid token against WCAG 1.4.4 (max-px ÷ min-px ≤ 2.5). Violations show inline banner + global header banner. Save button blocked when violations exist UNLESS author explicitly toggles "Save anyway despite N WCAG violation(s)" — forces a deliberate decision, not a silent override.

### Per-BP fluid opt-out (`data-fluid-tablet` / `data-fluid-mobile` attributes)

Some block classes look correct at static desktop sizes only at specific viewports — fluid scaling actively hurts them at tablet, or at mobile, or both. Each BP is independently togglable. The opt-out hooks live in `packages/ui/src/theme/tokens.responsive.opt-out.css` (companion to `tokens.responsive.css`).

**Author usage** — independent attributes on the block element:

| Attribute | Behavior |
|---|---|
| `data-fluid-tablet="off"` | Pin desktop sizes at tablet viewport (768px ≤ vw < 1280px); fluid below |
| `data-fluid-mobile="off"` | Pin desktop sizes at mobile viewport (vw < 768px); fluid above |
| (both attributes absent / not "off") | Default — full fluid scaling per `tokens.responsive.css` clamps |

Combine both for full opt-out. Desktop has no toggle: at desktop viewport (≥1280px) the fluid clamp already evaluates to maxPx, so a desktop opt-out would be a visual no-op.

```html
<!-- Pin tablet only — heading stays desktop-sized at 768-1279, fluid below -->
<section class="block-theme-name" data-fluid-tablet="off">…</section>

<!-- Full opt-out — both tablet and mobile pinned -->
<section class="block-theme-name" data-fluid-tablet="off" data-fluid-mobile="off">…</section>
```

**Mechanic** — viewport `@media` query × CSS specificity. The media gate restricts the override to the matching BP range; `[data-fluid-*="off"]` specificity beats the `:root` cascade, re-binding the same token names to their static maxPx values within the block scope. All `var(--token)` references in descendant CSS resolve via custom-property inheritance — no per-block CSS edits needed.

**Legacy `data-fluid` migration** — the parser still reads pre-redesign `data-fluid="off" | "desktop-only"` for backward compat (maps to the new per-BP shape: `off` → both off, `desktop-only` → tablet=off, mobile=on). The writer always emits the new attrs and strips legacy `data-fluid` it encounters. Zero blocks in `content/db/blocks/` use the legacy attribute as of WP-030 redesign — the migration is parse-only insurance.

**Drift caveat** — `tokens.responsive.opt-out.css` is currently HAND-MAINTAINED to mirror the maxPx of each clamp in `tokens.responsive.css`. If the editor changes a maxPx (or adds/removes a token), `tokens.responsive.opt-out.css` MUST be re-synced manually. Polish queue item: editor regenerates this file alongside `tokens.responsive.css` (eliminates drift). Tracked for WP-031 / polish.

**Cross-surface activation** — the opt-out file is consumed via:
1. `apps/portal/app/globals.css` — `@import` after `tokens.responsive.css`
2. `tools/block-forge/src/lib/preview-assets.ts` — `?raw` import injected into `@layer tokens` block of iframe srcdoc
3. `apps/studio/src/pages/block-editor/responsive/preview-assets.ts` — same (PARITY mirror)

The new attrs work identically in production rendering, block-forge previews, and Studio Responsive tab previews.

**UI affordance — block-forge per-tab `FluidModeControl`** — 2-state segmented toggle (Fluid | Static) rendered next to the active tab's controls in `PreviewTriptych`. Visible only when the active tab is Tablet or Mobile (Desktop hides the toggle since fluid==static there). Reads/writes `data-fluid-tablet` / `data-fluid-mobile` on the FIRST opening tag of `block.html`. Implementation: `tools/block-forge/src/components/FluidModeControl.tsx` + parser at `tools/block-forge/src/lib/fluid-mode.ts`. Persists through existing save flow (`session.fluidModeOverride` → `composedBlock.html` → `applySuggestions` → `saveBlock`).

**Studio mirror — TODO follow-up** — Studio Responsive tab does NOT yet have the equivalent toggle (PARITY divergence). Author working in Studio must hand-edit block HTML in DB. Tracked for polish queue / WP-031 — extract shared primitive OR reimplement per WP-028 reimplement-not-extract decision and wire into `apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx` near the Process button.

### Run command

```bash
cd tools/responsive-tokens-editor && npm run dev
# ... opens :7703
```

Or via root alias (if defined): `npm run responsive-tokens-editor`. (As of Phase 7 close, root alias is NOT yet wired — Phase 6 verified the `cd` path; root alias falls into post-WP polish queue per `feedback_no_blocker_no_ask`.)

### Cross-surface PARITY discipline (WP-030 Phase 6)

Three PARITY.md files cross-reference each other:
- `tools/responsive-tokens-editor/PARITY.md` — full save-flow contract + cascade-override pattern + save-safety 6 rules
- `tools/block-forge/PARITY.md` §"WP-030 cross-surface PARITY (Phase 6)" — block-forge consumption via TWO paths (globals.css cascade + preview-iframe `?raw`)
- `apps/studio/src/pages/block-editor/responsive/PARITY.md` §"WP-030 cross-surface PARITY (Phase 6)" — Studio consumption via `preview-assets.ts:19` `?raw` import (already-wired since WP-027)

Auto-propagation: any token addition / removal / rename in generator output flows automatically through both consumption paths via Vite import primitives. Manual same-commit edits needed ONLY when `@layer` order, file path, or sibling-file structure changes.

Reference: `tools/responsive-tokens-editor/PARITY.md` for the canonical contract.

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

### 0. NPM workspace nit

`tools/block-forge/` is **NOT** an npm workspace (root `package.json`
`workspaces` covers `apps/*`, `packages/*`, `tools/layout-maker` only).

- **DO** `cd tools/block-forge && npm <cmd>` to run package-scoped commands.
- **DON'T** `npm -w tools/block-forge <cmd>` from repo root — fails with
  "No workspaces found".

WP-029 Phase 2 surfaced this gap.

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

### 5. Render-level regression pin pattern (WP-029 Task B)

When a regression vector requires **production code** to fire (not a harness
mirror), pin via a full `<App />` mount with mocked module boundaries.
`tools/block-forge/src/__tests__/app-save-regression.test.tsx` is the canonical
reference.

- **DO** mount the production component (`<App />` for block-forge save flows)
  + mock the module boundary (`vi.mock('../lib/api-client', …)` for HTTP).
  Use `import * as apiClient` + typed `vi.mocked()` access — apiClient
  signature drift surfaces as a TypeScript compile error, not a silent runtime
  no-op.
- **DO** add jsdom polyfills file-level (mirror `TweakPanel.test.tsx` L11–25 +
  `VariantsDrawer.test.tsx` L7–28 — `ResizeObserver` + `setPointerCapture` /
  `releasePointerCapture` for Radix UI Dialog/Slider). Never global; avoids
  cross-file pollution.
- **DO** codify drift detectors as `test.skip(...)` with an inverted assertion
  + an inline activation comment (step-by-step recipe). AC-gate
  `git diff --quiet` before commit guards against accidental un-skip leak
  (Brain WP-029 ruling C4).
- **DO** convert prior harness-mirror pins to `it.skip('historical/baseline:
  …', () => { /* original assertions preserved verbatim */ })`.
  **Prefer `it.skip` over body-comment** — keeps the Vitest count honest
  (no-op `it()` shells silently count as "passed"; WP-029 Phase 2 honest-gap
  closure B).
- **DON'T** delete historical harness-mirror pins — preserve payload-shape
  intent in commented bodies.
- **DON'T** assert sequence-of-calls (`mock.mock.calls[0]`,
  `mock.mock.calls[1]`, …) when a behavior assertion exists. Testing
  implementation order leans toward mock-testing anti-pattern.
- **DON'T** spy on internal helpers (e.g. `vi.spyOn(composeTweakedCss)`) to
  prove a code path was taken. Prefer asserting the observable artefact
  (a CSS substring in the saved payload) — spying on internals is the same
  harness-mirror trap render-level pins exist to escape.

Reference: `tools/block-forge/src/__tests__/app-save-regression.test.tsx`
+ `logs/wp-029/phase-2-result.md` + `logs/wp-029/phase-2-drift-experiment.md`
(empirical drift validation).

---

## Studio Responsive tab conventions (WP-027, ADR-025)

`apps/studio/src/pages/block-editor.tsx` hosts a 2-tab interface (Editor | Responsive). The Responsive tab surfaces `@cmsmasters/block-forge-core` heuristics against the currently-loaded block. These rules apply to the Responsive tab specifically; the Editor tab's rules are inherited from WP-006 block-editor.

### 1. Preview render — Path B (engine absorbs composeVariants)

The Responsive tab's preview triptych feeds `renderForPreview(block, { variants })` directly. The engine returns pre-wrapped HTML (`<div data-block-shell="{slug}">…</div>`) and stripped CSS — Studio's `composeSrcDoc` drops the inner shell wrap to avoid double-nesting.

**Deliberate deviation from `tools/block-forge/PARITY.md` §7:** block-forge wraps twice (its own `composeSrcDoc` + engine's `renderForPreview`) because block-forge predates Path B. Studio's composeSrcDoc is a conscious single-wrap. Do NOT "align with block-forge" by adding the inner wrap — you'll regress to triple-nest. See `logs/wp-027/phase-2-result.md` for the original trace + `tools/block-forge/PARITY.md` → "WP-027 Studio Responsive tab cross-reference".

### 2. Session state — pure mirror of block-forge's session.ts

`apps/studio/src/pages/block-editor/responsive/session-state.ts` is a pure-function module mirroring `tools/block-forge/src/lib/session.ts` minus two fields (`backedUp`, `lastSavedAt`) that don't apply to DB-backed authoring. API: `createSession, accept, reject, undo, clearAfterSave, isActOn, pickAccepted, isDirty`. Tests mirror block-forge verbatim at `apps/studio/src/pages/block-editor/responsive/__tests__/session-state.test.ts`.

**Trap:** `isDirty(session)` reports pending accepts ONLY. The canonical "unsaved changes" signal combines `isDirty(session) || formState.isDirty` — React Hook Form's `formState.isDirty` tracks the Editor tab's textarea separately. Save button consumes the OR.

### 3. Accept → form dirty via callback

The `ResponsiveTab` emits an optional `onApplyToForm(block: Block)` callback when a suggestion is Accepted. `block-editor.tsx` wires it to:
```tsx
form.setValue('code', blockToFormData(appliedBlock).code, { shouldDirty: true })
```

This is the ONLY bridge between the session state and the RHF form. If the callback is omitted, Accept silently updates session but leaves the form clean — Save button would not enable. Always wire the callback when mounting `ResponsiveTab` outside a read-only context.

### 4. Revalidation on Save — cache-wide via `{}`

`handleSave` in `block-editor.tsx` POSTs to `/api/content/revalidate` with empty body `{}` after a successful PATCH. Hono's `revalidate.ts` handler was extended (≤15 LOC) to accept `{}` / `{ all: true }` and forward `{}` to Portal — `revalidatePath()` with no argument invalidates every tag.

**Trap:** Do NOT default to `{ slug, type: 'block' }` path-scoped revalidation for block saves. Block CSS changes cascade to every theme using the block; single-path revalidation misses the layout cache. Memory `feedback_revalidate_default.md` enforces this.

### 5. Tab-switch preservation

Session state lives in `ResponsiveTab`'s `useState` and persists across tab switches via CSS `display: none` on the inactive tab (NOT unmount). Unmounting would wipe pending accepts on every Editor↔Responsive toggle — UX-hostile and session-destructive. The parent also passes `saveNonce` (counter incremented on successful save) so the child can `clearAfterSave` precisely on save-success — not on Discard.

**Trap:** If future work moves `ResponsiveTab` to a route-based split or Suspense boundary, session state MUST lift to `block-editor.tsx` (or a context) before unmount lands. Silent fix path: add `persistSession` prop + `useEffect` sync.

### 6. Dirty-state coupling across block-editor surfaces (WP-028 Phase 5)

Studio's `block-editor.tsx` integrates 3 editing surfaces that all write into the same RHF `form` instance: Editor-tab Code textarea, Responsive-tab suggestion list (Accept/Reject), and Responsive-tab tweak/variant drawer. Last write wins — there is no per-tab isolation or conflict-resolution UI. `formState.isDirty` is the canonical save-enabling signal; every dispatch that mutates form state sets `shouldDirty: true` so the existing Save footer fires uniformly.

Full enumeration (Studio + block-forge mirror) lives in `apps/studio/src/pages/block-editor/responsive/PARITY.md` §Dirty-state contract. `tools/block-forge/PARITY.md` carries a byte-identical section for the session-driven sibling surface.

**OQ2 clear-signal (Phase 5):** `formDataToPayload` emits `variants: null` on empty and the full map otherwise. The validator (`updateBlockSchema.variants`, `createBlockSchema.variants`) accepts `variantsSchema.nullable().optional()`; Hono forwards whole `parsed.data` through to Supabase so `update({ variants: null })` NULLs the column. Pre-Phase-5 emitted `undefined`, which Supabase JS silently dropped — DB kept the prior value and the author's "delete all variants" intent never reached disk. See `logs/wp-028/parked-oqs.md` OQ2 for the full trace.

### 7. Edit-time validator pattern (WP-029 Task A)

`apps/studio/src/pages/block-editor/responsive/validateVariantCss.ts` is the
canonical reference for **non-blocking, edit-time validators** in this monorepo.
Reuse this shape for any future advisory check.

- **DO** make the validator a pure helper — input string + context, output
  `Warning[]`. Empty input → empty array; parse errors → single
  `{ reason: 'parse-error' }` warning (no throw).
- **DO** parse via PostCSS for CSS validators — already a transitive Studio dep
  via `@cmsmasters/block-forge-core`; no devDep additions required.
- **DO** latch on the integration's existing debounce (`VariantEditorPanel`
  uses 300ms). Validator state is local React state synced via
  `useState(() => validator(...))` lazy init + an effect on the watched fields.
- **DO** flush-on-unmount via `latestRef` + empty-deps `useEffect` cleanup
  reading the ref (Ruling BB pattern). NEVER put `[stateField]` in cleanup
  deps — fires every keystroke, collapses the debounce window
  (WP-028 Phase 4 Ruling BB; WP-029 Phase 1 confirmed).
- **DO** render warnings as inline JSX next to the edited field. Use
  `--status-warn-fg` / `--status-warn-bg` tokens (NOT `--status-warning-*` —
  see `logs/wp-028/parked-oqs.md` §OQ-α drift chip).
- **DON'T** block save based on validator output — banner is advisory.
  RHF `formState.isDirty` and the Save button stay independent.
- **DON'T** introduce a new debounce wrapper if the integration already has one.
- **DON'T** add a one-off `<Banner />` component file for a single banner
  instance — inline JSX is cheaper. Extract only if reused across surfaces.

Reference: `apps/studio/src/pages/block-editor/responsive/validateVariantCss.ts`
+ `VariantsDrawer.tsx::VariantEditorPanel` integration site

## Inspector pattern (WP-033, ADR-025 Layer 2)

The Inspector is the canonical DevTools-style authoring surface for responsive blocks. It coexists with TweakPanel (V1; sunset deferred) and ships in two surfaces — `tools/block-forge` (canonical) and `apps/studio/src/pages/block-editor/responsive/inspector` (cross-surface mirror).

### 1. Hover/pin postMessage protocol (cross-surface; locked)

Iframe IIFE (in `preview-assets.ts` of each surface) emits four message types in the `block-forge:` namespace:

| Type | Payload | Direction |
|---|---|---|
| `block-forge:inspector-hover` | `{ slug, selector, rect }` | iframe → host |
| `block-forge:inspector-unhover` | `{ slug }` | iframe → host |
| `block-forge:inspector-request-pin` | `{ slug, selector, rect }` | iframe → host |
| `block-forge:inspector-pin-applied` | `{ slug, selector, computedStyle }` | iframe → host (after host sets `data-bf-pin`) |

`rAF` throttle on hover dedup; cleanup on unmount. Inspector orchestrator listens to all four, plus the existing `block-forge:element-click` for TweakPanel coexistence.

### 2. DevTools mental model

- **Single pin per slug.** Pinning a new element auto-clears the prior pin.
- **Active cell editable on focus** (current breakpoint cell). Inactive cells render `↗` to switch BP without re-pinning.
- **Empty cells render `—`** when no value; the per-BP probe fills these on iframe-ready.
- **Validation** rejects empty + bare `em` (regex `(?<!r)em`); `rem | px | % | var(...) | keyword` all pass; invalid input snaps back via `e.currentTarget.value = value`.

### 3. Per-BP cell sourcing — Option A (3 hidden iframes)

`useInspectorPerBpValues(slug, html, css, selector, properties)` mounts 3 hidden iframes — one per breakpoint — and `getComputedStyle`s the pinned selector. Module-scoped cache by `(selector, cssHash)` via djb2; cleanup on unmount + pin clear.

**MUST** wrap html through `renderForPreview({slug, html, css}, {variants:[]})` BEFORE `composeSrcDoc` to match the visible DOM's `<div data-block-shell="{slug}">` wrap. Skipping the wrap silently misses selectors (Phase 3 §3.3 fix).

### 4. Chip detection — Option B-subset (PostCSS cascade walk)

`useChipDetection(css, selector, property, activeBp)` walks PostCSS root: top-level rules first, then `@container slot (max-width: <bp>)` rules whose bp === activeBp. Within each, picks the LAST decl for `property` (cascade ≈ source order). Linear-interp resolution against `responsive-config.json` 22-token compatibility table (10 type + 11 spacing + 1 special).

**Import path** is `@cmsmasters/ui/responsive-config.json` (package export; Phase 4 Ruling 5). Both surfaces use this — relative-path workaround from Phase 3 is obsolete.

### 5. Emit chains diverge (block-forge vs Studio)

| Surface | Chain | Notes |
|---|---|---|
| `tools/block-forge` | `addTweak` reducer → `session.tweaks` → `composeTweakedCss` → save | Session is SOT; OQ5 invariant pins `composeTweakedCss` BEFORE `applySuggestions` in `handleSave`. |
| `apps/studio` | `dispatchInspectorEdit(form, edit)` → `form.code` → save serializes verbatim | Form.code is SOT; LIVE-read invariant matches `dispatchTweakToForm` (WP-028 Phase 2 OQ4). 3 edit kinds: `tweak` / `apply-token` / `remove-decl`. |

Chip apply emits `{bp:0, value:'var(--token)'}` — same shape both surfaces. Visibility uncheck differs: block-forge uses session reducer's `removeTweakFor`, Studio uses `removeDeclarationFromCss(css, selector, bp, property)` PostCSS walk (Studio-local; Phase 4).

### 6. TweakPanel + Inspector coexistence (V1; locked)

Both surfaces mount BOTH controls. Inspector is preferred for discrete property edits + token-aware suggestions; TweakPanel is preferred for continuous-drag value tweaking. Both listen to `block-forge:element-click` and write to the same emit pipeline (form.code on Studio; session.tweaks on block-forge). Sunset decision deferred — surfaces field data on which surface authors actually prefer.

### 7. Live-rerender contract (post-Phase 5 OQ1)

Studio's `displayBlock` derivation (`ResponsiveTab.tsx::518`) follows `watchedFormCode` so Inspector + TweakPanel + SuggestionList tweaks reflect in the visible iframe IMMEDIATELY (no save round-trip). Block-forge has had this contract since Phase 1 (live-form coupling).

### 8. Known limitation — chip cascade override (WP-034 stub)

Chip apply emits at `bp:0` but pre-existing `@container slot` rules at higher specificity may continue to override the token. Tooltip pin (Phase 4 Ruling 2) surfaces the caveat: `"Sets {M}/{T}/{D}px at M/T/D · Note: existing breakpoint overrides may still apply."` Full fix scoped at `workplan/WP-034-inspector-cascade-override.md` (BACKLOG).

References:
- `tools/block-forge/PARITY.md` §Inspector
- `apps/studio/src/pages/block-editor/responsive/PARITY.md` §Inspector
- `tools/responsive-tokens-editor/PARITY.md` §Inspector consumer count
- `.claude/skills/domains/infra-tooling/SKILL.md` §Inspector
- `.claude/skills/domains/studio-blocks/SKILL.md` §Inspector cross-surface mirror
- `workplan/WP-033-block-forge-inspector.md` (full WP doc)
- `workplan/WP-034-inspector-cascade-override.md` (BACKLOG)
(`logs/wp-029/phase-1-result.md`).

## Inspector UX Polish patterns (WP-036)

Three-pattern bundle from WP-036 — Inspector UX polish polishing primitives:
sidebar-to-iframe hover broadcast, per-id Undo reducer, and render-time
group-by-tuple. All cross-surface mirrored byte-identical between block-forge
and Studio (PARITY trio audit).

### 1. Sidebar→iframe hover-highlight protocol (cross-surface; locked)

When the parent UI (sidebar, suggestion list, etc.) needs to outline an
element inside the preview iframe, use a NEW dedicated attribute slot —
NOT the iframe's native `[data-bf-hover]` (which races with the iframe's
own mouseover handler).

```
Direction       │ Type                                      │ Purpose
────────────────┼───────────────────────────────────────────┼─────────────────
parent → iframe │ block-forge:inspector-request-hover       │ Apply transient hover
                │ payload: {slug, selector | '__clear__'}   │ outline to selector
```

Iframe IIFE listener:
```js
window.addEventListener('message', (e) => {
  if (e.data?.type !== 'block-forge:inspector-request-hover') return
  if (e.data.slug !== SLUG) return

  // Clear-all-then-apply for multi-match safety.
  document.querySelectorAll('[data-bf-hover-from-suggestion]')
    .forEach((el) => el.removeAttribute('data-bf-hover-from-suggestion'))

  if (!e.data.selector || e.data.selector === '__clear__') return

  let target = null
  try { target = document.querySelector(e.data.selector) } catch {}
  if (!target) return
  target.setAttribute('data-bf-hover-from-suggestion', '')
})
```

Outline rule (`@layer shared`, alongside `[data-bf-hover]` and `[data-bf-pin]`):
```css
[data-bf-hover-from-suggestion] {
  outline-style: solid;
  outline-width: 2px;
  outline-color: hsl(var(--text-link)); /* same blue as native hover */
  outline-offset: -2px;
}
```

Parent broadcast:
```ts
const handlePreviewHover = useCallback((selector: string | null) => {
  if (!currentSlug) return
  const iframes = document.querySelectorAll<HTMLIFrameElement>(
    `iframe[title^="${CSS.escape(currentSlug)}-"]`,
  )
  iframes.forEach((iframe) => {
    iframe.contentWindow?.postMessage(
      { type: 'block-forge:inspector-request-hover', slug: currentSlug, selector: selector ?? '__clear__' },
      '*',
    )
  })
}, [currentSlug])
```

`querySelectorAll` (not `querySelector`) is intentional — Studio's responsive
triptych broadcasts to all 3 BPs simultaneously; block-forge's tabbed UI
matches the single visible iframe. Same handler shape both surfaces.

### 2. Per-id Undo reducer pattern (`removeFromPending`)

When a state machine has an `accept(id)` reducer that puts ids into a
"pending" set with an early-exit guard against duplicates, the natural
"undo this specific accept" affordance can NOT use `reject(id)` —
`reject` shares the same guard and silently no-ops. A dedicated
`removeFromPending(id)` reducer is required:

```ts
export function removeFromPending(state: SessionState, id: string): SessionState {
  if (!state.pending.includes(id)) return state
  return {
    ...state,
    pending: state.pending.filter((p) => p !== id),
    history: state.history.filter(
      (h) => !(h.type === 'accept' && h.id === id),
    ),
  }
}
```

**History filter is precise** (filter by matching `accept` action, NOT
pop-last) so subsequent global `undo()` doesn't try to roll back a phantom
action that was already removed.

**Idempotent**: no-op when id is not in pending. Safe to call repeatedly.

### 3. Render-time group-by-tuple pattern (`SuggestionGroupCard`)

When an engine emits N atomic items that share a "visually-identical" intent,
the UX layer can collapse them at render time WITHOUT changing engine emit
semantics. Group key tuple should capture the dimensions of "looks the same":

```ts
function groupKey(s: Suggestion): string {
  return `${s.heuristic}|${s.bp}|${s.property}|${s.value}|${s.rationale}`
}
```

Embedding the rationale text (which itself often embeds px/N/etc.) naturally
separates items that share heuristic+bp but differ in scale (e.g.
`font-clamp 60px` vs `font-clamp 48px` keep separate cards).

`buildEntries(sorted)` returns `(Suggestion | Group)[]` — singletons keep
using the existing row component (`SuggestionRow`); N≥2 groups render via
the new card component (`SuggestionGroupCard`). Save composition reads
individual ids from `session.pending` unchanged.

**Default state collapsed** when grouping is not free vertically (Studio
rail layout has no max-height). Click chevron to expand → per-item rows
with individual Accept/Reject + per-row hover-highlight integration with
pattern #1.

References:
- `tools/block-forge/PARITY.md` §Inspector UX Polish (WP-036)
- `apps/studio/src/pages/block-editor/responsive/PARITY.md` §Inspector UX Polish
- `.claude/skills/domains/infra-tooling/SKILL.md` §Inspector UX Polish
- `.claude/skills/domains/studio-blocks/SKILL.md` §Inspector UX Polish cross-surface mirror
- `workplan/WP-036-inspector-ux-polish.md` (full WP doc)
- `logs/wp-036/phase-{0..3}-result.md`

## Inspector typed inputs + Tooltip primitive (WP-037)

Two patterns introduced together. Both apply to Inspector PropertyRow on
both authoring surfaces (block-forge + Studio Responsive tab).

### Pattern 1 — Property metadata source-of-truth (PROPERTY_META)

Static map keyed by CSS property name → `{ kind, options?, tooltip }`.
Drives input affordance (text vs select) AND tooltip text from a single
file per surface. Byte-identical mirror at the second surface mod 3-line
JSDoc header per cross-surface mirror discipline.

Schema:

```ts
export type PropertyKind = 'numeric' | 'enum'
export interface PropertyMeta {
  kind: PropertyKind
  tooltip: string                // 1-2 sentence "what does this do" hint
  options?: readonly string[]    // required when kind === 'enum'
}
export const PROPERTY_META: Readonly<Record<string, PropertyMeta>> = { /* ... */ }
export function getPropertyMeta(property: string): PropertyMeta | undefined
```

Live at:
- `tools/block-forge/src/lib/property-meta.ts`
- `apps/studio/src/pages/block-editor/responsive/inspector/property-meta.ts`

Initial scope (WP-037 V1) — 4 LAYOUT enum properties: `display`,
`flex-direction`, `align-items`, `justify-content`. Numeric properties
have NO entry → `getPropertyMeta` returns `undefined` → PropertyRow falls
back to text input. Adding an entry to ONE surface MUST add to the OTHER
in the same commit.

Custom-value fallback (Phase 0 RECON Ruling 4B): if the current value
is not in `meta.options` (e.g. legacy `display: table-cell` tweak), the
dropdown prepends a disabled `<option>` labeled `"<value> (custom)"`.
Value survives, clearly flagged as outside the curated list.

### Pattern 2 — Radix Tooltip primitive (`packages/ui`)

First Tooltip in the DS. Underpinned by `@radix-ui/react-tooltip`.

Convenience + compound APIs:

```tsx
// 90% case
<Tooltip content="...">
  <button type="button">trigger</button>
</Tooltip>

// Compound for rich content / non-default positioning
<TooltipRoot>
  <TooltipTrigger asChild><button>...</button></TooltipTrigger>
  <TooltipPortal>
    <TooltipContent side="top" align="center">
      <Rich>...</Rich>
      <TooltipArrow />
    </TooltipContent>
  </TooltipPortal>
</TooltipRoot>
```

Tokens used: `--popover` / `--popover-foreground` (intentionally inverted
vs body — dark popover on light surface), `--shadow-md`, `--rounded-md`,
`--spacing-xs` / `--spacing-2xs`, `--text-xs-font-size` /
`--text-xs-line-height`. No new tokens introduced.

Defaults: `delayDuration={400}` (Provider-level — faster than Radix 700ms
default for power-user tooling), `skipDelayDuration={150}`, `side="right"`,
`align="start"`, `sideOffset={8}`. Mobile fallback is long-press (Radix
default — desktop-only authoring tools accept this).

App-root requirement: wrap the React tree with `<TooltipProvider>` once
at `main.tsx` so `skipDelayDuration` coordinates across all instances:

```tsx
import { TooltipProvider } from '@cmsmasters/ui'
createRoot(rootEl).render(
  <StrictMode>
    <TooltipProvider>
      <App />
    </TooltipProvider>
  </StrictMode>
)
```

Empty-content escape: `<Tooltip content={undefined}>` returns children
unwrapped (no Radix machinery, no Provider needed). Use for properties
that have no curated tooltip text — branch-render label as plain `<div>`
in that case to keep UX consistent (some labels show tooltip, others
don't but visually all look identical otherwise).

Test pattern: every render of a component that may invoke `<Tooltip>`
internally needs `<TooltipProvider>` wrapping. Add a `renderRow(ui)` /
`renderPanel(ui)` / `renderInspector(ui)` helper at the top of each test
file:

```ts
function renderRow(ui: ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>)
}
```

`rerender(...)` calls (RTL re-render of an already-mounted root) MUST
wrap their argument in `<TooltipProvider>` explicitly — `rerender` does
not reuse the original wrapper.

References:
- `tools/block-forge/PARITY.md` §Inspector Typed Inputs + Tooltips (WP-037)
- `apps/studio/src/pages/block-editor/responsive/PARITY.md` §Inspector Typed Inputs + Tooltips (WP-037)
- `.claude/skills/domains/infra-tooling/SKILL.md` §Inspector typed inputs + tooltips
- `.claude/skills/domains/studio-blocks/SKILL.md` §Inspector typed inputs + tooltips
- `.claude/skills/domains/pkg-ui/SKILL.md` Recipes (Tooltip)
- `workplan/WP-037-inspector-typed-inputs.md` (full WP doc)
- `logs/wp-037/phase-{0,3}-result.md`

### Native `title=` policy (WP-041)

Use `<Tooltip>` from `@cmsmasters/ui` for hover-info on focusable elements
(`<button>`, `<a>`, custom interactive widgets). Do NOT use the native HTML
`title=` attr for hover-info — Radix Tooltip provides consistent surface,
positioning, delay, and a11y across the portal.

Two narrow exceptions retain native `title=`:

1. **`<iframe title="...">`** — required by WCAG 2.1 SC 4.1.2 for
   accessible name. Tooltip primitive does not apply to iframes.
2. **PARITY-locked mirror sites** — when a button on Studio mirrors a Forge
   button byte-equivalent (PropertyRow ↺ revert button), keep both surfaces
   on the same hover-info pattern to preserve the WP-040 PARITY trio. A
   future coordinated mirror WP can migrate both surfaces in lockstep.

Migration pattern (WP-041 baseline):

```tsx
// Before
<Button variant="ghost" size="mini" onClick={fn} title="Action label">
  <Icon size={12} />
</Button>

// After
import { Tooltip } from '@cmsmasters/ui'
<Tooltip content="Action label">
  <Button variant="ghost" size="mini" onClick={fn}>
    <Icon size={12} />
  </Button>
</Tooltip>
```

WP-041 migrated 9 sites in studio (preset-bar, editor-sidebar, slots-list,
theme-editor, media). portal/dashboard/admin had zero native title attrs
on focusable elements — adopt opportunistically as those apps grow features
that need hover-info. Each adopting app must wire `<TooltipProvider>` once
at the React tree root before its first `<Tooltip>` consumer.

Audit grep targets when reviewing for `title=` regressions:
- `\btitle="` on `<button>`, `<a>`, focusable DOM elements (migrate)
- `<Section title=`, `<FormSection title=`, `<DeleteConfirmModal title=`,
  `<PageHeader title=` (component props — leave alone)
- `<iframe title=` (a11y-required — leave alone)

References:
- `workplan/WP-041-tooltip-portal-wide-rollout.md` (full WP doc)
- `logs/wp-041/phase-{0-audit,1-result}.md`

---

## E2E test infrastructure (WP-042 — 2026-04-28)

Inspector regression-pin tests run through `@playwright/test` (root devDep,
v1.59.1+). Specs live colocated with the surface they test:
`tools/block-forge/e2e/inspector.spec.ts` + `tools/block-forge/e2e/fixtures/`.

### When to add an e2e spec (vs unit)

Add e2e when the regression you want to pin involves:
- **Real iframe `getComputedStyle`** — values that depend on real layout, real
  CSS clamp() resolution, or real `@container` query evaluation
- **Cross-surface postMessage round-trips** — Inspector ↔ iframe IIFE
  protocols where serialization/deserialization matters
- **Hover/focus/click choreography** that jsdom can't fake authentically

Keep using vitest+jsdom for everything else: pure render assertions, reducer
output, snapshot diffs, hook returns, etc. Vitest is faster and more
ergonomic when authenticity isn't required.

### Fixture pattern

Block-forge e2e uses `BLOCK_FORGE_SOURCE_DIR` env override (set by
`tools/block-forge/playwright.config.ts`) so the dev server seeds blocks
from `e2e/fixtures/` instead of `tools/block-forge/blocks/`. Each fixture is
a minimal block JSON file; the BlockPicker picks them up like any other
block. **Never** write fixtures to `content/db/blocks/` or
`tools/block-forge/blocks/` (per saved memory `feedback_forge_sandbox_isolation`).

### Port + binding

Playwright spawns Vite at port **7799** (not 7702) to avoid colliding with a
developer's running dev session. `--host 127.0.0.1` forces IPv4 binding so
Playwright's webServer URL check resolves. CI gets a fresh box; port choice
is incidental there.

### Running

```bash
# Local
npm run block-forge:test:e2e
# Or from the package
cd tools/block-forge && npm run test:e2e

# Watch mode (Playwright UI)
cd tools/block-forge && npx playwright test --ui
```

### CI

`.github/workflows/e2e-block-forge.yml` runs on `pull_request` events
touching `tools/block-forge/**`, `packages/block-forge-core/**`, the Tooltip
primitive, the responsive config, or the workflow file itself. Suite
runs in <60s including Chromium install. Reports upload as artifact on
failure.

### Vitest must exclude `e2e/**`

`tools/block-forge/vite.config.ts` has `test.exclude: ['e2e/**', ...]`.
Without this, `npm test` tries to import Playwright specs as Vitest and
crashes on the `test.beforeEach` import.

References:
- `workplan/WP-042-inspector-e2e-playwright.md` (full WP doc)
- `logs/wp-042/phase-{0-audit,1-result,2-result}.md`
- `.github/workflows/e2e-block-forge.yml`
- `tools/block-forge/playwright.config.ts`

---

## Block authoring (WP-035 + WP-038 — 2026-04-28)

Block Forge is the sandbox; Studio is the production gate. The two surfaces never cross-write. See saved memory `feedback_forge_sandbox_isolation` for the full architectural reasoning.

| Action | Path | Notes |
|---|---|---|
| Create new block from Figma | `/block-craft` skill iterates `tools/studio-mockups/<name>.html` at `:7777`; on user signal, FINALIZE writes 11-key BlockJson to `tools/block-forge/blocks/<slug>.json` (sandbox) | Third sandbox seed source (alongside first-run + Clone); see saved memory `feedback_block_craft_finalize_protocol`; `id` field omitted; re-finalize preserves 8 metadata fields |
| Edit a block visually | Forge `[Save]` writes to `tools/block-forge/blocks/<slug>.json` (sandbox) | Production seed at `content/db/blocks/` is read-only from Forge |
| Duplicate for experiment | Forge `[+ Clone]` creates `<slug>-copy-N.json` (auto-suffix 1–99) | `id` stripped; same sandbox; race-safe `wx`-flag write |
| Ship to production | Forge `[Export]` → Copy payload OR Download JSON → Studio `[Import JSON]` → DB via `POST /api/blocks/import` | Server-side auto-revalidate (body `'{}'`); failures non-fatal |
| Legacy direct-edit | `BLOCK_FORGE_SOURCE_DIR=<abs>` env override | Escape hatch only; undocumented in UI |
| Bulk seed → DB (legacy) | `/content-push` skill | Reads `content/db/blocks/`; not affected by Forge |

**Don't:**
- Add a "publish from Forge" button that bypasses Studio (defeats the gate; saved memory `feedback_forge_sandbox_isolation`)
- Modify `content/db/blocks/` from Forge code paths (production seed is read-only from Forge)
- Hardcode `id` in cloned payloads (sandbox doesn't enforce; DB resolves on next import)
- Use path-scoped revalidate body (always `'{}'` per saved memory `feedback_revalidate_default`)
- Auto-finalize from `/block-craft` without an explicit user signal (FINALIZE is opt-in; saved memory `feedback_block_craft_finalize_protocol`)
- Narrow re-finalize preservation to just `variants` (preserve all 8 metadata fields: slug, name, block_type, is_default, sort_order, hooks, metadata, variants)

**First-run seed:** one-shot per Forge dev process — copies `content/db/blocks/*.json` into sandbox iff empty (`.gitkeep` tolerated; `*.bak` filtered). Skipped when `BLOCK_FORGE_SOURCE_DIR` override is active. Sandbox dir is git-tracked (Phase 0 Ruling B = COMMIT for cross-machine continuity); `tools/block-forge/blocks/*.bak` is gitignored.

References:
- `tools/block-forge/PARITY.md` §WP-035 — Sandbox + Export
- `apps/studio/src/pages/block-editor/responsive/PARITY.md` §WP-035 — Studio Import
- `.context/SKILL.md` §Block authoring loop
- `workplan/WP-035-block-forge-sandbox-export-import.md`
- `logs/wp-035/phase-{0,1,2,3,5}-result.md`
- `workplan/WP-038-block-craft-finalize-to-forge-json.md`
- `logs/wp-038/phase-{0,1,2}-result.md`
