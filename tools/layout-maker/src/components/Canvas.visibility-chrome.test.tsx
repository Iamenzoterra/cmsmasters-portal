/// <reference types="vitest/globals" />
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Canvas } from './Canvas'
import type { CanvasBreakpointId, LayoutConfig, TokenMap } from '../lib/types'

import '../styles/maker.css'

const tokens: TokenMap = { all: {}, spacing: {}, categories: [] }

const baseConfig: LayoutConfig = {
  version: 1,
  name: 'canvas-visibility-chrome-test',
  scope: 'theme',
  grid: {
    desktop: {
      'min-width': '1440px',
      columns: {
        'sidebar-left': '320px',
        content: '1fr',
        'sidebar-right': '320px',
      },
      'column-gap': '0',
    },
  },
  slots: {
    header: { position: 'top' },
    'sidebar-left': {},
    content: {},
    'sidebar-right': {},
    footer: { position: 'bottom' },
  },
}

function renderCanvas({
  config = baseConfig,
  activeBreakpoint = 'desktop',
  gridKey = activeBreakpoint,
  selectedSlot = null,
  onSlotSelect = vi.fn(),
  onToggleSlot = vi.fn(),
}: {
  config?: LayoutConfig
  activeBreakpoint?: CanvasBreakpointId
  gridKey?: string
  selectedSlot?: string | null
  onSlotSelect?: ReturnType<typeof vi.fn>
  onToggleSlot?: ReturnType<typeof vi.fn>
} = {}) {
  const result = render(
    <Canvas
      config={config}
      tokens={tokens}
      activeBreakpoint={activeBreakpoint}
      viewportWidth={activeBreakpoint === 'desktop' ? 1440 : 1024}
      gridKey={gridKey}
      selectedSlot={selectedSlot}
      onSlotSelect={onSlotSelect}
      onToggleSlot={onToggleSlot}
      changedSlots={[]}
      blocks={null}
    />,
  )
  return { ...result, onSlotSelect, onToggleSlot }
}

describe('Canvas visibility chrome', () => {
  afterEach(() => cleanup())

  it('shows a visibility icon for the selected sidebar-left SlotZone', () => {
    const { getByRole } = renderCanvas({ selectedSlot: 'sidebar-left' })

    expect(getByRole('button', { name: /Hide sidebar-left/i })).toBeTruthy()
  })

  it('does not show a visibility icon for selected non-sidebar content', () => {
    const { queryByRole } = renderCanvas({ selectedSlot: 'content' })

    expect(queryByRole('button', { name: /Hide content/i })).toBeNull()
  })

  it('does not show a visibility icon for selected locked header', () => {
    const { queryByRole } = renderCanvas({ selectedSlot: 'header' })

    expect(queryByRole('button', { name: /Hide header/i })).toBeNull()
  })

  it('keeps SlotZone body click wired to selection', () => {
    const { container, onSlotSelect } = renderCanvas({ selectedSlot: null })
    const slotZone = container.querySelector('.lm-slot-zone[data-slot-name="sidebar-left"]')

    expect(slotZone).not.toBeNull()
    fireEvent.click(slotZone!)

    expect(onSlotSelect).toHaveBeenCalledWith('sidebar-left')
  })

  it('visibility icon click hides the sidebar slot', () => {
    const { getByRole, onToggleSlot } = renderCanvas({ selectedSlot: 'sidebar-left' })

    fireEvent.click(getByRole('button', { name: /Hide sidebar-left/i }))

    expect(onToggleSlot).toHaveBeenCalledWith('sidebar-left', false)
  })

  it('visibility icon click does not bubble into SlotZone selection', () => {
    const onSlotSelect = vi.fn()
    const { getByRole, onToggleSlot } = renderCanvas({
      selectedSlot: 'sidebar-left',
      onSlotSelect,
    })

    fireEvent.click(getByRole('button', { name: /Hide sidebar-left/i }))

    expect(onToggleSlot).toHaveBeenCalledWith('sidebar-left', false)
    expect(onSlotSelect).not.toHaveBeenCalled()
  })

  it('uses the existing hidden sidebar badge instead of rendering a hidden SlotZone', () => {
    const config: LayoutConfig = {
      ...baseConfig,
      grid: {
        ...baseConfig.grid,
        tablet: {
          'min-width': '1024px',
          columns: baseConfig.grid.desktop.columns,
          sidebars: 'hidden',
        },
      },
    }
    const { container, getByRole } = renderCanvas({
      config,
      activeBreakpoint: 'tablet',
      gridKey: 'tablet',
      selectedSlot: 'sidebar-left',
    })

    expect(container.querySelector('.lm-slot-zone[data-slot-name="sidebar-left"]')).toBeNull()
    expect(getByRole('button', { name: /sidebar-left \(hidden\)/i })).toBeTruthy()
  })

  it('uses the hidden sidebar badge when a configured desktop sidebar is omitted from columns', () => {
    const config: LayoutConfig = {
      ...baseConfig,
      grid: {
        desktop: {
          ...baseConfig.grid.desktop,
          columns: {
            content: '1fr',
            'sidebar-right': '320px',
          },
        },
      },
    }
    const { container, getByRole } = renderCanvas({
      config,
      selectedSlot: 'sidebar-left',
    })

    expect(container.querySelector('.lm-slot-zone[data-slot-name="sidebar-left"]')).toBeNull()
    expect(getByRole('button', { name: /sidebar-left \(hidden\)/i })).toBeTruthy()
  })

  it.each(['drawer', 'push'] as const)('uses the existing %s sidebar badge instead of rendering the SlotZone', (mode) => {
    const config: LayoutConfig = {
      ...baseConfig,
      grid: {
        ...baseConfig.grid,
        tablet: {
          'min-width': '1024px',
          columns: baseConfig.grid.desktop.columns,
          sidebars: mode,
          'drawer-trigger': 'hamburger',
        },
      },
    }
    const { container, getByRole } = renderCanvas({
      config,
      activeBreakpoint: 'tablet',
      gridKey: 'tablet',
      selectedSlot: 'sidebar-left',
    })

    expect(container.querySelector('.lm-slot-zone[data-slot-name="sidebar-left"]')).toBeNull()
    expect(getByRole('button', { name: new RegExp(`sidebar-left \\(${mode}\\)`, 'i') })).toBeTruthy()
  })
})
