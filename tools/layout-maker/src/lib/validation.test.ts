/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest'
import {
  validateConfig,
  validateConfigMessages,
  deriveValidationState,
  type ValidationItem,
} from './validation'
import type { LayoutConfig } from './types'

// Net-new coverage for the six rules in `validateConfig`, plus the two
// helpers derived from it. These tests replace what `runtime/lib/
// config-schema.test.ts` was assumed to cover in the P3 task prompt —
// that file actually tests zod schema shape (`configSchema.safeParse`),
// which is a separate trust boundary and stays with the schema.

const TOKENS: Record<string, string> = {
  '--spacing-sm': '8px',
  '--spacing-md': '16px',
  '--spacing-xl': '24px',
}

const baseConfig = (): LayoutConfig => ({
  version: 1,
  name: 'fixture',
  scope: 'theme',
  grid: {
    desktop: {
      'min-width': '1440px',
      columns: { content: '1fr' },
      'column-gap': '0',
    },
  },
  slots: {
    content: { 'min-height': '400px' },
  },
})

describe('validateConfig — rule 1: grid column references a declared slot', () => {
  it('flags an error when a column has no slot definition', () => {
    const config = baseConfig()
    config.grid.desktop.columns['ghost'] = '200px'
    const items = validateConfig(config, TOKENS)
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      severity: 'error',
      slotName: 'ghost',
      gridKey: 'desktop',
      breakpointId: 'desktop',
    })
    expect(items[0].message).toContain('"desktop" column "ghost"')
  })
})

describe('validateConfig — rule 2: unknown token refs', () => {
  it('warns on an unknown --spacing-* token', () => {
    const config = baseConfig()
    config.slots.content.gap = '--spacing-not-real'
    const items = validateConfig(config, TOKENS)
    const item = items.find((i) => i.id.startsWith('r2:'))
    expect(item).toBeDefined()
    expect(item).toMatchObject({
      severity: 'warning',
      field: '--spacing-not-real',
    })
  })

  it('does not flag "0" as an unknown token', () => {
    const config = baseConfig()
    config.slots.content.gap = '0'
    const items = validateConfig(config, TOKENS)
    expect(items.filter((i) => i.id.startsWith('r2'))).toHaveLength(0)
  })
})

describe('validateConfig — rule 3: grid overflow', () => {
  it('warns when fixed columns + gaps exceed max-width', () => {
    const config = baseConfig()
    config.grid.desktop['max-width'] = '600px'
    config.grid.desktop.columns = { content: '400px', extra: '400px' }
    config.slots.extra = {}
    const items = validateConfig(config, TOKENS)
    const overflow = items.find((i) => i.id === 'r3:desktop')
    expect(overflow).toMatchObject({
      severity: 'warning',
      gridKey: 'desktop',
      breakpointId: 'desktop',
    })
  })
})

describe('validateConfig — rule 4: nested-slots', () => {
  it('warns on empty nested-slots list', () => {
    const config = baseConfig()
    config.slots.content['nested-slots'] = []
    const items = validateConfig(config, TOKENS)
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      severity: 'warning',
      id: 'r4e:content',
      slotName: 'content',
    })
  })

  it('errors when a nested child is not declared in slots', () => {
    const config = baseConfig()
    config.slots.content['nested-slots'] = ['ghost']
    const items = validateConfig(config, TOKENS)
    const err = items.find((i) => i.id.startsWith('r4m:'))
    expect(err).toMatchObject({
      severity: 'error',
      slotName: 'content',
    })
  })

  it('errors when a slot has multiple parents', () => {
    const config = baseConfig()
    config.slots.parentA = { 'nested-slots': ['child'] }
    config.slots.parentB = { 'nested-slots': ['child'] }
    config.slots.child = {}
    const items = validateConfig(config, TOKENS)
    const err = items.find((i) => i.id.startsWith('r4p:'))
    expect(err).toMatchObject({
      severity: 'error',
      slotName: 'child',
    })
  })

  it('errors on a cycle in nested-slots', () => {
    const config = baseConfig()
    config.slots.a = { 'nested-slots': ['b'] }
    config.slots.b = { 'nested-slots': ['a'] }
    const items = validateConfig(config, TOKENS)
    const err = items.find((i) => i.id.startsWith('r4c:'))
    expect(err).toMatchObject({ severity: 'error' })
  })
})

