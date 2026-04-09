import { useEffect, useState } from 'react'
import { PageHeader } from '../components/page-header'
import { fetchAdmin } from '../lib/api'
import type { HealthData } from '../lib/api'

export default function SystemHealth() {
  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetchAdmin<HealthData>('/admin/health')
      .then((d) => {
        if (!cancelled) {
          setData(d)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div>
      <PageHeader title="System Health" subtitle="Infrastructure status and system monitoring" />

      {loading && (
        <p style={{ color: 'hsl(var(--text-muted))', fontSize: 'var(--text-sm-font-size)' }}>
          Loading health data...
        </p>
      )}

      {error && (
        <div
          style={{
            padding: 'var(--spacing-md)',
            borderRadius: 'var(--rounded-lg)',
            backgroundColor: 'hsl(var(--status-error-bg))',
            color: 'hsl(var(--status-error-fg))',
            fontSize: 'var(--text-sm-font-size)',
          }}
        >
          {error}
        </div>
      )}

      {data && (
        <div className="flex flex-col" style={{ gap: 'var(--spacing-lg)' }}>
          {/* Overall status banner */}
          <div
            style={{
              padding: 'var(--spacing-md) var(--spacing-lg)',
              borderRadius: 'var(--rounded-lg)',
              backgroundColor:
                data.status === 'healthy'
                  ? 'hsl(var(--status-success-bg))'
                  : 'hsl(var(--status-warn-bg))',
              color:
                data.status === 'healthy'
                  ? 'hsl(var(--status-success-fg))'
                  : 'hsl(var(--status-warn-fg))',
              fontSize: 'var(--text-sm-font-size)',
              fontWeight: 'var(--font-weight-semibold)',
            }}
          >
            {data.status === 'healthy' ? 'All systems operational' : 'System degraded'}
          </div>

          {/* Detail cards 2x2 grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 'var(--spacing-md)',
            }}
          >
            {/* Database */}
            <DetailCard title="Database">
              <StatusDot ok={data.supabase.connected} />
              <span>{data.supabase.connected ? 'Connected' : 'Error'}</span>
              <span style={{ color: 'hsl(var(--text-muted))' }}>
                {' '}
                &middot; {data.supabase.latencyMs}ms
              </span>

              <div style={{ marginTop: 'var(--spacing-sm)' }}>
                <table
                  style={{
                    width: '100%',
                    fontSize: 'var(--text-xs-font-size)',
                    color: 'hsl(var(--text-muted))',
                  }}
                >
                  <tbody>
                    {Object.entries(data.tables).map(([table, count]) => (
                      <tr key={table}>
                        <td style={{ padding: '2px 0' }}>{table}</td>
                        <td
                          style={{
                            textAlign: 'right',
                            fontWeight: 'var(--font-weight-medium)',
                          }}
                        >
                          {count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DetailCard>

            {/* R2 Storage */}
            <DetailCard title="Object Storage">
              <StatusDot ok={data.r2.status === 'connected'} />
              <span style={{ textTransform: 'capitalize' }}>{data.r2.status}</span>
            </DetailCard>

            {/* Envato */}
            <DetailCard title="Envato Integration">
              <StatusDot ok={data.envato.tokenConfigured} />
              <span>{data.envato.tokenConfigured ? 'Configured' : 'Not configured'}</span>
            </DetailCard>

            {/* Application */}
            <DetailCard title="Application">
              <span
                style={{
                  fontSize: 'var(--text-xs-font-size)',
                  color: 'hsl(var(--text-muted))',
                }}
              >
                Health check: {new Date(data.timestamp).toLocaleString()}
              </span>
            </DetailCard>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        backgroundColor: 'hsl(var(--card-bg))',
        border: '1px solid hsl(var(--card-border))',
        borderRadius: 'var(--rounded-xl)',
        padding: 'var(--spacing-md)',
      }}
    >
      <div
        style={{
          fontSize: 'var(--text-sm-font-size)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'hsl(var(--text-primary))',
          marginBottom: 'var(--spacing-sm)',
        }}
      >
        {title}
      </div>
      <div
        className="flex flex-wrap items-center gap-2"
        style={{
          fontSize: 'var(--text-sm-font-size)',
          color: 'hsl(var(--text-primary))',
        }}
      >
        {children}
      </div>
    </div>
  )
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: ok ? 'hsl(var(--status-success-fg))' : 'hsl(var(--status-error-fg))',
        flexShrink: 0,
      }}
    />
  )
}
