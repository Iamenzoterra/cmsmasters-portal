import type { Block } from '@cmsmasters/db'
import { supabase } from './supabase'

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8787'

export async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')
  return session.access_token
}

export async function authHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken()
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

export async function parseError(res: Response, fallback: string): Promise<string> {
  try {
    const json = await res.json() as { error?: string }
    return json.error ?? fallback
  } catch {
    return fallback
  }
}

export async function fetchAllBlocks(): Promise<Block[]> {
  const res = await fetch(`${apiUrl}/api/blocks`, { headers: await authHeaders() })
  if (!res.ok) throw new Error('Failed to fetch blocks')
  const json = await res.json() as { data: Block[] }
  return json.data
}

export async function fetchBlockById(id: string): Promise<Block> {
  const res = await fetch(`${apiUrl}/api/blocks/${id}`, { headers: await authHeaders() })
  if (!res.ok) {
    if (res.status === 404) throw new Error('Block not found')
    throw new Error('Failed to fetch block')
  }
  const json = await res.json() as { data: Block }
  return json.data
}

export async function createBlockApi(payload: {
  slug: string
  name: string
  html: string
  css?: string
  hooks?: Record<string, unknown>
  metadata?: Record<string, unknown>
}): Promise<Block> {
  const res = await fetch(`${apiUrl}/api/blocks`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    if (res.status === 409) throw new Error(await parseError(res, 'Slug already exists'))
    if (res.status === 400) throw new Error(await parseError(res, 'Validation failed'))
    throw new Error('Failed to create block')
  }
  const json = await res.json() as { data: Block }
  return json.data
}

export async function updateBlockApi(
  id: string,
  payload: {
    name?: string
    html?: string
    css?: string
    hooks?: Record<string, unknown>
    metadata?: Record<string, unknown>
  }
): Promise<Block> {
  const res = await fetch(`${apiUrl}/api/blocks/${id}`, {
    method: 'PUT',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    if (res.status === 404) throw new Error('Block not found')
    throw new Error('Failed to update block')
  }
  const json = await res.json() as { data: Block }
  return json.data
}

export async function deleteBlockApi(id: string): Promise<void> {
  const res = await fetch(`${apiUrl}/api/blocks/${id}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  })
  if (!res.ok) {
    if (res.status === 409) throw new Error(await parseError(res, 'Block is used in templates'))
    if (res.status === 403) throw new Error('Admin role required to delete blocks')
    throw new Error('Failed to delete block')
  }
}
