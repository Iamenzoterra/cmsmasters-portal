import type { BlockAnalysis, Suggestion } from '../lib/types'
import { heuristicGridCols } from './heuristic-grid-cols'
import { heuristicSpacingClamp } from './heuristic-spacing-clamp'
import { heuristicFontClamp } from './heuristic-font-clamp'
import { heuristicFlexWrap } from './heuristic-flex-wrap'
import { heuristicHorizontalOverflow } from './heuristic-horizontal-overflow'
import { heuristicMediaMaxwidth } from './heuristic-media-maxwidth'

export function generateSuggestions(analysis: BlockAnalysis): Suggestion[] {
  return [
    ...heuristicGridCols(analysis),
    ...heuristicSpacingClamp(analysis),
    ...heuristicFontClamp(analysis),
    ...heuristicFlexWrap(analysis),
    ...heuristicHorizontalOverflow(analysis),
    ...heuristicMediaMaxwidth(analysis),
  ]
}
