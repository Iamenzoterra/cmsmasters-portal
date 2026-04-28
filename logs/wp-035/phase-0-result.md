# Execution Log: WP-035 Phase 0 — RECON pre-flight audit + 6 rulings + product-RECON

> Epic: WP-035 Block Forge Sandbox + Export/Import
> Executed: 2026-04-28
> Duration: ~50 minutes (audit-only; zero code mutations)
> Status: ✅ COMPLETE
> Domains audited: `infra-tooling` (Forge surface), `studio-blocks` (Studio Import surface), `app-api` (read-only — endpoint shape audit). Zero file mutations outside `logs/wp-035/`.

---

## What Was Audited

RECON-only audit pass for WP-035: Block Forge Sandbox + Export/Import. Mapped current Forge save/list byte-flow, layout-maker ExportDialog reference, Studio block-editor entry points, Hono blocks-routes contract, sandbox-path precedent (layout-maker `layouts/`), content-sync.js scope, and revalidate-endpoint semantics. Surfaced 6 Brain rulings (A–F) + product-RECON verdict + 3 pre-empted findings. No code written; only `logs/wp-035/phase-0-result.md` produced.

---

## §0 — Re-baseline

| Check | Result |
|---|---|
| `npm run arch-test` | **580 / 580** (510ms) — unchanged from WP-033 Phase 5 close baseline |
| Production block surface (`content/db/blocks/*.json`) | **9 files** — `fast-loading-speed`, `global-settings`, `header`, `sidebar-help-support`, `sidebar-perfect-for`, `sidebar-pricing`, `theme-details`, `theme-name`, `theme-tags`. First-run seed cost trivial. |
| `BLOCK_FORGE_SOURCE_DIR` override | Confirmed at [tools/block-forge/vite.config.ts:13-15](tools/block-forge/vite.config.ts:13) — `process.env.BLOCK_FORGE_SOURCE_DIR ?? path.resolve(__dirname, '../../content/db/blocks')` |
| Layout Maker `layouts/` git policy | **COMMITTED** — `git ls-files tools/layout-maker/layouts/` returns 13 yaml files (1 production + 5 presets + 6 scratch + theme-page-layout.yaml). `.gitignore` excludes only `exports/*.html|*.css`. |
| Block-forge `.gitignore` | `node_modules/, dist/, *.png, *.local, .vite/` — **no `blocks/` entry yet** (because no sandbox dir exists). |
| BlockJson key parity | 11 keys at [tools/block-forge/src/types.ts:6-27](tools/block-forge/src/types.ts:6) match `@cmsmasters/db` Block via `BlockVariants` import. |
| Existing `POST /api/blocks/import` | **DOES NOT EXIST** — Hono routes are GET / list, GET /:id, POST /, PUT /:id, DELETE /:id ([apps/api/src/routes/blocks.ts](apps/api/src/routes/blocks.ts)). Ruling C scope confirmed. |
| `BLOCK_FORGE_ALLOW_DIRECT_EDIT` flag callers | **Zero** — only `BLOCK_FORGE_SOURCE_DIR` is wired. No legacy script/test depends on direct-edit path → Phase 4 collapse is safe. |
| Existing `ExportDialog` consumers | Only `tools/layout-maker/src/App.tsx:11`. No shared package, no Studio mirror. → Ruling D port-verbatim is the only sane path. |

---

## §0.1 — Domain Skill invariants relevant to WP-035

NEW invariants surfaced from full SKILL.md reads (beyond WP §Domain Impact table).

### `infra-tooling` (block-forge sub-section)

