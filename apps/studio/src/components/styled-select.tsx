import { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'

type StyledSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  /** Compact sizing for inline/toolbar use */
  compact?: boolean
}

export const StyledSelect = forwardRef<HTMLSelectElement, StyledSelectProps>(
  ({ compact, className, style, children, ...props }, ref) => {
    return (
      <div className="relative inline-flex" style={style}>
        <select
          ref={ref}
          className={`w-full cursor-pointer appearance-none outline-none ${className ?? ''}`}
          style={{
            height: compact ? '28px' : '36px',
            paddingLeft: 'var(--spacing-sm)',
            paddingRight: compact ? '28px' : '32px',
            backgroundColor: 'hsl(var(--input))',
            border: '1px solid hsl(var(--border-3))',
            borderRadius: 'var(--button-radius)',
            fontSize: compact ? 'var(--text-xs-font-size)' : 'var(--text-sm-font-size)',
            color: 'hsl(var(--foreground))',
            lineHeight: compact ? '28px' : '36px',
          }}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          size={compact ? 12 : 14}
          className="pointer-events-none absolute"
          style={{
            right: compact ? '6px' : '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'hsl(var(--text-muted))',
          }}
        />
      </div>
    )
  },
)
StyledSelect.displayName = 'StyledSelect'
