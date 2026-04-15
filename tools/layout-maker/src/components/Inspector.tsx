import { useState } from 'react'
import type { LayoutConfig, TokenMap, ScopingWarning, PerBpSlotField, CanvasBreakpointId, SlotConfig } from '../lib/types'
import { resolveSlotConfig, getBaseGridKey, isFieldOverridden } from '../lib/types'
import { resolveToken, resolveTokenPx, hslTripletToHex } from '../lib/tokens'
import { CopyButton } from './CopyButton'
import { SlotToggles } from './SlotToggles'
import { SlotReference } from './SlotReference'
import { TokenReference } from './TokenReference'
import { CreateSlotModal } from './CreateSlotModal'

interface Props {
  selectedSlot: string | null
  config: LayoutConfig | null
  activeBreakpoint: string
  gridKey: string
  tokens: TokenMap | null
  onShowToast: (message: string) => void
  blockWarnings: ScopingWarning[]
  onToggleSlot: (slotName: string, enabled: boolean) => void
  onUpdateSlotConfig: (slotName: string, key: string, value: string | undefined, targetGridKey?: string, breakpointId?: CanvasBreakpointId) => void
  onUpdateColumnWidth: (slotName: string, breakpointKey: string, width: string) => void
  onUpdateGridProp: (breakpointKey: string, key: string, value: string | undefined) => void
  onUpdateLayoutProp: (key: string, value: string | undefined) => void
  onUpdateNestedSlots: (parentName: string, children: string[] | null) => void
  onCreateNestedSlot: (parentName: string, childName: string, defaults: SlotConfig) => void
  onSelectSlot: (name: string | null) => void
}

/** List of --bg-* tokens from tokens map, with label + preview color. */
function getBgTokens(tokens: TokenMap): Array<{ name: string; hsl: string }> {
  return Object.keys(tokens.all)
    .filter((t) => t.startsWith('--bg-'))
    .map((name) => ({ name, hsl: `hsl(${tokens.all[name]})` }))
}

function BackgroundPicker({ value, onChange, tokens, allowInherit, inheritLabel }: {
  value: string | undefined
  onChange: (v: string | undefined) => void
  tokens: TokenMap
  allowInherit: boolean
  inheritLabel?: string
}) {
  const bgTokens = getBgTokens(tokens)
  const previewRaw = value?.startsWith('--') ? tokens.all[value] : undefined
  const previewHex = previewRaw ? hslTripletToHex(previewRaw) : undefined
  return (
    <div className="lm-inspector__row" style={{ gap: '8px', alignItems: 'center' }}>
      <select
        className="lm-spacing-select lm-spacing-select--inline"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value)}
      >
        <option value="">{allowInherit ? (inheritLabel ?? 'inherit') : 'none'}</option>
        {bgTokens.map((t) => {
          const hex = hslTripletToHex(tokens.all[t.name])
          return (
            <option key={t.name} value={t.name}>
              {t.name.replace('--bg-', '')} ({hex ?? tokens.all[t.name]})
            </option>
          )
        })}
      </select>
      {previewHex && (
        <span
          style={{
            display: 'inline-block',
            width: '20px',
            height: '20px',
            borderRadius: '4px',
            border: '1px solid var(--lm-border)',
            background: previewHex,
          }}
          title={`${value} ${previewHex}`}
        />
      )}
    </div>
  )
}

interface PropertyRow {
  label: string
  property: string
  value: string
  token?: string
  resolvedPx?: string
}

const ALIGN_OPTIONS = [
  { value: 'flex-start', label: 'Left', icon: '\u2590' },
  { value: 'center', label: 'Center', icon: '\u2503' },
  { value: 'flex-end', label: 'Right', icon: '\u258C' },
] as const

function buildPropertyRows(
  slotConfig: Record<string, unknown>,
  tokens: TokenMap,
): PropertyRow[] {
  const rows: PropertyRow[] = []
  const spacingProps = [
    { label: 'Gap', key: 'gap' },
    { label: 'Min-height', key: 'min-height' },
    { label: 'Margin-top', key: 'margin-top' },
  ]
  for (const { label, key } of spacingProps) {
    const val = slotConfig[key] as string | undefined
    if (!val) continue
    const resolved = resolveToken(val, tokens)
    const isToken = resolved !== val
    rows.push({
      label,
      property: key,
      value: val,
      token: isToken ? val : undefined,
      resolvedPx: isToken ? resolved : undefined,
    })
  }
  return rows
}

