import { Hono } from 'hono'
import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { loadConfig, getExistingScopes } from '../lib/config-resolver.js'
import { generateCSS } from '../lib/css-generator.js'
import { generateHTML } from '../lib/html-generator.js'
import { parseTokens } from '../lib/token-parser.js'
import { validateConfig } from '../lib/config-schema.js'

const exportRoute = new Hono()

exportRoute.post('/layouts/:scope/export', (c) => {
  const scope = c.req.param('scope')

  // 1. Load config
  let config
  try {
    config = loadConfig(scope)
  } catch {
    return c.json({ error: `Layout "${scope}" not found` }, 404)
  }

  // 2. Load tokens
  const tokens = parseTokens()

  // 3. Validate (includes grid overflow check)
  const existingScopes = getExistingScopes()
  const errors = validateConfig(config, tokens, existingScopes, scope)
  if (errors.length > 0) {
    return c.json({ error: 'Validation failed', details: errors }, 400)
  }

  // 4. Generate HTML and CSS
  const html = generateHTML(config)
  const css = generateCSS(config, tokens)

  // 5. Build slot_config (resolved visual params + per-bp overrides)
  type VisualParams = {
    gap?: string
    'max-width'?: string
    'padding-x'?: string
    'padding-top'?: string
    'padding-bottom'?: string
    align?: string
  }
  type SlotConfigEntry = VisualParams & { breakpoints?: Record<string, VisualParams> }

  function resolveVisualParams(slot: Record<string, unknown>): VisualParams {
    const out: VisualParams = {}
    const resolve = (key: string) => {
      const v = slot[key] as string | undefined
      if (!v || v === '0') return undefined
      // Resolve token ref → px value; passthrough raw values
      if (v.startsWith('--')) return tokens[v] ?? v
      return v
    }
    const gap = resolve('gap')
    if (gap) out.gap = gap
    const mw = resolve('max-width')
    if (mw) out['max-width'] = mw
    const px = resolve('padding-x') ?? resolve('padding')
    if (px) out['padding-x'] = px
    const pt = resolve('padding-top') ?? resolve('padding')
    if (pt) out['padding-top'] = pt
    const pb = resolve('padding-bottom') ?? resolve('padding')
    if (pb) out['padding-bottom'] = pb
    if (slot.align) out.align = slot.align as string
    return out
  }

  const slotConfig: Record<string, SlotConfigEntry> = {}
  for (const [name, slot] of Object.entries(config.slots)) {
    const base = resolveVisualParams(slot as unknown as Record<string, unknown>)
    const entry: SlotConfigEntry = { ...base }

    // Collect per-bp overrides
    const bpOverrides: Record<string, VisualParams> = {}
    for (const [bpName, grid] of Object.entries(config.grid)) {
      const override = grid.slots?.[name]
      if (override && Object.keys(override).length > 0) {
        const resolved = resolveVisualParams(override as unknown as Record<string, unknown>)
        if (Object.keys(resolved).length > 0) {
          bpOverrides[bpName] = resolved
        }
      }
    }
    if (Object.keys(bpOverrides).length > 0) entry.breakpoints = bpOverrides

    if (Object.keys(entry).length > 0) slotConfig[name] = entry
  }

  // 6. Build payload matching pageSchema
  const payload = {
    slug: `layout-${config.scope}`,
    title: config.name,
    type: 'layout' as const,
    scope: config.scope,
    html,
    css,
    layout_slots: {},
    slot_config: slotConfig,
    status: 'draft' as const,
  }

  // 7. Write files to exports/
  const exportsDir = path.resolve(import.meta.dirname, '../../exports')
  mkdirSync(exportsDir, { recursive: true })
  writeFileSync(path.resolve(exportsDir, `${scope}.html`), html, 'utf-8')
  writeFileSync(path.resolve(exportsDir, `${scope}.css`), css, 'utf-8')

  return c.json({
    payload,
    files: {
      html: `exports/${scope}.html`,
      css: `exports/${scope}.css`,
    },
  })
})

export { exportRoute }
