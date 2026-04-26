# WP-030 Phase 6 — Task: Save Flow + Cross-Surface PARITY

> Phase 6: Save flow (responsive-tokens-editor → fs → repo) + cross-surface PARITY hookup (block-forge + Studio cross-references). Closes the WP-030 generator → consumer loop.
> Status: 📋 DRAFTED (Brain) — awaiting Hands self-approval per `feedback_plan_approval` delegation.
> Phase 5 baseline: `0ba985eb` (doc fixup of `23ec58f4`).
> Estimated effort: 5–7h.

## Anchors

- **HEAD**: `0ba985eb` (Phase 5 doc fixup; ladder current)
- **Phase 5 head**: `23ec58f4` (P5 main commit — 22 files, +1867/-7)
- **WP-030 ladder (post-P5)**: `4f487154 → d8c5498a → ddec80e4 → 45a8e973 → 4c377a33 → a917f3b6 → 23ec58f4 → 0ba985eb`
- **Arch-test target**: 537 / 537 unchanged (Phase 6 adds files but the +4 path-existence tests for new tools-editor source files already in manifest; new tests for config-io are additive on existing file)
- **Test target**: 12 files (Phase 5: 11 → Phase 6: 12, +1 config-io.test.ts) / ≥73 assertions (Phase 5: 67 → Phase 6: ≥73, +6 minimum)
- **PFs introduced**: PF.31 – PF.40 (10 new findings)
- **Phase 0 escalation status (post-P5)**: (a)✅HELD / (b)✅RESOLVED-P5 / (c)✅HELD / (d)✅HELD-WAIT-P6
- **Polish queue (deferred)**: Locale-aware nums, edit-multipliers toggle, container effective-maxw indicator, auto-scale-down LivePreviewRow

## What Phase 6 Closes

Editor's Save button writes `responsive-config.json` (source-of-truth) AND regenerates `tokens.responsive.css` (cascade-override file consumed by all portal apps + 2 preview-assets.ts files). Cross-surface PARITY chain documented (3 PARITY.md files cross-reference each other). Block-forge globals.css extended to import tokens.responsive.css per WP §6.2. Studio side reduces to docs-only per Phase 0 Ruling #4 (preview-assets.ts:19 already imports tokensResponsiveCSS via `?raw`). Render-level smoke gate verifies fast-loading-speed renders identically pre/post-activation at @1440 (parity invariant) and shows fluid scaling at @375 (activation-success invariant).

After Phase 6 lands:
1. Vite dev server `:7703` exposes `GET /api/load-config` + `POST /api/save-config`
2. `packages/ui/src/theme/responsive-config.json` exists and is the SOT
3. `packages/ui/src/theme/tokens.responsive.css` regenerates with full 22-token + 3-container-block content (replaces WP-024 2-token scaffold)
4. block-forge `tools/block-forge/src/globals.css` line 2 imports tokens.responsive.css → editor chrome adopts fluid tokens at desktop widths (resolves to maxPx — zero visible change)
5. block-forge preview-assets.ts iframe injection picks up new content automatically (already imports via `?raw` at L14)
6. Studio Responsive tab preview iframe picks up new content automatically (already imports via `?raw` at L19)
7. Portal apps consume tokens.responsive.css via existing `apps/portal/app/globals.css` cascade order (line 3, post-WP-024) → portal pages render with fluid tokens after Vercel rebuild

## Pre-flight findings (new — PF.31 through PF.40)

