import * as React from 'react';

/**
 * VariantsDrawer — tools/block-forge surface. Phase 1 placeholder.
 * Phase 3 wires Drawer open/close + variant list + fork + name validation (kebab-case).
 * Cross-surface parity mirror: apps/studio/src/pages/block-editor/responsive/VariantsDrawer.tsx
 */
export interface VariantsDrawerProps {
  /** Whether drawer is open */
  open: boolean
  /** Called when user closes the drawer (Escape, click-outside, explicit close) */
  onOpenChange: (open: boolean) => void
  'data-testid'?: string
}

export function VariantsDrawer(props: VariantsDrawerProps) {
  return (
    <div
      data-testid={props['data-testid'] ?? 'variants-drawer'}
      data-open={props.open ? 'true' : 'false'}
      aria-label="Variants drawer"
    />
  )
}
