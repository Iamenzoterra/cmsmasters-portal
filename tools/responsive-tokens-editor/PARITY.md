# tools/responsive-tokens-editor — PARITY contract

> Cross-surface PARITY discipline mirrors WP-026/027/028 wave: any change to the tokens consumed via `tokens.responsive.css` MUST propagate same-commit across consuming surfaces.

## Cross-references

- `tools/block-forge/PARITY.md` — preview iframe injection contract for the block-authoring surface (`:7702`). Block-forge consumes `tokens.responsive.css` via TWO paths post-WP-030 Phase 6: (a) editor chrome `src/globals.css:2` `@import`, (b) preview iframe `src/lib/preview-assets.ts:14` `?raw` import (already wired since WP-024).
- `apps/studio/src/pages/block-editor/responsive/PARITY.md` — Studio Responsive tab preview iframe contract. Studio's `preview-assets.ts:19` already imports `tokensResponsiveCSS` since WP-027; Studio activates automatically when Phase 6 generator populates real values. Cross-reference entry in Phase 6 is docs-only (per Phase 0 Ruling #4).

## Save flow contract (Phase 6)

### Endpoints (Vite dev-server middleware in `vite.config.ts`)

- `GET /api/load-config` — reads `packages/ui/src/theme/responsive-config.json` via `fs.readFile`. Returns `{ ok: true, config }` on 200; `{ ok: false, error: 'not-found' }` on ENOENT. Client treats 404 as first-save scenario and falls back to `defaults.ts::conservativeDefaults`.
- `POST /api/save-config` — body `{ config: ResponsiveConfig, cssOutput: string, requestBackup: boolean }`. Writes BOTH files (`responsive-config.json` SOT + `tokens.responsive.css` cascade-override). Returns `{ ok: true, savedAt, backupCreated }` or `{ ok: false, error }`.

### Save-safety contract (mirrors infra-tooling SKILL 6 rules; PF.32)

1. **Read-guards on payload** — body validated for `{ config: object, cssOutput: string, requestBackup: boolean }` shape; rejected with 400 on mismatch.
2. **First-save .bak per session** — client owns the `_firstSaveDone` flag; server writes `.bak` iff `requestBackup === true`. `responsive-config.json.bak` is SKIPPED on truly-first-save when the file didn't exist yet (PF.34). `tokens.responsive.css.bak` is always created on first session save (preserves the WP-024 scaffold for rollback).
3. **Single-file scope per write** — TWO files written (`responsive-config.json` + `tokens.responsive.css`), both fixed paths resolved via `path.resolve(__dirname, '../../packages/ui/src/theme/...')`. No glob expansion, no recursive writes.
4. **No deletes** — server never deletes either file or the `.bak` siblings.
5. **Server stateless** — no cross-request state; session state lives in the client.
6. **Two-write atomicity trade-off** — JSON written first, then CSS. If CSS write fails after JSON success, JSON is committed but CSS is stale; next save retries both since JSON overwrite is idempotent. Acceptable V1 trade-off (PF.40).

### Cascade-override pattern

Token resolution order: `tokens.css` (Figma-synced, static values) → `tokens.responsive.css` (machine-generated, `clamp()` + container `@media` overrides) → cascade resolves to fluid behavior at runtime.

Order in consumers:

1. `apps/portal/app/globals.css:2-3` — tokens.css → tokens.responsive.css (verified Phase 0 §0.2).
2. `tools/block-forge/src/globals.css:1-2` — tokens.css → tokens.responsive.css (Phase 6 BAKE; cross-surface PARITY).
3. `tools/block-forge/src/lib/preview-assets.ts:13-14` — `tokensCSS` → `tokensResponsiveCSS` (`?raw` imports; iframe `<style>` `@layer tokens, reset, shared, block` order; both inside `@layer tokens`).
4. `apps/studio/src/pages/block-editor/responsive/preview-assets.ts:18-19` — same `?raw` byte-identical injection into iframe `<style>` (matches block-forge per Studio's own PARITY.md §7 deliberate-divergence note).

## Cross-surface PARITY mirror discipline

Any change to the GENERATOR output that adds/removes/renames tokens in `tokens.responsive.css` propagates AUTOMATICALLY to:

- **block-forge globals.css** cascade (`@import` re-resolves on next dev-server request — no edit needed unless layer order touched).
- **block-forge preview-assets.ts** iframe injection (`?raw` import re-resolves on Vite HMR — no edit needed).
- **Studio preview-assets.ts** iframe injection (same `?raw` mechanism — no edit needed).

**Manual same-commit edit needed ONLY when**: `@layer` order changes, file path changes, or new sibling file added (e.g., a future `tokens.fluid.css` companion). Phase 6 introduces no such structural change.

## Real-block validation workaround (carried from Phase 0 Ruling #2 caveat #3)

Live Preview Row (Phase 5) uses generic samples (H1/H2/body/buttons/section). For real-block validation post-Phase-6:

1. Click **Save** in `:7703` → server writes `responsive-config.json` + `tokens.responsive.css`.
2. Open `tools/block-forge/` (`:7702`) in a second browser tab.
3. Refresh — block-forge picks up the regenerated `tokens.responsive.css` automatically via Vite HMR (both globals.css cascade AND preview-iframe `?raw` import).
4. Inspect any production block at all 3 BPs (1440 / 768 / 375) to validate the fluid scale.

V2 enhancement (deferred to polish queue per WP §5.3): integrate `fast-loading-speed` sample directly into Live Preview Row.

## Status

✅ FULL CONTRACT — Phase 6 (machine-generated `tokens.responsive.css`, save-safety contract live, cross-surface PARITY chain documented).
