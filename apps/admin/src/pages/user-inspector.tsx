import { useParams } from 'react-router-dom'

export default function UserInspector() {
  const { id } = useParams()

  return (
    <div>
      <h1
        style={{
          fontSize: 'var(--h2-font-size)',
          lineHeight: 'var(--h2-line-height)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'hsl(var(--text-primary))',
          margin: 0,
        }}
      >
        User Inspector
      </h1>
      <p
        style={{
          fontSize: 'var(--text-sm-font-size)',
          lineHeight: 'var(--text-sm-line-height)',
          color: 'hsl(var(--text-secondary))',
          margin: 0,
          marginTop: 'var(--spacing-2xs)',
        }}
      >
        Inspecting user <strong>{id}</strong>
      </p>
    </div>
  )
}
