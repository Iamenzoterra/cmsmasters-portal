/// <reference types="vitest/globals" />
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DrawerTriggerDialog } from './DrawerTriggerDialog'
import type { SlotConfig, TokenMap } from '../lib/types'

import '../styles/maker.css'

const tokens: TokenMap = {
  all: {
    '--brand-the-sky': '227 72% 51%',
    '--brand-deep-blue': '230 58% 20%',
    '--brand-mare': '186 64% 37%',
    '--brand-grey': '0 0% 62%',
  },
  spacing: {},
  categories: [],
}

function renderDialog({
  isOpen = true,
  slotName = 'sidebar-left',
  baseSlot = {},
  onClose = vi.fn(),
  onUpdateSlotRole = vi.fn(),
}: {
  isOpen?: boolean
  slotName?: string
  baseSlot?: SlotConfig
  onClose?: ReturnType<typeof vi.fn>
  onUpdateSlotRole?: ReturnType<typeof vi.fn>
} = {}) {
  const result = render(
    <DrawerTriggerDialog
      isOpen={isOpen}
      slotName={slotName}
      baseSlot={baseSlot}
      tokens={tokens}
      onClose={onClose}
      onUpdateSlotRole={onUpdateSlotRole}
    />,
  )
  return { ...result, onClose, onUpdateSlotRole }
}

describe('DrawerTriggerDialog', () => {
  afterEach(() => cleanup())

  it('renders nothing when closed', () => {
    const { queryByText } = renderDialog({ isOpen: false })

    expect(queryByText(/Configure drawer trigger/i)).toBeNull()
  })

  it('renders title, three controls, and actions when open', () => {
    const { getByLabelText, getByRole, getByText } = renderDialog()

    expect(getByRole('dialog')).toBeTruthy()
    expect(getByText('Configure drawer trigger — sidebar-left')).toBeTruthy()
    expect(getByLabelText('Label')).toBeTruthy()
    expect(getByLabelText('Icon')).toBeTruthy()
    expect(getByText('Color')).toBeTruthy()
    expect(getByRole('button', { name: 'Cancel' })).toBeTruthy()
    expect(getByRole('button', { name: 'Save' })).toBeTruthy()
  })

  it('seeds initial values from baseSlot', () => {
    const { getByLabelText } = renderDialog({
      baseSlot: {
        'drawer-trigger-label': 'Quick actions',
        'drawer-trigger-icon': 'menu',
        'drawer-trigger-color': '--brand-mare',
      },
    })

    expect((getByLabelText('Label') as HTMLInputElement).value).toBe('Quick actions')
    expect((getByLabelText('Icon') as HTMLSelectElement).value).toBe('menu')
  })

  it('saving unchanged default values clears all three overrides', () => {
    const { getByRole, onUpdateSlotRole } = renderDialog()

    fireEvent.click(getByRole('button', { name: 'Save' }))

    expect(onUpdateSlotRole).toHaveBeenCalledTimes(1)
    expect(onUpdateSlotRole).toHaveBeenCalledWith('sidebar-left', {
      'drawer-trigger-label': undefined,
      'drawer-trigger-icon': undefined,
      'drawer-trigger-color': undefined,
    })
  })

  it('saving a custom label only writes label and clears default fields', () => {
    const { getByLabelText, getByRole, onUpdateSlotRole } = renderDialog()

    fireEvent.change(getByLabelText('Label'), { target: { value: 'Quick actions' } })
    fireEvent.click(getByRole('button', { name: 'Save' }))

    expect(onUpdateSlotRole).toHaveBeenCalledWith('sidebar-left', {
      'drawer-trigger-label': 'Quick actions',
      'drawer-trigger-icon': undefined,
      'drawer-trigger-color': undefined,
    })
  })

  it('cancel closes without saving', () => {
    const { getByRole, onClose, onUpdateSlotRole } = renderDialog()

    fireEvent.click(getByRole('button', { name: 'Cancel' }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onUpdateSlotRole).not.toHaveBeenCalled()
  })

  it('escape closes without saving', () => {
    const { onClose, onUpdateSlotRole } = renderDialog()

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onUpdateSlotRole).not.toHaveBeenCalled()
  })

  it('backdrop click closes without saving', () => {
    const { container, onClose, onUpdateSlotRole } = renderDialog()
    const backdrop = container.querySelector('.lm-drawer-trigger-dialog__backdrop')

    expect(backdrop).not.toBeNull()
    fireEvent.click(backdrop!)

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onUpdateSlotRole).not.toHaveBeenCalled()
  })

  it('re-opening re-seeds from baseSlot instead of stale local state', () => {
    const onClose = vi.fn()
    const onUpdateSlotRole = vi.fn()
    const baseSlot: SlotConfig = { 'drawer-trigger-label': 'Base label' }
    const { getByLabelText, getByRole, rerender } = render(
      <DrawerTriggerDialog
        isOpen
        slotName="sidebar-left"
        baseSlot={baseSlot}
        tokens={tokens}
        onClose={onClose}
        onUpdateSlotRole={onUpdateSlotRole}
      />,
    )

    fireEvent.change(getByLabelText('Label'), { target: { value: 'Cancelled draft' } })
    fireEvent.click(getByRole('button', { name: 'Cancel' }))

    rerender(
      <DrawerTriggerDialog
        isOpen={false}
        slotName="sidebar-left"
        baseSlot={baseSlot}
        tokens={tokens}
        onClose={onClose}
        onUpdateSlotRole={onUpdateSlotRole}
      />,
    )
    rerender(
      <DrawerTriggerDialog
        isOpen
        slotName="sidebar-left"
        baseSlot={baseSlot}
        tokens={tokens}
        onClose={onClose}
        onUpdateSlotRole={onUpdateSlotRole}
      />,
    )

    expect((getByLabelText('Label') as HTMLInputElement).value).toBe('Base label')
    expect(onUpdateSlotRole).not.toHaveBeenCalled()
  })
})
