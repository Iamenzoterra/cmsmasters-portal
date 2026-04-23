# R2 Images, Bucket & Icons Management

> Single source of truth for how portal images and icons are stored, served,
> and optimised. Covers Cloudflare R2 bucket layout, custom-domain serving,
> on-the-fly Image Transformations, and the portal render-time rewriter.
>
> Last verified: **23 April 2026**

---

## 1. TL;DR

- **Storage:** Cloudflare R2 bucket `cmsmasters-assets`
- **Custom domain:** `https://assets.cmsmasters.studio` (this is the only public URL we advertise)
- **Optimisation:** Cloudflare Image Transformations on the same zone — `/cdn-cgi/image/<opts>/<path>` serves resized + `format=auto` (AVIF/WebP) variants
- **Savings:** ~70–90 % vs original PNG/JPEG (Chrome AVIF), ~50–70 % (Safari WebP)
- **Rewriter:** `apps/portal/lib/optimize-images.ts` rewrites every block `<img>` at render time
- **Legacy URL:** `pub-c82d3ffae6954db48f40feef14b8e2e0.r2.dev` still works but is deprecated — rewriter auto-migrates references

---

## 2. Bucket layout

```
cmsmasters-assets/
├── blocks/                # Block body images uploaded via Studio (/upload, /upload/batch)
│   └── <sha256-12>.<ext>  # content-hash-addressed; dedup by hash
└── icons/                 # Icons curated by team (category, feature, status...)
    └── theme-category/
        └── calendar.svg
    └── ...
```

### Content-hash addressing (`blocks/*`)

Uploads via Studio hit `apps/api/src/routes/upload.ts` which:
1. Computes SHA-256 of the file, keeps first 12 hex chars
2. Derives extension from `Content-Type` (png/jpg/webp/gif/svg/avif/ico)
3. Writes to `blocks/<hash>.<ext>`
4. If hash already exists → reuses the object (dedup, no extra upload)

### Curated icons (`icons/*`)

Uploaded by hand via the Cloudflare R2 dashboard. Folder hierarchy is manual —
keep slugs lowercase-kebab-case. Reference them in content/code by the
`/icons/<folder>/<name>.svg` path.

---

## 3. Public URL conventions

Every asset has **one canonical URL prefix**:

```
https://assets.cmsmasters.studio
```

Do not use, link to, or hardcode the legacy `pub-*.r2.dev` URL in new code or
content. The render-time rewriter still handles it for legacy stored content,
but new code MUST emit the custom-domain URL.

### Transformation URL shape

```
https://assets.cmsmasters.studio/cdn-cgi/image/<opts>/<bucket-path>
                                  └───────────────┘└──────────────┘
                                  Transformations    original R2 key
```

Supported `<opts>` (comma-separated):

| Option | Example | Notes |
|--------|---------|-------|
| `format=auto` | `format=auto` | Negotiates AVIF/WebP via `Accept` header; PNG fallback |
| `width=N` | `width=800` | Pixels. Does NOT upscale — if source is 1250w, `width=1600` returns 1250w |
| `quality=N` | `quality=85` | 1–100. We default to 85 |
| `fit=...` | `fit=cover` | `scale-down \| contain \| cover \| crop \| pad` |

Example:
```
https://assets.cmsmasters.studio/cdn-cgi/image/format=auto,quality=85,width=800/blocks/logo.png
```

Full reference: https://developers.cloudflare.com/images/transform-images/

---

## 4. Cloudflare dashboard configuration

### R2 → bucket `cmsmasters-assets`

- **Settings → Custom Domains:** `assets.cmsmasters.studio` → Status: `Active`, Access: `Enabled`
- **Settings → Public Development URL:** currently **enabled** (`pub-c82d3ffae...r2.dev`) for backwards compat; safe to disable once no content references it

### Cloudflare zone `cmsmasters.studio` → Images → Transformations

