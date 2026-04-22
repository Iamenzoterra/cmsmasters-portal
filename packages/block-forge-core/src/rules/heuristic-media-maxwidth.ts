import type { BlockAnalysis, Element, Rule, Suggestion } from '../lib/types'
import { suggestionId } from '../lib/hash'

const MEDIA_TAGS = ['img', 'video', 'iframe'] as const

const SIMPLE_CLASS_SELECTOR = /^\.([A-Za-z_][\w-]*)$/

function hasMaxWidth(rule: Rule): boolean {
  return rule.declarations.some(d => d.prop === 'max-width')
}

function tagHasCap(tag: string, rules: Rule[]): boolean {
  return rules.some(r => r.selector === tag && hasMaxWidth(r))
}

function elementHasClassCap(element: Element, rules: Rule[]): boolean {
  return element.classes.some(cls =>
    rules.some(r => {
      const m = SIMPLE_CLASS_SELECTOR.exec(r.selector)
      return m !== null && m[1] === cls && hasMaxWidth(r)
    }),
  )
}

export function heuristicMediaMaxwidth(analysis: BlockAnalysis): Suggestion[] {
  const out: Suggestion[] = []
  for (const tag of MEDIA_TAGS) {
    const elementsOfTag = analysis.elements.filter(el => el.tag === tag)
    if (elementsOfTag.length === 0) continue

    if (tagHasCap(tag, analysis.rules)) continue

    const everyElementClassCapped = elementsOfTag.every(el =>
      elementHasClassCap(el, analysis.rules),
    )
    if (everyElementClassCapped) continue

    const rationale = `media element <${tag}> without max-width cap — add 100% cap to prevent overflow`

    out.push({
      id: suggestionId('media-maxwidth', tag, 0, 'max-width', '100%'),
      heuristic: 'media-maxwidth',
      selector: tag,
      bp: 0,
      property: 'max-width',
      value: '100%',
      rationale,
      confidence: 'high',
    })
    out.push({
      id: suggestionId('media-maxwidth', tag, 0, 'height', 'auto'),
      heuristic: 'media-maxwidth',
      selector: tag,
      bp: 0,
      property: 'height',
      value: 'auto',
      rationale,
      confidence: 'high',
    })
  }
  return out
}
