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

  // 5. Build slot_config (resolved gap values)
  const slotConfig: Record<string, { gap?: string }> = {}
  for (const [name, slot] of Object.entries(config.slots)) {
    if (slot.gap) {
      const resolvedGap = tokens[slot.gap]
      if (resolvedGap) slotConfig[name] = { gap: resolvedGap }
    }
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
