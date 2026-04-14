import { useState, useMemo } from 'react'
import type { TokenCategory } from '../lib/types'
import { CopyButton } from './CopyButton'

/** Detect if a token value is an HSL triplet (e.g. "230 58% 20%" or "0 0% 0% / 0.5") */
function isHSL(value: string): boolean {
  return /^\d+\s+\d+%\s+\d+%/.test(value)
}

/** Convert HSL triplet string to CSS hsl() */
function toHSLCSS(value: string): string {
  return value.includes('/') ? `hsl(${value})` : `hsl(${value})`
}

interface Props {
  categories: TokenCategory[]
  onCopied: () => void
}

export function TokenReference({ categories, onCopied }: Props) {
  const [openCat, setOpenCat] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  const filtered = useMemo(() => {
    if (!filter) return categories
    const q = filter.toLowerCase()
    return categories
      .map((cat) => ({
        ...cat,
        tokens: cat.tokens.filter(
          (t) => t.name.toLowerCase().includes(q) || t.value.toLowerCase().includes(q),
        ),
      }))
      .filter((cat) => cat.tokens.length > 0)
  }, [categories, filter])

  const totalCount = categories.reduce((sum, c) => sum + c.tokens.length, 0)

  return (
    <div className="lm-token-ref">
      <div className="lm-token-ref__title">
        Design Tokens ({totalCount})
      </div>

      <input
        className="lm-token-ref__filter"
        type="text"
        placeholder="Filter tokens..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      <div className="lm-token-ref__cats">
        {filtered.map((cat) => (
          <div key={cat.name}>
            <button
              className="lm-token-ref__toggle"
              onClick={() => setOpenCat(openCat === cat.name ? null : cat.name)}
            >
              <span className="lm-token-ref__arrow">
                {openCat === cat.name ? '\u25BE' : '\u25B8'}
              </span>
              {cat.name}
              <span className="lm-token-ref__count">({cat.tokens.length})</span>
            </button>

            {openCat === cat.name && (
              <div className="lm-token-ref__list">
                {cat.tokens.map((t) => (
                  <div key={t.name} className="lm-token-ref__item">
                    <div className="lm-token-ref__row">
                      {isHSL(t.value) && (
                        <span
                          className="lm-token-ref__swatch"
                          style={{ background: toHSLCSS(t.value) }}
                        />
                      )}
                      <code className="lm-token-ref__name">{t.name}</code>
                      <CopyButton text={`var(${t.name})`} onCopied={onCopied} />
                    </div>
                    <div className="lm-token-ref__value">{t.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="lm-token-ref__empty">No matching tokens</div>
        )}
      </div>
    </div>
  )
}
