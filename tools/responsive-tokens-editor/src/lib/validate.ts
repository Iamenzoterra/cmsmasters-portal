import { checkWCAG } from 'utopia-core'
import type { ResponsiveConfig, GeneratedToken, WcagViolation } from '../types'

/**
 * Per-token WCAG 1.4.4 ratio check (max ≤ 2.5× min) via utopia-core checkWCAG.
 * Returns one entry per violator; empty array if all clean.
 *
 * Per Ruling #3: NO manual ratio arithmetic — checkWCAG is canonical.
 *
 * checkWCAG contract (locked empirically 2026-04-26 — utopia-core@1.6.0):
 *   Signature: ({ min, max, minWidth, maxWidth }) => number[] | null
 *   Semantics:
 *     pass = result is null OR empty array
 *     fail = result is length-2 number array [from, to] (viewport-width bounds
 *            where ratio > 2.5× violates)
 *   The null vs [] distinction for pass cases is non-deterministic from inputs —
 *   internal numeric-precision detail of utopia-core; both shapes mean "no violation".
 *
 * Bonus (non-blocking, Phase 3+ forward note): calculateTypeScale already returns
 * UtopiaStep[] with inline wcagViolation?: { from, to } | null per step. Future
 * scale-derived (override-removal) flow may consume that directly; V1 path
 * (every token is an explicit override → flat calculateClamp calls) goes through
 * this validate() function for uniform diagnostics.
 */
export function validate(
  config: ResponsiveConfig,
  tokens: GeneratedToken[],
): WcagViolation[] {
  const violations: WcagViolation[] = []
  for (const t of tokens) {
    const result = checkWCAG({
      min: t.minPx,
      max: t.maxPx,
      minWidth: config.minViewport,
      maxWidth: config.maxViewport,
    })
    if (isViolation(result)) {
      violations.push({
        token: t.name,
        minPx: t.minPx,
        maxPx: t.maxPx,
        reason: buildReason(result),
      })
    }
  }
  return violations
}

function isViolation(result: number[] | null): boolean {
  return Array.isArray(result) && result.length > 0
}

function buildReason(result: number[] | null): string {
  if (!isViolation(result)) return ''
  const [from, to] = result as number[]
  return `WCAG 1.4.4 violation; ratio > 2.5× across viewport ${from.toFixed(0)}–${to.toFixed(0)}px`
}
