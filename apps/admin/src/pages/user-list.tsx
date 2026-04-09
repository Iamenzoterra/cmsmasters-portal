import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/page-header'
import { AvatarInitials } from '../components/avatar-initials'
import { StatusBadge, roleBadgeVariant } from '../components/status-badge'
import { fetchAdminWithCount } from '../lib/api'
import type { ProfileWithStaff } from '../lib/api'

const LIMIT = 20

export default function UserList() {
  const [users, setUsers] = useState<ProfileWithStaff[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const load = useCallback(
    (query: string, currentOffset: number, append: boolean) => {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(currentOffset) })
      if (query) params.set('search', query)

      fetchAdminWithCount<ProfileWithStaff>(`/admin/users?${params}`)
        .then(({ data, count: total }) => {
          setUsers((prev) => (append ? [...prev, ...data] : data))
          setCount(total)
          setLoading(false)
        })
        .catch((err) => {
          setError(err.message)
          setLoading(false)
        })
    },
    [],
  )

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setOffset(0)
      load(search, 0, false)
    }, 300)

    return () => clearTimeout(debounceRef.current)
  }, [search, load])

  return (
    <div>
      <PageHeader title="User Inspector" subtitle="Search and inspect user accounts" />

      {/* Search */}
      <input
        type="text"
        placeholder="Search by email or name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: '100%',
          padding: '10px 14px',
          fontSize: 'var(--text-sm-font-size)',
          borderRadius: 'var(--rounded-lg)',
          border: '1px solid hsl(var(--card-border))',
          backgroundColor: 'hsl(var(--card-bg))',
          color: 'hsl(var(--text-primary))',
          marginBottom: 'var(--spacing-md)',
          outline: 'none',
        }}
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

      {/* User list */}
      <div
        style={{
          backgroundColor: 'hsl(var(--card-bg))',
          border: '1px solid hsl(var(--card-border))',
          borderRadius: 'var(--rounded-xl)',
          overflow: 'hidden',
        }}
      >
        {users.length === 0 && !loading ? (
          <div
            style={{
              padding: 'var(--spacing-2xl)',
              textAlign: 'center',
              color: 'hsl(var(--text-muted))',
              fontSize: 'var(--text-sm-font-size)',
            }}
          >
            {search ? 'No users match your search' : 'No users found'}
          </div>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3"
              style={{
                padding: 'var(--spacing-sm) var(--spacing-md)',
                borderBottom: '1px solid hsl(var(--card-border))',
              }}
            >
              <AvatarInitials name={user.full_name} email={user.email} size={32} />

              <div className="flex min-w-0 flex-1 flex-col" style={{ gap: 1 }}>
                <span
                  style={{
                    fontSize: 'var(--text-sm-font-size)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'hsl(var(--text-primary))',
                  }}
                >
                  {user.full_name || user.email || 'Unknown'}
                </span>
                {user.full_name && user.email && (
                  <span
                    style={{
                      fontSize: 'var(--text-xs-font-size)',
                      color: 'hsl(var(--text-muted))',
                    }}
                  >
                    {user.email}
                  </span>
                )}
              </div>

              <StatusBadge label={user.role} variant={roleBadgeVariant(user.role)} />

              {user.staff_roles?.length > 0 &&
                user.staff_roles.map((sr) => (
                  <StatusBadge
                    key={sr.role}
                    label={sr.role.replace(/_/g, ' ')}
                    variant={roleBadgeVariant(sr.role)}
                  />
                ))}

              <span
                style={{
                  fontSize: 'var(--text-xs-font-size)',
                  color: 'hsl(var(--text-muted))',
                  whiteSpace: 'nowrap',
                }}
              >
                Joined {new Date(user.created_at).toLocaleDateString()}
              </span>

              <Link
                to={`/users/${user.id}`}
                style={{
                  fontSize: 'var(--text-xs-font-size)',
                  color: 'hsl(var(--text-muted))',
                  textDecoration: 'none',
                  fontWeight: 'var(--font-weight-medium)',
                  whiteSpace: 'nowrap',
                }}
              >
                Inspect
              </Link>
            </div>
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

      {!loading && users.length < count && (
        <button
          onClick={() => {
            const next = offset + LIMIT
            setOffset(next)
            load(search, next, true)
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