- **Server-stateless writes; client-owned session.** SKILL §Invariants — every Vite middleware POST reads `requestBackup: boolean` per request; no in-memory cache. **Phase 1 Clone endpoint MUST inherit this** — no "current sandbox" cache; resolve SOURCE_DIR per request from `process.env`.
- **Pretty-print + trailing newline serialization** (vite.config.ts:150 `JSON.stringify(block, null, 2) + '\n'`). **ExportDialog Download/Copy MUST match byte-for-byte** so a download → re-import round-trip is git-clean. Otherwise Studio's paste re-pretty-prints and produces git-noisy diffs on next `/content-pull`.
- **`tools/*` is NOT a workspace** — install dance applies to any new tool-local code (carry from WP-026 Dev #2). Phase 1's ExportDialog component lives inside existing `tools/block-forge/` workspace; no new tool registration needed.
- **content-sync collision** (SKILL §Traps). `/content-pull` overwrites `content/db/blocks/*.json` from DB. **WP-035 sandbox migration ELIMINATES this trap for Forge edits** — Forge edits in `tools/block-forge/blocks/` survive `/content-pull`. Document in Phase 5 close memory.
- **Phase 1 Inspector probe iframe contract** — 3 hidden iframes pass through `renderForPreview` BEFORE `composeSrcDoc` (per saved skill block). Sandbox migration MUST keep this; no risk because Inspector reads `block` from React state, not disk.

### `studio-blocks`

- **Save ALWAYS revalidates cache-wide** — `apps/api/src/routes/revalidate.ts:25-28` accepts BOTH `{}` AND `{ all: true }` as all-tags semantics (L28: `body.all === true || Object.keys(body).length === 0`). Studio's existing handleSave uses `{ all: true }` ([apps/studio/src/pages/block-editor.tsx:406](apps/studio/src/pages/block-editor.tsx:406)); saved memory `feedback_revalidate_default` and WP-035 spec say `{}`. **Both encodings are semantically identical** — load-bearing finding for Ruling E (no behavior gap; just two encodings).
- **`createBlockSchema` / `updateBlockSchema` from `@cmsmasters/validators`** are the validator SOT — Studio's Import flow MUST validate against these BEFORE network round-trip; reject with field-level errors before submission. Confirmed in `block-editor.tsx:5` (createBlockSchema imported via zodResolver for new-block path).
- **`form.setValue('code', ..., { shouldDirty: true })` is the only enable-save vector** — `handleFileImport` (block-editor.tsx:461-487) is the precedent; new Import-JSON flow MUST follow the same pattern OR call submit directly (WP-035 design choice).
- **Image extraction via `extractR2Urls`** (block-editor.tsx:188-196) detects R2 URLs in saved block; Import flow may need to surface "imported block references images that don't exist in your R2 yet" if image surface drifts. Pre-empted out-of-scope per WP §OOS list, but the helper exists for future Phase 6+ work.
- **`splitCode(code)` extracts CSS from `<style>` tags** (block-editor.tsx:133-142) — Import payload arrives as separate html+css from Forge ExportDialog (BlockJson shape, NOT `code` blob). `formDataToPayload` already accepts split fields; ImportDialog submit handler can bypass `code` blob and emit html+css directly to API.

### `app-api`

- **No /import endpoint exists.** Confirmed via `grep -nE "app\.(get|post|put|delete)" apps/api/src/routes/blocks.ts | head -10`. Ruling C scope: 1 new route is the minimum surface change.
- **`requireRole('content_manager', 'admin')` gate** on POST /blocks + PUT /blocks/:id ([apps/api/src/routes/blocks.ts:52, 89](apps/api/src/routes/blocks.ts)). New POST /blocks/import (Ruling C Option B) MUST inherit the same role gate; anonymous import is a security hole.
- **POST /content/revalidate** at [apps/api/src/routes/revalidate.ts:9](apps/api/src/routes/revalidate.ts:9) — `requireRole('content_manager', 'admin')`. Same gate as blocks routes; ImportDialog submit chain (validate → upsert → revalidate) is one auth context.
- **`isDuplicate(err)` checks Postgres 23505** ([apps/api/src/routes/blocks.ts:151-156](apps/api/src/routes/blocks.ts:151)) — POST /blocks returns 409 on slug collision. New POST /blocks/import MUST handle the collision case server-side (upsert by slug) since "import an existing slug" is the common case (re-import/overwrite).

---

## §0.2 — Block Forge save/list flow byte-trace

### Full diagram (current state)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ User clicks [Save] in StatusBar (App.tsx:558 — onSave={handleSave})        │
│   ↓                                                                        │
│ App.tsx:400 handleSave (callback, deps [block, session, suggestions])      │
│   ↓                                                                        │
│ Early return if !isDirty(session)                          (L405)          │
│   ↓                                                                        │
│ accepted = pickAccepted(session, suggestions)              (L406)          │
│   ↓                                                                        │
│ Compose tweaks BEFORE applySuggestions (Phase 6 OQ5 fix):                  │
│   composedCss = session.tweaks.length>0                    (L419-422)      │
│     ? composeTweakedCss(block.css, session.tweaks)                         │
│     : block.css                                                            │
│   composedHtml = session.fluidModeOverride !== null        (L424-427)      │
│     ? setFluidMode(block.html, override)                                   │
│     : block.html                                                           │
│   ↓                                                                        │
│ applied = accepted.length > 0                              (L428-434)      │
│   ? applySuggestions({ slug, html: composedHtml, css: composedCss }, accepted)│
│   : { html: composedHtml, css: composedCss }                               │
│   ↓                                                                        │
│ updatedBlock = { ...block, html, css,                      (L446-451)      │
│                  variants: hasVariants ? session.variants : null }         │
│   (Ruling HH+LL — null sentinel preserves key through JSON.stringify)      │
│   ↓                                                                        │
│ requestBackup = !session.backedUp                          (L452)          │
│   ↓                                                                        │
│ saveBlock({ block: updatedBlock, requestBackup })          (L453)          │
│   ↓ POST /api/blocks/:slug                                                 │
│   ↓ { block: {...}, requestBackup: boolean }                               │
│   ↓                                                                        │
│ blocksApiPlugin POST handler (vite.config.ts:82-156)                       │
│   ├─ SAFE_SLUG regex check                  (L84)                          │
│   ├─ access(filepath, W_OK) — 404 if absent (L93-100) — overwrite-only     │
│   ├─ Read POST body, parse JSON             (L102-118)                     │
│   ├─ Validate body.block.html string + body.block.slug === slug (L129-138) │
│   ├─ if requestBackup: writeFile(`${filepath}.bak`, currentBytes) (L142-146)│
│   ├─ writeFile(filepath, JSON.stringify(block, null, 2) + '\n') (L150)     │
│   └─ res.json({ ok: true, slug, backupCreated })           (L154)          │
│   ↓                                                                        │
│ App.tsx:456 — refetch via getBlock(slug) → setBlock(refreshed)             │
│   ↓                                                                        │
│ App.tsx:462 — clearAfterSave(prev, refreshed.variants ?? {})               │
└────────────────────────────────────────────────────────────────────────────┘
```

### Three seam points identified

#### Seam 1 — Phase 1 Export button + ExportDialog (zero middleware change)

ExportDialog reads from React state (`block` + computed effective payload, mirroring the App.tsx L167-179 `composedBlock` memo). **No fetch needed** — block-forge has no separate Hono runtime (unlike LM's `:7701`); the entire payload is already on the client. Layout-maker's `api.exportLayout(id) → POST /layouts/:id/export` is server-side because LM compiles yaml → html+css; Forge has no compilation step (block JSON IS the payload).

**File seam:** new `tools/block-forge/src/components/ExportDialog.tsx`. Consumes `block` + `session` props; emits Download JSON / Copy payload via Blob + clipboard (port from layout-maker L51-62).

**Header seam:** new button in App.tsx L475-492 header next to `+ Variant (n)` (line 478-486 pattern).

#### Seam 2 — Phase 1 Clone affordance (NEW middleware route)

New `POST /api/blocks/clone` route in blocksApiPlugin. Server-side: read existing file → derive `<slug>-copy-N.json` (find first unused N via `readdir`) → write new file → return new slug. **Inherits SAFE_SLUG regex; reuses Pretty-print + trailing newline format.**

**File seam:** new branch in `tools/block-forge/vite.config.ts` blocksApiPlugin BEFORE the catch-all 405 (L159). Order matters — placing AFTER 405 catches the request first.

**Client seam:** new `cloneBlock(slug)` in `tools/block-forge/src/lib/api-client.ts` mirroring `saveBlock` pattern (L46-69).

**Header seam:** new `+ Clone` button in App.tsx header next to `+ Variant`.

#### Seam 3 — Phase 3 sandbox migration (one-line SOURCE_DIR change + first-run seed)

Single seam: [tools/block-forge/vite.config.ts:13-15](tools/block-forge/vite.config.ts:13). Default flips from `'../../content/db/blocks'` → `'./blocks'` (relative to tool root).

**First-run seed boot logic** lives in `configureServer` (vite.config.ts:22 onwards) — one-time check at server boot:

```ts
// pseudocode for Phase 3
async function ensureSandboxSeeded(sandboxDir: string) {
  await mkdir(sandboxDir, { recursive: true })
  const existing = (await readdir(sandboxDir)).filter(f => f.endsWith('.json'))
  if (existing.length === 0) {
    const seedDir = path.resolve(__dirname, '../../content/db/blocks')
    for (const f of await readdir(seedDir)) {
      if (f.endsWith('.json')) {
        await copyFile(path.join(seedDir, f), path.join(sandboxDir, f))
      }
    }
  }
}
```

**`BLOCK_FORGE_SOURCE_DIR` env var stays as escape hatch** — advanced users can opt back into direct-edit by `BLOCK_FORGE_SOURCE_DIR=content/db/blocks npm run block-forge`. Phase 3 (collapse Phase 4 per Ruling F recommendation) adds a header banner if `SOURCE_DIR` resolves to anything OTHER than the default sandbox path.

### content-sync.js scope verification

[tools/content-sync.js:22](tools/content-sync.js:22) — `CONTENT_DIR = path.join(__dirname, '..', 'content', 'db')`. Independent of `tools/block-forge/blocks/`. Sandbox migration is a non-event for content-sync — `/content-pull` continues writing `content/db/blocks/`, `/content-push` continues reading from there. **WP-035 IMPROVES the content-sync collision trap**: Forge edits in sandbox can no longer be trampled by `/content-pull`. Document in Phase 5 SKILL update.

---

## §0.3 — Layout Maker ExportDialog mapping + port plan

### Source vs target structural diff

| Concern | Layout-maker (source — 217 LOC) | Block-forge (target — projected ~150 LOC) | Action |
|---|---|---|---|
| Fetch | `useEffect` calls `api.exportLayout(id)` (L36-42) — server compiles | None — payload built client-side from React state | Drop fetch; useMemo over `composedBlock` |
| Validation gating | `validationState` + ValidationItemList (L33, L86-95) | Drop — no LM-style validation surface | Remove |
| HTML preview collapsible | `htmlOpen` state + button (L138-150) | Keep optional (debatable; nice for review) | Keep — adapt for `block.html` |
| CSS preview collapsible | `cssOpen` state + button (L153-166) | Keep optional | Keep — adapt for `block.css` |
| `slot_config` section | L168-176 | N/A | Remove |
| `files` section | L179-187 (compiled .html/.css refs) | N/A | Remove |
| Meta rows | slug / title / scope (L123-135) | slug / name (no scope) | Adapt (drop scope) |
| Backdrop click-to-close | L72 | Keep verbatim | Keep |
| Toast on success | `onShowToast` callback | Keep | Keep |
| Download JSON | Blob + `<a download>` (L51-62) — uses `result.payload.scope` for filename | Same pattern — use `block.slug` for filename | Adapt filename |
| Copy payload | `navigator.clipboard.writeText` (L44-49) | Same | Keep |
| `onExportSuccess` | Phase 6 — banner-dismiss callback (L13, L48, L61) | Block-forge has no equivalent banner | Drop |
| Class prefix | `lm-export-*` | `bf-export-*` | Rename |

### 11-key BlockJson payload mapping

| BlockJson key | Required? | Render in dialog? | Notes |
|---|---|---|---|
| `id` | yes (string\|number) | meta row | Always present (file-io read-time) |
| `slug` | yes (string) | meta row + filename | SAFE_SLUG regex enforced upstream |
| `name` | yes (string) | meta row | Renamed from LM's `title` |
| `html` | yes (string) | collapsible preview | Composed (`composedBlock.html` from App.tsx state) |
| `css` | yes (string) | collapsible preview | Composed (`composedBlock.css` from App.tsx state, includes session.tweaks) |
| `js` | optional | collapsible preview if present | Block-specific |
| `block_type` | optional | meta row if present | DB schema field |
| `hooks` | optional unknown | collapsible JSON if present | Pricing / link mapping |
| `metadata` | optional unknown | collapsible JSON if present | Author notes, figma_node, alt |
| `is_default` | optional boolean | meta row if true | Default-block-of-category flag |
| `sort_order` | optional number | meta row if present | DB ordering |
| `variants` | optional `BlockVariants \| null` | collapsible JSON if non-empty/non-null | Sentinel: emit `null` over `undefined` (Ruling HH+LL) — preserves key through JSON.stringify so disk + DB round-trip stay parity-equal |

### Port plan

**Source:** `tools/layout-maker/src/components/ExportDialog.tsx` (217 LOC).
**Target:** `tools/block-forge/src/components/ExportDialog.tsx` (~150 LOC projected).

**Adapt:**
- Drop validation gating, slot_config section, files section, scope meta-row, fetch effect (~40 LOC removed)
- Rename: `title` → `name`; `lm-export-*` → `bf-export-*` (CSS-class-only edit)
- Add: variants section (collapsed by default, shown only if `Object.keys(variants).length > 0`); js section (same gate)
- Style: Tailwind classes only (block-forge uses Tailwind; LM uses bespoke CSS classes via `src/styles/maker.css`). Net result: LOC down ~30%, structurally a port not an extraction.

**Net byte-divergence vs source:** ~30% (close to a port; not an extraction). Mirrors WP-028 Phase 2 reimplementation precedent (TweakPanel reimplemented over shared package; cross-surface mirror via byte-identical body modulo headers).

**🔔 Brain Ruling D — ExportDialog port shape.** Port-verbatim+adapt-fields recommended. Rejecting "extract shared dialog package" — only two callers (LM + block-forge); shared abstraction premature per WP-028 reimplement-not-extract precedent.

---

## §0.4 — Studio block-editor mount point + ImportDialog sketch

### Toolbar audit (current state)

Header at [apps/studio/src/pages/block-editor.tsx:537-627](apps/studio/src/pages/block-editor.tsx:537), height 65px, padding `var(--spacing-xl)`:

| Position | Button | Icon | Disabled when |
|---|---|---|---|
| L582 | Import HTML | `<Upload size={14} />` | never |
| L586 | Process | `<Sparkles size={14} />` | `!watchedCode.trim()` |
| L590 | Preview | `<Eye size={14} />` | `!watchedCode.trim()` |
| L622 | Export | `<Download size={14} />` | `!watchedCode.trim()` |

Pattern: `<Button variant="outline" size="sm" onClick={...}>{icon}{label}</Button>`. Hidden file input ref pattern at L575-580 (`fileInputRef.current?.click()` to trigger browser dialog).

### Placement options

| Option | Mount point | Pros | Cons | Verdict |
|---|---|---|---|---|
| **A** | New `Import JSON` button next to `Import HTML` (L582) | Discoverable, parallel to Import HTML; mirrors toolbar precedent | Adds button to busy toolbar (5 buttons total) | **RECOMMENDED** |
| B | Dropdown split-button on Import HTML | Doesn't grow width | Hides feature behind menu; WP-035 wants visibility | Reject |
| C | Top-level [Import block] in page header (above toolbar) | Highest visibility | Disconnects from toolbar flow | Reject |
| D | Kebab menu / right-rail | Lowest discoverability | Anti-feature | Reject |

**Pre-empted finding (no Brain ruling).** Option A — toolbar parallel placement. Per saved memory `feedback_no_blocker_no_ask`: precedent (Import HTML pattern) + WP signal (visibility) converge. Phase 2 task spec will bake in.

### ImportDialog surface sketch

```
┌──────────────────────────────────────────────────────────────┐
│ Import block from JSON                                  ×    │
├──────────────────────────────────────────────────────────────┤
│ [▸ Paste JSON]   [▸ Upload .json file]                       │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐   │
│ │ <textarea autoFocus />                                 │   │
│ │                                                        │   │
│ │ (or click to upload .json file)                        │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                              │
│ ▸ Preview (parsed):                                          │
│   slug: fast-loading-speed                                   │
│   name: Fast Loading Speed                                   │
│   html: 124 lines  |  css: 87 lines  |  variants: 2          │
│                                                              │
│ ⚠️  Block "fast-loading-speed" exists in DB.                  │
│     Click Import to overwrite the production block.          │
│                                                              │
│ [Cancel]                                          [Import]   │
└──────────────────────────────────────────────────────────────┘
```

### Slug-collision strategy

| Case | Action |
|---|---|
| Slug not in DB | POST /api/blocks/import → server-side createBlock; toast "Block imported (created)" |
| Slug exists in DB | Dialog warns BEFORE submit ("Block X exists. Click Import to overwrite."); on Import → POST /api/blocks/import → server-side update by slug; toast "Block imported (updated)" |
| Validation fails | Inline error above [Import] button; button disabled until errors clear |
| Empty payload | [Import] disabled |

`POST /api/blocks/import` (Ruling C Option B) handles both create + update server-side via "find or create by slug" — single round-trip, atomic upsert.

### Mount mechanics

- Modal: `<div role="dialog" aria-modal="true">` overlay (mirrors DeleteConfirmModal pattern at apps/studio/src/components/delete-confirm-modal.tsx).
- File upload: hidden `<input type="file" accept=".json">` + button click delegate (mirrors `fileInputRef` at block-editor.tsx:576-580).
- Submit: validate payload via `createBlockSchema` (loosened — id allowed) → POST /api/blocks/import → on success, POST /api/content/revalidate → toast → close.

---

## §0.5 — Sandbox path + git policy ruling

### Ruling A — Sandbox path

| Option | Path | Locality | First-run seed cost | Vite middleware change |
|---|---|---|---|---|
| **A (recommended)** | `tools/block-forge/blocks/` | Mirrors `tools/layout-maker/layouts/` precedent | 9 files × ~50KB = trivial | 1-line edit to vite.config.ts:13-15 default |
| B.1 | `apps/cmsmasters-portal/.sandbox/blocks/` | Too deep; tool-local more discoverable | same | same | Reject |
| B.2 | `~/.cmsmasters/block-drafts/` | Outside repo; loses git versioning | n/a | env-only forced | Reject |
| B.3 | Force-explicit `BLOCK_FORGE_SANDBOX_DIR` env (no default) | Defeats first-run convenience | n/a | UX regression | Reject |

**Decision:** `tools/block-forge/blocks/`. Confidence high — locality precedent + workplan signal converge.

**🔔 Brain Ruling A — Sandbox path = `tools/block-forge/blocks/`.** Confirms or pivots.

### Ruling B — Git policy

| Option | Sandbox in git? | `.bak` in git? | Cross-machine drafts | Working-tree noise |
|---|---|---|---|---|
| **A.1 COMMIT (recommended)** | ✅ tracked | ❌ gitignore via `tools/block-forge/.gitignore` (`blocks/*.bak`) | ✅ | Some — Save/Clone produce visible diffs (intent: drafts are versioned alongside source) |
| A.2 GITIGNORE | ❌ | ❌ | ❌ devs lose drafts on machine switch | Clean |

**Layout-maker precedent (verified via `git ls-files tools/layout-maker/layouts/`):**
- 13 yaml files committed: theme-page-layout.yaml + 5 presets (`_presets/*.yaml`) + 6 scratch-* files (scratch-broken-drawer, scratch-desktop-only, scratch-recovered-alias, scratch-unknown-token, inspect-test, 2132)
- `.gitignore` excludes only `exports/*.html` + `exports/*.css` (compiled artifacts)
- Pattern: drafts are committed; compiled artifacts are not

**Workplan signal (WP-035 Risk row 4):**
> "devs lose drafts on machine switch" — A.2 risk explicitly flagged

**Decision:** A.1 COMMIT. Mirrors layout-maker precedent + cross-machine continuity + workplan risk-mitigation signal.

`.gitignore` mechanics under A.1:
- `tools/block-forge/blocks/*.json` → tracked (default)
- `tools/block-forge/blocks/*.bak` → ignored via `tools/block-forge/.gitignore` addition (Phase 3 commits)
- `<slug>-copy-N.json` from Clone → automatically tracked once added (no special handling)

**🔔 Brain Ruling B — Git policy = COMMIT (mirrors layout-maker).** Confirms or pivots.

---

## §0.6 — Studio Import endpoint shape ruling

### Existing surface (apps/api/src/routes/blocks.ts)

| Route | Line | Purpose | Auth |
|---|---|---|---|
| GET /blocks | L20-28 | list all | authMiddleware |
| GET /blocks/:id | L32-45 | fetch by id | authMiddleware |
| POST /blocks | L49-82 | create new — 409 on slug collision | content_manager / admin |
| PUT /blocks/:id | L86-113 | update by **id** | content_manager / admin |
| DELETE /blocks/:id | L117-138 | delete with usage check | admin |

**The id-vs-slug gap.** Studio's existing `updateBlockApi(id, payload)` ([apps/studio/src/lib/block-api.ts:68-95](apps/studio/src/lib/block-api.ts:68)) takes id. An imported BlockJson payload from Forge has only `slug` (and optionally a stale id from source DB — id may be a Supabase UUID OR a numeric content-sync rowid; not portable across DBs). The Import flow must resolve "is this slug in DB?" first.

No `getBlockBySlug` helper exists in [apps/studio/src/lib/block-api.ts](apps/studio/src/lib/block-api.ts) — Phase 2 must add one for Option A or eliminate need via Option B.

### Options compared

| Option | Round-trips | Atomicity | New API surface | Studio client work |
|---|---|---|---|---|
| **A** Reuse existing endpoints (GET list filter → POST or PUT chain) | 2 (GET → POST/PUT) | Race window between GET and PUT | None | Add `getBlockBySlug` helper; ImportDialog logic complex |
| **B (recommended)** New POST /api/blocks/import (atomic upsert by slug) | 1 | Atomic | +1 route in blocks.ts (~40 LOC) + 1 validator | Add `importBlockApi(payload)` wrapper — simple |
| C Extend PUT /:id to accept slug as alt key | 1 | Atomic | Modified existing route (REST anti-pattern: ambiguous URL semantics) | Same as A |

**Decision:** Option B — new POST /api/blocks/import.

**Rationale:**
- Atomic upsert eliminates race window (GET/PUT is a TOCTOU smell on shared DB)
- Single round-trip (perf + UX latency)
- Centralizes "find or create by slug + auto-revalidate" — future scriptable: CLI import, /content-push integration, batch import
- Auth gate identical (`requireRole('content_manager', 'admin')`)
- Validator effort minimal — extends existing `createBlockSchema` with `id` as optional/ignored on import + slug as required key

### Endpoint contract sketch

```
POST /api/blocks/import
Authorization: Bearer <Supabase access token>
Content-Type: application/json

Request body (importBlockSchema, new):
{
  block: BlockJson,            // 11-key payload; id ignored/optional
  revalidate?: boolean = true  // default true; chain to POST /content/revalidate { all: true }
}

Response (200):
{
  data: Block,                 // saved block from DB
  action: 'created' | 'updated',
  revalidated: boolean
}

Response (400):
{ error: 'Validation failed', details: ZodIssue[] }

Response (409):
(impossible on import — slug collision = update path; no 409 emit)

Response (500):
{ error: 'Internal server error', detail?: string }
```

### arch-test math projection

| Phase | File | owned_files Δ | Test Δ |
|---|---|---|---|
| Phase 1 | `tools/block-forge/src/components/ExportDialog.tsx` (NEW) | infra-tooling +1 | +N tests on render + interaction |
| Phase 1 | `tools/block-forge/src/lib/api-client.ts` (cloneBlock added) | infra-tooling +0 (existing file) | +N tests |
| Phase 1 | `tools/block-forge/vite.config.ts` (POST /clone branch) | infra-tooling +0 | +N tests |
| Phase 2 | `apps/studio/src/components/ImportDialog.tsx` OR `apps/studio/src/pages/block-editor/ImportDialog.tsx` (NEW) | studio-blocks +1 | +N tests |
| Phase 2 | `apps/studio/src/lib/block-api.ts` (importBlockApi added) | studio-core +0 (existing) | +N tests |
| Phase 2 | `apps/api/src/routes/blocks.ts` (POST /import branch) | app-api +0 (existing) | +N tests |
| Phase 2 | `packages/validators/src/block.ts` (importBlockSchema added) | pkg-validators +0 (existing) | +N tests |
| Phase 3 | `tools/block-forge/blocks/*.json` (sandbox seed; if Ruling A.1 COMMIT chooses to manifest-track) | infra-tooling +0 OR +9 — SUB-RULING (see below) | n/a |
| Phase 3 | `tools/block-forge/.gitignore` (add `blocks/*.bak`) | infra-tooling +0 (file exists; just edit) | n/a |

**Sub-ruling needed:** are `tools/block-forge/blocks/*.json` files manifest-tracked individually, or are they treated like `workplan/*.md` (committed but NOT in domain-manifest, per saved skill knowledge — "workplan/*.md and tools/studio-mockups/*.html tracked outside manifest")? **Recommend: NOT manifest-tracked** (sandbox is volatile; like content/db/*.json which are also not individually manifest-tracked — `getOwnerDomain` resolves them via directory rules). Phase 3 task prompt confirms.

**Net Phase 0 → Phase 5 close:** ~+2-3 owned_files (ExportDialog + ImportDialog + maybe one helper hook) + ~30-50 new tests. arch-test target: **~582-585** (start: 580).

**🔔 Brain Ruling C — Studio Import endpoint = Option B (new POST /api/blocks/import).** Confirms or pivots.

---

## §0.7 — Auto-revalidate / sunset / PARITY consolidated rulings

### 0.7a — Auto-revalidate trigger pattern

**Body shape encoding:** [apps/api/src/routes/revalidate.ts:28](apps/api/src/routes/revalidate.ts:28) treats BOTH `{}` AND `{ all: true }` as semantically identical (`isAllTagsRequest = body.all === true || Object.keys(body).length === 0`). Studio's existing handleSave uses `{ all: true }` (block-editor.tsx:406); WP-035 spec + saved memory `feedback_revalidate_default` say `{}`.

**Pre-empted finding:** new ImportDialog flow uses `{}` (canonical per saved memory). The two encodings are identical at runtime; choosing `{}` aligns new code with the saved memory + WP spec. Existing Studio code stays on `{ all: true }` (no rip-up; the encoding is a free choice).

**Trigger options:**
- **α (recommended) — Always auto-revalidate.** Import success → fire-and-forget POST `/api/content/revalidate {}` → toast on completion. No opt-out. Mirrors current Save UX.
- β — Toast with explicit "Revalidate now" button. User can defer.

**Decision:** Option α. Import is the production gate; deferring revalidate creates "imported but invisible on portal" surprise. Mirror existing Save UX (already auto-revalidates per block-editor.tsx:401-411).

**🔔 Brain Ruling E — Auto-revalidate = Option α (always auto, body `{}`).** Confirms or pivots.

### 0.7b — Direct-edit sunset (Phase 4 collapse decision)

**Audit:** `grep -rnE "BLOCK_FORGE_ALLOW_DIRECT_EDIT|BLOCK_FORGE_SOURCE_DIR" tools/ apps/ scripts/` returns:
- `tools/block-forge/README.md:94` — doc reference to override
- `tools/block-forge/vite.config.ts:13-14` — only consumer

**Zero callers** depending on a direct-edit allow flag. No legacy script, no test, no CI hook. Phase 4 collapse is risk-free.

**Options:**
- **COLLAPSE (recommended) — Phase 4 → Phase 3.** Phase 3 sandbox migration includes:
  - `BLOCK_FORGE_ALLOW_DIRECT_EDIT` flag handling (false default; if `true`, vite.config.ts SOURCE_DIR resolves to `content/db/blocks/` AND a header banner warns)
  - OR: full removal of direct-edit fallback — only `BLOCK_FORGE_SOURCE_DIR` env var remains as escape hatch (advanced users set it explicitly)
  - Banner if `SOURCE_DIR !== sandbox default` regardless of mechanism
- KEEP — Phase 3 ships sandbox-only; Phase 4 audits direct-edit callers (find none; full removal); Phase 5 close

**Decision:** COLLAPSE. WP doc allows it ("may collapse into Phase 3 if scope minimal" — line 213). Saves one commit + simpler ladder. Phase numbering: 0 → 1 → 2 → 3 → (no 4) → 5. Commit Ladder updated by Brain (not Hands; not in Phase 0).

**🔔 Brain Ruling F — Phase 4 collapse INTO Phase 3.** Confirms or keeps Phase 4 separate.

### 0.7c — PARITY trio impact

**Asymmetric design.** WP-035 surface adds:
- Forge-only: ExportDialog + Clone affordance (+1 middleware route + 1 client wrapper + 1 component)
- Studio-only: ImportDialog (+1 component + 1 client wrapper + 1 API route + 1 validator)
- RTE-only: nothing — RTE has no surface in WP-035

**No cross-surface mirror discipline.** Forge ExportDialog has no Studio counterpart; Studio ImportDialog has no Forge counterpart. The asymmetry IS the design (export from sandbox → import to production).

**Pre-empted finding (no Brain ruling):**
- `tools/block-forge/PARITY.md` — adds "WP-035 Sandbox + Export" entry noting Forge gains ExportDialog + Clone with NO Studio mirror (asymmetric by design)
- `apps/studio/src/pages/block-editor/responsive/PARITY.md` — adds "WP-035 Import" entry noting Studio gains ImportDialog with NO Forge mirror
- `tools/responsive-tokens-editor/PARITY.md` — UNTOUCHED

Phase 5 close commits these PARITY updates. Approval gate per saved memory `feedback_close_phase_approval_gate` activates (≥3 doc files: BRIEF + CONVENTIONS + 2 SKILLs + 2 PARITY + WP doc + new memory `feedback_forge_sandbox_isolation` ≈ 7 files).

---

## §0.8 — Product-RECON: Forge sandbox + Studio import mental-model match

### Scenario walk

> **Dmytro opens Block Forge after WP-035 ships.** Goal: tweak `fast-loading-speed` mobile padding; ship to production.
>
> 1. Open `:7702` → BlockPicker shows `fast-loading-speed` (sandbox, seeded on first run)
> 2. Click block → loads in editor
> 3. (Optional) Click `[+ Clone]` → creates `fast-loading-speed-copy-1` for safe experimentation
> 4. Inspector tweak mobile padding → Save (writes to sandbox)
> 5. Click `[Export]` → ExportDialog opens with JSON pretty-print
> 6. Click `[Copy payload]` → toast confirms
> 7. Open Studio block-editor for `fast-loading-speed`
> 8. Click `[Import JSON]` → modal opens
> 9. Paste from clipboard → preview renders → validation passes → click `[Import]`
> 10. Toast: "Block imported. Revalidating cache..."
> 11. Production portal sees the edit on next page load

### 8 questions answered

**a. Two-surface friction.** Does Dmytro want to context-switch from Forge to Studio?
- **Verdict: GREEN.** WP-035 spec line 141 explicitly cites the dialog as a checkpoint ("user can read what they're about to deploy before clicking Copy/Download"). Layout Maker's same pattern has been productive evidence for 6+ months. Two-stage push (Forge → DB) would lose review affordance. Trust gain > friction cost.

**b. Clone naming (`<slug>-copy-N`).**
- **Verdict: GREEN.** Auto-incrementing N mirrors macOS Finder duplicate behavior. Layout Maker `cloneLayout` takes `{ name, scope }` (a-priori prompt); block clone is structurally simpler (just slug). Auto-suffix is the path of least resistance for "let me play with a copy" — author renames in the editor if a custom name is needed (slug field is editable). Zero added prompts; zero added cognitive load.

**c. First-run seed surprise.** First Forge open after WP-035 ships → sandbox empty → 9 production blocks copy in.
- **Verdict: GREEN.** Empty sandbox = useless tool. Auto-seed is the only sensible default. Brief StatusBar one-time message ("Sandbox seeded from production seed (9 blocks)") removes ambiguity. Contrast: requiring explicit "Seed from production" button = extra step + first-run confusion.

**d. Production seed visibility.** After migration, BlockPicker shows only sandbox blocks. Should production seed be surfaced?
- **Verdict: GREEN with caveat.** Invisibility matches mental model ("I'm editing my drafts; production lives elsewhere"). StatusBar already shows `sourcePath` ([App.tsx:556](tools/block-forge/src/App.tsx:556)) — Phase 3 updates to read sandbox path; one-line change reinforces "this is your sandbox" message without needing a "production seed" panel. **Caveat for V1:** ensure StatusBar correctly reflects sandbox vs production-seed (env override case) so an advanced user running `BLOCK_FORGE_SOURCE_DIR=...content/db/blocks` sees a banner — covered by Ruling F (collapse Phase 4 → Phase 3 includes this banner).

**e. Re-import overwrite default.**
- **Verdict: GREEN.** Audience is technical (Dmytro + Brain agents). CLI tools default-overwrite; Webflow/WordPress prompt. Modal warns BEFORE Import click ("Block X exists. Click Import to overwrite.") — confirmation lives in the deliberate two-click flow, not in a separate prompt. **Alternative considered ("Import as new (slug-2)"):** rejected — adds branching UI for an edge case (re-import is the common case; "fork to new slug" is what `[+ Clone]` in Forge does).

**f. Validation failure UX.**
- **Verdict: GREEN.** Inline error above [Import] button + button disabled. Mirrors RHF + Zod patterns already used in Studio (block-editor.tsx form errors). Field-level highlights in JSON preview = nice-to-have; defer to V2 if author feedback escalates. Toast-only error = worse UX (dismissable); rejected.

**g. Roundtrip-as-test.**
- **Verdict: GREEN.** Manual roundtrip per edit is the contract (per WP §OOS line 263 — "CLI tool for headless export/import" out). Cost = acceptable given the trust gain (review-before-deploy). Hot-import would short-circuit Studio's role as production gate; rejected.

**h. Inspector pin invalidation on Clone.**
- **Verdict: GREEN.** Existing behavior (App.tsx:294 `setSelection(null)` on slug change) invalidates pin on slug change. Cloned block has fresh DOM; pin reuse is unsafe (selectors might match different elements after fork). Document in §Inspector skill or just inherit from existing pin-invalidation behavior. No new code needed — the slug-change useEffect already handles it.

### Verdict

**🟢 GREEN — proceed as designed.**

All 8 questions surface zero mental-model misalignments. The two-surface chokepoint (Forge → Studio Import) IS the production gate by design; this is what the WP architects with intent. Zero V1 caveats requiring deferred V2 work; zero RED flags requiring re-plan.

---

## 🔔 Brain rulings surfaced (6)

User (Dmytro / Brain) reads each, confirms or pivots. Phase 1 starts only after all six are signed off.

1. **🔔 Ruling A — Sandbox path = `tools/block-forge/blocks/`.** (§0.5)
   - Recommended: this path. Mirrors `tools/layout-maker/layouts/` precedent.
   - Alternatives if rejected: `apps/cmsmasters-portal/.sandbox/blocks/` (too deep), `~/.cmsmasters/block-drafts/` (loses git), force-explicit env (UX regression).

2. **🔔 Ruling B — Git policy = COMMIT.** (§0.5)
   - Recommended: COMMIT (sandbox JSON tracked; .bak gitignored).
   - Alternative if rejected: GITIGNORE (per-developer scratch; loses cross-machine drafts; deviates from layout-maker precedent).

3. **🔔 Ruling C — Studio Import endpoint = Option B (new POST /api/blocks/import).** (§0.6)
   - Recommended: new endpoint for atomic upsert + future-scriptable.
   - Alternative if rejected: Option A (existing GET-then-POST/PUT chain) — 2 round-trips + race window + complex client logic.

4. **🔔 Ruling D — ExportDialog port shape = port-verbatim+adapt-fields.** (§0.3)
   - Recommended: port LM ExportDialog into block-forge with field renames + structural drops.
   - Alternative if rejected: extract shared dialog to `packages/ui/` — premature (only 2 callers); WP-028 reimplement-not-extract precedent.

5. **🔔 Ruling E — Auto-revalidate trigger = Option α (always auto, body `{}`).** (§0.7a)
   - Recommended: fire-and-forget POST `{}` after Import success.
   - Alternative if rejected: Option β (toast with explicit "Revalidate now" — user defers).
   - Compat note: Studio's existing handleSave uses `{ all: true }` — semantically identical to `{}` per [apps/api/src/routes/revalidate.ts:28](apps/api/src/routes/revalidate.ts:28). New code uses `{}` (canonical); existing code stays.

6. **🔔 Ruling F — Direct-edit sunset = COLLAPSE Phase 4 INTO Phase 3.** (§0.7b)
   - Recommended: 4-commit ladder (Phases 0, 1, 2, 3, 5; no 4). Phase 3 includes banner + `BLOCK_FORGE_SOURCE_DIR` escape hatch.
   - Alternative if rejected: keep Phase 4 separate (audits direct-edit callers — already known empty; full removal of fallback). Adds one commit; not load-bearing.
   - Audit confirms zero callers depending on direct-edit flag; collapse is risk-free.

---

## 🔔 Product-RECON Verdict (separate gate)

**🟢 GREEN — proceed as designed.** All 8 product-RECON questions (§0.8 a–h) surface zero mental-model misalignments. No V1 caveats; no RED re-plan signals. Phase 1 starts on Ruling A–F sign-off.

---

## Pre-empted findings (no Brain ruling needed)

1. **Studio Import button placement = Option A (toolbar parallel next to Import HTML).** §0.4. Precedent (Import HTML pattern at block-editor.tsx:582) + WP signal converge; saved memory `feedback_no_blocker_no_ask` invokes pre-empt. Phase 2 task prompt bakes in.

2. **PARITY trio asymmetric update (Phase 5).** §0.7c.
   - `tools/block-forge/PARITY.md` — adds WP-035 entry noting Forge gains ExportDialog + Clone with NO Studio mirror.
   - `apps/studio/src/pages/block-editor/responsive/PARITY.md` — adds WP-035 entry noting Studio gains ImportDialog with NO Forge mirror.
   - `tools/responsive-tokens-editor/PARITY.md` — UNTOUCHED.
   - Phase 5 close approval gate activates (≥3 doc files).

3. **Revalidate body encoding for new code = `{}`.** §0.7a. New ImportDialog uses canonical `{}` per saved memory. Studio's existing handleSave (`{ all: true }`) is semantically identical and stays as-is. No rip-up; no compat shim needed.

4. **Forge `[Export]` + `[+ Clone]` button placement.** WP spec line 174 says "header (next to Save)", but Save is in StatusBar (footer at App.tsx:551-562). Natural placement: header next to existing `+ Variant (n)` button (App.tsx:478-486 pattern). Phase 1 task prompt bakes in. No Brain ruling — placement is mechanical.

5. **`tools/block-forge/blocks/*.json` NOT individually manifest-tracked.** §0.6. Sandbox files are volatile drafts (cf. `content/db/*.json` not in manifest, per skill). `getOwnerDomain('tools/block-forge/blocks/...')` resolves via directory rule to `infra-tooling`. Phase 3 task prompt confirms; arch-test stays at +1-2 owned_files (just ExportDialog + ImportDialog component files), not +10.

---

## Open Questions

None. All architectural decisions consolidated into Rulings A–F + product-RECON verdict. Pre-empted findings bake into Phase 1/2/3/5 task prompts directly.

---

## Verification Results

| Check | Result |
|---|---|
| `npm run arch-test` | ✅ **580 / 580** (510ms) — unchanged from WP-033 close baseline |
| result.md sections present | ✅ §0.1 – §0.8 (8 / 8) |
| 6 Brain rulings (A–F) enumerated | ✅ |
| Product-RECON verdict separate gate | ✅ 🟢 GREEN |
| Zero file changes outside `logs/wp-035/` | ✅ — only `logs/wp-035/phase-0-result.md` written |
| Read all 3 SKILL.md files (infra-tooling, studio-blocks, app-api) | ✅ |
| Read WP-035 spec verbatim | ✅ |
| Read tools/block-forge/PARITY.md | ✅ |
| Read apps/studio/.../responsive/PARITY.md | ✅ |
| Confirmed no existing /api/blocks/import endpoint | ✅ |
| Confirmed no existing BLOCK_FORGE_ALLOW_DIRECT_EDIT callers | ✅ |
| Confirmed layout-maker layouts/ git-tracked (precedent) | ✅ 13 yamls via `git ls-files` |

---

## Git

- Commit: TBD (Hands writes after this file lands; commit message: `docs(wp-035): phase 0 RECON — 6 rulings + product-RECON verdict + endpoint audit [WP-035 phase 0]`)

---
