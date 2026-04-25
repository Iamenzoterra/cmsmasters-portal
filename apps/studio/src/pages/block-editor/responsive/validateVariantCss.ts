import postcss, { type AtRule, type Container, type Root } from 'postcss'

/**
 * Variant CSS scoping validator (WP-029 Task A — OQ4).
 *
 * Variant CSS leaks into the base render unless every rule is either:
 *   1. Scoped via `[data-variant="<name>"]` ancestor on at least one selector, OR
 *   2. Wrapped in an `@container` ancestor (named or unnamed) — production
 *      reveal rules emit `@container slot (max-width: …px) { … }`.
 *
 * Multi-selector rules use OR semantics — one matching selector unblocks the
 * whole rule (a CSS rule = union of its selectors). This matches authoring
 * intent: `[data-variant="fast"] .a, [data-variant="fast"] .b { … }` is fine.
 *
 * Output is advisory only; never blocks save. Validator output order = source
 * order (PostCSS walkRules is deterministic depth-first).
 */
export type ValidationWarning =
  | { reason: 'unscoped-outside-reveal'; selector: string; line: number }
  | { reason: 'parse-error'; detail: string }

export function validateVariantCss(
  cssText: string,
  variantName: string,
): ValidationWarning[] {
  if (!cssText.trim()) return []

  let root: Root
  try {
    root = postcss.parse(cssText)
  } catch (err) {
    return [
      {
        reason: 'parse-error',
        detail: err instanceof Error ? err.message : String(err),
      },
    ]
  }

  const warnings: ValidationWarning[] = []
  const variantPrefix = `[data-variant="${variantName}"]`

  root.walkRules((rule) => {
    const isScoped = rule.selectors.some((sel) => sel.includes(variantPrefix))
    if (isScoped) return

    let parent: Container | undefined = rule.parent as Container | undefined
    while (parent) {
      if (parent.type === 'atrule' && (parent as AtRule).name === 'container') return
      parent = parent.parent as Container | undefined
    }

    warnings.push({
      reason: 'unscoped-outside-reveal',
      selector: rule.selector,
      line: rule.source?.start?.line ?? 0,
    })
  })

  return warnings
}
