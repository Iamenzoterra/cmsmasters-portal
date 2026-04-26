import type { ResponsiveConfig, LoadConfigResult, SaveConfigResult } from '../types'

/**
 * Load responsive-config.json from disk via the Vite dev-server fs bridge.
 *
 * Phase 2: function signature only — body returns null (file not yet wired).
 * Phase 6: wires GET /api/load-config to the Vite middleware that reads
 *   packages/ui/src/theme/responsive-config.json via fs.readFile.
 *
 * Returns null if file missing — Phase 3 falls back to defaults.ts.
 */
export async function loadConfig(): Promise<LoadConfigResult> {
  // Phase 6 wires this via fetch('/api/load-config'). Phase 2: stub.
  return null
}

/**
 * Save responsive-config.json + regenerated tokens.responsive.css to disk.
 *
 * Phase 2: function signature only — body returns { ok: false, error: 'phase-6-not-yet' }.
 * Phase 6: wires POST /api/save-config to the Vite middleware that:
 *   1. Validates config via validate.ts
 *   2. Writes packages/ui/src/theme/responsive-config.json (JSON.stringify pretty)
 *   3. Generates CSS via generator.ts and writes packages/ui/src/theme/tokens.responsive.css
 *   4. Applies save-safety contract (6 rules per infra-tooling SKILL):
 *      first-save .bak, no-creates, slug-equivalent path safety, etc.
 */
export async function saveConfig(_config: ResponsiveConfig): Promise<SaveConfigResult> {
  // Phase 6 wires this via fetch('/api/save-config', { method: 'POST', body: ... }).
  // Phase 2: stub.
  return { ok: false, error: 'phase-6-not-yet-implemented' }
}
