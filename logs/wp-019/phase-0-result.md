# Execution Log: WP-019 Phase 0 — RECON
> Epic: Layout Maker
> Executed: 2026-04-13T16:00:00+02:00
> Duration: ~12 minutes
> Status: COMPLETE
> Domains affected: none (read-only audit)

## What Was Verified

| Integration Point | File | Status |
|---|---|---|
| Page type definition | `packages/db/src/types.ts` | Confirmed |
| getLayoutByScope query | `apps/portal/lib/blocks.ts` | Confirmed |
| resolveSlots implementation | `apps/portal/lib/hooks.ts` | Confirmed (2 of 3 formats) |
| POST /api/pages endpoint | `apps/api/src/routes/pages.ts` | Confirmed |
| pageSchema validation | `packages/validators/src/page.ts` | Confirmed |
| tokens.css format | `packages/ui/src/theme/tokens.css` | Confirmed (485 lines) |
| Slot registry | `packages/db/src/slot-registry.ts` | Confirmed (4 slots) |
| Block scoping convention | `.claude/skills/block-craft/SKILL.md` | Confirmed |
| Sample blocks | `content/db/blocks/*.json` | 4 blocks inspected |
| tools/layout-maker/ absence | `tools/` | Confirmed absent |

## Export Contract: Confirmed Fields

| Field | Type | Required on create? | Default | Export value |
|---|---|---|---|---|
| `slug` | `string` (lowercase alphanum + hyphens, 2-100 chars) | **Yes** | — | e.g. `'theme-page-layout'` |
| `title` | `string` (1-200 chars) | **Yes** | — | e.g. `'Theme Page Layout'` |
| `type` | `'layout' \| 'composed'` | **Yes** | — | `'layout'` |
| `scope` | `string` | No | `''` | e.g. `'theme'` |
| `html` | `string` | No | `''` | Layout HTML with `data-slot` attrs |
| `css` | `string` | No | `''` | Compiled CSS (resolved px, not token refs) |
| `layout_slots` | `Record<string, string \| string[]>` | No | `{}` | Empty `{}` on export |
| `slot_config` | `Record<string, { gap?: string }>` | No | `{}` | e.g. `{ "sidebar-right": { "gap": "16px" } }` |
| `seo` | `{ title?, description? } \| null` | No | `undefined` | omitted on export |
| `status` | `'draft' \| 'published' \| 'archived'` | No | `'draft'` | `'published'` for production |

**SlotConfig** is gap-only (`{ gap?: string }`). All other YAML slot properties (padding, align, min-height, sticky, z-index, margin-top, position) compile into CSS during export — they are NOT stored in `slot_config`.

## resolveSlots: Implemented Formats

| Format | Regex | Implemented? | Notes |
|---|---|---|---|
| `<tag data-slot="name"></tag>` | `/<(\w+)([^>]*)\s+data-slot="([^"]+)"([^>]*)><\/\1>/g` | Yes | Tag-agnostic, replaces innerHTML, preserves attrs |
| `{{slot:name}}` | `/\{\{slot:([a-z0-9-]+)\}\}/g` | Yes | Lowercase alphanumeric + hyphens only |
| `<!-- SLOT: NAME -->` | — | **No** | Documented in JSDoc but not implemented in code |

Style block protection: Yes — `<style>` blocks are replaced with `<!--STYLE_PLACEHOLDER_N-->` before `data-slot` resolution, then restored.

Slot name normalization: `data-slot` names are lowercased with whitespace replaced by hyphens.

**Decision**: Export should use `data-slot` format exclusively (primary, well-tested path).

## Portal Rendering Pipeline

**`getLayoutByScope(scope)`** (blocks.ts:69-85):
- Query: `.eq('type', 'layout').eq('scope', scope).eq('status', 'published').limit(1).single()`
- Caching: `unstable_cache` with key `['layout', scope]`, tags `['layouts', 'layout-${scope}']`, revalidate 3600s
- Returns: Full `pages` row or throws

## API Endpoint

**POST `/pages`** (pages.ts:52-78):
- Auth: JWT + `requireRole('content_manager', 'admin')`
- Validation: `pageSchema.safeParse(body)` — returns 400 with Zod issues
- Duplicate slug: PostgreSQL 23505 error caught, returns 409
- Success: Returns 201 with created page

