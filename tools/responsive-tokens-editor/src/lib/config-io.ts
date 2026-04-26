// WP-030 Phase 6 — fs-IO via Vite dev-server middleware (vite.config.ts).
//
// Endpoints:
//   GET  /api/load-config  → reads packages/ui/src/theme/responsive-config.json
//   POST /api/save-config  → writes responsive-config.json + tokens.responsive.css
//
// Save-safety contract (mirrors infra-tooling SKILL 6 rules; PF.32):
//   1. Body validated server-side
//   2. First-save-per-session `.bak` (client-owned `_firstSaveDone` flag)
//   3. Two fixed paths only
//   4. No deletes
//   5. Server stateless
//   6. Two-write atomicity trade-off documented (PF.40 — JSON first then CSS;
//      next save retries both since JSON overwrite is idempotent)

import type { ResponsiveConfig, LoadConfigResult, SaveConfigResult } from '../types'

/**
 * Load responsive-config.json from disk via Vite dev-server fs bridge.
 * Returns null if file missing — App.tsx falls back to conservativeDefaults.
 */
export async function loadConfig(): Promise<LoadConfigResult> {
  try {
    const res = await fetch('/api/load-config')
    if (res.status === 404) return null
    if (!res.ok) return null
    const data = (await res.json()) as { ok: boolean; config?: ResponsiveConfig; error?: string }
    if (!data.ok || !data.config) return null
    return data.config
  } catch {
    return null
  }
}

/**
 * Session flag — set true after first successful save. Drives `requestBackup`
 * field on the next POST so the server creates `.bak` only once per session.
 * Mirrors block-forge's client-owned dirty/first-save discipline (PF.32 Rule 2).
 */
let _firstSaveDone = false

/**
 * Save config + regenerated CSS to disk via POST /api/save-config.
 *
 * Prepends a single-line timestamp comment to the raw `cssOutput` from
 * `generator.ts` (R.3: snapshot stays stable; generator already emits its
 * own AUTO-GENERATED header from Phase 2). PF.41 — RECON catch on Phase 6
 * spec which assumed no generator header; pivoted to single-line prefix to
 * avoid duplicate header stacks.
 *
 * Two-write atomicity (PF.40): server writes JSON first then CSS. If CSS
 * write fails after JSON success, JSON is committed but CSS stale; next
 * save retries both since JSON overwrite is idempotent. Acceptable V1.
 */
export async function saveConfig(
  config: ResponsiveConfig,
  cssOutput: string,
): Promise<SaveConfigResult> {
  // R.3 — single-line timestamp prefix at save-time (snapshot stable;
  // generator emits its own AUTO-GENERATED header from Phase 2; this prefix
  // adds the missing piece — when-saved — without duplicating purpose docs).
  const cssWithTimestamp = `/* Saved by tools/responsive-tokens-editor on ${new Date().toISOString()} — see header below for file purpose. */
${cssOutput}`

  try {
    const res = await fetch('/api/save-config', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        config,
        cssOutput: cssWithTimestamp,
        requestBackup: !_firstSaveDone,
      }),
    })
    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({ error: 'unknown' }))) as { error?: string }
      return { ok: false, error: errBody.error ?? `http ${res.status}` }
    }
    _firstSaveDone = true
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Test-only: reset the session flag so a fresh test gets `requestBackup: true`.
 * NOT exported via package public API (named export consumed only by config-io.test.ts).
 */
export function _resetSessionForTest(): void {
  _firstSaveDone = false
}
