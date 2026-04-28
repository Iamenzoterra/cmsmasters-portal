import postcss, { type AtRule as PcssAtRule, type Rule as PcssRule } from 'postcss'
import { parseContainerBp } from '../lib/container-query'

/**
 * Scan CSS for `@container slot (max-width: Npx)` blocks that declare
 * `property` on `selector`. Returns the set of conflict BPs.
 *
 * Top-level rules (outside any `@container`) are excluded — `bp:0` is
 * always emitted unconditionally by Path A's chip-apply contract, so its
 * conflict status is irrelevant to the smart-emit filter.
 *
 * Used by Inspector smart Path A (WP-039) to choose which canonical BPs
 * to emit alongside `bp:0` when applying a token, instead of emitting at
 * all 4 canonical BPs unconditionally (WP-034 baseline).
 */
export function findConflictBps(
  css: string,
  selector: string,
  property: string,
): Set<number> {
  const conflicts = new Set<number>()
  const root = postcss.parse(css)
  const trimmedSelector = selector.trim()

  root.walkAtRules('container', (atRule: PcssAtRule) => {
    const asString = `@container ${atRule.params}`
    const bp = parseContainerBp(asString)
    if (bp === null || bp === 0) return undefined

    atRule.walkRules((rule: PcssRule) => {
      if (rule.selector.trim() !== trimmedSelector) return undefined
      rule.walkDecls((decl) => {
        if (decl.prop === property) {
          conflicts.add(bp)
          return false
        }
        return undefined
      })
      return undefined
    })

    return undefined
  })

  return conflicts
}