describe('validateConfig — rule 5: drawer breakpoint requires drawer-trigger', () => {
  it('errors on sidebars:drawer without a trigger', () => {
    const config = baseConfig()
    config.grid.desktop.sidebars = 'drawer'
    const items = validateConfig(config, TOKENS)
    const err = items.find((i) => i.id === 'r5:desktop')
    expect(err).toMatchObject({
      severity: 'error',
      gridKey: 'desktop',
      breakpointId: 'desktop',
    })
  })

  it('accepts sidebars:drawer WITH a trigger', () => {
    const config = baseConfig()
    config.grid.desktop.sidebars = 'drawer'
    config.grid.desktop['drawer-trigger'] = 'hamburger'
    const items = validateConfig(config, TOKENS)
    expect(items.find((i) => i.id.startsWith('r5'))).toBeUndefined()
  })
})

describe('validateConfig — rule 6: per-slot visibility:drawer requires trigger', () => {
  it('errors when a per-slot drawer has no trigger at grid level', () => {
    const config = baseConfig()
    config.slots.sidebar = {}
    config.grid.desktop.slots = { sidebar: { visibility: 'drawer' } }
    const items = validateConfig(config, TOKENS)
    const err = items.find((i) => i.id.startsWith('r6:'))
    expect(err).toMatchObject({
      severity: 'error',
      gridKey: 'desktop',
      slotName: 'sidebar',
    })
  })
})

describe('validateConfigMessages (legacy string[] adapter)', () => {
  it('returns flat messages for the same inputs', () => {
    const config = baseConfig()
    config.grid.desktop.columns['ghost'] = '200px'
    const items = validateConfig(config, TOKENS)
    const messages = validateConfigMessages(config, TOKENS)
    expect(messages).toEqual(items.map((i) => i.message))
  })

  it('returns an empty array for a clean config', () => {
    expect(validateConfigMessages(baseConfig(), TOKENS)).toEqual([])
  })
})

describe('deriveValidationState — splits by severity', () => {
  it('returns {errors:[], warnings:[]} for a clean config', () => {
    const state = deriveValidationState(baseConfig(), TOKENS)
    expect(state).toEqual({ errors: [], warnings: [] })
  })

  it('routes errors and warnings to the correct buckets', () => {
    const config = baseConfig()
    config.grid.desktop.columns['ghost'] = '200px' // error: rule 1
    config.slots.content.gap = '--spacing-missing' // warning: rule 2
    const { errors, warnings } = deriveValidationState(config, TOKENS)
    expect(errors.every((i) => i.severity === 'error')).toBe(true)
    expect(warnings.every((i) => i.severity === 'warning')).toBe(true)
    expect(errors.length).toBe(1)
    expect(warnings.length).toBe(1)
  })

  // Brain decision #8: badge precedence lock — if a consumer displays a
  // single badge across a mixed set, it must reflect the highest severity.
  // Consumers derive the badge from `state.errors.length > 0 ? 'error'
  // : state.warnings.length > 0 ? 'warning' : 'info'`. This test locks
  // that contract at the state level.
  it('precedence contract: error > warning > info', () => {
    const clean = deriveValidationState(baseConfig(), TOKENS)
    const badge = (s: { errors: ValidationItem[]; warnings: ValidationItem[] }) =>
      s.errors.length > 0 ? 'error' : s.warnings.length > 0 ? 'warning' : 'info'
    expect(badge(clean)).toBe('info')

    const warnConfig = baseConfig()
    warnConfig.slots.content.gap = '--spacing-missing'
    expect(badge(deriveValidationState(warnConfig, TOKENS))).toBe('warning')

    const errorConfig = baseConfig()
    errorConfig.grid.desktop.columns['ghost'] = '200px'
    expect(badge(deriveValidationState(errorConfig, TOKENS))).toBe('error')

    // Mixed — error wins.
    const mixedConfig = baseConfig()
    mixedConfig.grid.desktop.columns['ghost'] = '200px'
    mixedConfig.slots.content.gap = '--spacing-missing'
    expect(badge(deriveValidationState(mixedConfig, TOKENS))).toBe('error')
  })
})
