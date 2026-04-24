import type { CanvasBreakpointId, BreakpointGrid } from './types'
import { CANVAS_BREAKPOINTS, resolveGridKey } from './types'

export interface BreakpointTruth {
  /** The canonical canvas BP the operator selected (desktop/tablet/mobile). */
  canonicalId: CanvasBreakpointId
  /** The canonical BP's width from CANVAS_BREAKPOINTS (1440/768/375). */
  canonicalWidth: number
  /** The grid key resolveGridKey picked (may equal canonicalId or an alias). */
  resolvedKey: string
  /** The resolved grid's min-width, parsed to number. */
  resolvedMinWidth: number
  /** True if `grid[canonicalId]` exists as an exact key. */
  hasCanonicalGridKey: boolean
  /** True if resolved exists but its min-width differs from canonical width. */
  isNonCanonicalMatch: boolean
  /** True when resolveGridKey fell back to nearest-match (no exact). */
  isFallbackResolved: boolean
  /** True when the next canonicalizing edit would materialize `grid[canonicalId]`. */
  willMaterializeCanonicalKey: boolean
  /** The grid key ensureGridEntry would clone from (matches resolvedKey when materializing). */
  materializationSourceKey: string
}

/**
 * Pure, render-safe narrator of the active-BP → grid-key relationship.
 * Wraps `resolveGridKey` verbatim; does not fork its strategy.
 *
 * Used by `BreakpointBar` and `Inspector` to disclose three truths that
 * used to collapse into one label: which canonical BP is active, which
 * grid key resolved, and which key the next edit will materialize.
 */
export function deriveBreakpointTruth(
  canonicalId: CanvasBreakpointId,
  grid: Record<string, BreakpointGrid>,
): BreakpointTruth {
  const canonicalWidth = CANVAS_BREAKPOINTS.find((b) => b.id === canonicalId)!.width
  const resolvedKey = resolveGridKey(canonicalId, grid)
  const resolvedGrid = grid[resolvedKey]
  const resolvedMinWidth = resolvedGrid ? parseInt(resolvedGrid['min-width'], 10) || 0 : 0

  const hasCanonicalGridKey = !!grid[canonicalId]
  const isFallbackResolved = !hasCanonicalGridKey && resolvedKey !== canonicalId
  const isNonCanonicalMatch = hasCanonicalGridKey
    ? resolvedMinWidth !== canonicalWidth
    : isFallbackResolved && resolvedMinWidth !== canonicalWidth

  const willMaterializeCanonicalKey = !hasCanonicalGridKey
  const materializationSourceKey = resolvedKey

  return {
    canonicalId,
    canonicalWidth,
    resolvedKey,
    resolvedMinWidth,
    hasCanonicalGridKey,
    isNonCanonicalMatch,
    isFallbackResolved,
    willMaterializeCanonicalKey,
    materializationSourceKey,
  }
}
