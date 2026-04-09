interface DateRangeToggleProps {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}

export function DateRangeToggle({ value, onChange, options }: DateRangeToggleProps) {
  return (
    <div className="flex">
      {options.map((opt, i) => {
        const isActive = opt.value === value
        const isFirst = i === 0
        const isLast = i === options.length - 1

        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              padding: '6px 16px',
              fontSize: 'var(--text-sm-font-size)',
              lineHeight: 'var(--text-sm-line-height)',
              fontWeight: 'var(--font-weight-medium)',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: isActive
                ? 'hsl(var(--general-primary))'
                : 'hsl(var(--general-secondary))',
              color: isActive
                ? 'hsl(var(--general-primary-foreground))'
                : 'hsl(var(--general-foreground))',
              borderRadius: isFirst
                ? 'var(--rounded-lg) 0 0 var(--rounded-lg)'
                : isLast
                  ? '0 var(--rounded-lg) var(--rounded-lg) 0'
                  : '0',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
