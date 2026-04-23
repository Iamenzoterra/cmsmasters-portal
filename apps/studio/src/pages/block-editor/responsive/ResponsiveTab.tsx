// WP-027 Phase 3 — Responsive tab with inline useResponsiveAnalysis hook.
//
// Receives block prop from block-editor.tsx (existingBlock) per Brain ruling 7 (Phase 2).
// Phase 3 adds engine wiring:
//   - useResponsiveAnalysis runs analyzeBlock + generateSuggestions on BASE block (no variants)
//   - SuggestionList renders below ResponsivePreview with rows / warnings / empty / error states
//
// Hook is INLINE per Brain ruling 1 — no manifest delta. Extract when a second consumer appears.

import { useMemo } from 'react'
import {
  analyzeBlock,
  generateSuggestions,
  type Suggestion,
} from '@cmsmasters/block-forge-core'
import type { Block } from '@cmsmasters/db'
import { ResponsivePreview } from './ResponsivePreview'
import { SuggestionList } from './SuggestionList'

interface ResponsiveTabProps {
  block: Block | null
}

interface AnalysisResult {
  suggestions: Suggestion[]
  warnings: string[] // engine's BlockAnalysis.warnings is string[] (verified types.ts:22)
  error: Error | null
}

/**
 * Analyzes the BASE block (ignoring variants per Brain ruling 2) and returns
 * suggestions + warnings + any thrown error. Memoized on stable primitives.
 */
function useResponsiveAnalysis(block: Block | null): AnalysisResult {
  return useMemo(() => {
    if (!block) return { suggestions: [], warnings: [], error: null }
    try {
      // analyzeBlock takes only { html, css } per AnalyzeBlockInput — engine doesn't read slug.
      const analysis = analyzeBlock({
        html: block.html ?? '',
        css: block.css ?? '',
      })
      const suggestions = generateSuggestions(analysis)
      return {
        suggestions,
        warnings: analysis.warnings ?? [],
        error: null,
      }
    } catch (err) {
      return {
        suggestions: [],
        warnings: [],
        error: err instanceof Error ? err : new Error(String(err)),
      }
    }
    // Deliberately NOT keyed on block.variants — Brain ruling 2 (analyze base only)
  }, [block?.id, block?.html, block?.css])
}

export function ResponsiveTab({ block }: ResponsiveTabProps) {
  const { suggestions, warnings, error } = useResponsiveAnalysis(block)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        overflow: 'hidden',
      }}
    >
      <ResponsivePreview block={block} />
      <SuggestionList suggestions={suggestions} warnings={warnings} error={error} />
      {/* Phase 4: Accept/Reject handlers + session-state wiring */}
    </div>
  )
}
