import { useState, useRef, useEffect } from 'react'
import type { LayoutConfig, TokenMap, ScopingWarning, PerBpSlotField, CanvasBreakpointId, SlotConfig } from '../lib/types'
import { resolveSlotConfig, getBaseGridKey, isFieldOverridden } from '../lib/types'
import { deriveBreakpointTruth } from '../lib/breakpoint-truth'
import { resolveToken, resolveTokenPx, hslTripletToHex } from '../lib/tokens'
import {
  canShow,
  getFieldScope,
  getSlotBadges,
  getSlotTraits,
  type ScopeCtx,
} from '../lib/inspector-capabilities'
import { CopyButton } from './CopyButton'
import { SlotToggles } from './SlotToggles'
import { InspectorUtilityZone } from './InspectorUtilityZone'
import { InspectorCluster } from './InspectorCluster'
import { CreateSlotModal } from './CreateSlotModal'
import { DRAWER_ICONS } from '../../../../packages/ui/src/portal/drawer-icons'
export { DrawerSettingsControl } from './ResponsivePreviewControls'
// GLOBAL_SLOT_NAMES_SET removed — `traits.isGlobalSlot` from
// inspector-capabilities.ts is now the single source of truth, and the
// `canShow('allowed-block-types', ...)` dispatch internalizes the check.

function BreakpointFooter({ config, activeBreakpoint }: {
  config: LayoutConfig
  activeBreakpoint: string
}) {
  const truth = deriveBreakpointTruth(activeBreakpoint as CanvasBreakpointId, config.grid)
  const writesTo = truth.willMaterializeCanonicalKey
    ? `will create grid.${truth.canonicalId} from ${truth.materializationSourceKey}`
    : truth.resolvedKey === truth.canonicalId
      ? 'Base / canonical override'
      : `Override: ${truth.resolvedKey}`

  return (
    <div className="lm-inspector__bp-footer">
      <div className="lm-inspector__bp-row">
        <span className="lm-inspector__label">Breakpoint</span>
        <span>
          <strong>{truth.canonicalId}</strong>
          <span className="lm-inspector__muted"> &rarr; {truth.resolvedKey} ({truth.resolvedMinWidth}px)</span>
        </span>
        {truth.isNonCanonicalMatch && (
          <span className="lm-bp-badge lm-bp-badge--warn" title="Resolved width differs from canonical">
            Non-canonical
          </span>
        )}
        {truth.isFallbackResolved && !truth.isNonCanonicalMatch && (
          <span className="lm-bp-badge lm-bp-badge--info" title="Nearest-match resolution">
            Recovered
          </span>
        )}
      </div>
      <div className="lm-inspector__bp-row">
        <span className="lm-inspector__label">Edit writes to</span>
        <span className="lm-inspector__muted">{writesTo}</span>
      </div>
    </div>
  )
}

const BLOCK_TYPE_OPTIONS = [
  { id: 'theme-block', label: 'Theme blocks' },
  { id: 'element', label: 'Elements' },
] as const

interface Props {
  selectedSlot: string | null
  config: LayoutConfig | null
  activeBreakpoint: string
  gridKey: string
  tokens: TokenMap | null
  onShowToast: (message: string) => void
  blockWarnings: ScopingWarning[]
  onToggleSlot: (slotName: string, enabled: boolean) => void
  onUpdateSlotConfig: (slotName: string, key: string, value: string | number | undefined, targetGridKey?: string, breakpointId?: CanvasBreakpointId) => void
  onBatchUpdateSlotConfig: (slotNames: string[], key: string, value: string | number | undefined, breakpointId?: CanvasBreakpointId) => void
  onUpdateSlotRole: (slotName: string, updates: Record<string, unknown>) => void
  onUpdateColumnWidth: (slotName: string, breakpointKey: string, width: string) => void
  onUpdateGridProp: (breakpointKey: string, key: string, value: string | undefined) => void
  onUpdateLayoutProp: (key: string, value: string | undefined) => void
  onUpdateNestedSlots: (parentName: string, children: string[] | null) => void
  onCreateNestedSlot: (parentName: string, childName: string, defaults: SlotConfig) => void
  onCreateTopLevelSlot: (name: string, defaults: SlotConfig, position?: 'top' | 'bottom') => void
  onSelectSlot: (name: string | null) => void
}