- **Status:** Enabled
- **Sources:** `Specified origins` (not `This zone only`, not `Any origin`)
  - Allowed origin: `assets.cmsmasters.studio` — **All paths**
  - Do not add the apex `cmsmasters.studio` unless you want to transform images served from apex (we don't)
- **Preserve Content Credentials:** off

### Safety rules

- Never set Transformations to `Any origin` — turns the zone into a free image proxy for the internet.
- Origin allowlist is **explicit host match**, no wildcard/subdomain inclusion. Add each new asset host manually.

---

## 5. Render-time rewriter

Implementation: `apps/portal/lib/optimize-images.ts`

Public API:

| Function | Purpose |
|----------|---------|
| `buildImageUrl(path, opts)` | Returns `/cdn-cgi/image/...` URL for a single variant |
| `buildImageSrcSet(path, widths)` | Returns a `srcset`-ready string across widths |
| `rewriteImages(html)` | Walks all `<img>` tags in HTML, rewrites those that point at our buckets |

Wiring:

- `apps/portal/app/_components/block-renderer.tsx` (content pages) — wraps `html` and every variant's `html` before `dangerouslySetInnerHTML`
- `apps/portal/lib/hooks.ts` (`renderBlock`, used by theme pages) — same, at HTML-string composition time

### Rewriter rules

| Input | Behaviour |
|-------|-----------|
| `src="https://pub-*.r2.dev/blocks/x.png"` | Rewritten to `assets.cmsmasters.studio/cdn-cgi/image/.../x.png` |
| `src="https://assets.cmsmasters.studio/blocks/x.png"` | Rewritten with transformation |
| `src="/blocks/x.png"` or bare path | Treated as our asset, rewritten |
| `src="https://external.example/x.png"` | Untouched |
| `src="....svg"` (any .svg) | Untouched — SVG is vector, transformations would rasterise |
| Tag already has `srcset` | Untouched — author opted out |
| Tag lacks `loading=` | `loading="lazy"` added |
| Tag lacks `decoding=` | `decoding="async"` added |

### Default widths

`[400, 800, 1200, 1600]` with `src` pinned at `800w`.

> **Limitation:** these defaults are wasteful for small icons (e.g. 64×64
> rendered at 1600w on desktop-retina). Add `width="64" height="64"` to the
> `<img>` tag — besides being an HTML best practice that prevents CLS, it
> gives the rewriter a size signal it can use in the future to shrink the
> srcset. See issue log in `.context/` for the planned size-aware variant.

---

## 6. Uploading new images

### Via Studio (block body images)

Studio's block import posts to Hono API → `/upload` (single) or `/upload/batch`.
Hono downloads/receives bytes, hashes, writes to `blocks/<hash>.<ext>`, returns
`{ url: "https://assets.cmsmasters.studio/blocks/<hash>.<ext>" }`. Stored URL
is the **raw bucket path**, NOT a transformation URL — the rewriter adds
transformations at render time.

### Via R2 dashboard (curated icons, one-offs)

R2 dashboard → bucket → upload into the right `icons/<folder>/` path. Commit the
reference in content/code using the `assets.cmsmasters.studio/icons/...` URL,
not the `r2.dev` URL.

### Required after upload

No revalidation is needed for **new** uploads referenced by fresh content. But
if existing pages reference an image whose bytes you just replaced (same key),
CF edge will keep serving the old variant until cache expires. Nuke it with a
bucket-level purge or renamed key.

---

## 7. Disabling the legacy `pub-*.r2.dev` URL

Safe to do when:

```bash
grep -r "pub-c82d3ffae6954db48f40feef14b8e2e0" content/db apps packages docs
# must return: no matches
```

Then: R2 → bucket → Settings → **Public Development URL → Disable**.

Rewriter still accepts the legacy host in input HTML — so leftover DB content
won't break, but new publishes should only use `assets.cmsmasters.studio`.

---

## 8. Troubleshooting

| Symptom | Check |
|---------|-------|
| Browser shows `.png` in tab title even though CF returned AVIF | Expected. Tab title uses URL filename; actual payload content-type is AVIF (verify in DevTools → Network → Response Headers → `content-type`) |
| `curl URL` returns PNG not WebP | `curl` doesn't send `Accept: image/webp`. Pass `-H "Accept: image/avif,image/webp,*/*"` |
| Transformation URL returns 403 | Origin not in Transformations allowlist. Dashboard → Images → Transformations → Sources → add host |
| Image not rewritten on portal page | Either (a) SVG (by design), (b) already has `srcset`, (c) external host, (d) rendered via non-block path that bypasses `renderBlock`/`BlockRenderer` |
| 1600w version returned at source resolution | CF Transformations does NOT upscale. If source is 1250w, `width=1600` gives 1250w — that's correct |
| Old image bytes still served after reupload with same key | CF edge cache. Use a new key (rename) or purge via dashboard |

---

## 9. Related files

| Path | Role |
|------|------|
| `apps/api/wrangler.toml` | `R2_PUBLIC_URL`, R2 bucket binding `ASSETS_BUCKET` |
| `apps/api/src/env.ts` | Types for `R2_PUBLIC_URL` and `ASSETS_BUCKET` |
| `apps/api/src/routes/upload.ts` | Single + batch upload handlers, SHA-256 keys, dedup |
| `apps/api/src/routes/icons.ts` | Icon library endpoints reading from `icons/` prefix |
| `apps/portal/lib/optimize-images.ts` | Rewriter + URL builders |
| `apps/portal/lib/hooks.ts` | `renderBlock` wires rewriter into theme pages |
| `apps/portal/app/_components/block-renderer.tsx` | `BlockRenderer` wires rewriter into content pages |
| `docs/OPERATIONS-GUIDE.md` §11 | Short summary in the ops guide |

---

## 10. Change log

| Date | Change |
|------|--------|
| 2026-04-23 | Custom domain `assets.cmsmasters.studio` enabled; Transformations enabled with `assets.cmsmasters.studio` as only allowed origin; rewriter deployed; content migrated off `pub-*.r2.dev` host (see commit `b5ccfb32`) |
