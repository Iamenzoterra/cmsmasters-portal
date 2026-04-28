import type { BlockAnalysis, Rule, Suggestion } from '../lib/types'
import { suggestionId } from '../lib/hash'

function isAlreadyAdaptive(rule: Rule): boolean {
  return rule.atRuleChain.some(a => a.startsWith('@container') || a.startsWith('@media'))
}

function lastDecl(rule: Rule, prop: string): string | undefined {
  let value: string | undefined
  for (const d of rule.declarations) {
    if (d.prop === prop) value = d.value
  }
  return value
}

function parseRepeatColumns(value: string): number | null {
  const match = /^repeat\(\s*(\d+)\s*,/i.exec(value.trim())
  if (!match) return null
  const n = Number.parseInt(match[1], 10)
  return Number.isFinite(n) ? n : null
}

/** True iff an adaptive (@container/@media) rule for `selector` declares `prop`. */
function hasAdaptiveDecl(rules: readonly Rule[], selector: string, prop: string): boolean {
  for (const r of rules) {
    if (r.selector !== selector) continue
    if (!r.atRuleChain.some(a => a.startsWith('@container') || a.startsWith('@media'))) continue
    if (r.declarations.some(d => d.prop === prop)) return true
  }
  return false
}

export function heuristicGridCols(analysis: BlockAnalysis): Suggestion[] {
  const out: Suggestion[] = []
  for (const rule of analysis.rules) {
    if (isAlreadyAdaptive(rule)) continue
    const display = lastDecl(rule, 'display')
    if (display !== 'grid') continue
    const cols = lastDecl(rule, 'grid-template-columns')
    if (!cols) continue
    const n = parseRepeatColumns(cols)
    if (n === null || n < 2) continue
    if (hasAdaptiveDecl(analysis.rules, rule.selector, 'grid-template-columns')) continue

    const rationale = `grid with ${n} columns — collapse to ${n >= 3 ? '2 at 768px (and 1 at 480px)' : '1 at 480px'}`

    if (n >= 3) {
      out.push({
        id: suggestionId('grid-cols', rule.selector, 768, 'grid-template-columns', 'repeat(2, 1fr)'),
        heuristic: 'grid-cols',
        selector: rule.selector,
        bp: 768,
        property: 'grid-template-columns',
        value: 'repeat(2, 1fr)',
        rationale,
        confidence: 'high',
      })
    }

    out.push({
      id: suggestionId('grid-cols', rule.selector, 480, 'grid-template-columns', '1fr'),
      heuristic: 'grid-cols',
      selector: rule.selector,
      bp: 480,
      property: 'grid-template-columns',
      value: '1fr',
      rationale,
      confidence: 'high',
    })
  }
  return out
}
