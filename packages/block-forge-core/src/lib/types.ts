import type { BlockVariants } from '@cmsmasters/db'

/** Input to the engine — raw block as stored in DB or file system. */
export interface BlockInput {
  slug: string
  html: string
  css: string
}

/** Output of the engine — adaptive block ready for renderer / persistence. */
export interface BlockOutput {
  slug: string
  html: string
  css: string
  variants?: BlockVariants
}

/** Parsed block state — flat rules list + element tree + parse warnings. */
export interface BlockAnalysis {
  rules: Rule[]
  elements: Element[]
  warnings: string[]
}

/** A single CSS rule with at-rule context (empty array = top-level). */
export interface Rule {
  selector: string
  declarations: Array<{ prop: string; value: string }>
  atRuleChain: string[]
}

/** A single HTML element — shallow view for the heuristics that need it. */
export interface Element {
  tag: string
  classes: string[]
  childCount: number
  parentTag: string | null
}

/** A suggestion from the rule engine — consumer decides accept/tweak/reject. */
export interface Suggestion {
  id: string
  heuristic: Heuristic
  selector: string
  bp: number
  property: string
  value: string
  rationale: string
  confidence: Confidence
}

/** Identifier of one of the six ADR-025 heuristics. */
export type Heuristic =
  | 'grid-cols'
  | 'spacing-clamp'
  | 'font-clamp'
  | 'flex-wrap'
  | 'horizontal-overflow'
  | 'media-maxwidth'

/** Three levels of confidence for suggestions — UI may filter by these. */
export type Confidence = 'high' | 'medium' | 'low'

/** A tweak — a single property-per-breakpoint override, authored explicitly. */
export interface Tweak {
  selector: string
  bp: number
  property: string
  value: string
}

/** A variant — full-rewrite alternative HTML+CSS for a breakpoint. */
export interface Variant {
  name: string
  html: string
  css: string
}

/** Result of renderForPreview — deterministic HTML+CSS string pair. */
export interface PreviewResult {
  html: string
  css: string
}
