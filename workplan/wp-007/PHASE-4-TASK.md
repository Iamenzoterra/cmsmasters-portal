# WP-007 Phase 4: SEO + Sitemap + Deploy to Cloudflare Pages

> Workplan: WP-007 Portal Layout System
> Phase: 4 of 5
> Priority: P0
> Estimated: 1.5 hours
> Type: Config + Frontend
> Previous: Phase 3 ✅ (Composed pages + homepage catch-all)
> Next: Phase 5 (Docs + Close)

---

## Context

SEOHead component already has JSON-LD Product schema, OG tags, and canonical URLs for theme pages (Phase 2). Composed pages have basic OG + canonical (Phase 3). Missing: sitemap.xml, robots.txt, and Cloudflare Pages deployment.

```
CURRENT:  JSON-LD + OG + canonical on theme pages                     ✅
CURRENT:  Basic meta on composed pages                                 ✅
MISSING:  sitemap.xml (auto-generated from all routes)                 ❌
MISSING:  robots.txt                                                   ❌
MISSING:  Cloudflare Pages deployment config                           ❌
```

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Current SEO in SEOHead
grep -n "ld.json\|og:\|canonical\|description" apps/portal/src/components/SEOHead.astro | head -10

# 2. Current composed page SEO
grep -n "og:\|canonical\|description" "apps/portal/src/pages/[...slug].astro" | head -10

# 3. Astro sitemap integration available?
grep "sitemap" apps/portal/package.json || echo "not installed"

# 4. Current astro.config
cat apps/portal/astro.config.mjs

# 5. Check if wrangler.toml exists for CF Pages
ls apps/portal/wrangler.toml 2>/dev/null || echo "no wrangler.toml"
```

---

## Task 4.1: Add @astrojs/sitemap integration

### What to Build

Install the official Astro sitemap integration — auto-generates `sitemap.xml` from all static routes at build time.

```bash
cd apps/portal && npm install @astrojs/sitemap
```

**Update `astro.config.mjs`:**
```javascript
import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'

export default defineConfig({
  output: 'static',
  site: 'https://portal.cmsmasters.net',
  integrations: [sitemap()],
  vite: {
    resolve: {
      alias: {
        '@cmsmasters/db': '../../packages/db/src/index.ts',
      },
    },
  },
})
```

**Verification:** `npx astro build` → `dist/sitemap-index.xml` and `dist/sitemap-0.xml` exist with theme/page URLs.

---

## Task 4.2: Add robots.txt

### What to Build

**File:** `apps/portal/public/robots.txt`

```
User-agent: *
Allow: /

Sitemap: https://portal.cmsmasters.net/sitemap-index.xml
```

Static file in `public/` — copied as-is to `dist/`.

---

## Task 4.3: Cloudflare Pages deployment config

### What to Build

Cloudflare Pages can deploy from a Git repo or via `wrangler pages deploy`. For our setup:

**Option A: wrangler pages deploy (CI/manual)**

**File:** `apps/portal/wrangler.toml`
```toml
name = "cmsmasters-portal"
pages_build_output_dir = "dist"
```

Deploy command:
```bash
cd apps/portal && npx astro build && npx wrangler pages deploy dist --project-name cmsmasters-portal
```

**Option B: Git integration (auto-deploy on push)**

Configure in CF dashboard: Pages → Create → Connect Git → Build settings:
- Build command: `cd apps/portal && npm run build`
- Build output: `apps/portal/dist`
- Root directory: `/`
- Environment variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`

**Go with Option A for now** — manual deploy gives more control. Auto-deploy via Git can be added later.

Add deploy script to package.json:
```json
"scripts": {
  "deploy": "astro build && wrangler pages deploy dist --project-name cmsmasters-portal"
}
```

---

## Task 4.4: Enhance composed page SEO

### What to Build

Composed pages currently have inline meta tags. Refactor to use a simpler version of SEOHead or a shared pattern.

