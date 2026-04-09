import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AvatarInitials } from '../components/avatar-initials'
import { StatusBadge, roleBadgeVariant, actionBadgeVariant } from '../components/status-badge'
import { StatCard } from '../components/stat-card'
import { fetchAdmin, mutateAdmin } from '../lib/api'
import type { UserDetail } from '../lib/api'

const ROLE_OPTIONS = ['admin', 'content_manager', 'support_operator'] as const

export default function UserInspector() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Role actions
  const [grantRole, setGrantRole] = useState<string>('content_manager')
  const [roleSubmitting, setRoleSubmitting] = useState(false)
  const [roleError, setRoleError] = useState<string | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null)

  const loadUser = useCallback(() => {
    if (!id) return
    setLoading(true)
    fetchAdmin<UserDetail>(`/admin/users/${id}`)
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [id])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  async function handleGrant() {
    if (!id) return
    setRoleSubmitting(true)
    setRoleError(null)
    try {
      await mutateAdmin(`/admin/users/${id}/staff-role`, 'POST', {
        role: grantRole,
        permissions: ['*'],
      })
      loadUser()
    } catch (err: unknown) {
      setRoleError(err instanceof Error ? err.message : String(err))
    } finally {
      setRoleSubmitting(false)
    }
  }

  async function handleRevoke(role: string) {
    if (!id) return
    setRoleSubmitting(true)
    setRoleError(null)
    try {
      await mutateAdmin(`/admin/users/${id}/staff-role`, 'DELETE', { role })
      setRevokeTarget(null)
      loadUser()
    } catch (err: unknown) {
      setRoleError(err instanceof Error ? err.message : String(err))
    } finally {
      setRoleSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div>
        <p style={{ color: 'hsl(var(--text-muted))', fontSize: 'var(--text-sm-font-size)' }}>
          Loading user...
        </p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div>
        <Link
          to="/users"
          style={{
            fontSize: 'var(--text-sm-font-size)',
            fontWeight: 'var(--font-weight-medium)',
            color: 'hsl(var(--text-muted))',
            textDecoration: 'none',
            marginBottom: 'var(--spacing-md)',
            display: 'inline-block',
          }}
        >
          &larr; Back to users
        </Link>
        <div
          style={{
            padding: 'var(--spacing-md)',
            borderRadius: 'var(--rounded-lg)',
            backgroundColor: 'hsl(var(--status-error-bg))',
            color: 'hsl(var(--status-error-fg))',
            fontSize: 'var(--text-sm-font-size)',
          }}
        >
          {error || 'User not found'}
        </div>
      </div>
    )
  }

  const { profile, licenses, staffRoles, recentActivity } = data
  const accountAge = Math.floor(
    (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24),
  )

  return (
    <div>
      {/* Back link */}
      <Link
        to="/users"
        style={{
          fontSize: 'var(--text-sm-font-size)',
          fontWeight: 'var(--font-weight-medium)',
          color: 'hsl(var(--text-muted))',
          textDecoration: 'none',
          marginBottom: 'var(--spacing-md)',
          display: 'inline-block',
        }}
      >
        &larr; Back to users
      </Link>

      {/* Account card */}
      <div
        className="flex items-center gap-4"
        style={{
          backgroundColor: 'hsl(var(--card-bg))',
          border: '1px solid hsl(var(--card-border))',
          borderRadius: 'var(--rounded-xl)',
          padding: 'var(--spacing-lg)',
          marginBottom: 'var(--spacing-lg)',
        }}
      >
        <AvatarInitials name={profile.full_name} email={profile.email} size={48} />
        <div className="flex flex-1 flex-col" style={{ gap: 2 }}>
          <span
            style={{
              fontSize: 'var(--text-lg-font-size)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'hsl(var(--text-primary))',
            }}
          >
            {profile.full_name || profile.email || 'Unknown'}
          </span>
          <span style={{ fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--text-muted))' }}>
            {profile.email}
          </span>
          <span style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))' }}>
            Joined {new Date(profile.created_at).toLocaleDateString()}
          </span>
        </div>
        <StatusBadge label={profile.role} variant={roleBadgeVariant(profile.role)} />
      </div>

      {/* Stat cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 'var(--spacing-md)',
          marginBottom: 'var(--spacing-lg)',
        }}
      >
        <StatCard label="Licenses" value={String(licenses.length)} sub="total" />
        <StatCard label="Staff roles" value={String(staffRoles.length)} sub="active" />
        <StatCard label="Activity" value={String(recentActivity.length)} sub="recent entries" />
        <StatCard label="Account age" value={`${accountAge}d`} sub="days" />
      </div>

      {/* Licenses */}
      <SectionTitle>Licenses</SectionTitle>
      <div
        style={{
          backgroundColor: 'hsl(var(--card-bg))',
          border: '1px solid hsl(var(--card-border))',
          borderRadius: 'var(--rounded-xl)',
          overflow: 'hidden',
          marginBottom: 'var(--spacing-lg)',
        }}
      >
        {licenses.length === 0 ? (
          <EmptyState>No licenses</EmptyState>
        ) : (
          licenses.map((lic) => (
            <div
              key={lic.id}
              className="flex items-center gap-3"
              style={{
                padding: 'var(--spacing-sm) var(--spacing-md)',
                borderBottom: '1px solid hsl(var(--card-border))',
              }}
            >
              <span
                style={{
                  fontSize: 'var(--text-sm-font-size)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'hsl(var(--text-primary))',
                  minWidth: 120,
                }}
              >
                {lic.themes?.slug || lic.theme_id || 'Unknown theme'}
              </span>
              <span
                className="font-mono"
                style={{
                  fontSize: 'var(--text-xs-font-size)',
                  color: 'hsl(var(--text-muted))',
                }}
              >
                {lic.purchase_code
                  ? `****${lic.purchase_code.slice(-4)}`
                  : 'No code'}
              </span>
              {lic.license_type && (
                <StatusBadge
                  label={lic.license_type}
                  variant={lic.license_type === 'extended' ? 'info' : 'neutral'}
                />
              )}
              <div className="flex-1" />
              <span style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))' }}>
                {lic.verified_at
                  ? `Verified ${new Date(lic.verified_at).toLocaleDateString()}`
                  : 'Unverified'}
              </span>
              {lic.support_until && (
                <span
                  style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))' }}
                >
                  Support until {new Date(lic.support_until).toLocaleDateString()}
                </span>
              )}
            </div>
          ))
        )}
      </div>

      {/* Recent Activity */}
      <SectionTitle>Recent Activity</SectionTitle>
      <div
        style={{
          backgroundColor: 'hsl(var(--card-bg))',
          border: '1px solid hsl(var(--card-border))',
          borderRadius: 'var(--rounded-xl)',
          overflow: 'hidden',
          marginBottom: 'var(--spacing-lg)',
        }}
      >
        {recentActivity.length === 0 ? (
          <EmptyState>No recent activity</EmptyState>
        ) : (
          recentActivity.slice(0, 20).map((act) => (
            <div
              key={act.id}
              className="flex items-center gap-3"
              style={{
                padding: 'var(--spacing-sm) var(--spacing-md)',
                borderBottom: '1px solid hsl(var(--card-border))',
              }}
            >
              <span
                className="font-mono"
                style={{
                  fontSize: 'var(--text-xs-font-size)',
                  color: 'hsl(var(--text-muted))',
                  whiteSpace: 'nowrap',
                  minWidth: 130,
                }}
              >
                {new Date(act.created_at).toLocaleString()}
              </span>
              <StatusBadge
                label={act.action.replace(/_/g, ' ')}
                variant={actionBadgeVariant(act.action)}
              />
              {act.theme_slug && (
                <span
                  style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))' }}
                >
                  {act.theme_slug}
                </span>
              )}
            </div>
          ))
        )}
      </div>

      {/* Admin Actions */}
      <SectionTitle>Admin Actions</SectionTitle>
      <div
        style={{
          backgroundColor: 'hsl(var(--card-bg))',
          border: '1px solid hsl(var(--card-border))',
          borderRadius: 'var(--rounded-xl)',
          padding: 'var(--spacing-md)',
        }}
      >
        {/* Current staff roles */}
        {staffRoles.length > 0 && (
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <span
              style={{
                fontSize: 'var(--text-xs-font-size)',
                color: 'hsl(var(--text-muted))',
                display: 'block',
                marginBottom: 'var(--spacing-xs)',
              }}
            >
              Current staff roles
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {staffRoles.map((sr) => (
                <div key={sr.id} className="flex items-center gap-2">
                  <StatusBadge
                    label={sr.role.replace(/_/g, ' ')}
                    variant={roleBadgeVariant(sr.role)}
                  />
                  {revokeTarget === sr.role ? (
                    <span className="flex items-center gap-1">
                      <button
                        onClick={() => handleRevoke(sr.role)}
                        disabled={roleSubmitting}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 'var(--text-xs-font-size)',
                          color: 'hsl(var(--status-error-fg))',
                          fontWeight: 'var(--font-weight-medium)',
                        }}
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setRevokeTarget(null)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 'var(--text-xs-font-size)',
                          color: 'hsl(var(--text-muted))',
                        }}
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setRevokeTarget(sr.role)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 'var(--text-xs-font-size)',
                        color: 'hsl(var(--status-error-fg))',
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grant role */}
        <div className="flex items-end gap-3">
          <div className="flex flex-col" style={{ gap: 4 }}>
            <label
              style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))' }}
            >
              Grant role
            </label>
            <select
              value={grantRole}
              onChange={(e) => setGrantRole(e.target.value)}
              disabled={roleSubmitting}
              style={{
                padding: '8px 12px',
                fontSize: 'var(--text-sm-font-size)',
                borderRadius: 'var(--rounded-lg)',
                border: '1px solid hsl(var(--card-border))',
                backgroundColor: 'hsl(var(--bg-page))',
                color: 'hsl(var(--text-primary))',
              }}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleGrant}
            disabled={roleSubmitting}
            style={{
              padding: '8px 20px',
              fontSize: 'var(--text-sm-font-size)',
              fontWeight: 'var(--font-weight-medium)',
              borderRadius: 'var(--rounded-lg)',
              border: 'none',
              backgroundColor: 'hsl(var(--general-primary))',
              color: 'hsl(var(--general-primary-foreground))',
              cursor: roleSubmitting ? 'default' : 'pointer',
              opacity: roleSubmitting ? 0.6 : 1,
            }}
          >
            {roleSubmitting ? 'Saving...' : 'Grant'}
          </button>
        </div>

        {roleError && (
          <p
            style={{
              marginTop: 'var(--spacing-sm)',
              fontSize: 'var(--text-xs-font-size)',
              color: 'hsl(var(--status-error-fg))',
            }}
          >
            {roleError}
          </p>
        )}
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </h2>
  )
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: 'var(--spacing-2xl)',
        textAlign: 'center',
        color: 'hsl(var(--text-muted))',
        fontSize: 'var(--text-sm-font-size)',
      }}
    >
      {children}
    </div>
  )
}
