export type {
  BlockInput,
  BlockOutput,
  BlockAnalysis,
  Rule,
  Element,
  Suggestion,
  Heuristic,
  Confidence,
  Tweak,
  Variant,
  PreviewResult,
} from './lib/types'

export { analyzeBlock } from './analyze/analyze-block'

export { generateSuggestions } from './rules'

export { applySuggestions } from './compose/apply-suggestions'
export { emitTweak } from './compose/emit-tweak'
export { composeVariants } from './compose/compose-variants'
export { renderForPreview } from './compose/render-preview'
