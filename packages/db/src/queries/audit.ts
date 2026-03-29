import type { SupabaseClient } from '../client'
import type { AuditEntryInsert } from '../types'

// M1 cut: NOT fire-and-forget — await insert, throw on error
type AuditInput = Omit<AuditEntryInsert, 'id' | 'created_at'>

export async function logAction(client: SupabaseClient, entry: AuditInput) {
  const { error } = await client.from('audit_log').insert(entry)
  if (error) throw error
}
