/// <reference types="vitest/globals" />
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { SlotStructurePanel } from './SlotStructurePanel'
import type { LayoutConfig, TokenMap } from '../lib/types'

const tokens: TokenMap = {
  all: {
    '--spacing-xl': '24px',
  },
  spacing: {},
  categories: [],
}

const config: LayoutConfig = {
  version: 1,
  name: 'structure-test',
  scope: 'theme',
  grid: {
    desktop: {
      'min-width': '1440px',
      columns: {
        header: '1fr',
        'sidebar-left': '280px',
        content: '1fr',
        'sidebar-right': '280px',
        footer: '1fr',
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

function renderPanel(overrides: Partial<ComponentProps<typeof SlotStructurePanel>> = {}) {
  const props: ComponentProps<typeof SlotStructurePanel> = {
    config,
    gridKey: 'desktop',
    selectedSlot: null,
    tokens,
    onToggleSlot: vi.fn(),
    onCreateTopLevelSlot: vi.fn(),
    onSelectSlot: vi.fn(),
    ...overrides,
  }

  return {
    ...render(<SlotStructurePanel {...props} />),
    props,
  }
}

describe('SlotStructurePanel', () => {
  afterEach(() => cleanup())

  it('renders the canonical slot rows for a typical layout config', () => {
    renderPanel()

    for (const name of ['header', 'sidebar-left', 'content', 'sidebar-right', 'footer']) {
      expect(screen.getByRole('button', { name })).not.toBeNull()
    }
  })

  it('visibility checkbox click calls onToggleSlot(name, checked)', () => {
    const onToggleSlot = vi.fn()
    renderPanel({ onToggleSlot })

    fireEvent.click(screen.getByLabelText('Toggle sidebar-left slot'))

    expect(onToggleSlot).toHaveBeenCalledWith('sidebar-left', false)
  })

  it('visibility checkbox click does not call onSelectSlot', () => {
    const onSelectSlot = vi.fn()
    renderPanel({ onSelectSlot })

    fireEvent.click(screen.getByLabelText('Toggle sidebar-left slot'))

    expect(onSelectSlot).not.toHaveBeenCalled()
  })

  it('locked slot shows a disabled checkbox', () => {
    renderPanel()

    const headerToggle = screen.getByLabelText('Toggle header slot') as HTMLInputElement
    expect(headerToggle.disabled).toBe(true)
  })

  it('Add slot button opens CreateSlotModal', () => {
    renderPanel()

    fireEvent.click(screen.getByRole('button', { name: 'Add slot' }))

    expect(screen.getByText('Create new slot')).not.toBeNull()
  })

  it('Add slot modal submit calls onCreateTopLevelSlot', () => {
    const onCreateTopLevelSlot = vi.fn()
    renderPanel({ onCreateTopLevelSlot })

    fireEvent.click(screen.getByRole('button', { name: 'Add slot' }))
    fireEvent.change(screen.getByPlaceholderText('e.g. Hero Banner'), {
      target: { value: 'Promo Rail' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    expect(onCreateTopLevelSlot).toHaveBeenCalledTimes(1)
    expect(onCreateTopLevelSlot.mock.calls[0][0]).toBe('promo-rail')
    expect(onCreateTopLevelSlot.mock.calls[0][1]).toEqual({
      'allowed-block-types': ['theme-block', 'element'],
    })
    expect(onCreateTopLevelSlot.mock.calls[0][2]).toBeUndefined()
  })

  it('selected slot row gets a visual cue', () => {
    const { container } = renderPanel({ selectedSlot: 'sidebar-left' })

    const selected = container.querySelector('[data-slot-name="sidebar-left"]')
    expect(selected?.getAttribute('data-selected')).toBe('true')
  })
})