**`updatePageSchema`**: All fields optional. Cannot change `slug` or `type` (not present in schema).

## Slot Registry

4 registered global slots:

| Name | Category |
|---|---|
| `header` | header |
| `footer` | footer |
| `sidebar-left` | sidebar |
| `sidebar-right` | sidebar |

`content` is NOT registered — it's the main content area populated by page-specific blocks, not global elements. Layout Maker config slot names are freeform `data-slot` strings, not constrained to this registry.

## Token Parsing Strategy

**File structure**: 485 lines. `:root { }` (lines 4-411) + `.dark { }` (lines 413-484). No media queries.

**Token format**: `--name: value;` — values are HSL triplets, px values, shadow expressions, font stacks.

**Spacing tokens** (16 total, `:root` lines 293-308):
```
--spacing-3xs: 2px     --spacing-2xs: 4px     --spacing-xs: 8px
--spacing-sm: 12px     --spacing-md: 16px     --spacing-lg: 20px
--spacing-xl: 24px     --spacing-2xl: 32px    --spacing-3xl: 40px
--spacing-4xl: 48px    --spacing-5xl: 64px    --spacing-6xl: 80px
--spacing-7xl: 96px    --spacing-8xl: 112px   --spacing-9xl: 128px
--spacing-10xl: 144px
```

**Parsing regex**:
```regex
/^\s*--([\w-]+):\s*(.+?);\s*$/gm
```
Apply to content inside `:root { }` only. For spacing, filter by `name.startsWith('spacing-')` and extract px with `parseInt(value)`.

## Block Scoping Convention

- Block root: `<section class="block-{slug}" data-block>`
- CSS: All selectors under `.block-{slug}`
- 4 sample blocks inspected: 2 fully scoped, 2 have leaky global selectors (`*`, `body`)
- **Slug/class mismatch found**: `header` block has slug `header` but class `block-header-nav`

## Discrepancies from Spec

1. **`<!-- SLOT: NAME -->` not implemented** — Spec mentions 3 formats; code has 2. Not a blocker — export uses `data-slot` only.

2. **`LayoutPagePayload` type does not exist** — Spec defines it as a standalone type, but actual contract is `pageSchema` from `@cmsmasters/validators` / `PageInsert` from `@cmsmasters/db`.

3. **Slot properties vs SlotConfig** — YAML config supports many slot properties (padding, align, min-height, sticky, z-index, etc.), but `SlotConfig` DB type is gap-only. Properties compile to CSS during export. This is correct behavior per spec.

4. **CSS must use resolved px** — Portal renders `css` column verbatim. The Layout Maker must resolve token references (`--spacing-xl`) to actual px values (`24px`) in exported CSS.

5. **Block slug/class mismatch** — `header` block has different slug vs CSS class. CSS scoping validator should check for any `.block-*` prefix, not assume `.block-{slug}`.

## Issues & Workarounds

None — all integration points confirmed. No code changes needed.

## Open Questions

1. **`slot_config.gap` value format** — Is it stored as token name (`--spacing-xl`) or resolved px (`24px`)? Zod says `z.string().optional()`. No live data to inspect. **Recommendation**: Use resolved px values, consistent with CSS output.

2. **Duplicate scope enforcement** — `getLayoutByScope` uses `.limit(1).single()` (expects one result). No DB unique constraint confirmed on `(type, scope, status)`. The Layout Maker runtime should enforce unique scopes at the YAML level before export.

3. **`content` slot handling** — Not in slot registry (intentional). Layout Maker treats it as the main content area where page blocks are placed, not a global-element slot.

4. **`updatePageSchema` cannot change slug/type** — Rename requires delete + recreate. Relevant for Layout Maker's workflow.

5. **Drawer JS in `html` column** — Confirmed: no separate `js` column on `pages` table. Drawer `<script>` goes inline in `html`.

## Verification Results

| Check | Result |
|---|---|
| arch-test | 384 tests, all passed (442ms) |
| git status clean | No tracked files modified |
| AC met | All 11 acceptance criteria satisfied |
