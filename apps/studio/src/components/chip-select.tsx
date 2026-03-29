import { X, Plus } from 'lucide-react'

interface ChipSelectProps {
  values: string[]
  onChange: (values: string[]) => void
  options: string[]
  label?: string
}

export function ChipSelect({ values, onChange, options, label }: ChipSelectProps) {
  function addChip() {
    const available = options.filter((o) => !values.includes(o))
    if (available.length === 0) return
    onChange([...values, available[0]])
  }

  function removeChip(value: string) {
    onChange(values.filter((v) => v !== value))
  }

  return (
    <div className="flex flex-col" style={{ gap: 'var(--spacing-xs)' }}>
      {label && (
        <span
          style={{
            fontSize: 'var(--text-xs-font-size)',
            fontWeight: 600,
            color: 'hsl(var(--text-muted))',
            fontFamily: "'Manrope', sans-serif",
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {label}
        </span>
      )}
      <div className="flex flex-wrap items-center" style={{ gap: 'var(--spacing-xs)' }}>
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center"
            style={{
              backgroundColor: 'hsl(var(--tag-active-bg))',
              color: 'hsl(var(--tag-active-fg))',
              borderRadius: '9999px',
              padding: '3px 8px 3px 10px',
              fontSize: '12px',
              fontWeight: 500,
              fontFamily: "'Manrope', sans-serif",
              gap: '4px',
            }}
          >
            {v}
            <button
              type="button"
              onClick={() => removeChip(v)}
              className="flex items-center border-0 bg-transparent p-0"
              style={{ color: 'hsl(var(--tag-active-fg))', cursor: 'pointer' }}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        {options.filter((o) => !values.includes(o)).length > 0 && (
          <button
            type="button"
            onClick={addChip}
            className="inline-flex items-center border-0 bg-transparent"
            style={{
              color: 'hsl(var(--text-link))',
              fontSize: '12px',
              fontWeight: 500,
              fontFamily: "'Manrope', sans-serif",
              cursor: 'pointer',
              padding: 0,
              gap: '2px',
            }}
          >
            <Plus size={12} />
            add
          </button>
        )}
      </div>
    </div>
  )
}
