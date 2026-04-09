import { useEffect, useState } from 'react'
import { PageHeader } from '../components/page-header'
import { StatCard } from '../components/stat-card'
import { DateRangeToggle } from '../components/date-range-toggle'
import { ActivationEvent } from '../components/activation-event'
import { fetchAdmin } from '../lib/api'
import type { AdminStats, ActivityEntry } from '../lib/api'

const RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
]

export default function Overview() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [activations, setActivations] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState('30d')

  useEffect(() => {
    let cancelled = false

    Promise.all([
      fetchAdmin<AdminStats>('/admin/stats'),
      fetchAdmin<ActivityEntry[]>('/admin/activity?limit=10'),
    ])
      .then(([statsData, activityData]) => {
        if (cancelled) return
        setStats(statsData)
        // Use activity endpoint data, fall back to stats.recentActivations
        setActivations(activityData.length > 0 ? activityData : statsData.recentActivations)
        setLoading(false)
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
      <PageHeader
        title="Overview"
        subtitle="New activations, license verification, and customer acquisition"
      >
        <DateRangeToggle value={range} onChange={setRange} options={RANGE_OPTIONS} />
      </PageHeader>

      {loading && (
        <p style={{ color: 'hsl(var(--text-muted))', fontSize: 'var(--text-sm-font-size)' }}>
          Loading overview...
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

      {stats && (
        <div className="flex flex-col" style={{ gap: 'var(--spacing-lg)' }}>
          {/* 5 KPI cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 'var(--spacing-md)',
            }}
          >
            <StatCard
              label="New registrations"
              value={String(stats.totalUsers)}
              sub="total"
            />
            <StatCard
              label="Verified licenses"
              value={String(stats.totalLicenses)}
              sub="total"
            />
            <StatCard
              label="Published themes"
              value={String(stats.publishedThemes)}
              sub="total"
            />
            <StatCard
              label="Staff members"
              value={String(stats.staffMembers)}
              sub="active"
            />
            <StatCard
              label="Recent activations"
              value={String(stats.recentActivations.length)}
              sub="latest"
              muted
            />
          </div>

          {/* New activations feed */}
          <div>
            <h2
              style={{
                fontSize: 'var(--h4-font-size)',
                lineHeight: 'var(--h4-line-height)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'hsl(var(--text-primary))',
                margin: 0,
                marginBottom: 'var(--spacing-sm)',
              }}
            >
              New activations
            </h2>
            <div
              style={{
                backgroundColor: 'hsl(var(--card-bg))',
                border: '1px solid hsl(var(--card-border))',
                borderRadius: 'var(--rounded-xl)',
                overflow: 'hidden',
              }}
            >
              {activations.length === 0 ? (
                <div
                  style={{
                    padding: 'var(--spacing-2xl)',
                    textAlign: 'center',
                    color: 'hsl(var(--text-muted))',
                    fontSize: 'var(--text-sm-font-size)',
                  }}
                >
                  No recent activations
                </div>
              ) : (
                activations.map((event) => (
                  <ActivationEvent key={event.id} event={event} />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