/** List of --bg-* tokens from tokens map, with label + preview color. */
function getBgTokens(tokens: TokenMap): Array<{ name: string; hsl: string }> {
  return Object.keys(tokens.all)
    .filter((t) => t.startsWith('--bg-'))
    .map((name) => ({ name, hsl: `hsl(${tokens.all[name]})` }))
}

/** List of --border-* tokens (excluding bare --border) */
function getBorderTokens(tokens: TokenMap): Array<{ name: string; hsl: string }> {
  return Object.keys(tokens.all)
    .filter((t) => t.startsWith('--border-'))
    .map((name) => ({ name, hsl: `hsl(${tokens.all[name]})` }))
}

/** Brand / accent color tokens suitable for filling a drawer trigger button.
 *  Filters to --brand-* primitives and skips neutral greys (triplet matches
 *  "0 0% X%") which would look muddy on the trigger. */
function getBrandColorTokens(tokens: TokenMap): Array<{ name: string; hsl: string }> {
  return Object.keys(tokens.all)
    .filter((t) => t.startsWith('--brand-'))
    .filter((t) => {
      const v = tokens.all[t]
      // Drop pure whites/blacks/greys — not usable as a trigger background.
      return !/^0 0%/.test(v) && !/0 0% (0|100|95|87|62|46|33|23|9|5)%/.test(v)
    })
    .map((name) => ({ name, hsl: `hsl(${tokens.all[name]})` }))
}

