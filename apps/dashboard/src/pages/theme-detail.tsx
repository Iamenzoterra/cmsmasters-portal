import { useParams } from 'react-router-dom'

export function ThemeDetail() {
  const { slug } = useParams<{ slug: string }>()

  return (
    <div>
      <h1
        style={{
          fontSize: 'var(--h3-font-size)',
          lineHeight: 'var(--h3-line-height)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'hsl(var(--text-primary))',
          margin: 0,
        }}
      >
        Theme Detail
      </h1>
      <p
        style={{
          fontSize: 'var(--text-sm-font-size)',
          color: 'hsl(var(--text-secondary))',
          marginTop: 'var(--spacing-sm)',
        }}
      >
        Viewing theme: <strong>{slug}</strong>
      </p>
    </div>
  )
}
