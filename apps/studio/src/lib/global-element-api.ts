import type { GlobalElement } from '@cmsmasters/db'
import { authHeaders, parseError } from './block-api'

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8787'

export async function fetchAllGlobalElements(): Promise<GlobalElement[]> {
  const res = await fetch(`${apiUrl}/api/global-elements`, { headers: await authHeaders() })
  if (!res.ok) throw new Error('Failed to fetch global elements')
  const json = await res.json() as { data: GlobalElement[] }
  return json.data
}

export async function createGlobalElementApi(payload: {
  slot: string
  block_id: string
  scope: string
  priority?: number
}): Promise<GlobalElement> {
  const res = await fetch(`${apiUrl}/api/global-elements`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    if (res.status === 409) throw new Error(await parseError(res, 'Scope already assigned for this slot'))
    if (res.status === 400) throw new Error(await parseError(res, 'Validation failed'))
    throw new Error('Failed to create global element')
  }
  const json = await res.json() as { data: GlobalElement }
  return json.data
}

export async function updateGlobalElementApi(
  id: string,
  payload: {
    slot?: string
    block_id?: string
    scope?: string
    priority?: number
  }
): Promise<GlobalElement> {
  const res = await fetch(`${apiUrl}/api/global-elements/${id}`, {
    method: 'PUT',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    if (res.status === 404) throw new Error('Global element not found')
    throw new Error('Failed to update global element')
  }
  const json = await res.json() as { data: GlobalElement }
  return json.data
}

export async function deleteGlobalElementApi(id: string): Promise<void> {
  const res = await fetch(`${apiUrl}/api/global-elements/${id}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  })
  if (!res.ok) {
    if (res.status === 403) throw new Error('Admin role required to delete global elements')
    throw new Error('Failed to delete global element')
  }
}
