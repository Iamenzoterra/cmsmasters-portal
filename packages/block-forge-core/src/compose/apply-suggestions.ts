import type { BlockInput, BlockOutput, Suggestion, Heuristic } from '../lib/types'
import { buildAtContainer } from '../lib/container-query'

/** Same fixed order as dispatcher — used for deterministic sort before emission. */
const HEURISTIC_ORDER: Heuristic[] = [
  'grid-cols',
  'spacing-clamp',
  'font-clamp',
  'flex-wrap',
  'horizontal-overflow',
  'media-maxwidth',
]

function orderIndex(h: Heuristic): number {
  const i = HEURISTIC_ORDER.indexOf(h)
  return i === -1 ? HEURISTIC_ORDER.length : i
}

function sortSuggestions(list: readonly Suggestion[]): Suggestion[] {
  return [...list].sort((a, b) => {
    const ha = orderIndex(a.heuristic)
    const hb = orderIndex(b.heuristic)
    if (ha !== hb) return ha - hb
    if (a.bp !== b.bp) return a.bp - b.bp
    if (a.selector !== b.selector) return a.selector < b.selector ? -1 : 1
    if (a.property !== b.property) return a.property < b.property ? -1 : 1
    return a.value < b.value ? -1 : a.value > b.value ? 1 : 0
  })
}

/**
 * Apply accepted suggestions to a block. Empty `accepted` returns a
 * structurally identical BlockOutput (ADR-025 "never auto-apply").
 *
 * Suggestions with `bp === 0` emit as top-level rules; all others wrap in
 * `@container slot (max-width: {bp}px)`. Suggestions are grouped by (bp, selector)
 * for compact output — each unique `{bp, selector}` yields one rule.
 */
export function applySuggestions(block: BlockInput, accepted: readonly Suggestion[]): BlockOutput {
  const base: BlockOutput = { slug: block.slug, html: block.html, css: block.css }

  if (accepted.length === 0) return base

  const sorted = sortSuggestions(accepted)

  // Group by bp first, then by selector within that bp.
  const byBp = new Map<number, Map<string, string[]>>()
  for (const s of sorted) {
    if (!byBp.has(s.bp)) byBp.set(s.bp, new Map())
    const selMap = byBp.get(s.bp)!
    const decls = selMap.get(s.selector) ?? []
    decls.push(`    ${s.property}: ${s.value};`)
    selMap.set(s.selector, decls)
  }

  const chunks: string[] = []

  for (const bp of [...byBp.keys()].sort((a, b) => a - b)) {
    const selMap = byBp.get(bp)!
    const selectors = [...selMap.keys()]

    if (bp === 0) {
      for (const sel of selectors) {
        chunks.push(`${sel} {\n${selMap.get(sel)!.join('\n')}\n}`)
      }
      continue
    }

    const body = selectors
      .map(sel => `  ${sel} {\n${selMap.get(sel)!.join('\n')}\n  }`)
      .join('\n')
    chunks.push(buildAtContainer(bp, body))
  }

  const appended = chunks.join('\n')
  const join = block.css.length > 0 && !block.css.endsWith('\n') ? '\n' : ''
  const css = block.css + join + appended + '\n'

  return { slug: block.slug, html: block.html, css }
}
