import type { BlockAnalysis, Rule, Suggestion } from '../lib/types'
import { suggestionId } from '../lib/hash'

const UNSAFE_VALUE = /(var\(|clamp\(|\bmin\(|\bmax\(|calc\(|%|\b(vw|vh|svw|svh|lvw|lvh|dvw|dvh)\b|(?<!r)em\b)/i

const SINGLE_NUM_UNIT = /^\s*(\d+(?:\.\d+)?)(px|rem)\s*$/i

function isAlreadyAdaptive(rule: Rule): boolean {
  return rule.atRuleChain.some(a => a.startsWith('@container') || a.startsWith('@media'))
}

function fontSizePx(value: string): number | null {
  if (UNSAFE_VALUE.test(value)) return null
  const m = SINGLE_NUM_UNIT.exec(value)
  if (!m) return null
  const num = Number.parseFloat(m[1])
  const unit = m[2].toLowerCase()
  return unit === 'rem' ? num * 16 : num
}

function buildClamp(maxPx: number): string {
  const rawMin = Math.round((maxPx * 0.55) / 2) * 2
  const minPx = Math.max(16, rawMin)
  const fluidVw = (maxPx / 19.2).toFixed(2)
  return `clamp(${minPx}px, ${fluidVw}vw, ${maxPx}px)`
}

export function heuristicFontClamp(analysis: BlockAnalysis): Suggestion[] {
  const out: Suggestion[] = []
  for (const rule of analysis.rules) {
    if (isAlreadyAdaptive(rule)) continue
    for (const decl of rule.declarations) {
      if (decl.prop !== 'font-size') continue
      const px = fontSizePx(decl.value)
      if (px === null || px < 24) continue
      const value = buildClamp(px)
      out.push({
        id: suggestionId('font-clamp', rule.selector, 640, 'font-size', value),
        heuristic: 'font-clamp',
        selector: rule.selector,
        bp: 640,
        property: 'font-size',
        value,
        rationale: `large font-size (${px}px) — convert to fluid clamp`,
        confidence: 'high',
      })
    }
  }
  return out
}
