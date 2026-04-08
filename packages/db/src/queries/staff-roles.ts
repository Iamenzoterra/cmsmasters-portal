import type { SupabaseClient } from '../client'
import type { StaffRole, StaffRoleInsert, StaffRoleName } from '../types'

export async function getStaffRoles(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from('staff_roles')
    .select('*')
    .eq('user_id', userId)
  if (error) throw error
  return data as StaffRole[]
}

export async function getAllStaffMembers(client: SupabaseClient) {
  const { data, error } = await client
    .from('staff_roles')
    .select('*, profiles!staff_roles_user_id_fkey(id, email, full_name, avatar_url)')
    .order('granted_at', { ascending: false })
  if (error) throw error
  return data
}

export async function grantStaffRole(
  client: SupabaseClient,
  userId: string,
  role: StaffRoleName,
  grantedBy: string,
  permissions: string[] = ['*']
) {
  const insert: StaffRoleInsert = {
    user_id: userId,
    role,
    permissions,
    granted_by: grantedBy,
  }
  const { data, error } = await client
    .from('staff_roles')
    .upsert(insert, { onConflict: 'user_id,role' })
    .select()
    .single()
  if (error) throw error
  return data as StaffRole
}

export async function revokeStaffRole(
  client: SupabaseClient,
  userId: string,
  role: StaffRoleName
) {
  const { error } = await client
    .from('staff_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role', role)
  if (error) throw error
}

export async function hasStaffRole(
  client: SupabaseClient,
  userId: string,
  role: StaffRoleName
): Promise<boolean> {
  const { count, error } = await client
    .from('staff_roles')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('role', role)
  if (error) return false
  return (count ?? 0) > 0
}
