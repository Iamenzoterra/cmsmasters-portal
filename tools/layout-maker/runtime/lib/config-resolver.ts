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

// --- Read operations ---

/** Load and resolve a config by scope (handles extends) */
export function loadConfig(scope: string): LayoutConfig {
  const filePath = findConfigByScope(scope)
  if (!filePath) throw new Error(`Layout "${scope}" not found`)
  return loadConfigFromFile(filePath)
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
  merged.description = parsed.description ?? base.description
  merged['test-blocks'] = parsed['test-blocks'] ?? base['test-blocks']

  // Remove extends/overrides from merged result
  delete merged.extends
  delete merged.overrides

  return configSchema.parse(merged)
}

/** Find a YAML file by its scope field. Returns file path or null. */
export function findConfigByScope(scope: string): string | null {
  if (!existsSync(LAYOUTS_DIR)) return null

  for (const file of readdirSync(LAYOUTS_DIR)) {
    if (!file.endsWith('.yaml') && !file.endsWith('.yml')) continue

    const filePath = path.join(LAYOUTS_DIR, file)
    try {
      const raw = readFileSync(filePath, 'utf-8')
      const parsed = yaml.load(raw) as Record<string, unknown>
      if (parsed?.scope === scope) return filePath
    } catch {
      // Skip unparseable files
    }
  }

  return null
}

/** List all non-preset layouts */
export function listLayouts(): Array<{
  name: string
  scope: string
  description?: string
}> {
  if (!existsSync(LAYOUTS_DIR)) return []

  const results: Array<{ name: string; scope: string; description?: string }> =
    []

  for (const file of readdirSync(LAYOUTS_DIR)) {
    if (!file.endsWith('.yaml') && !file.endsWith('.yml')) continue

    const filePath = path.join(LAYOUTS_DIR, file)
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

/** Get all existing scopes (for duplicate detection) */
export function getExistingScopes(): string[] {
  return listLayouts().map((l) => l.scope)
}

// --- Write operations ---

/** Write a config to a YAML file named by scope */
export function writeConfig(config: LayoutConfig): string {
  const filePath = path.join(LAYOUTS_DIR, `${config.scope}.yaml`)
  const content = yaml.dump(config, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
  })
  writeFileSync(filePath, content, 'utf-8')
  return filePath
}

/** Delete a layout file by scope */
export function deleteConfig(scope: string): boolean {
  const filePath = findConfigByScope(scope)
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
