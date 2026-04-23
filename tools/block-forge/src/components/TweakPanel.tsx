import * as React from 'react';

/**
 * TweakPanel — tools/block-forge surface. Phase 1 placeholder.
 * Phase 2 dispatch MUST read current session state at dispatch time (NOT cached
 * block-from-file). Cross-surface equivalent of Studio's `form.getValues('code')`
 * rule (Brain OQ4) — dispatch source-of-truth is the live session, not DB/file.
 * Cross-surface parity mirror: apps/studio/src/pages/block-editor/responsive/TweakPanel.tsx
 */
export interface TweakPanelProps {
  /** Currently selected element's CSS selector, or null when nothing selected */
  selector: string | null
  /** Active breakpoint (480/640/768/1440/null) */
  bp: number | null
  'data-testid'?: string
}

export function TweakPanel(props: TweakPanelProps) {
  return (
    <div
      data-testid={props['data-testid'] ?? 'tweak-panel'}
      data-selector={props.selector ?? ''}
      data-bp={props.bp ?? ''}
      aria-label="Element tweak panel"
    />
  )
}
