import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@cmsmasters/ui'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <AlertTriangle
            size={48}
            style={{ color: 'hsl(var(--status-error-fg))' }}
          />
          <h2
            style={{
              fontSize: 'var(--text-lg-font-size)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'hsl(var(--text-primary))',
              margin: 0,
            }}
          >
            Something went wrong
          </h2>
          <p
            style={{
              fontSize: 'var(--text-sm-font-size)',
              color: 'hsl(var(--text-secondary))',
              margin: 0,
            }}
          >
            {this.state.error?.message}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try again
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { window.location.href = '/' }}
            >
              Back to Themes
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
