import { useEffect, useRef, useState } from 'react'

/**
 * 3-second hold-to-confirm reset button — no modal infrastructure.
 *
 * - mouseDown / touchStart starts a 50ms-tick countdown timer
 * - release / leave cancels and resets progress
 * - full 3s elapsed fires onReset() exactly once
 *
 * Inline `style={{ width }}` is the ONE allowed inline-style use here per
 * CLAUDE.md "Inline `style={{}}` is allowed ONLY for truly dynamic values".
 */
export function ResetButton({ onReset }: { onReset: () => void }) {
  const [progress, setProgress] = useState(0) // 0..1
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAtRef = useRef<number | null>(null)

  const cancel = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    startedAtRef.current = null
    setProgress(0)
  }

  const start = () => {
    if (timerRef.current) return // already running — guard against repeated mouseDown
    startedAtRef.current = Date.now()
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - (startedAtRef.current ?? Date.now())
      const p = Math.min(elapsed / 3000, 1)
      setProgress(p)
      if (p >= 1) {
        cancel()
        onReset()
      }
    }, 50)
  }

  // Cleanup on unmount — prevents stray setInterval if button unmounts mid-hold.
  useEffect(() => () => cancel(), [])

  return (
    <button
      type="button"
      onMouseDown={start}
      onMouseUp={cancel}
      onMouseLeave={cancel}
      onTouchStart={start}
      onTouchEnd={cancel}
      className="relative mt-8 inline-flex items-center justify-center overflow-hidden rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-2 text-[length:var(--text-sm-font-size)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 bg-[hsl(var(--destructive)_/_0.15)]"
        style={{ width: `${progress * 100}%`, transition: 'width 0.05s linear' }}
      />
      <span className="relative">
        {progress === 0
          ? 'Hold to reset to defaults'
          : progress < 1
            ? `Resetting in ${(3 - progress * 3).toFixed(1)}s…`
            : 'Reset!'}
      </span>
    </button>
  )
}
