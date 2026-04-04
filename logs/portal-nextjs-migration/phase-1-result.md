# Portal Migration: Astro → Next.js 15 — Execution Log

**Date:** 2026-04-04
**Task:** Migrate Portal from Astro SSG to Next.js 15 App Router + implement revalidation + portal link in Studio

## What Was Attempted

Migrate the Portal app from Astro 5.0 (SSG, CF Pages direct upload) to Next.js 15 App Router (SSG+ISR, Vercel-ready) to unlock:
- On-demand ISR via `revalidatePath()`
- Deploy hooks and preview deployments (Vercel)
- Middleware for future auth-gated content
- Scalable incremental builds for 500+ pages

## What Was Actually Done

### Files Created
- `apps/portal/next.config.js` — minimal Next.js config
- `apps/portal/.eslintrc.json` — ESLint rules for portal
- `apps/portal/app/layout.tsx` — root layout (Manrope via next/font, animate-utils.js via next/script)
- `apps/portal/app/globals.css` — portal styles (tokens.css + portal-blocks.css imports)
- `apps/portal/app/[[...slug]]/page.tsx` — composed pages (homepage + catch-all)
- `apps/portal/app/themes/[slug]/page.tsx` — theme showcase pages (full 8-step pipeline)
- `apps/portal/app/_components/block-renderer.tsx` — server component for block HTML+CSS+JS
- `apps/portal/app/sitemap.ts` — built-in Next.js sitemap
- `apps/portal/app/api/revalidate/route.ts` — on-demand ISR endpoint

### Files Moved (src/lib/ → lib/)
- `lib/supabase.ts` — changed `import.meta.env` → `process.env`
- `lib/blocks.ts` — unchanged
- `lib/hooks.ts` — unchanged
- `lib/global-elements.ts` — unchanged

### Files Modified
- `apps/portal/package.json` — astro → next/react/react-dom, port 3100
- `apps/portal/tsconfig.json` — Next.js 15 config with path aliases
- `apps/api/src/env.ts` — added PORTAL_REVALIDATE_URL + PORTAL_REVALIDATE_SECRET
- `apps/api/src/routes/revalidate.ts` — replaced stub with actual Portal revalidation call
- `apps/studio/src/pages/theme-editor.tsx` — added portal link for published themes, pass type:'theme' to revalidate
- `.gitignore` — added `.next/`

### Files Deleted
- `apps/portal/astro.config.mjs`
- `apps/portal/wrangler.toml`
- `apps/portal/src/env.d.ts`
- `apps/portal/src/` — entire directory (replaced by app/ + lib/)

## Build Results

```
✓ Compiled successfully in 1803ms
✓ Generating static pages (6/6)

Route (app)                    Size  First Load JS  Revalidate
○ /_not-found                  986B  103kB
● /[[...slug]]                 133B  102kB
ƒ /api/revalidate              133B  102kB
○ /sitemap.xml                 133B  102kB
● /themes/[slug]               133B  102kB          1h
```

- SSG works: composed pages + theme pages generated from Supabase
- ISR configured: theme pages revalidate every hour
- On-demand revalidation endpoint: `/api/revalidate`
- First Load JS: 102kB (shared React runtime — no per-page JS)

## What Worked

- All 4 lib files ported without changes (pure TS, framework-agnostic)
- `generateStaticParams()` maps cleanly from Astro's `getStaticPaths()`
- `generateMetadata()` replaces manual og: tags and JSON-LD
- React `cache()` deduplicates theme fetch between metadata and page component
- `BlockRenderer` server component preserves `<script>` tags that `dangerouslySetInnerHTML` on parent would strip
- `next/font/google` self-hosts Manrope (eliminates render-blocking Google Fonts request)

## Discoveries / Drift

1. **ESLint strictness:** Next.js brought in stricter lint rules (unicorn, sonarjs). Added `.eslintrc.json` to suppress warnings for existing lib code patterns (regex-based replace, non-null assertions).
2. **Optional catch-all:** `[[...slug]]` (double brackets) needed for homepage `/` — single `[...slug]` wouldn't match root.
3. **Script tags preserved:** `BlockRenderer` component renders `<script>` as separate JSX element, not concatenated into HTML string. Theme page still uses `renderBlock()` string output for layout slot resolution (needs raw HTML for `resolveSlots()`).

## Still TODO

- [ ] Deploy to Vercel (need Vercel account/project setup)
- [ ] Set env vars in Vercel: SUPABASE_URL, SUPABASE_ANON_KEY, REVALIDATE_SECRET
- [ ] Set secrets in CF Workers: `wrangler secret put PORTAL_REVALIDATE_URL`, `wrangler secret put PORTAL_REVALIDATE_SECRET`
- [ ] Update ADR-007 → V4 (Next.js for Portal, Vercel deployment)
- [ ] Update .context/BRIEF.md — Portal now Next.js, not Astro
- [ ] Smoke test revalidation flow: Studio publish → Hono API → Portal ISR
