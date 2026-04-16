import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { SlotConfig, TokenMap } from '../lib/types'

interface Props {
  isOpen: boolean
  parentContainer: string
  existingSlotNames: string[]
  tokens: TokenMap | null
  /** When true, creates a top-level slot (not nested). Shows position dropdown. */
  topLevel?: boolean
  onClose: () => void
  onCreate: (name: string, defaults: SlotConfig, position?: 'top' | 'bottom') => void
}

const ALIGN_OPTIONS = [
  { value: 'stretch', label: 'Stretch' },
  { value: 'flex-start', label: 'Start' },
  { value: 'center', label: 'Center' },
  { value: 'flex-end', label: 'End' },
] as const

type Align = (typeof ALIGN_OPTIONS)[number]['value']

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function validateName(slug: string, existing: Set<string>): string | null {
  if (!slug) return 'Enter a name'
  if (!/^[a-z][a-z0-9-]*$/.test(slug)) return 'Use lowercase letters, digits, hyphens (start with a letter)'
  if (slug.startsWith('meta:') || slug.startsWith('slot:')) return "Prefixes 'meta:' and 'slot:' are reserved"
  if (existing.has(slug)) return `Slot '${slug}' already exists`
  return null
}

export function CreateSlotModal({ isOpen, parentContainer, existingSlotNames, tokens, topLevel, onClose, onCreate }: Props) {
  const [rawName, setRawName] = useState('')
  const [gap, setGap] = useState<string>('')
  const [maxWidth, setMaxWidth] = useState<string>('')
  const [padding, setPadding] = useState<string>('')
  const [align, setAlign] = useState<Align>('stretch')
  const [position, setPosition] = useState<'' | 'top' | 'bottom'>('')

  const dialogRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const existingSet = useMemo(() => new Set(existingSlotNames), [existingSlotNames])
  const slug = slugify(rawName)
  const error = validateName(slug, existingSet)
  const canSubmit = !error

  // Reset form on open + autofocus
  useEffect(() => {
    if (!isOpen) return
    setRawName('')
    setGap('')
    setMaxWidth('')
    setPadding('')
    setAlign('stretch')
    setPosition('')
    // Autofocus after paint
    const id = requestAnimationFrame(() => nameInputRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [isOpen])

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return
    const defaults: SlotConfig = {}
    if (gap) defaults.gap = gap
    if (maxWidth) defaults['max-width'] = maxWidth
    if (padding) defaults['padding-x'] = padding
    if (align && align !== 'stretch') defaults.align = align as SlotConfig['align']
    if (topLevel) defaults['allowed-block-types'] = ['theme-block', 'element']
    onCreate(slug, defaults, (topLevel && position) ? position as 'top' | 'bottom' : undefined)
  }, [canSubmit, gap, maxWidth, padding, align, slug, topLevel, position, onCreate])

  // Keyboard: ESC close, Enter submit, Tab focus-trap
  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        const target = e.target as HTMLElement
        // Don't swallow Enter in selects/textareas/radios
        if (target.tagName === 'TEXTAREA') return
        e.preventDefault()
        handleSubmit()
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
  }, [isOpen, handleSubmit, onClose])

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose()
    },
    [onClose],
  )

  if (!isOpen) return null

  const spacingTokens = tokens
    ? Object.keys(tokens.all).filter((t) => t.startsWith('--spacing-'))
    : []

  return (
    <div className="lm-modal-overlay" onClick={handleOverlayClick}>
      <div
        className="lm-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lm-create-slot-title"
        ref={dialogRef}
      >
        <div className="lm-export-dialog__header">
          <span id="lm-create-slot-title">{topLevel ? 'Create new slot' : `Create slot in ${parentContainer}`}</span>
          <button className="lm-export-dialog__close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        <div className="lm-export-dialog__body">
          {/* Name */}
          <div className="lm-inspector__section">
            <div className="lm-inspector__row">
              <span className="lm-inspector__label">Name</span>
            </div>
            <input
              ref={nameInputRef}
              className="lm-width-input__field"
              style={{ width: '100%' }}
              placeholder="e.g. Hero Banner"
              value={rawName}
              onChange={(e) => setRawName(e.target.value)}
              aria-invalid={!!error}
              aria-describedby="lm-create-slot-slug-hint"
            />
            <div id="lm-create-slot-slug-hint" style={{ marginTop: 'var(--lm-sp-2)', fontFamily: 'var(--lm-font-mono)', fontSize: '11px' }}>
              {rawName === '' ? (
                <span style={{ color: 'var(--lm-text-muted)' }}>slug: (type a name)</span>
              ) : error ? (
                <span className="lm-field-error">{error}</span>
              ) : (
                <span style={{ color: 'var(--lm-text-muted)' }}>slug: <span style={{ color: 'var(--lm-text-accent)' }}>{slug}</span></span>
              )}
            </div>
          </div>

          {/* Position — top-level only */}
          {topLevel && (
            <div className="lm-inspector__section">
              <div className="lm-inspector__row">
                <span className="lm-inspector__label">Position</span>
              </div>
              <select
                className="lm-spacing-select lm-spacing-select--inline"
                value={position}
                onChange={(e) => setPosition(e.target.value as '' | 'top' | 'bottom')}
              >
                <option value="">(grid)</option>
                <option value="top">top — before grid</option>
                <option value="bottom">bottom — after grid</option>
              </select>
            </div>
          )}

          {/* Gap */}
          <div className="lm-inspector__section">
            <div className="lm-inspector__row">
              <span className="lm-inspector__label">Gap</span>
            </div>
            <select
              className="lm-spacing-select lm-spacing-select--inline"
              value={gap}
              onChange={(e) => setGap(e.target.value)}
            >
              <option value="">none</option>
              {spacingTokens.map((t) => (
                <option key={t} value={t}>
                  {t.replace('--spacing-', '')} ({tokens!.all[t]})
                </option>
              ))}
            </select>
          </div>

          {/* Max-width */}
          <div className="lm-inspector__section">
            <div className="lm-inspector__row">
              <span className="lm-inspector__label">Max-width</span>
            </div>
            <input
              className="lm-width-input__field"
              placeholder="e.g. 615px"
              value={maxWidth}
              onChange={(e) => setMaxWidth(e.target.value)}
            />
          </div>

          {/* Padding (combined) */}
          <div className="lm-inspector__section">
            <div className="lm-inspector__row">
              <span className="lm-inspector__label">Padding</span>
            </div>
            <select
              className="lm-spacing-select lm-spacing-select--inline"
              value={padding}
              onChange={(e) => setPadding(e.target.value)}
            >
              <option value="">none</option>
              {spacingTokens.map((t) => (
                <option key={t} value={t}>
                  {t.replace('--spacing-', '')} ({tokens!.all[t]})
                </option>
              ))}
            </select>
          </div>

          {/* Align */}
          <div className="lm-inspector__section">
            <div className="lm-inspector__row">
              <span className="lm-inspector__label">Align</span>
            </div>
            <div className="lm-align-group" role="radiogroup" aria-label="Align">
              {ALIGN_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`lm-align-btn${align === opt.value ? ' lm-align-btn--active' : ''}`}
                  role="radio"
                  aria-checked={align === opt.value}
                  onClick={() => setAlign(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lm-export-dialog__actions">
          <button className="lm-btn" onClick={onClose}>Cancel</button>
          <button
            className="lm-btn lm-btn--primary"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  )
}
