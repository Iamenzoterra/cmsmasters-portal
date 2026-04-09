import { useNavigate } from 'react-router-dom'
import { Button } from '@cmsmasters/ui'

export function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <h2
        style={{
          fontSize: 'var(--text-lg-font-size)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'hsl(var(--text-primary))',
          margin: 0,
        }}
      >
        Page not found
      </h2>
      <p
        style={{
          fontSize: 'var(--text-sm-font-size)',
          color: 'hsl(var(--text-secondary))',
          margin: 0,
        }}
      >
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Button variant="outline" size="sm" onClick={() => navigate('/')}>
        Back to Admin
      </Button>
    </div>
  )
}
