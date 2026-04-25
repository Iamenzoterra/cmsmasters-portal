/**
 * InspectorCluster — collapsible disclosure primitive for Inspector IA.
 *
 * Wraps related field blocks under a sticky cluster title with native
 * <details>/<summary> collapse. Identity cluster is special-cased: it
 * renders without disclosure (always-on slot identity row).
 *
 * Phase 4 will provide a `scopeBadge` slot for per-BP override visibility.
 * Phase 3 ships without persistence — collapse state is per-page-load.
 */

import type { ReactNode } from 'react'

export interface InspectorClusterProps {
  /** Cluster identifier — drives `data-cluster-id` and dispatcher gating. */
  id: string
  /** Display title rendered in the cluster header. */
  title: string
  /** Default open state for `<details>` (ignored for cluster-identity). */
  defaultOpen?: boolean
  /** Optional right-aligned slot for scope badges (Phase 4 hook). */
  scopeBadge?: ReactNode
  children: ReactNode
}

export function InspectorCluster({
  id,
  title,
  defaultOpen = false,
  scopeBadge,
  children,
}: InspectorClusterProps) {
  if (id === 'cluster-identity') {
    return (
      <div
        className="lm-inspector__cluster lm-inspector__cluster--identity"
        data-cluster-id={id}
      >
        {children}
      </div>
    )
  }

  return (
    <details
      className="lm-inspector__cluster"
      data-cluster-id={id}
      open={defaultOpen}
    >
      <summary className="lm-inspector__cluster-title">
        <span className="lm-inspector__cluster-label">{title}</span>
        {scopeBadge != null && (
          <span className="lm-inspector__cluster-scope">{scopeBadge}</span>
        )}
      </summary>
      <div className="lm-inspector__cluster-body">{children}</div>
    </details>
  )
}
