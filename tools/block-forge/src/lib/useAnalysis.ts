// Phase 3 — hook wrapping core's analyzeBlock + generateSuggestions.
// Pure; no side effects beyond the computation. Re-memoizes on
// (slug, html, css) change. Null-tolerant for picker-not-yet-selected state.
//
// Defensive try/catch despite WP-025's "no throws on malformed" guarantee:
// if core ever regresses, the UI still renders instead of white-screening.

import { useMemo } from 'react'
import {
  analyzeBlock,
  generateSuggestions,
  type Suggestion,
} from '@cmsmasters/block-forge-core'
import type { BlockJson } from '../types'

export type AnalysisResult = {
  suggestions: Suggestion[]
  warnings: string[]
}

const EMPTY: AnalysisResult = { suggestions: [], warnings: [] }

/**
 * Runs analyzeBlock + generateSuggestions for the given block.
 * Re-computes when block.slug / block.html / block.css change.
 * Null input → empty result (picker hasn't selected yet).
 */
export function useAnalysis(block: BlockJson | null): AnalysisResult {
  return useMemo(() => {
    if (!block) return EMPTY
    try {
      // `analyzeBlock` takes only {html, css} per core's AnalyzeBlockInput;
      // `slug` is passed through the JSON load for identity but isn't part of
      // the analysis input surface.
      const analysis = analyzeBlock({
        html: block.html,
        css: block.css,
      })
      const suggestions = generateSuggestions(analysis)
      return { suggestions, warnings: analysis.warnings }
    } catch (err) {
      // Belt-and-suspenders — core is contracted not to throw, but if it ever
      // regresses we surface the crash as a synthesized warning.
      const msg = err instanceof Error ? err.message : String(err)
      return { suggestions: [], warnings: [`analyzer crashed: ${msg}`] }
    }
  }, [block?.slug, block?.html, block?.css])
}
