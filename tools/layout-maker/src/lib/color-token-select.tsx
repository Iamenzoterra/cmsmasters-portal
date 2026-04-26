import { useEffect, useRef, useState } from 'react'
import type { TokenMap } from './types'

/** Brand / accent color tokens suitable for filling a drawer trigger button.
 *  Filters to --brand-* primitives and skips neutral greys (triplet matches
 *  "0 0% X%") which would look muddy on the trigger. */
export function getBrandColorTokens(tokens: TokenMap): Array<{ name: string; hsl: string }> {
  return Object.keys(tokens.all)
    .filter((t) => t.startsWith('--brand-'))
    .filter((t) => {
      const v = tokens.all[t]
      // Drop pure whites/blacks/greys — not usable as a trigger background.
      return !/^0 0%/.test(v) && !/0 0% (0|100|95|87|62|46|33|23|9|5)%/.test(v)
    })
    .map((name) => ({ name, hsl: `hsl(${tokens.all[name]})` }))
}

/** Shared custom dropdown with color swatches. */
export function ColorTokenSelect({ options, value, onChange, placeholder }: {
  options: Array<{ value: string; label: string; hex: string }>
  value: string | undefined
  onChange: (v: string | undefined) => void
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const selected = options.find((o) => o.value === value)

  return (
    <div className="lm-color-select" ref={ref}>
      <button
        type="button"
        className="lm-color-select__trigger"
        onClick={() => setOpen(!open)}
      >
        {selected ? (
          <>
            <span className="lm-color-select__swatch" style={{ background: selected.hex }} />
            <span className="lm-color-select__label">{selected.label}</span>
            <span className="lm-color-select__hex">{selected.hex}</span>
          </>
        ) : (
          <span className="lm-color-select__label">{placeholder}</span>
        )}
        <span className="lm-color-select__chevron">▾</span>
      </button>
      {open && (
        <div className="lm-color-select__menu">
          <button
            type="button"
            className={`lm-color-select__option ${!value ? 'lm-color-select__option--active' : ''}`}
            onClick={() => { onChange(undefined); setOpen(false) }}
          >
            <span className="lm-color-select__swatch lm-color-select__swatch--none" />
            <span className="lm-color-select__label">{placeholder}</span>
          </button>
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              className={`lm-color-select__option ${value === o.value ? 'lm-color-select__option--active' : ''}`}
              onClick={() => { onChange(o.value); setOpen(false) }}
            >
              <span className="lm-color-select__swatch" style={{ background: o.hex }} />
              <span className="lm-color-select__label">{o.label}</span>
              <span className="lm-color-select__hex">{o.hex}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