| # | Severity | Description |
|---|----------|-------------|
| PF.31 | HIGH | **WP §6.2 (block-forge globals.css update) is NOT redundant.** Phase 0 Ruling #4 explicitly applies to **Studio side only** (preview-assets.ts:19 already imports). Block-forge globals.css ≠ block-forge preview-assets.ts. globals.css is editor chrome (the page wrapping iframes); preview-assets.ts is iframe srcdoc injection. preview-assets.ts at L14 ALREADY imports tokensResponsiveCSS via `?raw` (verified 2026-04-26 RECON) — iframe side wired since WP-024. globals.css is NOT — it imports only tokens.css. Phase 6 §6.2 BAKE: add line 2 `@import '../../../packages/ui/src/theme/tokens.responsive.css';` to block-forge globals.css. Effect: editor chrome adopts fluid tokens at desktop widths (zero visible change since clamps resolve to maxPx). Per Brain ruling R.1 = adopt for cross-surface PARITY consistency. |
| PF.32 | HIGH | **Vite fs middleware precedent EXISTS in `tools/block-forge/vite.config.ts`** at L19-181 — `blocksApiPlugin()` PluginOption with `configureServer(server) → server.middlewares.use(...)`. Phase 6 MIRRORS this pattern for `/api/load-config` (GET) + `/api/save-config` (POST). Save-safety contract (6 rules per infra-tooling SKILL L64): read-guards on payload, single-file scope, first-save-per-session `.bak`, no creates without explicit allowance, no deletes, server stateless. Per Brain ruling R.2. |
| PF.33 | MEDIUM | **`tokens.responsive.css` currently has WP-024 2-token scaffold** (`--space-section: clamp(1.5rem, 4vw, 6rem)` + `--text-display: clamp(1.75rem, 3.5vw, 4rem)`). Phase 6 OVERWRITES with full machine-generated content. Phase 5 result.md confirms generator output preserves both tokens (P0 ruling 1.a kept WP-024 scaffold values + P0 ruling 1.b kept --space-section). Verify via post-write smoke that `--space-section` + `--text-display` lines exist in regenerated file. |
| PF.34 | MEDIUM | **Save-safety contract differs slightly from block-forge precedent.** block-forge: 404 if target doesn't exist (overwrite-only). Phase 6 must CREATE `responsive-config.json` on first save (file may not exist before Phase 6 lands). Phase 6 OVERWRITES `tokens.responsive.css` (always exists since WP-024 scaffold). `.bak` semantics: first-save-per-session backs up CURRENT bytes of BOTH files (responsive-config.json `.bak` skipped if file didn't exist; tokens.responsive.css `.bak` always created on first save preserving WP-024 scaffold for rollback). Per Brain ruling R.2. |
| PF.35 | MEDIUM | **Render-level smoke gate per `feedback_visual_check_mandatory`** — Phase 6 UI-touching + cross-surface activation REQUIRES same-session live verification. Capture 6 screenshots in `logs/wp-030/p6-smoke/`: 3× block-forge `:7702` (fast-loading-speed at 1440/768/375) + 3× Portal `:3100` (theme-page rendering fast-loading-speed at 1440/768/375). Visual invariant: at 1440 → block-forge ≈ Portal ≈ pre-WP rendering (parity hold). At 375 → fluid scaling visibly active (heading shrinks from ~64px to ~52px on `--h2-font-size`). Per Brain ruling R.7. |
| PF.36 | LOW | **`tools/responsive-tokens-editor/PARITY.md` is currently a 17-line stub** (Phase 1 placeholder). Phase 6 expands to full contract: cross-references to block-forge + Studio PARITY.md, save-safety contract description, cascade-override pattern documentation, cross-surface PARITY mirror discipline, real-block validation workaround. Estimated +60-80 lines. Per Brain ruling R.5. |
| PF.37 | LOW | **`apps/portal/app/globals.css` cascade order verified clean in Phase 0 §0.2** — already imports tokens.responsive.css at line 3. Phase 6 just regenerates the file content; portal globals.css unchanged. Auto-cascade resolves new content on next request. No portal-side code change needed. |
| PF.38 | MEDIUM | **Test carry-forward**: Phase 5 = 11 files / 67 assertions. Phase 6 adds **+1 file** (`__tests__/config-io.test.ts`) covering: (a) loadConfig returns null on 404, (b) loadConfig parses JSON on 200, (c) saveConfig POST shape includes config + cssOutput, (d) saveConfig handles success response, (e) saveConfig handles error response. **+5-8 assertions minimum**. Mock `fetch` via `vi.spyOn(global, 'fetch')` (no actual fs writes from tests — middleware lives in dev server only). Target: 12 files / ≥73 assertions. |
| PF.39 | LOW | **Domain manifest update**: `responsive-config.json` is a NEW file in `packages/ui/src/theme/`. Add to `pkg-ui.owned_files`. `tokens.responsive.css` regenerated (NOT new) — manifest unchanged. `vite.config.ts` middleware additions — already in `infra-tooling.owned_files` (file path unchanged). Phase 6 manifest delta: +1 entry (responsive-config.json). |
| PF.40 | LOW | **Two-write atomicity trade-off**: saveConfig writes JSON first → CSS second. If CSS write fails mid-flight, JSON is committed but CSS is stale. Document in PARITY.md as known constraint. Mitigation: next save retries both writes (JSON write is idempotent overwrite). For V1 simplicity, no rollback logic. Hands-off acknowledgement: this is acceptable per `feedback_no_blocker_no_ask` philosophy — V1 ships the system, post-WP polish queue can add atomicity if real failure occurs. |

## Pre-flight findings carried (PF.21 – PF.30)

| # | Status |
|---|--------|
| PF.21 globals.css PostCSS @import order | ✅ BAKED P5 (no Phase 6 action) |
| PF.22 --container-* tokens introduction | ✅ RESOLVED P5 |
| PF.23 Schema field REQUIRED | ✅ HELD P5 |
| PF.24 Generator @media emit | ✅ HELD P5 |
| PF.25 LivePreviewRow iframes | ✅ HELD P5 |
| PF.26 srcdoc CSS exemption | ✅ HELD P5 |
| PF.27 Vitest config carry | ✅ HELD P5 |
| PF.28 lint-ds.sh skips tools/ | ✅ DOCUMENTED P5 |
| PF.29 Type-scale dial dormant on V1 baseline | ✅ DOCUMENTED P5 |
| PF.30 Tablet maxW above body content area inert | ✅ DOCUMENTED P5 |

## 8 Brain rulings