function computeUsableWidth(
  columnWidth: string | undefined,
  isFullWidth: boolean,
  slotConfig: Record<string, unknown>,
  tokens: TokenMap,
): string | null {
  if (isFullWidth || !columnWidth) return null
  const colPx = parseInt(columnWidth, 10)
  const paddingToken = slotConfig.padding as string | undefined
  if (!isNaN(colPx) && columnWidth.endsWith('px') && paddingToken) {
    const paddingPx = resolveTokenPx(paddingToken, tokens)
    if (paddingPx != null) return `${colPx - paddingPx * 2}px`
  }
  if (columnWidth === '1fr' || columnWidth.includes('fr')) return 'dynamic'
  return null
}

function SidebarModeControl({ config, activeBreakpoint, onUpdateGridProp }: {
  config: LayoutConfig
  activeBreakpoint: string
  onUpdateGridProp: Props['onUpdateGridProp']
}) {
  const isDesktop = activeBreakpoint === 'desktop'
  const hasSidebars = Object.keys(config.slots).some((n) => n.includes('sidebar'))
  if (isDesktop || !hasSidebars) return null

  const bpOwnGrid = config.grid[activeBreakpoint]
  return (
    <div className="lm-inspector__section lm-inspector__info">
      <div className="lm-inspector__row">
        <span className="lm-inspector__label">Sidebars at {activeBreakpoint}</span>
      </div>
      <div className="lm-align-group">
        {([
          { value: undefined, label: 'Visible' },
          { value: 'hidden', label: 'Hidden' },
          { value: 'drawer', label: 'Drawer' },
        ] as const).map((opt) => (
          <button
            key={opt.label}
            className={`lm-align-btn${(bpOwnGrid?.sidebars ?? undefined) === opt.value ? ' lm-align-btn--active' : ''}`}
            onClick={() => onUpdateGridProp(activeBreakpoint, 'sidebars', opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function ColumnWidthControl({ selectedSlot, gridKey, columnWidth, isFullWidth, widthDraft, setWidthDraft, onUpdateColumnWidth }: {
  selectedSlot: string
  gridKey: string
  columnWidth: string | undefined
  isFullWidth: boolean
  widthDraft: string
  setWidthDraft: (v: string) => void
  onUpdateColumnWidth: Props['onUpdateColumnWidth']
}) {
  const isFixedWidth = columnWidth ? columnWidth.endsWith('px') : false

  if (isFullWidth) {
    return (
      <div className="lm-inspector__locked">
        <span className="lm-inspector__value">1fr</span>
        <span className="lm-inspector__locked-note">locked — full width by position</span>
      </div>
    )
  }
  if (!columnWidth) {
    return (
      <div className="lm-inspector__locked">
        <span className="lm-inspector__locked-note">not in grid at this breakpoint</span>
      </div>
    )
  }

  return (
    <div className="lm-width-control">
      <div className="lm-align-group">
        <button
          className={`lm-align-btn${!isFixedWidth ? ' lm-align-btn--active' : ''}`}
          onClick={() => {
            onUpdateColumnWidth(selectedSlot, gridKey, '1fr')
            setWidthDraft('')
          }}
        >
          Fluid
        </button>
        <button
          className={`lm-align-btn${isFixedWidth ? ' lm-align-btn--active' : ''}`}
          onClick={() => {
            const px = widthDraft || (selectedSlot === 'content' ? '720' : '360')
            onUpdateColumnWidth(selectedSlot, gridKey, `${px}px`)
            setWidthDraft(px)
          }}
        >
          Fixed
        </button>
      </div>
      {isFixedWidth && (
        <div className="lm-width-input">
          <input
            className="lm-width-input__field"
            type="number"
            min={100}
            max={2000}
            step={10}
            value={widthDraft}
            onChange={(e) => setWidthDraft(e.target.value)}
            onBlur={() => {
              const n = parseInt(widthDraft, 10)
              if (!isNaN(n) && n >= 100) {
                onUpdateColumnWidth(selectedSlot, gridKey, `${n}px`)
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const n = parseInt(widthDraft, 10)
                if (!isNaN(n) && n >= 100) {
                  onUpdateColumnWidth(selectedSlot, gridKey, `${n}px`)
                }
              }
            }}
          />
          <span className="lm-width-input__unit">px</span>
        </div>
      )}
    </div>
  )
}

export function Inspector({ selectedSlot, config, activeBreakpoint, gridKey, tokens, onShowToast, blockWarnings, onToggleSlot, onUpdateSlotConfig, onUpdateColumnWidth, onUpdateGridProp, onUpdateLayoutProp, onUpdateNestedSlots, onCreateNestedSlot, onSelectSlot }: Props) {
  if (!config || !tokens) {
    return (
      <div className="lm-inspector" data-active-bp={activeBreakpoint}>
        <div className="lm-inspector__header">Inspector</div>
        <div className="lm-inspector__body">
          <div className="lm-inspector__empty">
            Select a layout to get started.
          </div>
        </div>
      </div>
    )
  }

  if (!selectedSlot) {
    return (
      <div className="lm-inspector" data-active-bp={activeBreakpoint}>
        <div className="lm-inspector__header">Inspector</div>
        <SlotToggles config={config} activeBreakpoint={gridKey} onToggleSlot={onToggleSlot} />
        <div className="lm-inspector__body">
          <SidebarModeControl config={config} activeBreakpoint={activeBreakpoint} onUpdateGridProp={onUpdateGridProp} />
          <div className="lm-inspector__section">
            <div className="lm-inspector__section-title">Layout defaults</div>
            <div className="lm-inspector__row">
              <span className="lm-inspector__label">Background</span>
            </div>
            <BackgroundPicker
              value={config.background}
              onChange={(v) => onUpdateLayoutProp('background', v)}
              tokens={tokens}
              allowInherit={false}
            />
          </div>
          <div className="lm-inspector__empty">
            Click a slot in the canvas to inspect its properties.
          </div>
          <SlotReference onCopied={() => onShowToast('Copied!')} />
          {tokens.categories && (
            <TokenReference categories={tokens.categories} onCopied={() => onShowToast('Copied!')} />
          )}
        </div>
      </div>
    )
  }

  const baseGridKey = getBaseGridKey(config.grid)
  const isBaseBp = activeBreakpoint === 'desktop'
  // Effective config (base + per-bp override) for display
  const slotConfig = resolveSlotConfig(selectedSlot, gridKey, config)
  // Base slot only (for role fields + inherited indicator)
  const baseSlot = config.slots[selectedSlot] ?? {}
  const grid = config.grid[gridKey]
  const bpWidth = grid?.['min-width'] ?? '0'
  const columnWidth = grid?.columns?.[selectedSlot]
  const isFullWidth = baseSlot.position === 'top' || baseSlot.position === 'bottom'

  // Helper: is a per-bp field currently overridden at this breakpoint?
  const isOverridden = (field: PerBpSlotField) =>
    !isBaseBp && isFieldOverridden(selectedSlot, gridKey, config, field)
  // Helper: is value inherited from base (viewing non-base bp, no override)?
  const isInherited = (field: PerBpSlotField) =>
    !isBaseBp && !isFieldOverridden(selectedSlot, gridKey, config, field) && baseSlot[field] !== undefined

  // Write target: base when viewing desktop, per-bp override otherwise
  const writeField = (key: string, value: string | undefined) =>
    onUpdateSlotConfig(selectedSlot, key, value, gridKey, activeBreakpoint as CanvasBreakpointId)
  // Reset: explicitly clear per-bp override (always targets current gridKey)
  const resetField = (key: string) =>
    onUpdateSlotConfig(selectedSlot, key, undefined, gridKey, activeBreakpoint as CanvasBreakpointId)

  // Content width editing state
  const currentPx = columnWidth?.endsWith('px') ? parseInt(columnWidth, 10).toString() : ''
  const [widthDraft, setWidthDraft] = useState(currentPx)

  // Sync draft when column width changes externally (SSE, slot switch)
  const [prevColumnWidth, setPrevColumnWidth] = useState(columnWidth)
  if (columnWidth !== prevColumnWidth) {
    setPrevColumnWidth(columnWidth)
    const newPx = columnWidth?.endsWith('px') ? parseInt(columnWidth, 10).toString() : ''
    setWidthDraft(newPx)
  }

  // Inner max-width editing state
  const innerMaxWidth = slotConfig['max-width']
  const hasInnerMaxWidth = !!innerMaxWidth
  const innerMaxWidthPx = hasInnerMaxWidth ? parseInt(innerMaxWidth!, 10).toString() : ''
  const [maxWidthDraft, setMaxWidthDraft] = useState(innerMaxWidthPx)

  // Sync max-width draft on external changes
  const [prevMaxWidth, setPrevMaxWidth] = useState(innerMaxWidth)
  if (innerMaxWidth !== prevMaxWidth) {
    setPrevMaxWidth(innerMaxWidth)
    setMaxWidthDraft(innerMaxWidth ? parseInt(innerMaxWidth, 10).toString() : '')
  }

  const rows = buildPropertyRows(slotConfig as unknown as Record<string, unknown>, tokens)
  const usableWidth = computeUsableWidth(columnWidth, isFullWidth, slotConfig as unknown as Record<string, unknown>, tokens)

  // Test blocks
  const testBlocks = config['test-blocks']?.[selectedSlot]
  const blockCount = testBlocks?.length ?? 0

  // Container/leaf: a slot is a container when its base config declares nested-slots (even if empty [])
  const nestedChildren = (baseSlot['nested-slots'] as string[] | undefined)
  const isContainer = Array.isArray(nestedChildren)

  // Slots eligible for "+ Add slot" dropdown: existing leaves not already nested anywhere, excluding self.
  const nestedAnywhere = new Set<string>()
  for (const name of Object.keys(config.slots)) {
    const nl = config.slots[name]['nested-slots']
    if (Array.isArray(nl)) nl.forEach((c) => nestedAnywhere.add(c))
  }
  const addCandidates = Object.keys(config.slots).filter((name) => {
    if (name === selectedSlot) return false
    if (nestedAnywhere.has(name)) return false
    // Containers are excluded — keep it simple (one level only for now)
    if (Array.isArray(config.slots[name]['nested-slots'])) return false
    return true
  })

  const [showCreateModal, setShowCreateModal] = useState(false)

  // Format helpers
  function formatLine(prop: string, token: string | undefined, resolved: string): string {
    const prefix = `[${activeBreakpoint} ${bpWidth}] ${selectedSlot}.${prop}`
    if (token) return `${prefix}: ${token} (${resolved})`
    return `${prefix}: ${resolved}`
  }

  function formatSummary(): string {
    const parts = rows
      .filter((r) => r.property !== 'width' || r.value !== 'n/a')
      .map((r) => {
        if (r.token && r.resolvedPx) return `${r.property} ${r.token} (${r.resolvedPx})`
        return `${r.property} ${r.value}`
      })
    return `[${activeBreakpoint} ${bpWidth}] ${selectedSlot}: ${parts.join(', ')}`
  }

  const handleCopied = () => onShowToast('Copied!')

  return (
    <div className="lm-inspector" data-active-bp={activeBreakpoint}>
      <div className="lm-inspector__header">Inspector</div>
      <SlotToggles config={config} activeBreakpoint={gridKey} onToggleSlot={onToggleSlot} />
      <div className="lm-inspector__body">
        {/* Slot name + Copy all */}
        <div className={`lm-inspector__section${isContainer ? ' lm-inspector__panel--container' : ''}`}>
          <div className="lm-inspector__slot-name">
            {selectedSlot}
            {isContainer && <span className="lm-badge lm-badge--container">container</span>}
            <CopyButton text={formatSummary()} onCopied={handleCopied} />
          </div>
        </div>

        {/* Container panel — children + create controls */}
        {isContainer && (
          <div className="lm-inspector__section lm-inspector__panel--container">
            <div className="lm-inspector__section-title">Child slots</div>
            {nestedChildren!.length === 0 ? (
              <div className="lm-inspector__empty" style={{ padding: 'var(--lm-sp-4) 0' }}>
                No children yet. Add or create one below.
              </div>
            ) : (
              <div className="lm-chip-list">
                {nestedChildren!.map((childName) => (
                  <span key={childName} className="lm-chip">
                    <button
                      className="lm-chip__label"
                      onClick={() => onSelectSlot(childName)}
                      title={`Select ${childName}`}
                    >
                      {childName}
                    </button>
                    <button
                      className="lm-chip__remove"
                      aria-label={`Remove nested slot ${childName} from ${selectedSlot}`}
                      title={`Remove ${childName}`}
                      onClick={() => {
                        const next = nestedChildren!.filter((n) => n !== childName)
                        onUpdateNestedSlots(selectedSlot, next)
                      }}
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="lm-inspector__row" style={{ gap: 'var(--lm-sp-3)', marginTop: 'var(--lm-sp-6)' }}>
              <select
                className="lm-spacing-select lm-spacing-select--inline"
                value=""
                disabled={addCandidates.length === 0}
                onChange={(e) => {
                  const pick = e.target.value
                  if (!pick) return
                  onUpdateNestedSlots(selectedSlot, [...nestedChildren!, pick])
                  e.target.value = ''
                }}
              >
                <option value="">
                  {addCandidates.length === 0 ? 'No unnested leaves' : '+ Add slot…'}
                </option>
                {addCandidates.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <button
                className="lm-btn lm-btn--primary"
                onClick={() => setShowCreateModal(true)}
              >
                + Create slot
              </button>
            </div>

            {/* Container outer params — background (min-height / margin-top tuned via yaml for MVP). */}
            <div className="lm-inspector__row" style={{ marginTop: 'var(--lm-sp-8)' }}>
              <span className="lm-inspector__label">Background</span>
            </div>
            <BackgroundPicker
              value={baseSlot.background}
              onChange={(v) => onUpdateSlotConfig(selectedSlot, 'background', v, gridKey)}
              tokens={tokens}
              allowInherit
              inheritLabel={config.background ? `inherit (${config.background.replace('--bg-', '')})` : 'inherit (none)'}
            />

            <div style={{ marginTop: 'var(--lm-sp-8)' }}>
              <button
                className="lm-btn"
                disabled={nestedChildren!.length > 0}
                title={nestedChildren!.length > 0 ? 'Remove all children first' : 'Convert to leaf'}
                onClick={() => onUpdateNestedSlots(selectedSlot, null)}
              >
                Convert to leaf
              </button>
            </div>
          </div>
        )}

        <CreateSlotModal
          isOpen={showCreateModal}
          parentContainer={selectedSlot}
          existingSlotNames={Object.keys(config.slots)}
          tokens={tokens}
          onClose={() => setShowCreateModal(false)}
          onCreate={(name, defaults) => {
            onCreateNestedSlot(selectedSlot, name, defaults)
            setShowCreateModal(false)
          }}
        />

        {/* Slot Area — outer (grid column width + padding). Hidden for containers — they have no inner host. */}
        {!isContainer && (
        <div className="lm-inspector__section lm-inspector__section--outer" data-slot-type={selectedSlot}>
          <div className="lm-inspector__section-title">
            <span className="lm-inspector__section-glyph">▭</span> Slot Area
          </div>

          {/* Outer padding — split into X / top / bottom */}
          {(['padding-x', 'padding-top', 'padding-bottom'] as const).map((key) => {
            const label = key === 'padding-x' ? 'Padding ←→' : key === 'padding-top' ? 'Padding ↑' : 'Padding ↓'
            // Effective value (resolved) — shows what's actually applied at this bp
            const effective = slotConfig[key] ?? slotConfig.padding
            const overridden = isOverridden(key)
            const inherited = isInherited(key) || (isInherited('padding') && !slotConfig[key])
            // Select value: override wins; else show "" (displayed as inherited)
            const rawOverride = config.grid[gridKey]?.slots?.[selectedSlot]?.[key]
            const selectValue = isBaseBp ? (baseSlot[key] ?? '') : (rawOverride ?? '')
            return (
              <div key={key} className={`lm-inspector__pad-row${overridden ? ' lm-inspector__pad-row--override' : ''}${inherited ? ' lm-inspector__pad-row--inherited' : ''}`}>
                <span className="lm-inspector__label">
                  {label}
                  {overridden && <span className="lm-bp-dot" data-bp={activeBreakpoint} title={`Overridden at ${activeBreakpoint}`} />}
                  {inherited && <span className="lm-inherit-dot" title={`Inherited from ${baseGridKey}`} />}
                </span>
                <select
                  className="lm-spacing-select lm-spacing-select--inline"
                  value={selectValue}
                  onChange={(e) => {
                    const v = e.target.value
                    writeField(key, v === '' ? undefined : v)
                  }}
                >
                  <option value="">
                    {isBaseBp
                      ? (baseSlot.padding && baseSlot[key] === undefined ? `inherit (${baseSlot.padding})` : 'none')
                      : (baseSlot[key] ?? baseSlot.padding ? `inherit (${baseSlot[key] ?? baseSlot.padding})` : 'none')}
                  </option>
                  <option value="0">0</option>
                  {Object.keys(tokens.all)
                    .filter((t) => t.startsWith('--spacing-'))
                    .map((t) => (
                      <option key={t} value={t}>
                        {t.replace('--spacing-', '')} ({tokens.all[t]})
                      </option>
                    ))}
                </select>
                {effective && effective !== '0' && (
                  <span className="lm-inspector__value-sub-inline">
                    {resolveToken(effective, tokens)}
                  </span>
                )}
                {overridden && (
                  <button className="lm-reset-btn" onClick={() => resetField(key)} title="Reset to inherited">↺</button>
                )}
              </div>
            )
          })}

          <ColumnWidthControl
            selectedSlot={selectedSlot}
            gridKey={gridKey}
            columnWidth={columnWidth}
            isFullWidth={isFullWidth}
            widthDraft={widthDraft}
            setWidthDraft={setWidthDraft}
            onUpdateColumnWidth={onUpdateColumnWidth}
          />
        </div>
        )}

        {/* Property rows — leaf only */}
        {!isContainer && rows.map((row) => (
          <div key={row.property} className="lm-inspector__section">
            <div className="lm-inspector__row">
              <span className="lm-inspector__label">{row.label}</span>
              <span className="lm-inspector__value">
                {row.token ?? row.value}
                <CopyButton
                  text={formatLine(row.property, row.token, row.resolvedPx ?? row.value)}
                  onCopied={handleCopied}
                />
              </span>
            </div>
            {row.resolvedPx && (
              <div className="lm-inspector__value-sub">({row.resolvedPx})</div>
            )}
          </div>
        ))}

        {/* Slot Parameters — inner container controls (leaf only) */}
        {!isContainer && (
        <div className="lm-inspector__section lm-inspector__section--inner">
          <div className="lm-inspector__section-title">
            <span className="lm-inspector__section-glyph">▤</span> Slot Parameters
            {!isBaseBp && <span className="lm-bp-badge" data-bp={activeBreakpoint}>{activeBreakpoint}</span>}
          </div>

          {/* Inner max-width */}
          <div className="lm-inspector__row">
            <span className="lm-inspector__label">
              Inner max-width
              {isOverridden('max-width') && <span className="lm-bp-dot" data-bp={activeBreakpoint} title={`Overridden at ${activeBreakpoint}`} />}
              {isInherited('max-width') && <span className="lm-inherit-dot" title={`Inherited from ${baseGridKey}`} />}
            </span>
            <span className="lm-inspector__value">
              {innerMaxWidth ?? 'none'}
              {isOverridden('max-width') && (
                <button className="lm-reset-btn" onClick={() => { resetField('max-width'); setMaxWidthDraft('') }} title="Reset to inherited">↺</button>
              )}
            </span>
          </div>
          <div className="lm-width-control">
            <div className="lm-align-group">
              <button
                className={`lm-align-btn${!hasInnerMaxWidth ? ' lm-align-btn--active' : ''}`}
                onClick={() => {
                  writeField('max-width', undefined)
                  setMaxWidthDraft('')
                }}
              >
                None
              </button>
              <button
                className={`lm-align-btn${hasInnerMaxWidth ? ' lm-align-btn--active' : ''}`}
                onClick={() => {
                  const px = maxWidthDraft || '360'
                  writeField('max-width', `${px}px`)
                  setMaxWidthDraft(px)
                }}
              >
                Fixed
              </button>
            </div>
            {hasInnerMaxWidth && (
              <div className="lm-width-input">
                <input
                  className="lm-width-input__field"
                  type="number"
                  min={100}
                  max={2000}
                  step={10}
                  value={maxWidthDraft}
                  onChange={(e) => setMaxWidthDraft(e.target.value)}
                  onBlur={() => {
                    const n = parseInt(maxWidthDraft, 10)
                    if (!isNaN(n) && n >= 100) {
                      writeField('max-width', `${n}px`)
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const n = parseInt(maxWidthDraft, 10)
                      if (!isNaN(n) && n >= 100) {
                        writeField('max-width', `${n}px`)
                      }
                    }
                  }}
                />
                <span className="lm-width-input__unit">px</span>
              </div>
            )}
          </div>

          {/* Content align */}
          <div className="lm-inspector__row" style={{ marginTop: '8px' }}>
            <span className="lm-inspector__label">
              Content align
              {isOverridden('align') && <span className="lm-bp-dot" data-bp={activeBreakpoint} title={`Overridden at ${activeBreakpoint}`} />}
              {isInherited('align') && <span className="lm-inherit-dot" title={`Inherited from ${baseGridKey}`} />}
            </span>
            {isOverridden('align') && (
              <button className="lm-reset-btn" onClick={() => resetField('align')} title="Reset to inherited">↺</button>
            )}
          </div>
          <div className="lm-align-group">
            {ALIGN_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`lm-align-btn${(slotConfig.align ?? 'flex-start') === opt.value ? ' lm-align-btn--active' : ''}`}
                title={opt.label}
                onClick={() => writeField('align', opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Background — inherits from layout when unset */}
          <div className="lm-inspector__row" style={{ marginTop: '8px' }}>
            <span className="lm-inspector__label">Background</span>
          </div>
          <BackgroundPicker
            value={baseSlot.background}
            onChange={(v) => onUpdateSlotConfig(selectedSlot, 'background', v, gridKey)}
            tokens={tokens}
            allowInherit
            inheritLabel={config.background ? `inherit (${config.background.replace('--bg-', '')})` : 'inherit (none)'}
          />

          {/* Convert leaf -> container */}
          <div style={{ marginTop: 'var(--lm-sp-8)' }}>
            <button
              className="lm-btn"
              onClick={() => onUpdateNestedSlots(selectedSlot, [])}
              title="Make this slot hold nested slots instead of blocks"
            >
              Convert to container
            </button>
          </div>
        </div>
        )}

        {/* Usable width (leaf only — derived from padding + column width) */}
        {!isContainer && usableWidth && (
          <div className="lm-inspector__section lm-inspector__derived">
            <div className="lm-inspector__row">
              <span className="lm-inspector__label">Usable width</span>
              <span className="lm-inspector__value">
                {usableWidth}
                {usableWidth !== 'dynamic' && (
                  <CopyButton
                    text={formatLine('usable-width', undefined, usableWidth)}
                    onCopied={handleCopied}
                  />
                )}
              </span>
            </div>
            {usableWidth !== 'dynamic' && (
              <div className="lm-inspector__value-sub">(width − padding × 2)</div>
            )}
          </div>
        )}

        {/* Breakpoint info */}
        <div className="lm-inspector__section lm-inspector__info">
          <div className="lm-inspector__row">
            <span className="lm-inspector__label">Breakpoint</span>
            <span className="lm-inspector__value">{activeBreakpoint} &rarr; {gridKey} ({bpWidth})</span>
          </div>
        </div>

        {/* Sidebar mode — reuse shared control */}
        <SidebarModeControl config={config} activeBreakpoint={activeBreakpoint} onUpdateGridProp={onUpdateGridProp} />

        {/* Test blocks */}
        {blockCount > 0 && (
          <div className="lm-inspector__section lm-inspector__info">
            <div className="lm-inspector__row">
              <span className="lm-inspector__label">Test blocks</span>
              <span className="lm-inspector__value">{blockCount} configured</span>
            </div>
            <div className="lm-inspector__block-list">
              {testBlocks!.map((slug) => (
                <div key={slug} className="lm-inspector__block-row">
                  <span className="lm-inspector__block-slug">{slug}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CSS scoping warnings for this slot's blocks */}
        {selectedSlot && testBlocks && testBlocks.length > 0 && (() => {
          const slotWarnings = blockWarnings.filter((w) => testBlocks.includes(w.slug))
          if (slotWarnings.length === 0) return null
          return (
            <div className="lm-inspector__section lm-inspector__warnings">
              <div className="lm-inspector__warnings-title">CSS Scoping Warnings</div>
              {slotWarnings.map((w) => (
                <div key={w.slug} className="lm-inspector__warning">
                  <div className="lm-inspector__warning-slug">{w.slug}: {w.selectors.length} unscoped</div>
                  <div className="lm-inspector__warning-selectors">
                    {w.selectors.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          )
        })()}

        <SlotReference onCopied={handleCopied} />
        {tokens.categories && (
          <TokenReference categories={tokens.categories} onCopied={handleCopied} />
        )}
      </div>
    </div>
  )
}
