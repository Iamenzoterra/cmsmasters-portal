/// <reference types="vitest/globals" />
import { cleanup, fireEvent, render } from '@testing-library/react'
import { Inspector } from './Inspector'
import type { LayoutConfig, TokenMap } from '../lib/types'

// Guards the LM-Reforge Phase 1 draft-handling rule: dirty drafts in
// SlotInspector discard on slot change, BP change, and external (SSE)
// reload. The canary for the fix is `Expected static flag was missing`
// — React 19 logs this to console.error when render-phase setState
// cascades trip the static-flag invariant. Pre-fix it fired on every
// BP switch with a slot selected; post-fix it never fires.

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

const staticFlagErrors = (errors: string[]): string[] =>
  errors.filter((e) => /Expected static flag was missing/.test(e))

const fixture: LayoutConfig = {
  version: 1,
  name: 'stability-test-layout',
  scope: 'theme',
  grid: {
    desktop: {
      'min-width': '1440px',
      columns: { content: '720px', 'sidebar-left': '360px' },
      'column-gap': '0',
    },
    tablet: {
      'min-width': '768px',
      columns: { content: '500px', 'sidebar-left': '200px' },
      'column-gap': '0',
    },
  },
  slots: {
    content: {},
    'sidebar-left': {},
  },
}

const tokens: TokenMap = { all: {}, spacing: {}, categories: [] }

const baseProps = {
  config: fixture,
  tokens,
  onShowToast: vi.fn(),
  blockWarnings: [],
  onToggleSlot: vi.fn(),
  onUpdateSlotConfig: vi.fn(),
  onBatchUpdateSlotConfig: vi.fn(),
  onUpdateSlotRole: vi.fn(),
  onUpdateColumnWidth: vi.fn(),
  onUpdateGridProp: vi.fn(),
  onUpdateLayoutProp: vi.fn(),
  onUpdateNestedSlots: vi.fn(),
  onCreateNestedSlot: vi.fn(),
  onCreateTopLevelSlot: vi.fn(),
  onSelectSlot: vi.fn(),
}

function getWidthInput(container: HTMLElement): HTMLInputElement {
  // Numeric width input lives inside `div.lm-width-input` wrapper (see
  // ColumnWidthControl line 448 in Inspector.tsx). The drawer-trigger-label
  // text input also uses className `lm-width-input__field` for layout
  // symmetry — parent-scoped selector disambiguates.
  const el = container.querySelector<HTMLInputElement>(
    '.lm-width-input > .lm-width-input__field',
  )
  if (!el) throw new Error('numeric width input not found in Inspector')
  return el
}

describe('Inspector stability — draft resync on context change', () => {
  let spy: ReturnType<typeof captureConsoleErrors>

  beforeEach(() => {
    spy = captureConsoleErrors()
  })

  afterEach(() => {
    spy.restore()
    cleanup()
  })

  it('discards dirty width draft on slot change and resyncs to new slot value', () => {
    const { container, rerender } = render(
      <Inspector
        {...baseProps}
        selectedSlot="content"
        activeBreakpoint="desktop"
        gridKey="desktop"
      />,
    )

    const input = getWidthInput(container)
    expect(input.value).toBe('720')

    fireEvent.change(input, { target: { value: '999' } })
    expect(getWidthInput(container).value).toBe('999')

    rerender(
      <Inspector
        {...baseProps}
        selectedSlot="sidebar-left"
        activeBreakpoint="desktop"
        gridKey="desktop"
      />,
    )

    expect(getWidthInput(container).value).toBe('360')
    expect(staticFlagErrors(spy.errors)).toEqual([])
  })

  it('discards dirty width draft on breakpoint change and resyncs to BP-resolved value', () => {
    const { container, rerender } = render(
      <Inspector
        {...baseProps}
        selectedSlot="content"
        activeBreakpoint="desktop"
        gridKey="desktop"
      />,
    )

    const input = getWidthInput(container)
    expect(input.value).toBe('720')

    fireEvent.change(input, { target: { value: '999' } })
    expect(getWidthInput(container).value).toBe('999')

    rerender(
      <Inspector
        {...baseProps}
        selectedSlot="content"
        activeBreakpoint="tablet"
        gridKey="tablet"
      />,
    )

    expect(getWidthInput(container).value).toBe('500')
    expect(staticFlagErrors(spy.errors)).toEqual([])
  })

  it('discards dirty width draft on external reload (columnWidth prop change)', () => {
    const { container, rerender } = render(
      <Inspector
        {...baseProps}
        selectedSlot="content"
        activeBreakpoint="desktop"
        gridKey="desktop"
      />,
    )

    const input = getWidthInput(container)
    expect(input.value).toBe('720')

    fireEvent.change(input, { target: { value: '999' } })
    expect(getWidthInput(container).value).toBe('999')

    const reloaded: LayoutConfig = {
      ...fixture,
      grid: {
        ...fixture.grid,
        desktop: {
          ...fixture.grid.desktop,
          columns: { content: '680px', 'sidebar-left': '360px' },
        },
      },
    }

    rerender(
      <Inspector
        {...baseProps}
        config={reloaded}
        selectedSlot="content"
        activeBreakpoint="desktop"
        gridKey="desktop"
      />,
    )

    expect(getWidthInput(container).value).toBe('680')
    expect(staticFlagErrors(spy.errors)).toEqual([])
  })
})
