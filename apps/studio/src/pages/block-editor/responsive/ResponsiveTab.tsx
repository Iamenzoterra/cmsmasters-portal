// WP-027 Phase 2 — Responsive tab shell.
//
// Receives block prop from block-editor.tsx (existingBlock) per Brain ruling 7.
// Preview reflects DB snapshot; live-form-edit coupling is Phase 4 concern.

import type { Block } from '@cmsmasters/db'
import { ResponsivePreview } from './ResponsivePreview'

interface ResponsiveTabProps {
  block: Block | null
}

export function ResponsiveTab({ block }: ResponsiveTabProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        overflow: 'hidden',
      }}
    >
      {/* Phase 2: preview triptych only */}
      <ResponsivePreview block={block} />
      {/* Phase 3: <SuggestionList /> goes here */}
      {/* Phase 4: <SuggestionRow /> becomes interactive */}
    </div>
  )
}
