import postcss, { type AtRule, type Container, type Document } from 'postcss'
import type { Rule as EngineRule } from '../lib/types'

export interface ParseCSSResult {
  rules: EngineRule[]
  warnings: string[]
}

export function parseCSS(css: string): ParseCSSResult {
  if (!css || !css.trim()) return { rules: [], warnings: [] }

  const rules: EngineRule[] = []
  const warnings: string[] = []

  let root
  try {
    root = postcss.parse(css, { from: undefined })
  } catch (err) {
    if (err instanceof Error) {
      const e = err as Error & { reason?: string; line?: number; column?: number }
      if (typeof e.reason === 'string' && typeof e.line === 'number' && typeof e.column === 'number') {
        warnings.push(`parse error: ${e.reason} at ${e.line}:${e.column}`)
      } else {
        warnings.push(`parse error: ${e.message}`)
      }
    } else {
      warnings.push(`parse error: ${String(err)}`)
    }
    return { rules, warnings }
  }

  root.walkRules(rule => {
    const declarations: Array<{ prop: string; value: string }> = []
    for (const node of rule.nodes) {
      if (node.type === 'decl') {
        declarations.push({ prop: node.prop, value: node.value })
      }
    }

    const atRuleChain: string[] = []
    let ancestor: Container | Document | undefined = rule.parent
    while (ancestor) {
      if (ancestor.type === 'atrule') {
        const atRule = ancestor as AtRule
        atRuleChain.push(
          atRule.params ? `@${atRule.name} ${atRule.params}` : `@${atRule.name}`,
        )
      }
      ancestor = ancestor.parent
    }

    rules.push({ selector: rule.selector, declarations, atRuleChain })
  })

  return { rules, warnings }
}
