import { Hono } from 'hono'
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs'
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
  getExistingIds,
  writeConfig,
  deleteConfig,
  findConfigById,
  generateId,
} from '../lib/config-resolver.js'
import { parseTokens } from '../lib/token-parser.js'
import { parseHTMLToConfig } from '../lib/html-parser.js'

const PRESETS_DIR = path.resolve(import.meta.dirname, '../../layouts/_presets')
const SETTINGS_PATH = path.resolve(import.meta.dirname, '../../settings.yaml')

/** Load allowed scope ids from settings.yaml. */
function loadAllowedScopes(): Set<string> {
  if (!existsSync(SETTINGS_PATH)) {
    mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true })
    const defaults = { scopes: [{ id: 'theme', label: 'Theme page' }] }
    writeFileSync(SETTINGS_PATH, yaml.dump(defaults), 'utf-8')
    return new Set(['theme'])
  }
  const data = yaml.load(readFileSync(SETTINGS_PATH, 'utf-8')) as { scopes?: Array<{ id: string }> }
  return new Set((data.scopes ?? []).map((s) => s.id))
}

const layouts = new Hono()

/** GET /layouts — list all non-preset layouts */
layouts.get('/layouts', (c) => {
  return c.json(listLayouts())
})

/** GET /layouts/:id — full resolved config */
layouts.get('/layouts/:id', (c) => {
  const id = c.req.param('id')
  try {
    const config = loadConfig(id)
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

  // Validate scope against settings
  const allowedScopes = loadAllowedScopes()
  if (!allowedScopes.has(scope)) {
    return c.json({ error: `Scope "${scope}" is not registered in settings` }, 400)
  }

  const existingIds = new Set(getExistingIds())
  const id = generateId(name, existingIds)

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
    delete base.extends
    delete base.id

    const result = configSchema.safeParse(base)
    if (!result.success) {
      return c.json(
        { error: 'Invalid preset config', issues: result.error.issues },
        400,
      )
    }
    config = result.data
  } else {
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

  const tokens = parseTokens()
  const validationErrors = validateConfig(config, tokens)
  if (validationErrors.length > 0) {
    return c.json({ error: 'Validation failed', issues: validationErrors }, 400)
  }

  const saved = { ...config, id }
  writeConfig(saved)
  return c.json(saved, 201)
})

/** PUT /layouts/:id — save/update full config. Can change name + scope. */
layouts.put('/layouts/:id', async (c) => {
  const id = c.req.param('id')

  if (!findConfigById(id)) {
    return c.json({ error: `Layout "${id}" not found` }, 404)
  }

  const body = await c.req.json()
  // Strip id from body — URL param is authoritative, we don't persist id inside YAML.
  delete body.id

  const result = configSchema.safeParse(body)
  if (!result.success) {
    return c.json(
      { error: 'Invalid config', issues: result.error.issues },
      400,
    )
  }

  const config = result.data

  // Validate scope against settings (scope is still a controlled tag)
  const allowedScopes = loadAllowedScopes()
  if (!allowedScopes.has(config.scope)) {
    return c.json({ error: `Scope "${config.scope}" is not registered in settings` }, 400)
  }

  const tokens = parseTokens()
  const validationErrors = validateConfig(config, tokens)
  if (validationErrors.length > 0) {
    return c.json({ error: 'Validation failed', issues: validationErrors }, 400)
  }

  writeConfig({ ...config, id })
  return c.json({ ...config, id })
})

/** POST /layouts/:id/clone — clone with new name */
layouts.post('/layouts/:id/clone', async (c) => {
  const sourceId = c.req.param('id')
  const body = await c.req.json<{ name: string; scope?: string }>()

  if (!body.name) {
    return c.json({ error: 'name is required' }, 400)
  }

  const sourceFile = findConfigById(sourceId)
  if (!sourceFile) {
    return c.json({ error: `Layout "${sourceId}" not found` }, 404)
  }

  const allowedScopes = loadAllowedScopes()
  const config = loadConfig(sourceId)
  config.name = body.name
  if (body.scope) {
    if (!allowedScopes.has(body.scope)) {
      return c.json({ error: `Scope "${body.scope}" is not registered in settings` }, 400)
    }
    config.scope = body.scope
  }

  const existingIds = new Set(getExistingIds())
  const id = generateId(body.name, existingIds)

  const tokens = parseTokens()
  const validationErrors = validateConfig(config, tokens)
  if (validationErrors.length > 0) {
    return c.json({ error: 'Validation failed', issues: validationErrors }, 400)
  }

  const saved = { ...config, id }
  writeConfig(saved)
  return c.json(saved, 201)
})

/** DELETE /layouts/:id — delete layout file */
layouts.delete('/layouts/:id', (c) => {
  const id = c.req.param('id')
  const deleted = deleteConfig(id)
  if (!deleted) {
    return c.json({ error: `Layout "${id}" not found` }, 404)
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

  const allowedScopes = loadAllowedScopes()
  if (!allowedScopes.has(scope)) {
    return c.json({ error: `Scope "${scope}" is not registered in settings` }, 400)
  }

  let config: LayoutConfig
  try {
    config = parseHTMLToConfig(html, name, scope)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Parse error'
    return c.json({ error: `Failed to parse HTML: ${msg}` }, 400)
  }

  const result = configSchema.safeParse(config)
  if (!result.success) {
    return c.json(
      { error: 'Parsed config is invalid', issues: result.error.issues, parsed: config },
      400,
    )
  }
  config = result.data

  const tokens = parseTokens()
  const validationErrors = validateConfig(config, tokens)
  const criticalErrors = validationErrors.filter((e) => !e.includes('Unknown token'))
  if (criticalErrors.length > 0) {
    return c.json({ error: 'Validation failed', issues: criticalErrors }, 400)
  }

  const existingIds = new Set(getExistingIds())
  const id = generateId(name, existingIds)
  const saved = { ...config, id }
  writeConfig(saved)
  return c.json(saved, 201)
})

/** GET /presets — list available presets */
layouts.get('/presets', (c) => {
  return c.json(listPresets())
})

export { layouts }
