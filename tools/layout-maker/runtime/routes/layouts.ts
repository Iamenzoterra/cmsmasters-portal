import { Hono } from 'hono'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
import {
  configSchema,
  validateConfig,
  type LayoutConfig,
} from '../lib/config-schema.js'
import {
  loadConfig,
  listLayouts,
  listPresets,
  getExistingScopes,
  writeConfig,
  deleteConfig,
  findConfigByScope,
} from '../lib/config-resolver.js'
import { parseTokens } from '../lib/token-parser.js'
import { parseHTMLToConfig } from '../lib/html-parser.js'

const PRESETS_DIR = path.resolve(import.meta.dirname, '../../layouts/_presets')

const layouts = new Hono()

/** GET /layouts — list all non-preset layouts */
layouts.get('/layouts', (c) => {
  return c.json(listLayouts())
})

/** GET /layouts/:scope — full resolved config */
layouts.get('/layouts/:scope', (c) => {
  const scope = c.req.param('scope')
  try {
    const config = loadConfig(scope)
    return c.json(config)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Not found'
    return c.json({ error: msg }, 404)
  }
})

/** POST /layouts — create a new layout */
layouts.post('/layouts', async (c) => {
  const body = await c.req.json<{
    name: string
    scope: string
    description?: string
    preset?: string | null
  }>()

  const { name, scope, description, preset } = body

  if (!name || !scope) {
    return c.json({ error: 'name and scope are required' }, 400)
  }

  // Check duplicate scope
  const existing = getExistingScopes()
  if (existing.includes(scope)) {
    return c.json({ error: `Scope "${scope}" already exists` }, 409)
  }

  let config: LayoutConfig

  if (preset) {
    // Clone from preset
    const presetPath = path.join(PRESETS_DIR, `${preset}.yaml`)
    if (!existsSync(presetPath)) {
      return c.json({ error: `Preset "${preset}" not found` }, 404)
    }

    const raw = readFileSync(presetPath, 'utf-8')
    const base = yaml.load(raw) as Record<string, unknown>
    base.name = name
    base.scope = scope
    if (description) base.description = description
    // Remove extends — preset content is copied, not referenced
    delete base.extends

    const result = configSchema.safeParse(base)
    if (!result.success) {
      return c.json(
        { error: 'Invalid preset config', issues: result.error.issues },
        400,
      )
    }
    config = result.data
  } else {
    // Blank layout with minimal structure
    config = {
      version: 1,
      name,
      scope,
      description,
      grid: {
        desktop: {
          'min-width': '1440px',
          columns: { content: '1fr' },
          'column-gap': '0',
        },
      },
      slots: {
        header: { position: 'top' as const },
        content: {},
        footer: { position: 'bottom' as const },
      },
    }
  }

  // Validate
  const tokens = parseTokens()
  const validationErrors = validateConfig(config, tokens, existing)
  if (validationErrors.length > 0) {
    return c.json({ error: 'Validation failed', issues: validationErrors }, 400)
  }

  writeConfig(config)
  return c.json(config, 201)
})

/** PUT /layouts/:scope — save/update full config */
layouts.put('/layouts/:scope', async (c) => {
  const scope = c.req.param('scope')
  const body = await c.req.json()

  // Zod parse
  const result = configSchema.safeParse(body)
  if (!result.success) {
    return c.json(
      { error: 'Invalid config', issues: result.error.issues },
      400,
    )
  }

  const config = result.data

  // Cross-field validation
  const tokens = parseTokens()
  const existing = getExistingScopes()
  const validationErrors = validateConfig(config, tokens, existing, scope)
  if (validationErrors.length > 0) {
    return c.json({ error: 'Validation failed', issues: validationErrors }, 400)
  }

  // Delete old file if scope changed
  if (config.scope !== scope) {
    deleteConfig(scope)
  }

  writeConfig(config)
  return c.json(config)
})

/** POST /layouts/:scope/clone — clone with new name+scope */
layouts.post('/layouts/:scope/clone', async (c) => {
  const sourceScope = c.req.param('scope')
  const body = await c.req.json<{ name: string; scope: string }>()

  if (!body.name || !body.scope) {
    return c.json({ error: 'name and scope are required' }, 400)
  }

  // Check source exists
  const sourceFile = findConfigByScope(sourceScope)
  if (!sourceFile) {
    return c.json({ error: `Layout "${sourceScope}" not found` }, 404)
  }

  // Check new scope is unique
  const existing = getExistingScopes()
  if (existing.includes(body.scope)) {
    return c.json({ error: `Scope "${body.scope}" already exists` }, 409)
  }

  // Load source, update identity
  const config = loadConfig(sourceScope)
  config.name = body.name
  config.scope = body.scope

  // Validate
  const tokens = parseTokens()
  const validationErrors = validateConfig(config, tokens, existing)
  if (validationErrors.length > 0) {
    return c.json({ error: 'Validation failed', issues: validationErrors }, 400)
  }

  writeConfig(config)
  return c.json(config, 201)
})

/** DELETE /layouts/:scope — delete layout file */
layouts.delete('/layouts/:scope', (c) => {
  const scope = c.req.param('scope')
  const deleted = deleteConfig(scope)
  if (!deleted) {
    return c.json({ error: `Layout "${scope}" not found` }, 404)
  }
  return c.json({ ok: true })
})

/** POST /layouts/import — import an HTML document as a new layout */
layouts.post('/layouts/import', async (c) => {
  const body = await c.req.json<{ html: string; name: string; scope: string }>()
  const { html, name, scope } = body

  if (!html || !name || !scope) {
    return c.json({ error: 'html, name, and scope are required' }, 400)
  }

  // Check duplicate scope
  const existing = getExistingScopes()
  if (existing.includes(scope)) {
    return c.json({ error: `Scope "${scope}" already exists` }, 409)
  }

  // Parse HTML → LayoutConfig
  let config: LayoutConfig
  try {
    config = parseHTMLToConfig(html, name, scope)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Parse error'
    return c.json({ error: `Failed to parse HTML: ${msg}` }, 400)
  }

  // Schema validation
  const result = configSchema.safeParse(config)
  if (!result.success) {
    return c.json(
      { error: 'Parsed config is invalid', issues: result.error.issues, parsed: config },
      400,
    )
  }
  config = result.data

  // Cross-field validation (skip token checks — imported layouts may use non-standard spacing)
  const tokens = parseTokens()
  const validationErrors = validateConfig(config, tokens, existing)
  // Filter out token warnings — imported layouts may reference tokens we don't have
  const criticalErrors = validationErrors.filter((e) => !e.includes('Unknown token'))
  if (criticalErrors.length > 0) {
    return c.json({ error: 'Validation failed', issues: criticalErrors }, 400)
  }

  writeConfig(config)
  return c.json(config, 201)
})

/** GET /presets — list available presets */
layouts.get('/presets', (c) => {
  return c.json(listPresets())
})

export { layouts }
