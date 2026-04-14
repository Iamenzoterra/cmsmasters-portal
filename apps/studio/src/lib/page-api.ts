import type { Page, PageBlock, SlotConfig } from '@cmsmasters/db'
import { authHeaders, parseError } from './block-api'

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8787'

export async function fetchAllPages(): Promise<Page[]> {
  const res = await fetch(`${apiUrl}/api/pages`, { headers: await authHeaders() })
  if (!res.ok) throw new Error('Failed to fetch pages')
  const json = await res.json() as { data: Page[] }
  return json.data
}

export async function fetchPageById(id: string): Promise<Page> {
  const res = await fetch(`${apiUrl}/api/pages/${id}`, { headers: await authHeaders() })
  if (!res.ok) {
    if (res.status === 404) throw new Error('Page not found')
    throw new Error('Failed to fetch page')
  }
  const json = await res.json() as { data: Page }
  return json.data
}

export async function createPageApi(payload: {
  slug: string
  title: string
  type: string
  scope?: string
  html?: string
  css?: string
  layout_slots?: Record<string, string | string[]>
  slot_config?: SlotConfig
  seo?: { title?: string; description?: string }
  status?: string
}): Promise<Page> {
  const res = await fetch(`${apiUrl}/api/pages`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    if (res.status === 409) throw new Error(await parseError(res, 'Slug already exists'))
    if (res.status === 400) throw new Error(await parseError(res, 'Validation failed'))
    throw new Error('Failed to create page')
  }
  const json = await res.json() as { data: Page }
  return json.data
}

export async function updatePageApi(
  id: string,
  payload: {
    title?: string
    scope?: string
    html?: string
    css?: string
    layout_slots?: Record<string, string | string[]>
  slot_config?: SlotConfig
    seo?: { title?: string; description?: string }
    status?: string
  }
): Promise<Page> {
  const res = await fetch(`${apiUrl}/api/pages/${id}`, {
    method: 'PUT',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    if (res.status === 404) throw new Error('Page not found')
    throw new Error('Failed to update page')
  }
  const json = await res.json() as { data: Page }
  return json.data
}

export async function deletePageApi(id: string): Promise<void> {
  const res = await fetch(`${apiUrl}/api/pages/${id}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  })
  if (!res.ok) {
    if (res.status === 409) throw new Error(await parseError(res, 'Page has blocks assigned'))
    if (res.status === 403) throw new Error('Admin role required to delete pages')
    throw new Error('Failed to delete page')
  }
}

export async function fetchPageBlocks(pageId: string): Promise<PageBlock[]> {
  const res = await fetch(`${apiUrl}/api/pages/${pageId}/blocks`, { headers: await authHeaders() })
  if (!res.ok) throw new Error('Failed to fetch page blocks')
  const json = await res.json() as { data: PageBlock[] }
  return json.data
}

export async function updatePageBlocks(
  pageId: string,
  blocks: Array<{ block_id: string; position: number; config?: Record<string, unknown> }>
): Promise<void> {
  const res = await fetch(`${apiUrl}/api/pages/${pageId}/blocks`, {
    method: 'PUT',
    headers: await authHeaders(),
    body: JSON.stringify(blocks),
  })
  if (!res.ok) throw new Error('Failed to update page blocks')
}
