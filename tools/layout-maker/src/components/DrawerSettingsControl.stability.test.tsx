/// <reference types="vitest/globals" />
import { cleanup, render } from '@testing-library/react'
import { DrawerSettingsControl } from './Inspector'
import type { LayoutConfig } from '../lib/types'

// Guards the LM-Reforge Phase 1 follow-up Rules-of-Hooks fix:
// DrawerSettingsControl used to call useState + useEffect AFTER two
// conditional early returns. When gridKey toggled between a non-drawer
// grid (both early returns fire → 0 hooks) and a drawer grid (early
// returns pass → 2 hooks), React saw a different hook count for the
// same component instance and logged the static-flag invariant warning.
//
// Canary matches both:
//   - React 19's "Expected static flag was missing"
//   - Classic Rules-of-Hooks diagnostic ("Rendered fewer/more hooks…")
// so the contract survives React minor bumps.

function captureConsoleErrors() {
  const errors: string[] = []
  const original = console.error
  console.error = (msg: unknown, ...rest: unknown[]) => {
    errors.push(String(msg))
    original(msg, ...rest)
  }
  return {
    errors,
    restore: () => {
      console.error = original
    },
  }
}

const hookInvariantErrors = (errors: string[]): string[] =>
  errors.filter((e) =>
    /Expected static flag was missing|Rendered (fewer|more) hooks/.test(e),
  )

// Minimal two-grid config. Desktop has no off-canvas sidebar → both
// early returns in DrawerSettingsControl fire → JSX renders null.
// Tablet has sidebar-left.visibility = 'drawer' → early returns pass
// → JSX with the useState/useEffect-backed panel renders.
// Hand-rolled rather than loading a YAML fixture because this shape is
// smaller than any real layout and the test reads top-to-bottom in one
// screen. `LayoutConfig` fields verified against `src/lib/types.ts`.
const makeConfig = (): LayoutConfig => ({
  version: 1,
  name: 'drawer-stability-test',
  scope: 'theme',
  grid: {
    desktop: {
      'min-width': '1440px',
      columns: { 'sidebar-left': '360px', content: '720px' },
      'column-gap': '0',
    },
    tablet: {
      'min-width': '768px',
      columns: { content: '1fr' },
      'column-gap': '0',
      sidebars: 'drawer',
      'drawer-width': '280px',
    },
  },
  slots: {
    'sidebar-left': {},
    content: {},
  },
})

describe('DrawerSettingsControl stability — Rules-of-Hooks on BP switch', () => {
  let spy: ReturnType<typeof captureConsoleErrors>

  beforeEach(() => {
    spy = captureConsoleErrors()
  })

  afterEach(() => {
    spy.restore()
    cleanup()
  })

  it('does not warn when gridKey toggles between a non-drawer grid and a drawer grid', () => {
    const config = makeConfig()
    const noop = () => {}

    const { rerender } = render(
      <DrawerSettingsControl
        config={config}
        activeBreakpoint="desktop"
        gridKey="desktop"
        onUpdateGridProp={noop}
      />,
    )

    rerender(
      <DrawerSettingsControl
        config={config}
        activeBreakpoint="tablet"
        gridKey="tablet"
        onUpdateGridProp={noop}
      />,
    )

    rerender(
      <DrawerSettingsControl
        config={config}
        activeBreakpoint="desktop"
        gridKey="desktop"
        onUpdateGridProp={noop}
      />,
    )

    expect(hookInvariantErrors(spy.errors)).toEqual([])
  })
})
