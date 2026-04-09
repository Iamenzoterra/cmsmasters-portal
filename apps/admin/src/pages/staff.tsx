import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '../components/page-header'
import { AvatarInitials } from '../components/avatar-initials'
import { StatusBadge, roleBadgeVariant } from '../components/status-badge'
import { fetchAdmin, fetchAdminWithCount, mutateAdmin } from '../lib/api'
import type { StaffMemberWithProfile, ProfileWithStaff } from '../lib/api'

const ROLE_OPTIONS = ['admin', 'content_manager', 'support_operator'] as const

export default function Staff() {
  const [staff, setStaff] = useState<StaffMemberWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Grant form
  const [formEmail, setFormEmail] = useState('')
  const [formRole, setFormRole] = useState<string>('content_manager')
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  // Revoke confirm
  const [revokeTarget, setRevokeTarget] = useState<{ userId: string; role: string } | null>(null)
  const [revokeSubmitting, setRevokeSubmitting] = useState(false)

  const loadStaff = useCallback(() => {
    setLoading(true)
    fetchAdmin<StaffMemberWithProfile[]>('/admin/staff')
      .then((data) => {
        setStaff(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    loadStaff()
  }, [loadStaff])

  async function handleGrant(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)

    if (!formEmail.trim()) {
      setFormError('Email is required')
      return
    }

    setFormSubmitting(true)

    try {
      // Resolve email to user ID
      const { data: users } = await fetchAdminWithCount<ProfileWithStaff>(
        `/admin/users?search=${encodeURIComponent(formEmail.trim())}&limit=1`,
      )

      if (users.length === 0) {
        setFormError('No user found with that email')
        setFormSubmitting(false)
        return
      }

      const userId = users[0].id

      await mutateAdmin(`/admin/users/${userId}/staff-role`, 'POST', {
        role: formRole,
        permissions: ['*'],
      })

      setFormSuccess(`Granted ${formRole.replace(/_/g, ' ')} role to ${formEmail}`)
      setFormEmail('')
      loadStaff()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err))
    } finally {
      setFormSubmitting(false)
    }
  }

  async function handleRevoke(userId: string, role: string) {
    setRevokeSubmitting(true)
    try {
      await mutateAdmin(`/admin/users/${userId}/staff-role`, 'DELETE', { role })
      setRevokeTarget(null)
      loadStaff()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err))
    } finally {
      setRevokeSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Staff & Roles"
        subtitle="Manage team members and their permissions"
      />

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

      {/* Staff list */}
      <div
        style={{
          backgroundColor: 'hsl(var(--card-bg))',
          border: '1px solid hsl(var(--card-border))',
          borderRadius: 'var(--rounded-xl)',
          overflow: 'hidden',
          marginBottom: 'var(--spacing-lg)',
        }}
      >
        {loading && staff.length === 0 ? (
          <div
            style={{
              padding: 'var(--spacing-2xl)',
              textAlign: 'center',
              color: 'hsl(var(--text-muted))',
              fontSize: 'var(--text-sm-font-size)',
            }}
          >
            Loading staff...
          </div>
        ) : staff.length === 0 ? (
          <div
            style={{
              padding: 'var(--spacing-2xl)',
              textAlign: 'center',
              color: 'hsl(var(--text-muted))',
              fontSize: 'var(--text-sm-font-size)',
            }}
          >
            No staff members found
          </div>
        ) : (
          staff.map((member) => {
            const name = member.profiles?.full_name
            const email = member.profiles?.email
            const isRevokeTarget =
              revokeTarget?.userId === member.user_id && revokeTarget?.role === member.role

            return (
              <div
                key={member.id}
                className="flex items-center gap-3"
                style={{
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  borderBottom: '1px solid hsl(var(--card-border))',
                }}
              >
                <AvatarInitials name={name} email={email} size={32} />

                <div className="flex min-w-0 flex-1 flex-col" style={{ gap: 1 }}>
                  <span
                    style={{
                      fontSize: 'var(--text-sm-font-size)',
                      fontWeight: 'var(--font-weight-semibold)',
                      color: 'hsl(var(--text-primary))',
                    }}
                  >
                    {name || email || 'Unknown'}
                  </span>
                  {name && email && (
                    <span
                      style={{
                        fontSize: 'var(--text-xs-font-size)',
                        color: 'hsl(var(--text-muted))',
                      }}
                    >
                      {email}
                    </span>
                  )}
                </div>

                <StatusBadge
                  label={member.role.replace(/_/g, ' ')}
                  variant={roleBadgeVariant(member.role)}
                />

                <span
                  style={{
                    fontSize: 'var(--text-xs-font-size)',
                    color: 'hsl(var(--text-muted))',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Granted {new Date(member.granted_at).toLocaleDateString()}
                </span>

                {isRevokeTarget ? (
                  <div className="flex items-center gap-2">
                    <span
                      style={{
                        fontSize: 'var(--text-xs-font-size)',
                        color: 'hsl(var(--status-error-fg))',
                      }}
                    >
                      Remove?
                    </span>
                    <button
                      onClick={() => handleRevoke(member.user_id, member.role)}
                      disabled={revokeSubmitting}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 'var(--text-xs-font-size)',
                        color: 'hsl(var(--status-error-fg))',
                        fontWeight: 'var(--font-weight-medium)',
                      }}
                    >
                      {revokeSubmitting ? 'Removing...' : 'Confirm'}
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
                  </div>
                ) : (
                  <button
                    onClick={() =>
                      setRevokeTarget({ userId: member.user_id, role: member.role })
                    }
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
            )
          })
        )}
      </div>

      {/* Grant role form */}
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
          Add staff member
        </div>

        <form onSubmit={handleGrant} className="flex items-end gap-3">
          <div className="flex flex-1 flex-col" style={{ gap: 4 }}>
            <label
              style={{
                fontSize: 'var(--text-xs-font-size)',
                color: 'hsl(var(--text-muted))',
              }}
            >
              Email
            </label>
            <input
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="user@example.com"
              disabled={formSubmitting}
              style={{
                padding: '8px 12px',
                fontSize: 'var(--text-sm-font-size)',
                borderRadius: 'var(--rounded-lg)',
                border: '1px solid hsl(var(--card-border))',
                backgroundColor: 'hsl(var(--bg-page))',
                color: 'hsl(var(--text-primary))',
                outline: 'none',
              }}
            />
          </div>

          <div className="flex flex-col" style={{ gap: 4 }}>
            <label
              style={{
                fontSize: 'var(--text-xs-font-size)',
                color: 'hsl(var(--text-muted))',
              }}
            >
              Role
            </label>
            <select
              value={formRole}
              onChange={(e) => setFormRole(e.target.value)}
              disabled={formSubmitting}
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
            type="submit"
            disabled={formSubmitting}
            style={{
              padding: '8px 20px',
              fontSize: 'var(--text-sm-font-size)',
              fontWeight: 'var(--font-weight-medium)',
              borderRadius: 'var(--rounded-lg)',
              border: 'none',
              backgroundColor: 'hsl(var(--general-primary))',
              color: 'hsl(var(--general-primary-foreground))',
              cursor: formSubmitting ? 'default' : 'pointer',
              opacity: formSubmitting ? 0.6 : 1,
            }}
          >
            {formSubmitting ? 'Granting...' : 'Grant role'}
          </button>
        </form>

        {formError && (
          <p
            style={{
              marginTop: 'var(--spacing-sm)',
              fontSize: 'var(--text-xs-font-size)',
              color: 'hsl(var(--status-error-fg))',
            }}
          >
            {formError}
          </p>
        )}
        {formSuccess && (
          <p
            style={{
              marginTop: 'var(--spacing-sm)',
              fontSize: 'var(--text-xs-font-size)',
              color: 'hsl(var(--status-success-fg))',
            }}
          >
            {formSuccess}
          </p>
        )}
      </div>
    </div>
  )
}
