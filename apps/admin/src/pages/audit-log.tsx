import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '../components/page-header'
import { AvatarInitials } from '../components/avatar-initials'
import { StatusBadge, actionBadgeVariant } from '../components/status-badge'
import { fetchAdminWithCount } from '../lib/api'
import type { AuditEntry } from '../lib/api'

const ACTION_OPTIONS = [
  { value: '', label: 'All actions' },
  { value: 'license_created', label: 'License created' },
  { value: 'staff_role_granted', label: 'Staff role granted' },
  { value: 'staff_role_revoked', label: 'Staff role revoked' },
  { value: 'content_published', label: 'Content published' },
]

const LIMIT = 50

export default function AuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionFilter, setActionFilter] = useState('')
  const [offset, setOffset] = useState(0)

  const load = useCallback(
    (currentOffset: number, append: boolean) => {
      setLoading(true)
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(currentOffset) })
      if (actionFilter) params.set('action', actionFilter)

      fetchAdminWithCount<AuditEntry>(`/admin/audit?${params}`)
        .then(({ data, count: total }) => {
          setEntries((prev) => (append ? [...prev, ...data] : data))
          setCount(total)
          setLoading(false)
        })
        .catch((err) => {
          setError(err.message)
          setLoading(false)
        })
    },
    [actionFilter],
  )

  useEffect(() => {
    setOffset(0)
    load(0, false)
  }, [load])

  return (
    <div>
      <PageHeader
        title="Audit Log"
        subtitle="System-wide action history and compliance trail"
      />

      {/* Filters */}
      <div className="flex items-center gap-3" style={{ marginBottom: 'var(--spacing-md)' }}>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          style={{
            padding: '6px 12px',
            fontSize: 'var(--text-sm-font-size)',
            borderRadius: 'var(--rounded-lg)',
            border: '1px solid hsl(var(--card-border))',
            backgroundColor: 'hsl(var(--card-bg))',
            color: 'hsl(var(--text-primary))',
          }}
        >
          {ACTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {actionFilter && (
          <button
            onClick={() => setActionFilter('')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 'var(--text-xs-font-size)',
              color: 'hsl(var(--text-muted))',
              textDecoration: 'underline',
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {error && (
        <div
          style={{
            padding: 'var(--spacing-md)',
            borderRadius: 'var(--rounded-lg)',
            backgroundColor: 'hsl(var(--status-error-bg))',
            color: 'hsl(var(--status-error-fg))',
            fontSize: 'var(--text-sm-font-size)',
            marginBottom: 'var(--spacing-md)',
          }}
        >
          {error}
        </div>
      )}

      {/* Entries */}
      <div
        style={{
          backgroundColor: 'hsl(var(--card-bg))',
          border: '1px solid hsl(var(--card-border))',
          borderRadius: 'var(--rounded-xl)',
          overflow: 'hidden',
        }}
      >
        {entries.length === 0 && !loading ? (
          <div
            style={{
              padding: 'var(--spacing-2xl)',
              textAlign: 'center',
              color: 'hsl(var(--text-muted))',
              fontSize: 'var(--text-sm-font-size)',
            }}
          >
            No audit entries found
          </div>
        ) : (
          entries.map((entry) => (
            <AuditRow key={entry.id} entry={entry} />
          ))
        )}
      </div>

      {loading && (
        <p
          style={{
            color: 'hsl(var(--text-muted))',
            fontSize: 'var(--text-sm-font-size)',
            marginTop: 'var(--spacing-sm)',
          }}
        >
          Loading...
        </p>
      )}

      {!loading && entries.length < count && (
        <button
          onClick={() => {
            const next = offset + LIMIT
            setOffset(next)
            load(next, true)
          }}
          style={{
            marginTop: 'var(--spacing-md)',
            padding: '8px 20px',
            fontSize: 'var(--text-sm-font-size)',
            fontWeight: 'var(--font-weight-medium)',
            borderRadius: 'var(--rounded-lg)',
            border: '1px solid hsl(var(--card-border))',
            backgroundColor: 'hsl(var(--card-bg))',
            color: 'hsl(var(--text-primary))',
            cursor: 'pointer',
          }}
        >
          Load more
        </button>
      )}
    </div>
  )
}

function AuditRow({ entry }: { entry: AuditEntry }) {
  const [expanded, setExpanded] = useState(false)
  const ts = new Date(entry.created_at)
  const timeStr = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}-${String(ts.getDate()).padStart(2, '0')} ${String(ts.getHours()).padStart(2, '0')}:${String(ts.getMinutes()).padStart(2, '0')}`
  const actorEmail = (entry.actor_id ?? 'system').slice(0, 16)
  const targetStr = entry.target_type
    ? `${entry.target_type} \u00B7 ${(entry.target_id ?? '').slice(0, 8)}...`
    : ''
  const detailsStr = entry.details ? JSON.stringify(entry.details, null, 2) : null

  return (
    <div
      style={{
        padding: 'var(--spacing-sm) var(--spacing-md)',
        borderBottom: '1px solid hsl(var(--card-border))',
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className="font-mono"
          style={{
            fontSize: 'var(--text-xs-font-size)',
            color: 'hsl(var(--text-muted))',
            whiteSpace: 'nowrap',
            minWidth: 130,
          }}
        >
          {timeStr}
        </span>

        <AvatarInitials name={null} email={actorEmail} size={24} />
        <span
          style={{
            fontSize: 'var(--text-xs-font-size)',
            color: 'hsl(var(--text-primary))',
            minWidth: 100,
          }}
        >
          {actorEmail}
        </span>

        <StatusBadge
          label={entry.action.replace(/_/g, ' ')}
          variant={actionBadgeVariant(entry.action)}
        />

        {targetStr && (
          <span
            style={{
              fontSize: 'var(--text-xs-font-size)',
              color: 'hsl(var(--text-muted))',
            }}
          >
            {targetStr}
          </span>
        )}

        <div className="flex-1" />

        {detailsStr && (
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 'var(--text-xs-font-size)',
              color: 'hsl(var(--text-muted))',
              textDecoration: 'underline',
            }}
          >
            {expanded ? 'Hide' : 'Details'}
          </button>
        )}
      </div>

      {expanded && detailsStr && (
        <pre
          className="font-mono"
          style={{
            marginTop: 'var(--spacing-xs)',
            padding: 'var(--spacing-sm)',
            fontSize: 'var(--text-xs-font-size)',
            color: 'hsl(var(--text-muted))',
            backgroundColor: 'hsl(var(--secondary))',
            borderRadius: 'var(--rounded-md)',
            overflow: 'auto',
            maxHeight: 200,
            whiteSpace: 'pre-wrap',
          }}
        >
          {detailsStr}
        </pre>
      )}
    </div>
  )
}