/** Shared custom dropdown with color swatches. */
function ColorTokenSelect({ options, value, onChange, placeholder }: {
  options: Array<{ value: string; label: string; hex: string }>
  value: string | undefined
  onChange: (v: string | undefined) => void
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const selected = options.find((o) => o.value === value)

  return (
    <div className="lm-color-select" ref={ref}>
      <button
        type="button"
        className="lm-color-select__trigger"
        onClick={() => setOpen(!open)}
      >
        {selected ? (
          <>
            <span className="lm-color-select__swatch" style={{ background: selected.hex }} />
            <span className="lm-color-select__label">{selected.label}</span>
            <span className="lm-color-select__hex">{selected.hex}</span>
          </>
        ) : (
          <span className="lm-color-select__label">{placeholder}</span>
        )}
        <span className="lm-color-select__chevron">▾</span>
      </button>
      {open && (
        <div className="lm-color-select__menu">
          <button
            type="button"
            className={`lm-color-select__option ${!value ? 'lm-color-select__option--active' : ''}`}
            onClick={() => { onChange(undefined); setOpen(false) }}
          >
            <span className="lm-color-select__swatch lm-color-select__swatch--none" />
            <span className="lm-color-select__label">{placeholder}</span>
          </button>
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              className={`lm-color-select__option ${value === o.value ? 'lm-color-select__option--active' : ''}`}
              onClick={() => { onChange(o.value); setOpen(false) }}
            >
              <span className="lm-color-select__swatch" style={{ background: o.hex }} />
              <span className="lm-color-select__label">{o.label}</span>
              <span className="lm-color-select__hex">{o.hex}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function BackgroundPicker({ value, onChange, tokens, allowInherit, inheritLabel }: {
  value: string | undefined
  onChange: (v: string | undefined) => void
  tokens: TokenMap
  allowInherit: boolean
  inheritLabel?: string
}) {
  const bgTokens = getBgTokens(tokens)
  const options = bgTokens.map((t) => ({
    value: t.name,
    label: t.name.replace('--bg-', ''),
    hex: hslTripletToHex(tokens.all[t.name]) ?? `hsl(${tokens.all[t.name]})`,
  }))
  return (
    <ColorTokenSelect
      options={options}
      value={value}
      onChange={onChange}
      placeholder={allowInherit ? (inheritLabel ?? 'inherit') : 'none'}
    />
  )
}

function BorderColorPicker({ value, onChange, tokens }: {
  value: string | undefined
  onChange: (v: string | undefined) => void
  tokens: TokenMap
}) {
  const borderTokens = getBorderTokens(tokens)
  const options = borderTokens.map((t) => ({
    value: t.name,
    label: t.name.replace('--border-', ''),
    hex: hslTripletToHex(tokens.all[t.name]) ?? `hsl(${tokens.all[t.name]})`,
  }))
  return (
    <ColorTokenSelect
      options={options}
      value={value}
      onChange={onChange}
      placeholder="none"
    />
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

/** Self-contained "+ Slot" button with its own modal state (avoids hooks-order issues with early returns). */
function AddSlotButton({ config, tokens, onCreateTopLevelSlot }: {
  config: LayoutConfig
  tokens: TokenMap
  onCreateTopLevelSlot: Props['onCreateTopLevelSlot']
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        className="lm-btn"
        title="Add a new slot to the layout"
        onClick={() => setOpen(true)}
        style={{ flex: 'none', marginTop: 'var(--lm-sp-6)', marginRight: 'var(--lm-sp-4)', padding: 'var(--lm-sp-1) var(--lm-sp-4)', fontSize: '11px', whiteSpace: 'nowrap' }}
      >
        + Slot
      </button>
      <CreateSlotModal
        isOpen={open}
        parentContainer=""
        existingSlotNames={Object.keys(config.slots)}
        tokens={tokens}
        topLevel
        onClose={() => setOpen(false)}
        onCreate={(name, defaults, position) => {
          onCreateTopLevelSlot(name, defaults, position)
          setOpen(false)
        }}
      />
    </>
  )
}

export function Inspector({ selectedSlot, config, activeBreakpoint, gridKey, tokens, onShowToast, blockWarnings, onToggleSlot, onUpdateSlotConfig, onBatchUpdateSlotConfig, onUpdateSlotRole, onUpdateColumnWidth, onUpdateGridProp, onUpdateLayoutProp, onUpdateNestedSlots, onCreateNestedSlot, onCreateTopLevelSlot, onSelectSlot }: Props) {
  // All hooks declared unconditionally at the top so the hook count stays
  // stable across selectedSlot=null → selectedSlot=string transitions. Moving
  // these below the `!config || !tokens` / `!selectedSlot` early returns
  // (as they used to sit) made Inspector call 0 hooks on the empty branches
  // and 6 hooks on the slot-selected branch — React 19 logs that exact
  // invariant break as "Expected static flag was missing" on the transition.
  // Null-safe computation keeps initial draft = '' in the empty states.
  const safeColumnWidth = (config && selectedSlot) ? config.grid[gridKey]?.columns?.[selectedSlot] : undefined
  const [widthDraft, setWidthDraft] = useState(
    safeColumnWidth?.endsWith('px') ? parseInt(safeColumnWidth, 10).toString() : '',
  )
  // Resync width draft on context change (slot switch / BP switch / SSE reload).
  // Per LM-reforge Phase 1 draft-handling rule: dirty draft discards on any
  // of these drivers; no merge UX. Mirrors DrawerSettingsControl's pattern.
  useEffect(() => {
    setWidthDraft(safeColumnWidth?.endsWith('px') ? parseInt(safeColumnWidth, 10).toString() : '')
  }, [selectedSlot, gridKey, safeColumnWidth])

  const safeInnerMaxWidth = (config && selectedSlot)
    ? resolveSlotConfig(selectedSlot, gridKey, config)['max-width']
    : undefined
  const [maxWidthDraft, setMaxWidthDraft] = useState(
    safeInnerMaxWidth ? parseInt(safeInnerMaxWidth, 10).toString() : '',
  )
  useEffect(() => {
    setMaxWidthDraft(safeInnerMaxWidth ? parseInt(safeInnerMaxWidth, 10).toString() : '')
  }, [selectedSlot, gridKey, safeInnerMaxWidth])

  const [pendingContainerSlot, setPendingContainerSlot] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

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
        <div className="lm-slot-toggles-row">
          <SlotToggles config={config} activeBreakpoint={gridKey} onToggleSlot={onToggleSlot} />
          <AddSlotButton config={config} tokens={tokens} onCreateTopLevelSlot={onCreateTopLevelSlot} />
        </div>
        <div className="lm-inspector__body">
          <InspectorCluster id="cluster-layout-defaults" title="Layout defaults" defaultOpen>
            <div className="lm-inspector__section">
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
          </InspectorCluster>
          <div className="lm-inspector__empty">
            Click a slot in the canvas to inspect its properties.
          </div>
          <InspectorCluster id="cluster-references" title="References">
            <InspectorUtilityZone tokens={tokens} onCopied={() => onShowToast('Copied!')} />
          </InspectorCluster>
        </div>
        <BreakpointFooter config={config} activeBreakpoint={activeBreakpoint} />
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
  const writeField = (key: string, value: string | number | undefined) =>
    onUpdateSlotConfig(selectedSlot, key, value, gridKey, activeBreakpoint as CanvasBreakpointId)
  // Reset: explicitly clear per-bp override (always targets current gridKey)
  const resetField = (key: string) =>
    onUpdateSlotConfig(selectedSlot, key, undefined, gridKey, activeBreakpoint as CanvasBreakpointId)

  // Inner max-width — `hasInnerMaxWidth` is the only derived helper still
  // used by JSX (widthDraft/maxWidthDraft hooks are declared at the top).
  const innerMaxWidth = slotConfig['max-width']
  const hasInnerMaxWidth = !!innerMaxWidth

  const rows = buildPropertyRows(slotConfig as unknown as Record<string, unknown>, tokens)
  const usableWidth = computeUsableWidth(columnWidth, isFullWidth, slotConfig as unknown as Record<string, unknown>, tokens)

  // Test blocks
  const testBlocks = config['test-blocks']?.[selectedSlot]
  const blockCount = testBlocks?.length ?? 0

  // Container/leaf: persisted when base config has a non-empty nested-slots array
  // (validator rejects empty []; see runtime validate). A "pending" local container
  // state lets the UI show the container panel before the first child is added —
  // never persisted until an add/create produces a non-empty array.
  // `pendingContainerSlot` state is declared at the top of Inspector (hooks-at-top rule).
  const nestedChildren = (baseSlot['nested-slots'] as string[] | undefined) ?? null
  const hasPersistedNested = Array.isArray(nestedChildren) && nestedChildren.length > 0
  const isPendingContainer = pendingContainerSlot === selectedSlot && !hasPersistedNested
  const isContainer = hasPersistedNested || isPendingContainer
  const effectiveChildren: string[] = hasPersistedNested ? nestedChildren! : []

  // Capability dispatcher — every gate below now routes through this one
  // source of truth. A "pending container" (user clicked Convert but hasn't
  // added a child yet) must show the container panel, so we override the
  // trait vector in that edge case — validator still rejects persisting an
  // empty `nested-slots` array.
  const traits = {
    ...getSlotTraits(selectedSlot, baseSlot, config, activeBreakpoint as CanvasBreakpointId),
    isContainer,
    isLeaf: !isContainer,
    supportsPerBreakpoint: !isContainer,
    supportsRoleLevelOnly: isContainer,
  }
  const scope: ScopeCtx = {
    currentBp: activeBreakpoint as CanvasBreakpointId,
    hasOverride: false,
    isGridField: false,
  }
  // Any per-BP field overridden on this slot at the current BP?
  // Controls scope-chip label: "N override" if yes, "Base" + inherited-label if no.
  const PER_BP_FIELDS_LOCAL: readonly PerBpSlotField[] = [
    'padding', 'padding-x', 'padding-top', 'padding-bottom',
    'gap', 'align', 'max-width', 'min-height', 'margin-top',
    'border-sides', 'border-width', 'border-color', 'visibility', 'order',
  ] as const
  const hasAnyPerBpOverride = !isBaseBp
    && PER_BP_FIELDS_LOCAL.some((f) => isFieldOverridden(selectedSlot, gridKey, config, f))
  const fieldScopeLabel = getFieldScope(
    'padding', traits, activeBreakpoint as CanvasBreakpointId,
    { hasOverrideAtBp: hasAnyPerBpOverride },
  )
  const bpScopeLabel: string =
    fieldScopeLabel === 'tablet-override' ? 'Tablet override'
    : fieldScopeLabel === 'mobile-override' ? 'Mobile override'
    : 'Base'
  const bpScopeClass: string =
    fieldScopeLabel === 'tablet-override' ? 'lm-scope-chip--tablet-override'
    : fieldScopeLabel === 'mobile-override' ? 'lm-scope-chip--mobile-override'
    : 'lm-scope-chip--base'

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

  // `showCreateModal` state is declared at the top of Inspector (hooks-at-top rule).

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
      <div className="lm-slot-toggles-row">
        <SlotToggles config={config} activeBreakpoint={gridKey} onToggleSlot={onToggleSlot} />
        <AddSlotButton config={config} tokens={tokens} onCreateTopLevelSlot={onCreateTopLevelSlot} />
      </div>
      <div className="lm-inspector__body">
        {/* Identity cluster — slot name + badges + copy */}
        <InspectorCluster id="cluster-identity" title="">
          <div className={`lm-inspector__section${isContainer ? ' lm-inspector__panel--container' : ''}`}>
            <div className="lm-inspector__slot-name">
              {selectedSlot}
              <span className="lm-inspector__slot-badges">
                {getSlotBadges(traits, baseSlot.position).map((badge) => (
                  <span key={badge} className={`lm-badge lm-badge--${badge}`}>{badge}</span>
                ))}
              </span>
              <CopyButton text={formatSummary()} onCopied={handleCopied} />
            </div>
          </div>
        </InspectorCluster>

        {/* Role cluster — position, sticky, z-index, allowed-block-types, drawer-trigger */}
        <InspectorCluster id="cluster-role" title="Slot Role" defaultOpen>
          <div className="lm-inspector__section lm-inspector__section--role">

          <div className="lm-inspector__row">
            <span className="lm-inspector__label">Position</span>
            <select
              className="lm-spacing-select lm-spacing-select--inline"
              value={baseSlot.position ?? ''}
              onChange={(e) => {
                const v = e.target.value as 'top' | 'bottom' | ''
                const updates: Record<string, unknown> = { position: v || undefined }
                // Clear sticky + z-index when leaving 'top'
                if (v !== 'top') {
                  updates.sticky = undefined
                  updates['z-index'] = undefined
                }
                onUpdateSlotRole(selectedSlot, updates)
              }}
            >
              <option value="">(grid)</option>
              <option value="top">top</option>
              <option value="bottom">bottom</option>
            </select>
          </div>

          {canShow('sticky', traits, scope) && (
            <div className="lm-inspector__row">
              <span className="lm-inspector__label">Sticky</span>
              <input
                type="checkbox"
                className="lm-inspector__checkbox"
                checked={!!baseSlot.sticky}
                onChange={(e) => {
                  const updates: Record<string, unknown> = {
                    sticky: e.target.checked || undefined,
                  }
                  if (!e.target.checked) updates['z-index'] = undefined
                  onUpdateSlotRole(selectedSlot, updates)
                }}
              />
            </div>
          )}

          {canShow('z-index', traits, scope) && (
            <div className="lm-inspector__row">
              <span className="lm-inspector__label">Z-index</span>
              <input
                type="number"
                className="lm-width-input__field"
                style={{ width: '64px' }}
                value={baseSlot['z-index'] ?? ''}
                placeholder="100"
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10)
                  onUpdateSlotRole(selectedSlot, { 'z-index': isNaN(n) ? undefined : n })
                }}
              />
            </div>
          )}

          {/* Allowed block types — custom leaf slots only */}
          {canShow('allowed-block-types', traits, scope) && (() => {
            const currentTypes = (baseSlot['allowed-block-types'] as string[] | undefined) ?? []
            return (
              <div className="lm-inspector__row lm-inspector__row--col">
                <span className="lm-inspector__label">Block types</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--lm-sp-2)' }}>
                  {BLOCK_TYPE_OPTIONS.map(({ id, label }) => (
                    <label key={id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--lm-sp-2)', fontSize: '12px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        className="lm-inspector__checkbox"
                        checked={currentTypes.includes(id)}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...currentTypes, id]
                            : currentTypes.filter(t => t !== id)
                          onUpdateSlotRole(selectedSlot, {
                            'allowed-block-types': next.length > 0 ? next : undefined,
                          })
                        }}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                {currentTypes.length === 0 && (
                  <span className="lm-inspector__hint">No types — slot won't show block controls in Studio</span>
                )}
              </div>
            )
          })()}

          {/* Drawer trigger — label + icon for the button that opens this
              slot as a drawer. Only shown for sidebar slots (others never
              become a drawer). Base/role-level — one label across all BPs. */}
          {canShow('drawer-trigger-label', traits, scope) && (
            <>
              <div className="lm-inspector__row">
                <span className="lm-inspector__label">Trigger label</span>
                <input
                  type="text"
                  className="lm-width-input__field"
                  style={{ flex: 1, minWidth: 0 }}
                  placeholder={selectedSlot.includes('left') ? 'Menu' : 'Details'}
                  value={(baseSlot['drawer-trigger-label'] as string | undefined) ?? ''}
                  onChange={(e) => {
                    const v = e.target.value
                    onUpdateSlotRole(selectedSlot, { 'drawer-trigger-label': v.trim() || undefined })
                  }}
                />
              </div>
              <div className="lm-inspector__row">
                <span className="lm-inspector__label">Trigger icon</span>
                <select
                  className="lm-spacing-select lm-spacing-select--inline"
                  style={{ flex: 1, minWidth: 0 }}
                  value={(baseSlot['drawer-trigger-icon'] as string | undefined) ?? ''}
                  onChange={(e) => {
                    const v = e.target.value
                    onUpdateSlotRole(selectedSlot, { 'drawer-trigger-icon': v || undefined })
                  }}
                >
                  <option value="">chevron (default)</option>
                  {DRAWER_ICONS.map((icon) => (
                    <option key={icon.name} value={icon.name}>{icon.label}</option>
                  ))}
                </select>
              </div>
              <div className="lm-inspector__row lm-inspector__row--col">
                <span className="lm-inspector__label">Trigger color</span>
                {(() => {
                  const brandTokens = getBrandColorTokens(tokens)
                  const options = brandTokens.map((t) => ({
                    value: t.name,
                    label: t.name.replace('--brand-', ''),
                    hex: hslTripletToHex(tokens.all[t.name]) ?? t.hsl,
                  }))
                  return (
                    <ColorTokenSelect
                      options={options}
                      value={baseSlot['drawer-trigger-color']}
                      onChange={(v) => onUpdateSlotRole(selectedSlot, { 'drawer-trigger-color': v })}
                      placeholder={selectedSlot.includes('left') ? 'the-sky (default)' : 'deep-blue (default)'}
                    />
                  )
                })()}
              </div>
            </>
          )}

          {canShow('full-width-note', traits, scope) && (
            <div className="lm-inspector__locked-note">Full width — locked by position</div>
          )}
          </div>
        </InspectorCluster>

        {/* Children cluster — container slots only */}
        {canShow('container-panel', traits, scope) && (
        <InspectorCluster id="cluster-children" title="Child slots" defaultOpen>
          <div className="lm-inspector__section lm-inspector__panel--container">
            {effectiveChildren.length === 0 ? (
              <div className="lm-inspector__empty" style={{ padding: 'var(--lm-sp-4) 0' }}>
                No children yet. Add or create one below.
              </div>
            ) : (
              <div className="lm-chip-list">
                {effectiveChildren.map((childName) => (
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
                        const next = effectiveChildren.filter((n) => n !== childName)
                        // Validator rejects empty arrays — delete the key instead to revert to leaf.
                        onUpdateNestedSlots(selectedSlot, next.length === 0 ? null : next)
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
                  onUpdateNestedSlots(selectedSlot, [...effectiveChildren, pick])
                  setPendingContainerSlot(null)
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
                disabled={effectiveChildren.length > 0}
                title={effectiveChildren.length > 0 ? 'Remove all children first' : 'Convert to leaf'}
                onClick={() => {
                  if (isPendingContainer) {
                    setPendingContainerSlot(null)
                  } else {
                    onUpdateNestedSlots(selectedSlot, null)
                  }
                }}
              >
                Convert to leaf
              </button>
            </div>
          </div>
        </InspectorCluster>
        )}

        <CreateSlotModal
          isOpen={showCreateModal}
          parentContainer={selectedSlot}
          existingSlotNames={Object.keys(config.slots)}
          tokens={tokens}
          onClose={() => setShowCreateModal(false)}
          onCreate={(name, defaults) => {
            onCreateNestedSlot(selectedSlot, name, defaults)
            setPendingContainerSlot(null)
            setShowCreateModal(false)
          }}
        />

        {/* Slot Area cluster — outer (grid column width + padding). Hidden for containers — they have no inner host. */}
        {canShow('cluster-outer', traits, scope) && (
        <InspectorCluster
          id="cluster-outer"
          title="Slot Area"
          defaultOpen
          scopeBadge={!isBaseBp ? (
            <>
              <span className={`lm-scope-chip ${bpScopeClass}`}>{bpScopeLabel}</span>
              {!hasAnyPerBpOverride && (
                <span className="lm-inspector__inherited-label">Inherited from Base</span>
              )}
            </>
          ) : undefined}
        >
          <div className="lm-inspector__section lm-inspector__section--outer" data-slot-type={selectedSlot}>

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

          {/* Border controls */}
          {(() => {
            const BORDER_SIDES = ['top', 'right', 'bottom', 'left'] as const
            const SIDE_LABELS = { top: 'T', right: 'R', bottom: 'B', left: 'L' } as const
            const activeSides = (slotConfig['border-sides'] ?? '').split(',').filter(Boolean)
            const hasSides = activeSides.length > 0

            const toggleSide = (side: string) => {
              const current = new Set(activeSides)
              if (current.has(side)) current.delete(side)
              else current.add(side)
              const ordered = BORDER_SIDES.filter((s) => current.has(s))
              writeField('border-sides', ordered.length === 0 ? undefined : ordered.join(','))
            }

            return (
              <div style={{ marginTop: '8px' }}>
                <div className="lm-inspector__row">
                  <span className="lm-inspector__label">
                    Border sides
                    {isOverridden('border-sides') && <span className="lm-bp-dot" data-bp={activeBreakpoint} title={`Overridden at ${activeBreakpoint}`} />}
                    {isInherited('border-sides') && <span className="lm-inherit-dot" title={`Inherited from ${baseGridKey}`} />}
                  </span>
                  {isOverridden('border-sides') && (
                    <button className="lm-reset-btn" onClick={() => resetField('border-sides')} title="Reset to inherited">↺</button>
                  )}
                </div>
                <div className="lm-align-group">
                  {BORDER_SIDES.map((side) => (
                    <button
                      key={side}
                      className={`lm-align-btn${activeSides.includes(side) ? ' lm-align-btn--active' : ''}`}
                      title={side}
                      onClick={() => toggleSide(side)}
                    >
                      {SIDE_LABELS[side]}
                    </button>
                  ))}
                </div>

                {hasSides && (
                  <>
                    <div className="lm-inspector__row" style={{ marginTop: '8px' }}>
                      <span className="lm-inspector__label">
                        Border width
                        {isOverridden('border-width') && <span className="lm-bp-dot" data-bp={activeBreakpoint} title={`Overridden at ${activeBreakpoint}`} />}
                        {isInherited('border-width') && <span className="lm-inherit-dot" title={`Inherited from ${baseGridKey}`} />}
                      </span>
                      {isOverridden('border-width') && (
                        <button className="lm-reset-btn" onClick={() => resetField('border-width')} title="Reset to inherited">↺</button>
                      )}
                    </div>
                    <select
                      className="lm-spacing-select lm-spacing-select--inline"
                      value={slotConfig['border-width'] ?? '1px'}
                      onChange={(e) => writeField('border-width', e.target.value)}
                    >
                      <option value="1px">1px</option>
                      <option value="2px">2px</option>
                      <option value="3px">3px</option>
                      <option value="4px">4px</option>
                    </select>

                    <div className="lm-inspector__row" style={{ marginTop: '8px' }}>
                      <span className="lm-inspector__label">
                        Border color
                        {isOverridden('border-color') && <span className="lm-bp-dot" data-bp={activeBreakpoint} title={`Overridden at ${activeBreakpoint}`} />}
                        {isInherited('border-color') && <span className="lm-inherit-dot" title={`Inherited from ${baseGridKey}`} />}
                      </span>
                      {isOverridden('border-color') && (
                        <button className="lm-reset-btn" onClick={() => resetField('border-color')} title="Reset to inherited">↺</button>
                      )}
                    </div>
                    <BorderColorPicker
                      value={slotConfig['border-color']}
                      onChange={(v) => writeField('border-color', v)}
                      tokens={tokens}
                    />
                  </>
                )}
              </div>
            )
          })()}

          <ColumnWidthControl
            selectedSlot={selectedSlot}
            gridKey={gridKey}
            columnWidth={columnWidth}
            isFullWidth={isFullWidth}
            widthDraft={widthDraft}
            setWidthDraft={setWidthDraft}
            onUpdateColumnWidth={onUpdateColumnWidth}
          />

          {/* Per-slot visibility — shown on non-desktop BPs */}
          {!isBaseBp && (
            <div className="lm-inspector__row" style={{ marginTop: '12px' }}>
              <span className="lm-inspector__label">
                Visibility
                {isOverridden('visibility') && <span className="lm-bp-dot" data-bp={activeBreakpoint} title={`Overridden at ${activeBreakpoint}`} />}
                {isInherited('visibility') && <span className="lm-inherit-dot" title={`Inherited from ${baseGridKey}`} />}
              </span>
              {isOverridden('visibility') && (
                <button className="lm-reset-btn" onClick={() => resetField('visibility')} title="Reset to inherited">↺</button>
              )}
            </div>
          )}
          {!isBaseBp && (
            <div className="lm-align-group">
              {([
                { value: undefined, label: 'Visible' },
                { value: 'hidden', label: 'Hidden' },
                { value: 'drawer', label: 'Drawer' },
              ] as const).map((opt) => (
                <button
                  key={opt.label}
                  className={`lm-align-btn${(slotConfig.visibility ?? undefined) === opt.value ? ' lm-align-btn--active' : ''}`}
                  onClick={() => writeField('visibility', opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Per-slot display order — shown on non-desktop BPs */}
          {!isBaseBp && (
            <div className="lm-inspector__row" style={{ marginTop: '8px' }}>
              <span className="lm-inspector__label">
                Order
                {isOverridden('order') && <span className="lm-bp-dot" data-bp={activeBreakpoint} title={`Overridden at ${activeBreakpoint}`} />}
                {isInherited('order') && <span className="lm-inherit-dot" title={`Inherited from ${baseGridKey}`} />}
              </span>
              <input
                type="number"
                className="lm-spacing-select lm-spacing-select--inline"
                min={0}
                max={99}
                value={slotConfig.order ?? ''}
                placeholder="auto"
                onChange={(e) => {
                  const v = e.target.value
                  writeField('order', v === '' ? undefined : parseInt(v, 10))
                }}
                style={{ width: '60px' }}
              />
              {isOverridden('order') && (
                <button className="lm-reset-btn" onClick={() => resetField('order')} title="Reset to inherited">↺</button>
              )}
            </div>
          )}
          </div>
        </InspectorCluster>
        )}

        {/* Property rows — leaf only */}
        {canShow('property-rows', traits, scope) && rows.map((row) => (
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

        {/* Slot Parameters cluster — inner container controls (leaf only) */}
        {canShow('cluster-inner', traits, scope) && (
        <InspectorCluster
          id="cluster-inner"
          title="Slot Parameters"
          defaultOpen
          scopeBadge={!isBaseBp ? (
            <>
              <span className={`lm-scope-chip ${bpScopeClass}`}>{bpScopeLabel}</span>
              {!hasAnyPerBpOverride && (
                <span className="lm-inspector__inherited-label">Inherited from Base</span>
              )}
            </>
          ) : undefined}
        >
          <div className="lm-inspector__section lm-inspector__section--inner">

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

          {/* Convert leaf -> container (local pending until first child is added;
              validator rejects persisted empty nested-slots arrays). */}
          <div style={{ marginTop: 'var(--lm-sp-8)' }}>
            <button
              className="lm-btn"
              onClick={() => setPendingContainerSlot(selectedSlot)}
              title="Hold nested slots instead of blocks (add a child to persist)"
            >
              Convert to container
            </button>
          </div>
          </div>
        </InspectorCluster>
        )}

        {/* Diagnostics cluster — usable width + test blocks + CSS warnings (collapsed by default) */}
        {(canShow('usable-width', traits, scope) || blockCount > 0 || (selectedSlot && testBlocks && testBlocks.length > 0)) && (
        <InspectorCluster id="cluster-diagnostics" title="Diagnostics">
          {canShow('usable-width', traits, scope) && usableWidth && (
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
        </InspectorCluster>
        )}

        <InspectorCluster id="cluster-references" title="References">
          <InspectorUtilityZone tokens={tokens} onCopied={handleCopied} />
        </InspectorCluster>
      </div>
      <BreakpointFooter config={config} activeBreakpoint={activeBreakpoint} />
    </div>
  )
}