**File:** `apps/portal/src/pages/[...slug].astro`

Add JSON-LD WebPage schema for composed pages (not Product — that's for themes):

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Homepage",
  "url": "https://portal.cmsmasters.net/"
}
</script>
```

---

## Task 4.5: Build + verify Lighthouse-readiness

### What to Build

No code — build verification and check output for Lighthouse-critical items:

```bash
cd apps/portal && npx astro build

# Check output
ls dist/sitemap-index.xml    # sitemap exists
ls dist/robots.txt            # robots.txt exists
ls dist/themes/*/index.html   # theme pages
```

Manual Lighthouse check (after deploy or local preview):
- `npx astro preview` → open http://localhost:4321/themes/{slug}
- Chrome DevTools → Lighthouse → Performance, SEO, Accessibility, Best Practices
- Target: 95+ on all categories

---

## Files to Modify

- `apps/portal/package.json` — add @astrojs/sitemap dep + deploy script
- `apps/portal/astro.config.mjs` — add sitemap integration
- `apps/portal/public/robots.txt` — **NEW** — crawler instructions
- `apps/portal/wrangler.toml` — **NEW** — CF Pages config
- `apps/portal/src/pages/[...slug].astro` — add JSON-LD WebPage

---

## Acceptance Criteria

- [ ] `@astrojs/sitemap` installed and configured
- [ ] `dist/sitemap-index.xml` generated on build
- [ ] `dist/robots.txt` exists with sitemap reference
- [ ] `wrangler.toml` for CF Pages exists
- [ ] `deploy` script in package.json
- [ ] Composed pages have JSON-LD WebPage schema
- [ ] Theme pages still have JSON-LD Product schema
- [ ] `npx astro build` succeeds with all output files
- [ ] No regressions on theme or composed pages

---

## ⚠️ MANDATORY: Verification (do NOT skip)

```bash
echo "=== WP-007 Phase 4 Verification ==="

# 1. Build
cd apps/portal && npx astro build 2>&1 | tail -5

# 2. Sitemap
ls dist/sitemap-index.xml && echo "✅ sitemap" || echo "❌ no sitemap"
cat dist/sitemap-index.xml | head -5

# 3. robots.txt
ls dist/robots.txt && echo "✅ robots.txt" || echo "❌ no robots.txt"

# 4. Theme pages still have JSON-LD Product
grep -c "Product" dist/themes/*/index.html && echo "✅ JSON-LD Product"

# 5. wrangler.toml
ls wrangler.toml && echo "✅ wrangler config" || echo "❌ missing"

# 6. deploy script
grep "deploy" package.json

echo "=== Verification complete ==="
```

---

## ⚠️ MANDATORY: Write Execution Log

Create: `logs/wp-007/phase-4-result.md`

---

## Git

```bash
git add apps/portal/package.json apps/portal/astro.config.mjs apps/portal/public/robots.txt apps/portal/wrangler.toml apps/portal/src/pages/ logs/wp-007/phase-4-result.md
git commit -m "feat: sitemap, robots.txt, CF Pages config, WebPage schema [WP-007 phase 4]"
```

---

## ⚠️ IMPORTANT Notes for CC

- **`@astrojs/sitemap` auto-discovers routes** — no manual URL list needed. It reads `getStaticPaths()` output.
- **`site` in astro.config is required** for sitemap to generate absolute URLs. Already set to `https://portal.cmsmasters.net`.
- **robots.txt is static** — goes in `public/`, not generated. Sitemap URL must match the site URL.
- **CF Pages wrangler.toml** — minimal config. Actual deploy is manual via `wrangler pages deploy`.
- **Don't deploy yet** — just set up config. Actual first deploy is a manual step after content is seeded.
- **Lighthouse 95+** — mostly guaranteed by: zero framework JS, SSG, proper meta tags, Manrope font preconnect. The remaining risk is LCP (large images) — depends on block content, not our code.
