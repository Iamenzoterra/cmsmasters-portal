import { useState } from 'react'
import type { LayoutConfig, SlotConfig, TokenMap } from '../lib/types'
import { SlotToggles } from './SlotToggles'
import { CreateSlotModal } from './CreateSlotModal'

interface Props {
  config: LayoutConfig
  gridKey: string
  selectedSlot: string | null
  tokens: TokenMap | null
  onToggleSlot: (slotName: string, enabled: boolean) => void
  onCreateTopLevelSlot: (name: string, defaults: SlotConfig, position?: 'top' | 'bottom') => void
  onSelectSlot: (slotName: string | null) => void
}

export function SlotStructurePanel({
  config,
  gridKey,
  selectedSlot,
  tokens,
  onToggleSlot,
  onCreateTopLevelSlot,
  onSelectSlot,
}: Props) {
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="lm-structure-panel">
      <SlotToggles
        config={config}
        activeBreakpoint={gridKey}
        selectedSlot={selectedSlot}
        onToggleSlot={onToggleSlot}
        onSelectSlot={onSelectSlot}
      />
      <button
        type="button"
        className="lm-btn lm-btn--primary lm-structure-panel__add"
        onClick={() => setCreateOpen(true)}
      >
        Add slot
      </button>
      <CreateSlotModal
        isOpen={createOpen}
        parentContainer=""
        existingSlotNames={Object.keys(config.slots)}
        tokens={tokens}
        topLevel
        onClose={() => setCreateOpen(false)}
        onCreate={(name, defaults, position) => {
          onCreateTopLevelSlot(name, defaults, position)
          setCreateOpen(false)
        }}
      />
    </div>
  )
}
