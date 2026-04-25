/// <reference types="vitest/globals" />
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Canvas } from './Canvas'
import type { LayoutConfig, TokenMap } from '../lib/types'

// Phase 7 backfill (Brain #7) — locks the Canvas preview-fixture hint
// conditional render rule. Three assertions cover: canonical text when
// test-blocks has entries for the slot, absent when the config omits
// test-blocks entirely, absent when the slot's test-blocks array is
// empty. Screenshots catch visual drift; this contract catches the
// logic regression before one can land.

import '../styles/maker.css'

const tokens: TokenMap = { all: {}, spacing: {}, categories: [] }

const baseConfig: LayoutConfig = {
  version: 1,
  name: 'canvas-hint-test',
  scope: 'theme',
  grid: {
    desktop: {
      'min-width': '1440px',
      columns: { content: '100%' },
      'column-gap': '0',
    },
  },
  slots: { content: {} },
}

const baseProps = {
  tokens,
  activeBreakpoint: 'desktop' as const,
  viewportWidth: 1440,
  gridKey: 'desktop',
  selectedSlot: null,
  onSlotSelect: vi.fn(),
  onToggleSlot: vi.fn(),
  changedSlots: [],
  blocks: null,
}

describe('Canvas preview-fixture hint (Phase 7 backfill)', () => {
  afterEach(() => cleanup())

  it('renders canonical hint text when a slot declares test-blocks', () => {
    const config: LayoutConfig = {
      ...baseConfig,
      'test-blocks': { content: ['foo'] },
    }
    const { container, getByText } = render(
      <Canvas {...baseProps} config={config} />,
    )
    expect(container.querySelector('.lm-preview-hint')).not.toBeNull()
    expect(
      getByText('Preview fixtures only. Not exported to Studio.'),
    ).toBeTruthy()
  })

  it('omits the hint when the config has no test-blocks field', () => {
    const { container } = render(
      <Canvas {...baseProps} config={baseConfig} />,
    )
    expect(container.querySelector('.lm-preview-hint')).toBeNull()
  })

  it('omits the hint when test-blocks exists but the slot entry is empty', () => {
    const config: LayoutConfig = {
      ...baseConfig,
      'test-blocks': { content: [] },
    }
    const { container } = render(
      <Canvas {...baseProps} config={config} />,
    )
    expect(container.querySelector('.lm-preview-hint')).toBeNull()
  })
})
