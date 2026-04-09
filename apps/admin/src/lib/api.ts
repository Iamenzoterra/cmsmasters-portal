import { supabase } from './supabase'

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8787'

async function getToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  return session.access_token
}

export async function fetchAdmin<T>(
  path: string,
  opts?: { method?: string; body?: unknown },
): Promise<T> {
  const token = await getToken()
  const res = await fetch(`${apiUrl}/api${path}`, {
    method: opts?.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(opts?.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  })

  const json = await res.json()

  if (!res.ok) {
    throw new Error(json.error || `API error: ${res.status}`)
  }

  return json.data as T
}

/** For paginated endpoints that return { data, count } at top level */
export async function fetchAdminWithCount<T>(
  path: string,
): Promise<{ data: T[]; count: number }> {
  const token = await getToken()
  const res = await fetch(`${apiUrl}/api${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  const json = await res.json()

  if (!res.ok) {
    throw new Error(json.error || `API error: ${res.status}`)
  }

  return { data: json.data as T[], count: json.count ?? 0 }
}

export async function mutateAdmin<T>(
  path: string,
  method: 'POST' | 'DELETE',
  body: unknown,
): Promise<T> {
  return fetchAdmin<T>(path, { method, body })
}

/* ── Response types ── */

export interface AdminStats {
  totalUsers: number
  totalLicenses: number
  publishedThemes: number
  staffMembers: number
  recentActivations: ActivityEntry[]
}

export interface ActivityEntry {
  id: string
  user_id: string | null
  action: string
  theme_slug: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface AuditEntry {
  id: string
  actor_id: string | null
  actor_role: string | null
  action: string
  target_type: string | null
  target_id: string | null
  details: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

export interface HealthData {
  status: 'healthy' | 'degraded'
  timestamp: string
  supabase: { connected: boolean; latencyMs: number }
  r2: { status: string }
  tables: Record<string, number>
  envato: { tokenConfigured: boolean }
}

export interface ProfileWithStaff {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  role: string
  elements_subscriber: boolean
  created_at: string
  updated_at: string
  staff_roles: { role: string; permissions: string[]; granted_at: string }[]
}

export interface UserDetail {
  profile: ProfileWithStaff
  licenses: LicenseWithTheme[]
  staffRoles: StaffRoleRecord[]
  recentActivity: ActivityEntry[]
}

export interface LicenseWithTheme {
  id: string
  user_id: string
  theme_id: string | null
  purchase_code: string | null
  license_type: string | null
  verified_at: string | null
  support_until: string | null
  envato_item_id: string | null
  created_at: string
  themes: { id: string; slug: string; meta: Record<string, unknown> } | null
}

export interface StaffRoleRecord {
  id: string
  user_id: string
  role: string
  permissions: string[]
  granted_by: string | null
  granted_at: string
}

export interface StaffMemberWithProfile {
  id: string
  user_id: string
  role: string
  permissions: string[]
  granted_by: string | null
  granted_at: string
  profiles: {
    id: string
    email: string | null
    full_name: string | null
    avatar_url: string | null
  }
}
