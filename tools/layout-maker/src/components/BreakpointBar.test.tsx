/// <reference types="vitest/globals" />
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BreakpointBar } from './BreakpointBar'
import type { LayoutConfig, TokenMap } from '../lib/types'

import '../styles/maker.css'

const tokens: TokenMap = {
  all: {},
  spacing: {},
  categories: [],
}

const config: LayoutConfig = {
  version: 1,
  name: 'bp-controls-test',
  scope: 'theme',
  grid: {
    desktop: {
      'min-width': '1440px',
      columns: {
        'sidebar-left': '360px',
        content: '1fr',
        'sidebar-right': '360px',
      },
      'column-gap': '0',
    },
    tablet: {
      'min-width': '768px',
      columns: { content: '1fr' },
      'column-gap': '0',
      sidebars: 'drawer',
      'drawer-trigger': 'hamburger',
      'drawer-position': 'both',
      'drawer-width': '280px',
    },
  },
  slots: {
    'sidebar-left': {},
    content: {},
    'sidebar-right': {},
  },
}

describe('BreakpointBar responsive preview controls', () => {
  afterEach(() => cleanup())

  it('hides preview controls on desktop', () => {
    const { queryByText } = render(
      <BreakpointBar
        config={config}
        tokens={tokens}
        activeBreakpoint="desktop"
        viewportWidth={1440}
        onBreakpointChange={vi.fn()}
        onDevicePreset={vi.fn()}
        onBatchUpdateSlotConfig={vi.fn()}
        onUpdateGridProp={vi.fn()}
      />,
    )

    expect(queryByText('Preview controls')).toBeNull()
  })

  it('moves sidebar and drawer global controls into the breakpoint bar popover', () => {
    const onBatchUpdateSlotConfig = vi.fn()
    const onUpdateGridProp = vi.fn()
    const { getByText, getByRole } = render(
      <BreakpointBar
        config={config}
        tokens={tokens}
        activeBreakpoint="tablet"
        viewportWidth={768}
        onBreakpointChange={vi.fn()}
        onDevicePreset={vi.fn()}
        onBatchUpdateSlotConfig={onBatchUpdateSlotConfig}
        onUpdateGridProp={onUpdateGridProp}
      />,
    )

    fireEvent.click(getByText('Preview controls'))

    expect(getByText('All sidebars at tablet')).toBeTruthy()
    expect(getByText('Drawer at tablet')).toBeTruthy()

    fireEvent.click(getByRole('button', { name: 'Hidden' }))
    expect(onBatchUpdateSlotConfig).toHaveBeenCalledWith(
      ['sidebar-left', 'sidebar-right'],
      'visibility',
      'hidden',
      'tablet',
    )

    fireEvent.click(getByRole('button', { name: 'tab' }))
    expect(onUpdateGridProp).toHaveBeenCalledWith('tablet', 'drawer-trigger', 'tab')
  })

  // WP-031 Phase 5 — Inspector overlay toggle
  it('renders Inspector toggle button when onToggleInspector is provided', () => {
    const onToggle = vi.fn()
    const { getByRole } = render(
      <BreakpointBar
        config={config}
        tokens={tokens}
        activeBreakpoint="tablet"
        viewportWidth={768}
        onBreakpointChange={vi.fn()}
        onDevicePreset={vi.fn()}
        onBatchUpdateSlotConfig={vi.fn()}
        onUpdateGridProp={vi.fn()}
        onToggleInspector={onToggle}
        inspectorOpen={false}
      />,
    )
    const btn = getByRole('button', { name: 'Inspector' })
    expect(btn).toBeTruthy()
    expect(btn.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(btn)
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('Inspector toggle reflects inspectorOpen via aria-expanded + active class', () => {
    const { getByRole } = render(
      <BreakpointBar
        config={config}
        tokens={tokens}
        activeBreakpoint="tablet"
        viewportWidth={768}
        onBreakpointChange={vi.fn()}
        onDevicePreset={vi.fn()}
        onBatchUpdateSlotConfig={vi.fn()}
        onUpdateGridProp={vi.fn()}
        onToggleInspector={vi.fn()}
        inspectorOpen={true}
      />,
    )
    const btn = getByRole('button', { name: 'Inspector' })
    expect(btn.getAttribute('aria-expanded')).toBe('true')
    expect(btn.className).toContain('lm-bp-btn--active')
  })

  it('does NOT render Inspector toggle when onToggleInspector callback is omitted', () => {
    const { queryByRole } = render(
      <BreakpointBar
        config={config}
        tokens={tokens}
        activeBreakpoint="tablet"
        viewportWidth={768}
        onBreakpointChange={vi.fn()}
        onDevicePreset={vi.fn()}
        onBatchUpdateSlotConfig={vi.fn()}
        onUpdateGridProp={vi.fn()}
      />,
    )
    expect(queryByRole('button', { name: 'Inspector' })).toBeNull()
  })
})
