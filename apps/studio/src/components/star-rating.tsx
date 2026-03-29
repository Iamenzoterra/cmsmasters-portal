import { Star } from 'lucide-react'

interface StarRatingProps {
  value: number | undefined
  onChange: (value: number | undefined) => void
}

export function StarRating({ value, onChange }: StarRatingProps) {
  const rating = value ?? 0
  const fullStars = Math.floor(rating)

  return (
    <div className="flex flex-col" style={{ gap: 'var(--spacing-xs)' }}>
      <div className="flex items-center" style={{ gap: '2px' }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={16}
            fill={i <= fullStars ? 'hsl(var(--status-warn-fg))' : 'none'}
            stroke={i <= fullStars ? 'hsl(var(--status-warn-fg))' : 'hsl(var(--text-muted))'}
          />
        ))}
      </div>
      <input
        type="number"
        min={0}
        max={5}
        step={0.01}
        value={value ?? ''}
        onChange={(e) => {
          const v = e.target.value
          onChange(v === '' ? undefined : Number(v))
        }}
        placeholder="0.00"
        className="w-full outline-none"
        style={{
          height: '36px',
          padding: '0 var(--spacing-sm)',
          backgroundColor: 'hsl(var(--input))',
          border: '1px solid hsl(var(--border))',
          borderRadius: 'var(--rounded-lg)',
          fontSize: 'var(--text-sm-font-size)',
          color: 'hsl(var(--foreground))',
          fontFamily: "'Manrope', sans-serif",
        }}
      />
    </div>
  )
}
