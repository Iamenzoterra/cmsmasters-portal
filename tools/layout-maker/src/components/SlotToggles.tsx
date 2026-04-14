import { SLOT_DEFINITIONS } from '@cmsmasters/db/slots'
import type { LayoutConfig } from '../lib/types'
import { SLOT_VISUAL } from '../lib/slot-visual'

/**
 * Ordered slot list for the toggles panel.
 * Derived from SLOT_DEFINITIONS (db registry) + "content" (the page body slot,
 * which isn't a global-element slot but is always present in layouts).
 */
const SLOT_DEFS = (() => {
  const names = SLOT_DEFINITIONS.map((s) => s.name)
  const result: Array<{ name: string; color: string; locked: boolean }> = []

  // Display order: header, sidebar-left, content, sidebar-right, …extras…, footer
  if (names.includes('header')) result.push({ name: 'header', ...SLOT_VISUAL['header'] })
  if (names.includes('sidebar-left')) result.push({ name: 'sidebar-left', ...SLOT_VISUAL['sidebar-left'] })
  result.push({ name: 'content', ...SLOT_VISUAL['content'] })
  if (names.includes('sidebar-right')) result.push({ name: 'sidebar-right', ...SLOT_VISUAL['sidebar-right'] })

  // Any future registry slots not covered above
  for (const s of SLOT_DEFINITIONS) {
    if (!result.some((r) => r.name === s.name)) {
      result.push({ name: s.name, ...(SLOT_VISUAL[s.name] ?? SLOT_VISUAL._fallback) })
    }
  }

  if (names.includes('footer')) result.push({ name: 'footer', ...SLOT_VISUAL['footer'] })
  return result
})()

interface Props {
  config: LayoutConfig
  activeBreakpoint: string
  onToggleSlot: (slotName: string, enabled: boolean) => void
}

export function SlotToggles({ config, activeBreakpoint, onToggleSlot }: Props) {
  const grid = config.grid[activeBreakpoint]

  return (
    <div className="lm-slot-toggles">
      <div className="lm-slot-toggles__title">Slots</div>
      {SLOT_DEFS.map(({ name, color, locked }) => {
        const isEnabled = locked || Boolean(grid?.columns[name]) || Boolean(config.slots[name]?.position)

        return (
          <label key={name} className="lm-slot-toggle">
            <input
              type="checkbox"
              className="lm-slot-toggle__input"
              checked={isEnabled}
              disabled={locked}
              onChange={(e) => onToggleSlot(name, e.target.checked)}
            />
            <span className="lm-slot-toggle__track" />
            <span className="lm-slot-toggle__dot" style={{ '--lm-slot-color': color } as React.CSSProperties} />
            <span className="lm-slot-toggle__name">{name}</span>
          </label>
        )
      })}
    </div>
  )
}