| ID | Ruling | Rationale |
|----|--------|-----------|
| **R.1** | **block-forge globals.css update STAYS in scope** (WP §6.2) — add line 2 `@import '../../../packages/ui/src/theme/tokens.responsive.css';` | Cross-surface PARITY discipline at globals.css level matches Portal apps. Editor chrome adopts fluid tokens; at desktop widths clamps resolve to maxPx (zero visible change). Phase 0 Ruling #4 covered Studio only. PF.31 nuance documented. |
| **R.2** | **Save flow architecture**: Vite middleware mirrors block-forge `blocksApiPlugin` pattern. Endpoints: `GET /api/load-config` (read responsive-config.json or 404→null) + `POST /api/save-config` (validate → write JSON → write CSS → return ok). Save-safety: first-save-per-session `.bak` for both files (skipped for responsive-config.json on truly-first-save when file didn't exist). | Single-port architecture (infra-tooling SKILL invariant). Stateless server. Client owns dirty / first-save flag. PF.32 + PF.34. |
| **R.3** | **Generator output format for tokens.responsive.css**: header comment block (file purpose, generator origin, "machine-generated — do not edit"), then existing snapshot output (22 tokens + 3 container blocks). Add `/* Generated by tools/responsive-tokens-editor on ${ISO timestamp} */` line. | Discoverability + future audits. Aligns with `tools/sync-tokens` precedent for tokens.css header. |
| **R.4** | **Save handler UI in App.tsx header**: "Save" button next to LoadStatusBadge. Disabled when `validate(config, tokens).length > 0` AND no override. "Save anyway" toggle inline below button on WCAG violation. Toast "Saved. Run `git commit` to deploy." on success; error toast on failure with Retry. | Forces explicit override decision on WCAG violation; matches WP-030 acceptance criteria #8 ("save-anyway gate exists"). |
| **R.5** | **PARITY.md trio update same-commit**: (a) `tools/responsive-tokens-editor/PARITY.md` expanded ~17→~80 lines with full contract; (b) `tools/block-forge/PARITY.md` adds cross-reference entry under "WP-030 cross-surface PARITY" subsection; (c) `apps/studio/src/pages/block-editor/responsive/PARITY.md` adds matching cross-reference entry. | Cross-surface PARITY discipline. PF.36. |
| **R.6** | **Test scope**: +1 file (`config-io.test.ts`), 5-8 assertions covering load + save round-trips with mocked fetch. Target 12/≥73. NO Vite middleware tests (lives in dev server only — would require integration suite or playwright; defer to V2 if needed). | Test cost-vs-coverage. Middleware is straightforward (mirrors block-forge); the failure modes are caught by render-level smoke at §6.7. PF.38. |
| **R.7** | **Render-level smoke MANDATORY in same session per `feedback_visual_check_mandatory`**: 6 screenshots × 2 surfaces × 3 BPs in `logs/wp-030/p6-smoke/`. block-forge boots :7702 (existing tool); Portal :3100 (existing dev server). fast-loading-speed renders BOTH places. Visual parity at 1440 (must match pre-WP) + visible fluid scale at 375 (must show shrinking heading). | Acceptance contract. PF.35. |
| **R.8** | **Phase 6 deferrals**: Edit-multipliers toggle, locale-aware number formatting, container effective-maxw indicator, auto-scale-down LivePreviewRow → all stay in post-WP polish queue. Phase 7 (Close + doc updates) is separate phase. | Minimum-viable scope. Phase 5 polish queue carry; nothing surfaced post-P5 to elevate priority. |

## Tasks 6.1 – 6.8

### 6.1 — Save handler in App.tsx (~30 LOC delta)

Add Save button to header, hold-to-save mechanic optional (defer to V2). Direct click triggers `handleSave()`:

```tsx
// App.tsx — add to imports
import { saveConfig } from './lib/config-io'
import { useState } from 'react' // already imported

// Inside App component, after existing useState declarations
const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
const [saveError, setSaveError] = useState<string | null>(null)
const [overrideWcag, setOverrideWcag] = useState(false)

const handleSave = async () => {
  if (violations.length > 0 && !overrideWcag) {
    setSaveStatus('error')
    setSaveError(`${violations.length} WCAG violation(s) — toggle "Save anyway" to override.`)
    return
  }
  setSaveStatus('saving')
  setSaveError(null)
  const result = await saveConfig(config, result.css) // sends both
  if (result.ok) {
    setSaveStatus('success')
    setOverrideWcag(false) // reset after successful save
  } else {
    setSaveStatus('error')
    setSaveError(result.error)
  }
}

// In header JSX, replace LoadStatusBadge alone with:
<div className="flex items-center gap-3">
  <LoadStatusBadge status={loadStatus} />
  <button
    type="button"
    onClick={handleSave}
    disabled={saveStatus === 'saving'}
    className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-2 text-[length:var(--text-sm-font-size)] font-[var(--font-weight-medium)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] disabled:opacity-50"
  >
    {saveStatus === 'saving' ? 'Saving…' : 'Save'}
  </button>
</div>

// Inline below header (or new banner component) when violations present:
{violations.length > 0 && (
  <label className="flex items-center gap-2 px-6 py-2 text-[length:var(--text-xs-font-size)] text-[hsl(var(--muted-foreground))]">
    <input
      type="checkbox"
      checked={overrideWcag}
      onChange={(e) => setOverrideWcag(e.target.checked)}
      className="rounded border-[hsl(var(--border))]"
    />
    Save anyway despite {violations.length} WCAG violation(s)
  </label>
)}

// Toast (simple inline; can promote to portal'd toast in V2):
{saveStatus === 'success' && (
  <div role="status" className="px-6 py-2 text-[length:var(--text-sm-font-size)] text-[hsl(var(--success-text))]">
    Saved. Run `git commit` to deploy.
  </div>
)}
{saveStatus === 'error' && saveError && (
  <div role="alert" className="px-6 py-2 text-[length:var(--text-sm-font-size)] text-[hsl(var(--destructive-text))]">
    {saveError}
  </div>
)}
```

### 6.2 — Generator output for tokens.responsive.css with header (~10 LOC delta in `lib/generator.ts`)

Wrap existing `result.css` output with a header comment block. Two options:
1. **Modify generator.ts**: emit header inside `generateTokensCss()` itself → snapshot test will need re-accept
2. **Wrap at save time**: compose header in `saveConfig()` callsite → snapshot stays stable

**Recommendation: option 2** — generator output stays pure (testable; snapshot stable); save-time wrap adds the header. Pseudo:

```ts
// In config-io.ts saveConfig, after generating CSS:
const cssWithHeader = `/* tokens.responsive.css
 *
 * MACHINE-GENERATED by tools/responsive-tokens-editor on ${new Date().toISOString()}.
 * Source of truth: packages/ui/src/theme/responsive-config.json
 * DO NOT EDIT MANUALLY — your changes will be overwritten on next Save.
 *
 * See WP-030 (Responsive Tokens Editor) + ADR-025 (Responsive Blocks).
 */

${cssOutput}
`
```

### 6.3 — Vite fs middleware (`vite.config.ts`, +120 LOC delta)

Mirror `tools/block-forge/vite.config.ts:19-181` pattern. PluginOption named `responsiveConfigApiPlugin`. Endpoints:

- `GET /api/load-config` — reads `packages/ui/src/theme/responsive-config.json` via `fs.readFile`. Returns `{ ok: true, config }` on 200, `{ ok: false, error: 'not-found' }` on ENOENT (signals first-save scenario; client treats as "use defaults").
- `POST /api/save-config` — body shape `{ config: ResponsiveConfig, cssOutput: string, requestBackup: boolean }`. Validates body via thin schema check (typeof checks); writes both files; returns `{ ok: true, savedAt: ISO, backupCreated: boolean }`.

**Save flow**:
1. Validate body shape (config object + cssOutput string + requestBackup boolean)
2. Read current responsive-config.json bytes (404 → no-existing-bytes branch)
3. Read current tokens.responsive.css bytes (always exists — WP-024 scaffold)
4. If requestBackup: write `.bak` for whichever exists
5. Write new responsive-config.json bytes (`JSON.stringify(config, null, 2) + '\n'`)
6. Write new tokens.responsive.css bytes (already-headered cssOutput)
7. Return `{ ok: true, savedAt: ISO, backupCreated: boolean }` (true if any `.bak` written)

**Path resolution**: `path.resolve(__dirname, '../../packages/ui/src/theme/responsive-config.json')` etc.

### 6.4 — `lib/config-io.ts` wire-up (+25 LOC delta)

Replace stub bodies:

```ts
export async function loadConfig(): Promise<ResponsiveConfig | null> {
  try {
    const res = await fetch('/api/load-config')
    if (res.status === 404) return null
    const data = await res.json() as { ok: boolean; config?: ResponsiveConfig; error?: string }
    if (!data.ok || !data.config) return null
    return data.config
  } catch {
    return null
  }
}

let _firstSaveDone = false // session flag — first save creates .bak

export async function saveConfig(
  config: ResponsiveConfig,
  cssOutput: string,
): Promise<SaveConfigResult> {
  const cssWithHeader = `/* tokens.responsive.css
 *
 * MACHINE-GENERATED by tools/responsive-tokens-editor on ${new Date().toISOString()}.
 * Source of truth: packages/ui/src/theme/responsive-config.json
 * DO NOT EDIT MANUALLY — your changes will be overwritten on next Save.
 *
 * See WP-030 (Responsive Tokens Editor) + ADR-025 (Responsive Blocks).
 */

${cssOutput}
`

  try {
    const res = await fetch('/api/save-config', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ config, cssOutput: cssWithHeader, requestBackup: !_firstSaveDone }),
    })
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ error: 'unknown' })) as { error?: string }
      return { ok: false, error: errBody.error ?? `http ${res.status}` }
    }
    _firstSaveDone = true
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
```

### 6.5 — block-forge globals.css line 2 add (PF.31 BAKE)

```css
@import '../../../packages/ui/src/theme/tokens.css';
@import '../../../packages/ui/src/theme/tokens.responsive.css';   /* WP-030 P6 cross-surface PARITY */
@import 'tailwindcss';
@config '../tailwind.config.ts';
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap');
/* ...rest unchanged */
```

Single-line addition. Cross-surface PARITY chain.

### 6.6 — PARITY.md trio update (~80 LOC across 3 files)

**(a) `tools/responsive-tokens-editor/PARITY.md` — expand from 17 to ~80 lines**:

```md
# tools/responsive-tokens-editor — PARITY contract

> Cross-surface PARITY discipline mirrors WP-026/027/028 wave: any change to the tokens consumed via `tokens.responsive.css` MUST propagate same-commit across consuming surfaces.

## Cross-references

- `tools/block-forge/PARITY.md` — preview iframe injection contract for block-authoring surface (`:7702`). Both globals.css (P6 BAKE) AND preview-assets.ts (already imports via `?raw`) consume tokens.responsive.css.
- `apps/studio/src/pages/block-editor/responsive/PARITY.md` — Studio Responsive tab preview iframe contract. preview-assets.ts:19 imports tokensResponsiveCSS via `?raw` since WP-027.

## Save flow contract (Phase 6)

### Endpoints (Vite dev-server middleware in `vite.config.ts`)

- `GET /api/load-config` → reads `packages/ui/src/theme/responsive-config.json`. Returns `{ ok: true, config }` on 200; `{ ok: false, error: 'not-found' }` on ENOENT (client treats as first-save scenario, falls back to `defaults.ts`).
- `POST /api/save-config` → body `{ config, cssOutput, requestBackup }`. Writes BOTH files (responsive-config.json + tokens.responsive.css). Returns `{ ok: true, savedAt, backupCreated }` or `{ ok: false, error }`.

### Save-safety contract (mirrors infra-tooling SKILL 6 rules)

1. **Read-guards on payload** — body validated for `{ config: object, cssOutput: string, requestBackup: boolean }` shape; rejected with 400 on mismatch.
2. **First-save .bak per session** — client owns the `_firstSaveDone` flag; server writes `.bak` iff `requestBackup === true`. responsive-config.json `.bak` skipped on first save when file didn't exist (truly-first-save scenario).
3. **Single-file scope per write** — TWO files written (responsive-config.json + tokens.responsive.css), both fixed paths. No glob expansion, no recursive writes.
4. **No deletes** — server never deletes either file.
5. **Server stateless** — no cross-request state.
6. **Two-write atomicity trade-off** — JSON written first, then CSS. If CSS write fails after JSON success, JSON is committed but CSS stale; next save retries both (JSON overwrite is idempotent). Acceptable V1 trade-off; PF.40.

### Cascade-override pattern

`tokens.css` (Figma-synced, static values) → `tokens.responsive.css` (machine-generated, clamp() + @media overrides) → cascade resolves to fluid behavior.

Order in consumers:
1. `apps/portal/app/globals.css:2-3` — tokens.css → tokens.responsive.css (verified Phase 0 §0.2)
2. `tools/block-forge/src/globals.css:1-2` — tokens.css → tokens.responsive.css (Phase 6 P6 BAKE)
3. `tools/block-forge/src/lib/preview-assets.ts:13-14` — tokensCSS → tokensResponsiveCSS (?raw imports; iframe srcdoc layer order: `@layer tokens, reset, shared, block` — both inside `@layer tokens`)
4. `apps/studio/src/pages/block-editor/responsive/preview-assets.ts:18-19` — tokensCSS → tokensResponsiveCSS (matches block-forge byte-identical injection)

## Cross-surface PARITY mirror discipline

Any change to the GENERATOR output that adds/removes/renames tokens in `tokens.responsive.css` MUST propagate to:
- block-forge globals.css cascade (auto via @import — no edit needed unless layer order touched)
- block-forge preview-assets.ts iframe injection (auto via `?raw` — no edit needed)
- Studio preview-assets.ts iframe injection (auto via `?raw` — no edit needed)

Effective auto-propagation since both surfaces consume via Vite import primitives. **Manual same-commit edit needed ONLY when**: layer order changes, file path changes, or new sibling file added (e.g., tokens.fluid.css companion).

## Real-block validation workaround (carried from Phase 0 Ruling #2 caveat #3)

Live Preview Row (Phase 5) uses generic samples (H1/H2/body/buttons/section). For real-block validation:
1. Save responsive-config.json (writes tokens.responsive.css)
2. Open `tools/block-forge/` (`:7702`) in second browser tab
3. Refresh — block-forge picks up regenerated tokens.responsive.css automatically
4. Inspect any production block at all 3 BPs to validate fluid scale

V2 enhancement: integrate fast-loading-speed sample directly into Live Preview Row (deferred per WP §5.3).

## Status

✅ FULL CONTRACT — Phase 6.
```

**(b) `tools/block-forge/PARITY.md` — append small section under "Cross-contract test layers"**:

```md
## WP-030 cross-surface PARITY (Phase 6)

`tools/responsive-tokens-editor/` (`:7703`) is the canonical writer of `packages/ui/src/theme/tokens.responsive.css` post-WP-030. Cross-reference: `tools/responsive-tokens-editor/PARITY.md`.

block-forge consumes tokens.responsive.css via TWO paths:
1. Editor chrome — `src/globals.css:2` `@import` (P6 BAKE)
2. Preview iframe — `src/lib/preview-assets.ts:14` `?raw` import → composed into `@layer tokens` block

Auto-propagation: any token addition/removal in generator output flows automatically through both consumption paths. Manual same-commit edits needed only when layer order, file path, or sibling-file structure changes.
```

**(c) `apps/studio/src/pages/block-editor/responsive/PARITY.md` — append matching section**:

```md
## WP-030 cross-surface PARITY (Phase 6)

`tools/responsive-tokens-editor/` (`:7703`) is the canonical writer of `packages/ui/src/theme/tokens.responsive.css` post-WP-030. Cross-reference: `tools/responsive-tokens-editor/PARITY.md`.

Studio Responsive tab consumes tokens.responsive.css via `src/pages/block-editor/responsive/preview-assets.ts:19` `?raw` import → composed into `@layer tokens` block (byte-identical with block-forge).

Auto-propagation: token changes in generator output flow automatically. Manual same-commit edit needed only when layer order, file path, or sibling-file structure changes (consistent with block-forge mirror discipline).
```

### 6.7 — Render-level smoke verification (manual, screenshot-driven)

Per `feedback_visual_check_mandatory`. Process:

1. Boot Portal local at :3100 (already running OR `cd apps/portal && npm run dev`)
2. Boot block-forge at :7702 (`cd tools/block-forge && npm run dev`)
3. Boot responsive-tokens-editor at :7703 (`cd tools/responsive-tokens-editor && npm run dev`)
4. **Pre-Save baseline screenshots** (block-forge first):
   - block-forge: select `fast-loading-speed` block, capture all 3 PreviewTriptych panels @1440 / 768 / 375 → save as `logs/wp-030/p6-smoke/01-block-forge-pre-save-1440.png` etc.
   - Portal :3100: navigate to a theme page rendering fast-loading-speed (or `apps/portal/app/themes/[slug]/page.tsx` test surface). Capture at 1440 viewport → `04-portal-pre-save-1440.png`
5. **Save responsive-config.json from :7703**: edit any value (e.g., baseAtMin 16 → 17), click Save, confirm toast. Inspect `packages/ui/src/theme/responsive-config.json` exists; `tokens.responsive.css` regenerated with header comment.
6. **Post-Save screenshots**:
   - block-forge: REFRESH browser at :7702 → re-capture 3 BPs → `02-block-forge-post-save-1440.png` etc.
   - Portal :3100: REFRESH browser → re-capture 1440 → `05-portal-post-save-1440.png`
7. **Visual parity assertions**:
   - At 1440: block-forge ≈ Portal ≈ pre-save (parity hold — heading at ~42px → ~42px, conservative defaults preserve desktop baseline)
   - At 375: heading visibly shrinks (~42px → ~32-34px depending on conservative-defaults)
   - At 768: intermediate (around 38-40px)

8. **Restore baseline**: restore baseAtMin to 16 + Save → confirm tokens.responsive.css reverts. Capture `06-restored-baseline.png` if visually distinct.

**Acceptance**: 6 screenshots in `logs/wp-030/p6-smoke/`. Visual narrative documented in `phase-6-result.md`.

### 6.8 — Tests (`__tests__/config-io.test.ts`, ~95 LOC, 6+ assertions)

```ts
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { loadConfig, saveConfig } from '../lib/config-io'
import { conservativeDefaults } from '../lib/defaults'

describe('config-io — loadConfig', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, 'fetch')
  })
  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it('returns null when /api/load-config returns 404', async () => {
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ ok: false, error: 'not-found' }), { status: 404 }))
    const result = await loadConfig()
    expect(result).toBe(null)
  })

  it('returns parsed config when /api/load-config returns 200 with ok:true', async () => {
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ ok: true, config: conservativeDefaults }), { status: 200 }))
    const result = await loadConfig()
    expect(result).toEqual(conservativeDefaults)
  })

  it('returns null when fetch throws', async () => {
    fetchSpy.mockRejectedValue(new Error('network'))
    const result = await loadConfig()
    expect(result).toBe(null)
  })
})

describe('config-io — saveConfig', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, 'fetch')
  })
  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it('POSTs config + cssOutput + requestBackup to /api/save-config', async () => {
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ ok: true, savedAt: '2026-04-26T19:50:00Z', backupCreated: true }), { status: 200 }))
    const result = await saveConfig(conservativeDefaults, ':root { --foo: 1; }')
    expect(result.ok).toBe(true)
    expect(fetchSpy).toHaveBeenCalledWith('/api/save-config', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'content-type': 'application/json' }),
    }))
    const callArgs = fetchSpy.mock.calls[0]
    const body = JSON.parse((callArgs[1] as RequestInit).body as string)
    expect(body.config).toEqual(conservativeDefaults)
    expect(body.cssOutput).toContain('MACHINE-GENERATED')
    expect(body.cssOutput).toContain(':root { --foo: 1; }')
    expect(typeof body.requestBackup).toBe('boolean')
  })

  it('returns ok:false with error message on non-2xx response', async () => {
    fetchSpy.mockResolvedValue(new Response(JSON.stringify({ error: 'invalid-body' }), { status: 400 }))
    const result = await saveConfig(conservativeDefaults, '')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('invalid-body')
    }
  })

  it('returns ok:false on fetch network failure', async () => {
    fetchSpy.mockRejectedValue(new Error('econnrefused'))
    const result = await saveConfig(conservativeDefaults, '')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('econnrefused')
    }
  })
})
```

## Verification gates (15)

| # | Gate | Pass criterion |
|---|------|----------------|
| 1 | **Drift sanity-check** | `npm test` from packages/ui — utopia-core checkWCAG semantic contract intact (HOLD) |
| 2 | **Typecheck** | `cd tools/responsive-tokens-editor && npx tsc --noEmit` exits 0 |
| 3 | **Tests** | `npm test` in tools/responsive-tokens-editor → **12 files / ≥73 assertions / 0 fail** (P5: 11/67 → P6: 12/≥73, +1 file +6 assertions minimum) |
| 4 | **Snapshot regression** | snapshot file unchanged from P5 (generator.ts NOT modified — header wrap lives in config-io.ts saveConfig at call site, NOT inside generateTokensCss). 22 vi STILL + 0 vw + 2 @media + 3 --container-max-w |
| 5 | **arch-test** | `npm run arch-test` → **537 / 537** (no manifest delta to file COUNT — only +1 entry for responsive-config.json which is in pkg-ui owned_files; that's a leaf path-existence test that auto-derives) |
| 6 | **No-hardcoded-styles audit** | App.tsx Save button + WCAG checkbox + toast use Tailwind v4 token classes (`bg-[hsl(var(--background))]`, `text-[length:var(--text-sm-font-size)]`); no `style={{}}` for static values |
| 7 | **Live UI verification** | 6 screenshots captured in `logs/wp-030/p6-smoke/`: 3 block-forge BPs (1440/768/375) + 3 Portal BPs (1440/768/375). `02-*` post-save shows visible diff vs `01-*` pre-save at 375 (heading shrunk). `04-*` Portal at 1440 visually identical pre/post (parity hold). |
| 8 | **fs-write evidence** | `packages/ui/src/theme/responsive-config.json` exists with `JSON.stringify` formatted content. `packages/ui/src/theme/tokens.responsive.css` updated (no longer 19-line WP-024 scaffold; now 60-80 lines including header). `.bak` files exist if first-save-per-session triggered backup. |
| 9 | **Manifest** | `responsive-config.json` added to `pkg-ui.owned_files` in `src/__arch__/domain-manifest.ts`. Single-line addition. |
| 10 | **Scope discipline** | Modified paths confined to: `tools/responsive-tokens-editor/{src,vite.config.ts,etc}`, `tools/block-forge/src/globals.css` (1 line), `tools/block-forge/PARITY.md` (small append), `apps/studio/src/pages/block-editor/responsive/PARITY.md` (small append), `packages/ui/src/theme/{responsive-config.json,tokens.responsive.css}` (regenerated), `src/__arch__/domain-manifest.ts` (1 line), `logs/wp-030/`. NO touch to `apps/portal/`, `apps/dashboard/`, `apps/admin/`, `content/`. |
| 11 | **fast-loading-speed.json untouched** | `git status` shows fast-loading-speed.json same M-state as Phase 4/5 baseline (pre-existing dirt, not Phase 6 regression). |
| 12 | **Emoji audit** | `cat tools/responsive-tokens-editor/src/lib/config-io.ts | grep -E '[\u{1F300}-\u{1F9FF}]'` → empty |
| 13 | **Token coverage gate** | tokens.responsive.css regenerated content contains: 22 `vi,` entries + 0 `vw,` entries + 2 `@media (min-width:` entries + 3 `--container-max-w` lines + header comment block + ISO timestamp |
| 14 | **PARITY trio coherence** | All 3 PARITY.md files updated same-commit. Cross-references resolve (text-grep `tools/responsive-tokens-editor/PARITY.md` in both block-forge + studio PARITY.md returns matches). |
| 15 | **WCAG save-anyway gate** | Override checkbox flips `overrideWcag` state; saveConfig fires only when override OR no violations. Manual: introduce a violation (override H1 to 20/120 — ratio 6×), confirm Save button blocked → toggle override → Save fires → tokens.responsive.css regenerated. |

### Verification command runbook

```bash
# Gate 1
cd packages/ui && npm test
# Gate 2
cd tools/responsive-tokens-editor && npx tsc --noEmit
# Gate 3
cd tools/responsive-tokens-editor && npm test
# Gate 4 — should be NO snapshot change since generator.ts untouched
cd tools/responsive-tokens-editor && npm test -- generator.test
# Gate 5
cd ../../.. && npm run arch-test
# Gate 6 — manual code review of App.tsx
# Gate 7 — manual screenshots in p6-smoke/
# Gate 8
ls -la packages/ui/src/theme/{responsive-config.json,tokens.responsive.css}{,.bak}
# Gate 9 — manual git diff src/__arch__/domain-manifest.ts
# Gate 10
git status --short
# Gate 11
git diff content/db/blocks/fast-loading-speed.json | head -3  # should be unchanged
# Gate 12 — emoji audit on new code
# Gate 13
grep -c "vi," packages/ui/src/theme/tokens.responsive.css  # expect 22
grep -c "@media (min-width:" packages/ui/src/theme/tokens.responsive.css  # expect 2
grep -c -- "--container-max-w" packages/ui/src/theme/tokens.responsive.css  # expect 3
grep -c "MACHINE-GENERATED" packages/ui/src/theme/tokens.responsive.css  # expect 1
# Gate 14
grep -l "tools/responsive-tokens-editor/PARITY.md" tools/block-forge/PARITY.md apps/studio/src/pages/block-editor/responsive/PARITY.md
# Gate 15 — manual UI smoke
```

## Files Changed (anticipated)

| Path | Type | Δ estimate |
|------|------|------------|
| `tools/responsive-tokens-editor/src/App.tsx` | MOD | +30 / -1 (Save button + WCAG override toggle + toast) |
| `tools/responsive-tokens-editor/src/lib/config-io.ts` | MOD | +50 / -10 (replace stub bodies with fetch wire-up + CSS header composition) |
| `tools/responsive-tokens-editor/vite.config.ts` | MOD | +120 / -0 (responsiveConfigApiPlugin block) |
| `tools/responsive-tokens-editor/src/__tests__/config-io.test.ts` | NEW | ~95 LOC, 6+ assertions |
| `tools/responsive-tokens-editor/PARITY.md` | MOD | +63 / -10 (full contract; replaces stub) |
| `tools/block-forge/src/globals.css` | MOD | +1 / -0 (line 2 @import) |
| `tools/block-forge/PARITY.md` | MOD | +12 / -0 (cross-ref section append) |
| `apps/studio/src/pages/block-editor/responsive/PARITY.md` | MOD | +12 / -0 (cross-ref section append) |
| `packages/ui/src/theme/responsive-config.json` | NEW | first-save artifact (~50 LOC; conservativeDefaults + smoke edits) |
| `packages/ui/src/theme/tokens.responsive.css` | MOD (regenerated) | ~60 / -19 (replaces WP-024 scaffold; includes header + 22 fluid tokens + 3 container blocks) |
| `packages/ui/src/theme/tokens.responsive.css.bak` | NEW (first-save) | ~19 LOC (preserves WP-024 scaffold for rollback) |
| `src/__arch__/domain-manifest.ts` | MOD | +1 / -0 (responsive-config.json into pkg-ui.owned_files) |
| `logs/wp-030/p6-smoke/01-block-forge-pre-save-1440.png` | NEW | screenshot |
| `logs/wp-030/p6-smoke/01-block-forge-pre-save-768.png` | NEW | screenshot |
| `logs/wp-030/p6-smoke/01-block-forge-pre-save-375.png` | NEW | screenshot |
| `logs/wp-030/p6-smoke/02-block-forge-post-save-1440.png` | NEW | screenshot |
| `logs/wp-030/p6-smoke/02-block-forge-post-save-768.png` | NEW | screenshot |
| `logs/wp-030/p6-smoke/02-block-forge-post-save-375.png` | NEW | screenshot |
| `logs/wp-030/p6-smoke/04-portal-pre-save-1440.png` | NEW | screenshot |
| `logs/wp-030/p6-smoke/05-portal-post-save-1440.png` | NEW | screenshot |
| `logs/wp-030/phase-6-task.md` | NEW | this file |
| `logs/wp-030/phase-6-result.md` | NEW | post-execution surface |

**Estimated total**: ~12 files modified + 1 new test + 1 new JSON + 6+ screenshots + 2 doc files (task + result) ≈ 22-24 paths.

## Stage block (post-execution, awaits Brain dual-gate review)

```bash
git add tools/responsive-tokens-editor/src/App.tsx \
        tools/responsive-tokens-editor/src/lib/config-io.ts \
        tools/responsive-tokens-editor/vite.config.ts \
        tools/responsive-tokens-editor/src/__tests__/config-io.test.ts \
        tools/responsive-tokens-editor/PARITY.md \
        tools/block-forge/src/globals.css \
        tools/block-forge/PARITY.md \
        apps/studio/src/pages/block-editor/responsive/PARITY.md \
        packages/ui/src/theme/responsive-config.json \
        packages/ui/src/theme/tokens.responsive.css \
        src/__arch__/domain-manifest.ts \
        logs/wp-030/phase-6-task.md \
        logs/wp-030/phase-6-result.md \
        logs/wp-030/p6-smoke/

git commit -m "feat(wp-030): Phase 6 — Save flow + cross-surface PARITY [WP-030 phase 6]"
```

`.bak` files (`tokens.responsive.css.bak`) intentionally NOT staged — they're transient artifacts of save flow, not source. Document this in result.md (Phase 4/5 carried similar exclusion of `.bak` semantics).

Doc fixup commit follows on Brain approval (Phase 1/2/3/4/5 precedent — records SHA in result.md Git table).

## Brain review gate (anticipated)

After Hands self-approves + executes:

**Code review**:
- `App.tsx` Save button + WCAG toggle + toast follow Tailwind v4 token-class discipline
- `config-io.ts` fetch wire-up handles all 3 paths (success / 404 / error) with stable types
- `vite.config.ts` middleware uses save-safety contract (6 rules); error handling matches block-forge precedent
- `config-io.test.ts` 6+ assertions cover happy path + 2 error paths
- `PARITY.md` trio cross-reference text resolves
- `domain-manifest.ts` +1 entry pkg-ui.owned_files
- snapshot file UNCHANGED (R.3 architectural decision: header wrap at save-time, not in generator)

**Live UI review**:
- 6 screenshots in `logs/wp-030/p6-smoke/`
- block-forge :7702 visual parity at 1440 (pre vs post-save) + visible fluid scale at 375
- Portal :3100 visual parity at 1440 (pre vs post-save) — desktop baseline preserved per conservative-defaults
- responsive-config.json file appears post-save in packages/ui/src/theme/
- tokens.responsive.css regenerates with header comment + 22 tokens + container blocks

## Open Questions (for Phase 7 Close prep)

Phase 7 (Close — approval gate) drafts post-Phase-6 SHA. Owns:
1. CONVENTIONS.md update — Responsive token system section (cascade override, conservative-defaults rule, when-to-add-token-vs-override)
2. BRIEF.md status table — WP-030 ✅ DONE
3. Domain skill updates: `pkg-ui/SKILL.md` (tokens.responsive.css machine-generated invariant), `infra-tooling/SKILL.md` (tools/responsive-tokens-editor block), `studio-blocks/SKILL.md` (preview-assets cross-surface PARITY)
4. ROADMAP.md note — WP-030 → WP-031 (Inspector rebuild)
5. Final arch-test pass + WP status flip (PLANNING → ✅ DONE + Completed date)

Approval-gate per `feedback_close_phase_approval_gate` (≥3 doc files touched).

## Self-approval signal pattern (Hands → Brain delegation)

Per Phase 4/5 precedent. Once Hands has:
1. Read this task spec
2. Done own pre-flight RECON (sanity-check the 8 rulings)
3. No pushback on R.1-R.8

Then post: **"🟢 Self-approved per Brain's delegation. Executing Phase 6."**

Surface pushback BEFORE execution if any of these warrant revision:
- R.1 (block-forge globals.css update) — reasonable to push back if "editor chrome adopting fluid tokens" feels surprising
- R.2 (save flow architecture) — reasonable to push back if want server-state .bak tracking instead of client-owned flag
- R.4 (Save handler UI) — reasonable to push back if hold-to-save (Phase 3 ResetButton precedent) preferred over instant click
- R.7 (render-level smoke) — reasonable to push back if Portal :3100 not feasible in current dev environment

If pushback surfaces, Brain revises spec; Hands re-approves; execution proceeds.

---

**Brain task draft complete. Awaiting Hands self-approval signal.**
