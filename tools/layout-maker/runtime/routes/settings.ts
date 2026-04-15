import { Hono } from 'hono'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'

export interface LMSettings {
  scopes: Array<{ id: string; label: string }>
}

const SETTINGS_PATH = path.resolve(import.meta.dirname, '../../settings.yaml')

function ensureDefaults(): LMSettings {
  if (!existsSync(SETTINGS_PATH)) {
    const defaults: LMSettings = {
      scopes: [
        { id: 'theme', label: 'Theme page' },
      ],
    }
    const dir = path.dirname(SETTINGS_PATH)
    mkdirSync(dir, { recursive: true })
    writeFileSync(SETTINGS_PATH, yaml.dump(defaults), 'utf-8')
    return defaults
  }
  return yaml.load(readFileSync(SETTINGS_PATH, 'utf-8')) as LMSettings
}

const settings = new Hono()

/** GET /settings — read settings */
settings.get('/settings', (c) => {
  return c.json(ensureDefaults())
})

/** PUT /settings — update settings */
settings.put('/settings', async (c) => {
  const body = await c.req.json<LMSettings>()

  if (!Array.isArray(body.scopes)) {
    return c.json({ error: 'scopes must be an array' }, 400)
  }

  for (const scope of body.scopes) {
    if (!scope.id || !scope.label) {
      return c.json({ error: 'Each scope needs id and label' }, 400)
    }
    if (!/^[a-z0-9-]+$/.test(scope.id)) {
      return c.json({ error: `Invalid scope id: "${scope.id}" (lowercase, hyphens only)` }, 400)
    }
  }

  // Check for duplicate ids
  const ids = body.scopes.map((s) => s.id)
  if (new Set(ids).size !== ids.length) {
    return c.json({ error: 'Duplicate scope ids' }, 400)
  }

  writeFileSync(SETTINGS_PATH, yaml.dump(body), 'utf-8')
  return c.json(body)
})

export { settings }
