# WP-006 Phase 2: R2 Image Pipeline — Result

**Date:** 2026-04-02
**Status:** DONE

## What was done

### 1. R2 bucket config (`wrangler.toml`)
- Added `[[r2_buckets]]` binding: `ASSETS_BUCKET` → `cmsmasters-assets`
- Added `R2_PUBLIC_URL` var for public asset URL prefix
- Bucket needs to be created: `wrangler r2 bucket create cmsmasters-assets`
- Public access enabled via Cloudflare dashboard

### 2. Environment types (`env.ts`)
- Added `R2_PUBLIC_URL: string`
- Added `ASSETS_BUCKET: R2BucketBinding` with minimal interface
- Used local interface (not `R2Bucket` global) to avoid type leaking into Studio via api-client → AppType chain

### 3. Upload route (`routes/upload.ts`) — two endpoints

**POST /api/upload/batch** (new):
- Accepts `{ urls: string[] }` — up to 50 URLs
- Downloads each image, content-hashes to dedup, uploads to R2
- Key format: `blocks/{sha256-12chars}.{ext}`
- Returns `{ results: { original, uploaded, error? }[] }`
- Auth: content_manager or admin

**POST /api/upload** (replaced stub):
- Accepts multipart form with `file` field
- Same hash-based dedup + R2 upload
- Returns `{ url: string }`
- Auth: content_manager or admin

### 4. Studio API client (`block-api.ts`)
- Added `uploadImageBatch(urls)` function
- Returns `BatchUploadResult[]`

## Key decisions
- Content-hash (first 12 chars SHA-256) for dedup — same image uploaded twice → same R2 key
- Extension detected from Content-Type header, falling back to URL extension
- Batch endpoint (not one-at-a-time) — parallel download+upload in single request
- R2BucketBinding local interface — avoids @cloudflare/workers-types leaking to Studio tsconfig

## Setup needed (Cloudflare dashboard)
1. Create R2 bucket: `wrangler r2 bucket create cmsmasters-assets`
2. Enable public access in dashboard → R2 → cmsmasters-assets → Settings
3. Set `R2_PUBLIC_URL` in wrangler.toml [vars] or dashboard
4. Update `.dev.vars` with `R2_PUBLIC_URL=http://localhost:8787/r2` (or however local R2 emulation works)

## TypeScript
- `tsc --noEmit` clean for both `apps/api` and `apps/studio`
