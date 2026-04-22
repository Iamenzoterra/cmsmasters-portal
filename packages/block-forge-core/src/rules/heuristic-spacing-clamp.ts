import type { BlockAnalysis, Rule, Suggestion } from '../lib/types'
import { suggestionId } from '../lib/hash'

const SPACING_PROPS = new Set([
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'gap',
  'row-gap',
  'column-gap',
])

const UNSAFE_VALUE = /(var\(|clamp\(|\bmin\(|\bmax\(|calc\(|%|\b(vw|vh|svw|svh|lvw|lvh|dvw|dvh)\b|(?<!r)em\b)/i

const NUM_UNIT = /(\d+(?:\.\d+)?)(px|rem)\b/gi

function isAlreadyAdaptive(rule: Rule): boolean {
  return rule.atRuleChain.some(a => a.startsWith('@container') || a.startsWith('@media'))
}

function maxPxFromValue(value: string): number | null {
  if (UNSAFE_VALUE.test(value)) return null
  let maxPx = -1
  for (const m of value.matchAll(NUM_UNIT)) {
    const num = Number.parseFloat(m[1])
    const unit = m[2].toLowerCase()
    const px = unit === 'rem' ? num * 16 : num
    if (px > maxPx) maxPx = px
  }
  return maxPx > 0 ? maxPx : null
}

function buildClamp(maxPx: number): string {
  const minPx = Math.max(8, Math.round((maxPx * 0.6) / 8) * 8)
  const fluidVw = (maxPx / 19.2).toFixed(2)
  return `clamp(${minPx}px, ${fluidVw}vw, ${maxPx}px)`
}

export function heuristicSpacingClamp(analysis: BlockAnalysis): Suggestion[] {
  const out: Suggestion[] = []
  for (const rule of analysis.rules) {
    if (isAlreadyAdaptive(rule)) continue
    for (const decl of rule.declarations) {
      if (!SPACING_PROPS.has(decl.prop)) continue
      const maxPx = maxPxFromValue(decl.value)
      if (maxPx === null || maxPx < 40) continue
      const value = buildClamp(maxPx)
      out.push({
        id: suggestionId('spacing-clamp', rule.selector, 640, decl.prop, value),
        heuristic: 'spacing-clamp',
        selector: rule.selector,
        bp: 640,
        property: decl.prop,
        value,
        rationale: `absolute ${decl.prop} (${maxPx}px) — convert to fluid clamp for responsive scaling`,
        confidence: 'medium',
      })
    }
  }
  return out
}
