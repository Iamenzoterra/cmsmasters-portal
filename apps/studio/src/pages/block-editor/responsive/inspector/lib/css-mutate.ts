// WP-033 Phase 4 — Studio-local declaration removal helper for Inspector visibility uncheck.
//
// Studio has no `removeTweakFor` analog (block-forge's session reducer pattern).
// form.code is the SOT — we walk it via PostCSS and remove the matching decl.
//
// - bp === 0: top-level rule (selector at root)
// - bp > 0: rule inside @container slot (max-width: <bp>px)
//
// If the declaration's parent rule has no other declarations left, remove the
// rule. If a @container has no rules left, remove the @container.
//
// Returns css unchanged when no match (no-op).

import postcss, { type AtRule as PcssAtRule } from 'postcss'

function isContainerFor(atRule: PcssAtRule, bp: number): boolean {
  if (atRule.name !== 'container') return false
  const m = atRule.params.match(/slot\s*\(\s*max-width:\s*(\d+)px\s*\)/i)
  return !!m && Number(m[1]) === bp
}

export function removeDeclarationFromCss(
  css: string,
  selector: string,
  bp: number,
  property: string,
): string {
  if (!css.trim()) return css
  let root: postcss.Root
  try {
    root = postcss.parse(css)
  } catch {
    return css
  }

  if (bp === 0) {
    root.walkRules((rule) => {
      if (rule.parent?.type !== 'root') return
      if (rule.selector.trim() !== selector.trim()) return
      rule.walkDecls(property, (decl) => {
        decl.remove()
      })
      if (rule.nodes.length === 0) rule.remove()
    })
  } else {
    root.walkAtRules('container', (atRule) => {
      if (!isContainerFor(atRule, bp)) return
      atRule.walkRules((rule) => {
        if (rule.selector.trim() !== selector.trim()) return
        rule.walkDecls(property, (decl) => {
          decl.remove()
        })
        if (rule.nodes.length === 0) rule.remove()
      })
      if (atRule.nodes.length === 0) atRule.remove()
    })
  }

  return root.toString()
}
