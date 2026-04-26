import type { WcagViolation } from '../types'

/**
 * WCAG 1.4.4 violation banner — renders red alert when validate.ts returns
 * non-empty WcagViolation[]. Null-renders on []. Lives at top of <main>.
 *
 * Uses --destructive-* triad from tokens.css (lines 17, 29-31 light + 425, 437-439 dark).
 * No hardcoded reds.
 */
export function WcagBanner({ violations }: { violations: WcagViolation[] }) {
  if (violations.length === 0) return null
  return (
    <div
      role="alert"
      aria-live="polite"
      className="mb-6 rounded-md border border-[hsl(var(--destructive-border))] bg-[hsl(var(--destructive-subtle))] p-4"
    >
      <h3 className="text-[length:var(--text-sm-font-size)] font-[var(--font-weight-semibold)] text-[hsl(var(--destructive-text))] mb-2">
        WCAG 1.4.4 violations · {violations.length}
      </h3>
      <ul className="list-disc pl-5 space-y-1 text-[length:var(--text-sm-font-size)] text-[hsl(var(--destructive-text))]">
        {violations.map((v) => (
          <li key={v.token}>
            <code className="font-mono text-[length:var(--text-xs-font-size)]">{v.token}</code> · {v.minPx}–{v.maxPx}px · {v.reason}
          </li>
        ))}
      </ul>
    </div>
  )
}
