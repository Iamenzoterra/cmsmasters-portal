import postcss, { type AtRule as PcssAtRule, type Rule as PcssRule } from 'postcss'
import type { Tweak } from '../lib/types'
import { parseContainerBp, buildAtContainer } from '../lib/container-query'

/**
 * Apply one tweak to existing CSS and return the new CSS string.
 *
 * Cases:
 *   A. No matching `@container slot (max-width: {bp}px)` → append new chunk.
 *   B. Container exists, selector-rule inside does not → append new inner rule.
 *   C. Container + selector-rule exist:
 *        - declaration for `property` absent → append declaration
 *        - declaration present → update its value (preserves other decls)
 *
 * Special case: `bp === 0` emits as a top-level rule (no `@container`).
 * PostCSS-based; deterministic over identical (tweak, css) inputs.
 */
export function emitTweak(tweak: Tweak, css: string): string {
  const { selector, bp, property, value } = tweak

  if (bp === 0) return emitTopLevel(css, selector, property, value)

  const root = postcss.parse(css)

  let matchedContainer: PcssAtRule | null = null
  root.walkAtRules('container', atRule => {
    const asString = `@container ${atRule.params}`
    if (parseContainerBp(asString) === bp) {
      matchedContainer = atRule
      return false
    }
    return undefined
  })

  if (!matchedContainer) {
    const chunk = buildAtContainer(bp, `  ${selector} {\n    ${property}: ${value};\n  }`)
    const join = root.toString().length > 0 && !root.toString().endsWith('\n') ? '\n' : ''
    return root.toString() + join + chunk + '\n'
  }

  const container = matchedContainer as PcssAtRule
  let matchedRule: PcssRule | null = null
  container.walkRules(rule => {
    if (rule.selector.trim() === selector.trim()) {
      matchedRule = rule
      return false
    }
    return undefined
  })

  if (!matchedRule) {
    container.append(postcss.rule({ selector }).append({ prop: property, value }))
    return root.toString()
  }

  const rule = matchedRule as PcssRule
  let foundDecl = false
  rule.walkDecls(decl => {
    if (decl.prop === property) {
      decl.value = value
      foundDecl = true
      return false
    }
    return undefined
  })

  if (!foundDecl) rule.append({ prop: property, value })

  return root.toString()
}

function emitTopLevel(css: string, selector: string, property: string, value: string): string {
  const root = postcss.parse(css)

  let matched: PcssRule | null = null
  root.walkRules(rule => {
    if (rule.parent && rule.parent.type !== 'root') return undefined
    if (rule.selector.trim() === selector.trim()) {
      matched = rule
      return false
    }
    return undefined
  })

  if (!matched) {
    const chunk = `${selector} {\n  ${property}: ${value};\n}`
    const join = css.length > 0 && !css.endsWith('\n') ? '\n' : ''
    return css + join + chunk + '\n'
  }

  const rule = matched as PcssRule
  let foundDecl = false
  rule.walkDecls(decl => {
    if (decl.prop === property) {
      decl.value = value
      foundDecl = true
      return false
    }
    return undefined
  })

  if (!foundDecl) rule.append({ prop: property, value })

  return root.toString()
}
