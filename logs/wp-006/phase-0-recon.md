# WP-006 Phase 0: RECON

**Date:** 2026-04-02
**Status:** DONE

## Block Editor (Studio)

- **File:** `apps/studio/src/pages/block-editor.tsx`
- Single `code` textarea (HTML+CSS combined with `<style>` tags)
- Form fields: name, slug, code, hooks (price selector, links[]), metadata (alt, figma_node)
- File import exists: `.html` → DOMParser → extract style+body → fill form
- No processing/tokenization step — raw paste → save
- Save splits `code` into `html` + `css` via regex, sends to API

## Upload Route (API)

- **File:** `apps/api/src/routes/upload.ts`
- Stub: returns placeholder URL
- Auth guards ready: `authMiddleware` + `requireRole('content_manager', 'admin')`

## Wrangler / R2

- **File:** `apps/api/wrangler.toml`
- No R2 bucket binding configured
- Only Supabase vars + secrets
- Need: `[[r2_buckets]]` section + env type update

## Tokens Format (tokens.css)

- **File:** `packages/ui/src/theme/tokens.css`
- Raw HSL triplets: `230 58% 20%` (shadcn convention, no hsl() wrapper)
- `:root { }` block, `.dark { }` overrides
- Categories: shadcn semantic, brand primitives, brand semantics (bg, text, border, status, button, tag, card, section), typography, spacing, radii, shadows
- ~200+ tokens total

## Key Decisions for Phase 1

- Token scanner is client-side (pure functions, no API)
- CSS parsing via regex (not PostCSS AST)
- Color matching: hex → HSL → compare to token HSL triplets
- Token map can be hardcoded (tokens change via /sync-tokens, rarely)
- Insert processing step in block editor between import and save
