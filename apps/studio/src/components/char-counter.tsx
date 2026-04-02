interface CharCounterProps {
  current: number
  max: number
}

export function CharCounter({ current, max }: CharCounterProps) {
  const isOver = current > max
  return (
    <span
      style={{
        fontSize: 'var(--text-xs-font-size)',
        color: isOver ? 'hsl(var(--status-error-fg))' : 'hsl(var(--text-link))',
      }}
    >
      {current} / {max}
    </span>
  )
}
