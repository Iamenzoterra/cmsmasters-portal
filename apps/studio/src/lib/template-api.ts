import type { Template } from '@cmsmasters/db'
import { authHeaders, parseError } from './block-api'

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8787'

export async function fetchAllTemplates(): Promise<Template[]> {
  const res = await fetch(`${apiUrl}/api/templates`, { headers: await authHeaders() })
  if (!res.ok) throw new Error('Failed to fetch templates')
  const json = await res.json() as { data: Template[] }
  return json.data
}

export async function fetchTemplateById(id: string): Promise<Template> {
  const res = await fetch(`${apiUrl}/api/templates/${id}`, { headers: await authHeaders() })
  if (!res.ok) {
    if (res.status === 404) throw new Error('Template not found')
    throw new Error('Failed to fetch template')
  }
  const json = await res.json() as { data: Template }
  return json.data
}

export async function createTemplateApi(payload: {
  slug: string
  name: string
  description?: string
  positions?: Array<{ position: number; block_id: string | null }>
  max_positions?: number
}): Promise<Template> {
  const res = await fetch(`${apiUrl}/api/templates`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    if (res.status === 409) throw new Error(await parseError(res, 'Slug already exists'))
    if (res.status === 400) throw new Error(await parseError(res, 'Validation failed'))
    throw new Error('Failed to create template')
  }
  const json = await res.json() as { data: Template }
  return json.data
}

export async function updateTemplateApi(
  id: string,
  payload: {
    name?: string
    description?: string
    positions?: Array<{ position: number; block_id: string | null }>
    max_positions?: number
  }
): Promise<Template> {
  const res = await fetch(`${apiUrl}/api/templates/${id}`, {
    method: 'PUT',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    if (res.status === 404) throw new Error('Template not found')
    throw new Error('Failed to update template')
  }
  const json = await res.json() as { data: Template }
  return json.data
}

export async function deleteTemplateApi(id: string): Promise<void> {
  const res = await fetch(`${apiUrl}/api/templates/${id}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  })
  if (!res.ok) {
    if (res.status === 409) throw new Error(await parseError(res, 'Template is used by themes'))
    if (res.status === 403) throw new Error('Admin role required to delete templates')
    throw new Error('Failed to delete template')
  }
}
