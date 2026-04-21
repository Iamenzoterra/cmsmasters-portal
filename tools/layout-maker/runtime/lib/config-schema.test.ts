import { describe, expect, it } from 'vitest'
import { configSchema } from './config-schema.js'

function minimalConfig(slotPatch: Record<string, unknown> = {}): unknown {
  return {
    version: 1,
    name: 'test',
    scope: 'theme',
    grid: {
      desktop: {
        'min-width': '1440px',
        columns: { 'sidebar-left': '1fr', content: '1fr' },
        'column-gap': '0',
      },
    },
    slots: {
      content: {},
      'sidebar-left': { ...slotPatch },
    },
  }
}

describe('config-schema: drawer-trigger-label / drawer-trigger-icon', () => {
  // PARITY-LOG contract: per-slot drawer trigger metadata is role-level,
  // travels in base slot config, and is validated at load time.

  it('accepts a valid label and icon name', () => {
    const res = configSchema.safeParse(
      minimalConfig({
        'drawer-trigger-label': 'Theme details',
        'drawer-trigger-icon': 'details',
      }),
    )
    expect(res.success).toBe(true)
  })

  it('accepts a label without an icon (icon falls back to registry default)', () => {
    const res = configSchema.safeParse(
      minimalConfig({ 'drawer-trigger-label': 'Open menu' }),
    )
    expect(res.success).toBe(true)
  })

  it('accepts an icon without a label', () => {
    const res = configSchema.safeParse(
      minimalConfig({ 'drawer-trigger-icon': 'info' }),
    )
    expect(res.success).toBe(true)
  })

  it('rejects an empty label', () => {
    const res = configSchema.safeParse(
      minimalConfig({ 'drawer-trigger-label': '' }),
    )
    expect(res.success).toBe(false)
  })

  it('rejects a label longer than 40 chars', () => {
    const res = configSchema.safeParse(
      minimalConfig({ 'drawer-trigger-label': 'x'.repeat(41) }),
    )
    expect(res.success).toBe(false)
  })

  it('rejects icon names that are not kebab-case-lowercase', () => {
    for (const bad of ['Info', 'SHOPPING-BAG', 'tag!', '1star']) {
      const res = configSchema.safeParse(
        minimalConfig({ 'drawer-trigger-icon': bad }),
      )
      expect(res.success, `bad name "${bad}" should be rejected`).toBe(false)
    }
  })

  it('accepts a valid --brand-* color token for drawer-trigger-color', () => {
    const res = configSchema.safeParse(
      minimalConfig({ 'drawer-trigger-color': '--brand-the-sky' }),
    )
    expect(res.success).toBe(true)
  })

  it('rejects a drawer-trigger-color that is not a CSS custom prop', () => {
    for (const bad of ['brand-the-sky', '#ff0000', 'red', 'hsl(0 0% 100%)', '-not-double-dash']) {
      const res = configSchema.safeParse(
        minimalConfig({ 'drawer-trigger-color': bad }),
      )
      expect(res.success, `bad value "${bad}" should be rejected`).toBe(false)
    }
  })

  it('rejects per-BP overrides of drawer-trigger-label/icon (role-level only)', () => {
    const config = minimalConfig()
    // @ts-expect-error: intentional — grid.tablet is being added for this test
    config.grid.tablet = {
      'min-width': '768px',
      columns: { 'sidebar-left': '1fr', content: '1fr' },
      'column-gap': '0',
      slots: {
        'sidebar-left': { 'drawer-trigger-label': 'Override at tablet' },
      },
    }
    const res = configSchema.safeParse(config)
    expect(res.success).toBe(false) // strict() on slotSchemaPartial rejects the key
  })
})
