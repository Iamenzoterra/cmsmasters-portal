import type { BlockAnalysis, Rule, Suggestion } from '../lib/types'
import { suggestionId } from '../lib/hash'

function isAlreadyAdaptive(rule: Rule): boolean {
  return rule.atRuleChain.some(a => a.startsWith('@container') || a.startsWith('@media'))
}

function hasDecl(rule: Rule, prop: string): boolean {
  return rule.declarations.some(d => d.prop === prop)
}

function hasWhiteSpaceNowrap(rule: Rule): boolean {
  let value: string | undefined
  for (const d of rule.declarations) {
    if (d.prop === 'white-space') value = d.value
  }
  return value === 'nowrap'
}

export function heuristicHorizontalOverflow(analysis: BlockAnalysis): Suggestion[] {
  const out: Suggestion[] = []
  for (const rule of analysis.rules) {
    if (isAlreadyAdaptive(rule)) continue
    if (!hasWhiteSpaceNowrap(rule)) continue
    if (hasDecl(rule, 'overflow-x')) continue

    out.push({
      id: suggestionId('horizontal-overflow', rule.selector, 480, 'overflow-x', 'auto'),
      heuristic: 'horizontal-overflow',
      selector: rule.selector,
      bp: 480,
      property: 'overflow-x',
      value: 'auto',
      rationale: 'white-space: nowrap without overflow-x fallback — add scroll at narrow widths',
      confidence: 'low',
    })
  }
  return out
}
