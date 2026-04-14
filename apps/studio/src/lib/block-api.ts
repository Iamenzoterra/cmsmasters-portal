import type { Block } from '@cmsmasters/db'
import { supabase } from './supabase'

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8787'

async function getAuthToken(): Promise<string> {
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

// ── Image upload ──

export interface BatchUploadResult {
  original: string
  uploaded: string
  error?: string
}

export async function uploadFile(file: File): Promise<string> {
  const token = await getAuthToken()
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${apiUrl}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  if (!res.ok) throw new Error(await parseError(res, 'Upload failed'))
  const json = await res.json() as { url: string }
  return json.url
}

export async function uploadImageBatch(
  urls: string[],
): Promise<BatchUploadResult[]> {
  const res = await fetch(`${apiUrl}/api/upload/batch`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ urls }),
  })
  if (!res.ok) {
    throw new Error(await parseError(res, 'Image upload failed'))
  }
  const json = await res.json() as { results: BatchUploadResult[] }
  return json.results
}

// ── Icons ──

export interface IconItem {
  key: string
  url: string
  name: string
  category: string
}

export interface IconCategory {
  name: string
  icons: IconItem[]
}

export async function fetchIcons(): Promise<IconCategory[]> {
  const res = await fetch(`${apiUrl}/api/icons`, { headers: await authHeaders() })
  if (!res.ok) throw new Error(await parseError(res, 'Failed to fetch icons'))
  const json = await res.json() as { categories: IconCategory[] }
  return json.categories
}

export async function uploadIcon(file: File, category: string): Promise<string> {
  const token = await getAuthToken()
  const formData = new FormData()
  formData.append('file', file)
  formData.append('category', category)
  const res = await fetch(`${apiUrl}/api/icons`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  })
  if (!res.ok) throw new Error(await parseError(res, 'Icon upload failed'))
  const json = await res.json() as { url: string }
  return json.url
}

export async function deleteIcon(category: string, name: string): Promise<void> {
  const res = await fetch(`${apiUrl}/api/icons/${category}/${name}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  })
  if (!res.ok) throw new Error(await parseError(res, 'Failed to delete icon'))
}

// ── Presets ──

export interface PresetSummary {
  slug: string
  name: string
}

interface PresetData {
  name: string
  items: Array<{ icon_url: string; label: string; value: string }>
}

export async function fetchPresets(type: string): Promise<PresetSummary[]> {
  const res = await fetch(`${apiUrl}/api/presets/${type}`, { headers: await authHeaders() })
  if (!res.ok) throw new Error(await parseError(res, 'Failed to fetch presets'))
  const json = await res.json() as { presets: PresetSummary[] }
  return json.presets
}

export async function fetchPreset(type: string, slug: string): Promise<PresetData> {
  const res = await fetch(`${apiUrl}/api/presets/${type}/${slug}`, { headers: await authHeaders() })
  if (!res.ok) throw new Error(await parseError(res, 'Failed to fetch preset'))
  return await res.json() as PresetData
}

export async function savePreset(type: string, name: string, items: PresetData['items']): Promise<PresetSummary> {
  const res = await fetch(`${apiUrl}/api/presets/${type}`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ name, items }),
  })
  if (!res.ok) throw new Error(await parseError(res, 'Failed to save preset'))
  return await res.json() as PresetSummary
}

export async function deletePreset(type: string, slug: string): Promise<void> {
  const res = await fetch(`${apiUrl}/api/presets/${type}/${slug}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  })
  if (!res.ok) throw new Error(await parseError(res, 'Failed to delete preset'))
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
