import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  unlinkSync,
} from 'node:fs'
import yaml from 'js-yaml'
import path from 'node:path'
import { configSchema, type LayoutConfig } from './config-schema.js'

const LAYOUTS_DIR = path.resolve(import.meta.dirname, '../../layouts')
const PRESETS_DIR = path.join(LAYOUTS_DIR, '_presets')

export interface LayoutSummary {
  id: string
  name: string
  scope: string
  description?: string
}

// --- Read operations ---

/** Load and resolve a config by id (filename basename). */
export function loadConfig(id: string): LayoutConfig {
  const filePath = findConfigById(id)
  if (!filePath) throw new Error(`Layout "${id}" not found`)
  const config = loadConfigFromFile(filePath)
  config.id = id
  return config
}

/** Load and resolve a config from a file path */
export function loadConfigFromFile(filePath: string): LayoutConfig {
  const raw = readFileSync(filePath, 'utf-8')
  const parsed = yaml.load(raw) as Record<string, unknown>

  if (!parsed.extends) {
    return configSchema.parse(parsed)
  }

  // Single-level extends
  const basePath = path.resolve(path.dirname(filePath), parsed.extends as string)
  if (!existsSync(basePath)) {
    throw new Error(`Extends target not found: ${parsed.extends}`)
  }

  const base = yaml.load(readFileSync(basePath, 'utf-8')) as Record<
    string,
    unknown
  >

  if (base.extends) {
    throw new Error(
      `Multi-level extends: "${parsed.extends}" also extends "${base.extends}". Only single-level allowed.`,
    )
  }

  const overrides = (parsed.overrides ?? {}) as Record<string, unknown>
  const merged = deepMerge(base, overrides)

  // Identity fields come from child
  merged.version = parsed.version
  merged.name = parsed.name
  merged.scope = parsed.scope
  merged.id = parsed.id
  merged.description = parsed.description ?? base.description
  merged['test-blocks'] = parsed['test-blocks'] ?? base['test-blocks']

  // Remove extends/overrides from merged result
  delete merged.extends
  delete merged.overrides

  return configSchema.parse(merged)
}

/** Find a YAML file by its id (filename basename). */
export function findConfigById(id: string): string | null {
  const filePath = path.join(LAYOUTS_DIR, `${id}.yaml`)
  if (existsSync(filePath)) return filePath
  const ymlPath = path.join(LAYOUTS_DIR, `${id}.yml`)
  if (existsSync(ymlPath)) return ymlPath
  return null
}

/** List all non-preset layouts. id = filename basename. */
export function listLayouts(): LayoutSummary[] {
  if (!existsSync(LAYOUTS_DIR)) return []

  const results: LayoutSummary[] = []

  for (const file of readdirSync(LAYOUTS_DIR)) {
    if (!file.endsWith('.yaml') && !file.endsWith('.yml')) continue

    const filePath = path.join(LAYOUTS_DIR, file)
    const id = file.replace(/\.ya?ml$/, '')
    try {
      const raw = readFileSync(filePath, 'utf-8')
      const parsed = yaml.load(raw) as Record<string, unknown>
      if (parsed?.name && parsed?.scope) {
        results.push({
          id,
          name: parsed.name as string,
          scope: parsed.scope as string,
          description: parsed.description as string | undefined,
        })
      }
    } catch {
      // Skip unparseable files
    }
  }

  return results
}

/** List all preset layouts from _presets/ */
export function listPresets(): Array<{
  name: string
  scope: string
  description?: string
}> {
  if (!existsSync(PRESETS_DIR)) return []

  const results: Array<{ name: string; scope: string; description?: string }> =
    []

  for (const file of readdirSync(PRESETS_DIR)) {
    if (!file.endsWith('.yaml') && !file.endsWith('.yml')) continue

    const filePath = path.join(PRESETS_DIR, file)
    try {
      const raw = readFileSync(filePath, 'utf-8')
      const parsed = yaml.load(raw) as Record<string, unknown>
      if (parsed?.name && parsed?.scope) {
        results.push({
          name: parsed.name as string,
          scope: parsed.scope as string,
          description: parsed.description as string | undefined,
        })
      }
    } catch {
      // Skip unparseable files
    }
  }

  return results
}

/** Get all existing layout ids */
export function getExistingIds(): string[] {
  return listLayouts().map((l) => l.id)
}

/** Generate a unique id from a name, avoiding collisions with existing ids. */
export function generateId(name: string, existing: Set<string>): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'layout'
  if (!existing.has(base)) return base
  let i = 2
  while (existing.has(`${base}-${i}`)) i++
  return `${base}-${i}`
}

// --- Write operations ---

/** Write a config to a YAML file named by id. Requires config.id. */
export function writeConfig(config: LayoutConfig & { id: string }): string {
  const filePath = path.join(LAYOUTS_DIR, `${config.id}.yaml`)
  // Don't persist `id` inside YAML — filename is the source of truth.
  const { id: _id, ...persisted } = config
  const content = yaml.dump(persisted, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
  })
  writeFileSync(filePath, content, 'utf-8')
  return filePath
}

/** Delete a layout file by id */
export function deleteConfig(id: string): boolean {
  const filePath = findConfigById(id)
  if (!filePath) return false
  unlinkSync(filePath)
  return true
}

// --- Helpers ---

function deepMerge(
  base: Record<string, unknown>,
  overrides: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...base }

  for (const [key, value] of Object.entries(overrides)) {
    result[key] =
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      typeof result[key] === 'object' &&
      result[key] !== null &&
      !Array.isArray(result[key])
        ? deepMerge(
            result[key] as Record<string, unknown>,
            value as Record<string, unknown>,
          )
        : value
  }

  return result
}
