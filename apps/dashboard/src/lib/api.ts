import { supabase } from './supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  }
}

export async function verifyLicense(purchaseCode: string) {
  const headers = await getAuthHeaders()
  const res = await fetch(`${API_URL}/api/licenses/verify`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ purchase_code: purchaseCode }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || `Verification failed (${res.status})`)
  return json.data
}
