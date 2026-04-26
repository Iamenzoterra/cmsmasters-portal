import { useCallback, useEffect, useRef, useState } from 'react'
import type { SlotConfig, TokenMap } from '../lib/types'
import { hslTripletToHex } from '../lib/tokens'
import { ColorTokenSelect, getBrandColorTokens } from '../lib/color-token-select'
import {
  getDrawerTriggerDefaultColorToken,
  getDrawerTriggerDefaults,
} from '../lib/drawer-trigger-defaults'
import { DRAWER_ICONS } from '../../../../packages/ui/src/portal/drawer-icons'

interface Props {
  isOpen: boolean
  slotName: string
  baseSlot: SlotConfig
  tokens: TokenMap | null
  onClose: () => void
  onUpdateSlotRole: (name: string, partial: Partial<SlotConfig>) => void
}

function normalizeText(value: string, defaultValue: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed || trimmed === defaultValue) return undefined
  return trimmed
}

function normalizeSelect(value: string, defaultValue: string): string | undefined {
  if (!value || value === defaultValue) return undefined
  return value
}

export function DrawerTriggerDialog({
  isOpen,
  slotName,
  baseSlot,
  tokens,
  onClose,
  onUpdateSlotRole,
}: Props) {
  const [label, setLabel] = useState('')
  const [icon, setIcon] = useState('')
  const [color, setColor] = useState('')

  const dialogRef = useRef<HTMLDivElement>(null)
  const labelInputRef = useRef<HTMLInputElement>(null)
  const defaults = getDrawerTriggerDefaults(slotName)
  const defaultColorToken = getDrawerTriggerDefaultColorToken(slotName)

  useEffect(() => {
    if (!isOpen) return
    setLabel(baseSlot['drawer-trigger-label'] ?? '')
    setIcon(baseSlot['drawer-trigger-icon'] ?? '')
    setColor(baseSlot['drawer-trigger-color'] ?? '')
    const id = requestAnimationFrame(() => labelInputRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [isOpen, baseSlot, slotName])

  const handleSave = useCallback(() => {
    onUpdateSlotRole(slotName, {
      'drawer-trigger-label': normalizeText(label, defaults.label),
      'drawer-trigger-icon': normalizeSelect(icon, defaults.icon),
      'drawer-trigger-color': normalizeSelect(color, defaultColorToken),
    })
    onClose()
  }, [color, defaultColorToken, defaults.icon, defaults.label, icon, label, onClose, onUpdateSlotRole, slotName])

  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'input, select, button, [tabindex]:not([tabindex="-1"])',
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        const active = document.activeElement as HTMLElement | null
        if (e.shiftKey && active === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && active === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose()
    },
    [onClose],
  )

  if (!isOpen) return null

  const colorOptions = tokens
    ? getBrandColorTokens(tokens).map((t) => ({
      value: t.name,
      label: t.name.replace('--brand-', ''),
      hex: hslTripletToHex(tokens.all[t.name]) ?? t.hsl,
    }))
    : []

  return (
    <div className="lm-drawer-trigger-dialog__backdrop" onClick={handleOverlayClick}>
      <div
        className="lm-drawer-trigger-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lm-drawer-trigger-dialog-title"
        ref={dialogRef}
      >
        <div className="lm-export-dialog__header">
          <span id="lm-drawer-trigger-dialog-title">Configure drawer trigger — {slotName}</span>
          <button className="lm-export-dialog__close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        <div className="lm-drawer-trigger-dialog__body">
          <div className="lm-drawer-trigger-dialog__field">
            <label className="lm-inspector__label" htmlFor="lm-drawer-trigger-label">Label</label>
            <input
              id="lm-drawer-trigger-label"
              ref={labelInputRef}
              type="text"
              className="lm-width-input__field"
              placeholder={defaults.label}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          <div className="lm-drawer-trigger-dialog__field">
            <label className="lm-inspector__label" htmlFor="lm-drawer-trigger-icon">Icon</label>
            <select
              id="lm-drawer-trigger-icon"
              className="lm-spacing-select lm-spacing-select--inline"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
            >
              <option value="">{defaults.icon} (default)</option>
              {DRAWER_ICONS.map((drawerIcon) => (
                <option key={drawerIcon.name} value={drawerIcon.name}>{drawerIcon.label}</option>
              ))}
            </select>
          </div>

          <div className="lm-drawer-trigger-dialog__field">
            <span className="lm-inspector__label">Color</span>
            <ColorTokenSelect
              options={colorOptions}
              value={color || undefined}
              onChange={(v) => setColor(v ?? '')}
              placeholder={`${defaults.color} (default)`}
            />
          </div>
        </div>

        <div className="lm-export-dialog__actions">
          <button className="lm-btn" onClick={onClose}>Cancel</button>
          <button className="lm-btn lm-btn--primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  )
}
