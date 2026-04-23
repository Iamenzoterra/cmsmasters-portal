import * as React from 'react';

/**
 * VariantsDrawer — Studio Responsive tab surface. Phase 1 placeholder.
 * Phase 3 writes variants into RHF form state on fork/delete/rename (Brain OQ4 pins).
 * Cross-surface parity mirror: tools/block-forge/src/components/VariantsDrawer.tsx
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
