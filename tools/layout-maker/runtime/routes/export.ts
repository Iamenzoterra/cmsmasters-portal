import { Hono } from 'hono'
import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { loadConfig } from '../lib/config-resolver.js'
import { generateCSS } from '../lib/css-generator.js'
import { generateHTML } from '../lib/html-generator.js'
import { parseTokens } from '../lib/token-parser.js'
import { validateConfig } from '../lib/config-schema.js'

type VisualParams = {
  gap?: string
  'max-width'?: string
  'padding-x'?: string
  'padding-top'?: string
  'padding-bottom'?: string
  align?: string
}
type SlotConfigEntry = VisualParams & { breakpoints?: Record<string, VisualParams> }

function resolveVisualParams(slot: Record<string, unknown>, tokens: Record<string, string>): VisualParams {
  const out: VisualParams = {}
  const resolve = (key: string) => {
    const v = slot[key] as string | undefined
    if (!v || v === '0') return undefined
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

function buildSlotConfig(
  config: ReturnType<typeof loadConfig>,
  tokens: Record<string, string>,
): Record<string, SlotConfigEntry> {
  const slotConfig: Record<string, SlotConfigEntry> = {}
  for (const [name, slot] of Object.entries(config.slots)) {
    const base = resolveVisualParams(slot as unknown as Record<string, unknown>, tokens)
    const entry: SlotConfigEntry = { ...base }

    const bpOverrides: Record<string, VisualParams> = {}
    for (const [bpName, grid] of Object.entries(config.grid)) {
      const override = grid.slots?.[name]
      if (override && Object.keys(override).length > 0) {
        const resolved = resolveVisualParams(override as unknown as Record<string, unknown>, tokens)
        if (Object.keys(resolved).length > 0) {
          bpOverrides[bpName] = resolved
        }
      }
    }
    if (Object.keys(bpOverrides).length > 0) entry.breakpoints = bpOverrides

    if (Object.keys(entry).length > 0) slotConfig[name] = entry
  }
  return slotConfig
}

const exportRoute = new Hono()

exportRoute.post('/layouts/:id/export', (c) => {
  const id = c.req.param('id')

  let config
  try {
    config = loadConfig(id)
  } catch {
    return c.json({ error: `Layout "${id}" not found` }, 404)
  }

  const tokens = parseTokens()

  const errors = validateConfig(config, tokens)
  if (errors.length > 0) {
    return c.json({ error: 'Validation failed', details: errors }, 400)
  }

  const html = generateHTML(config)
  const css = generateCSS(config, tokens)
  const slotConfig = buildSlotConfig(config, tokens)

  const payload = {
    slug: `layout-${id}`,
    title: config.name,
    type: 'layout' as const,
    scope: config.scope,
    html,
    css,
    layout_slots: {},
    slot_config: slotConfig,
    status: 'draft' as const,
  }

  const exportsDir = path.resolve(import.meta.dirname, '../../exports')
  mkdirSync(exportsDir, { recursive: true })
  writeFileSync(path.resolve(exportsDir, `${id}.html`), html, 'utf-8')
  writeFileSync(path.resolve(exportsDir, `${id}.css`), css, 'utf-8')

  return c.json({
    payload,
    files: {
      html: `exports/${id}.html`,
      css: `exports/${id}.css`,
    },
  })
})

export { exportRoute }
