import type { BlockAnalysis, Element, Rule, Suggestion } from '../lib/types'
import { suggestionId } from '../lib/hash'

const SIMPLE_CLASS_SELECTOR = /^\.([A-Za-z_][\w-]*)$/

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

function isFlexRow(rule: Rule): boolean {
  if (lastDecl(rule, 'display') !== 'flex') return false
  const dir = lastDecl(rule, 'flex-direction')
  if (dir === undefined) return true
  return dir === 'row' || dir === 'row-reverse'
}

function matchedElements(rule: Rule, elements: Element[]): Element[] {
  const classMatch = SIMPLE_CLASS_SELECTOR.exec(rule.selector)
  if (!classMatch) return []
  const cls = classMatch[1]
  return elements.filter(el => el.classes.includes(cls))
}

function isTopLevelParent(parentTag: string | null): boolean {
  return parentTag === null || parentTag === 'body'
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

export function heuristicFlexWrap(analysis: BlockAnalysis): Suggestion[] {
  const out: Suggestion[] = []
  for (const rule of analysis.rules) {
    if (isAlreadyAdaptive(rule)) continue
    if (!isFlexRow(rule)) continue
    if (hasAdaptiveDecl(analysis.rules, rule.selector, 'flex-wrap')) continue
    const matches = matchedElements(rule, analysis.elements)
    if (matches.length === 0) continue

    const qualifying = matches.find(
      el => el.childCount >= 3 && isTopLevelParent(el.parentTag),
    )
    if (!qualifying) continue

    out.push({
      id: suggestionId('flex-wrap', rule.selector, 640, 'flex-wrap', 'wrap'),
      heuristic: 'flex-wrap',
      selector: rule.selector,
      bp: 640,
      property: 'flex-wrap',
      value: 'wrap',
      rationale: `flex-row with ${qualifying.childCount} children — allow wrap at narrow widths`,
      confidence: 'medium',
    })
  }
  return out
}
