// WP-033 Phase 4 — Studio mirror of tools/block-forge/src/components/BreadcrumbNav.tsx
// (byte-identical body mod 3-line JSDoc header per Phase 4 Ruling 1 mirror discipline).
//
// Pure presentational. Renders the 3-state header line that shows what is
// currently being inspected: pinned > hover > empty hint.
//
// Phase 1 emitted ONLY the leaf selector (no ancestor chain). Phase 2 keeps
// that contract — this component is a 1:1 extract with the same visual shape
// the existing snapshot already captured. A future phase may extend the
// pinned-state branch with an ancestor chain (preview-assets.ts would need to
// emit `ancestors[]` in the pin payload). For now, the structural extract
// gives Phase 3+ a stable seam to grow into.
//
// Styling rules (carried from InspectorPanel verbatim — DS tokens only):
//   pinned  → text-primary + green dot (status-success-fg)
//   hover   → text-muted   + blue dot  (text-link)
//   empty   → text-muted   + hint copy

import type { HoverState, PinState } from './Inspector'

export interface BreadcrumbNavProps {
  hovered: HoverState | null
  pinned: PinState | null
  'data-testid'?: string
}

export function BreadcrumbNav({ hovered, pinned, ...rest }: BreadcrumbNavProps) {
  const testId = rest['data-testid'] ?? 'inspector-breadcrumb'

  return (
    <div
      data-testid={testId}
      className="min-h-[1.5rem] font-mono text-[length:var(--text-xs-font-size)] text-[hsl(var(--text-secondary))]"
    >
      {pinned ? (
        <span
          className="block truncate text-[hsl(var(--text-primary))]"
          title={pinned.selector}
        >
          <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[hsl(var(--status-success-fg))]" />
          {pinned.selector}
        </span>
      ) : hovered ? (
        <span
          className="block truncate text-[hsl(var(--text-muted))]"
          title={hovered.selector}
        >
          <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[hsl(var(--text-link))]" />
          {hovered.selector}
        </span>
      ) : (
        <span className="text-[hsl(var(--text-muted))]">
          Hover an element to inspect, click to pin.
        </span>
      )}
    </div>
  )
}
