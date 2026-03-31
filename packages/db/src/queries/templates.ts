import type { SupabaseClient } from '../client'
import type { TemplateInsert, TemplateUpdate } from '../types'

/** List all templates, ordered by name */
export async function getTemplates(client: SupabaseClient) {
  const { data, error } = await client
    .from('templates')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

/** Get a single template by ID */
export async function getTemplateById(client: SupabaseClient, id: string) {
  const { data, error } = await client
    .from('templates')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

/** Create a new template */
export async function createTemplate(client: SupabaseClient, template: TemplateInsert) {
  const { data, error } = await client
    .from('templates')
    .insert(template)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Update an existing template by ID */
export async function updateTemplate(client: SupabaseClient, id: string, updates: TemplateUpdate) {
  const { data, error } = await client
    .from('templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Delete a template by ID */
export async function deleteTemplate(client: SupabaseClient, id: string) {
  const { error } = await client
    .from('templates')
    .delete()
    .eq('id', id)
  if (error) throw error
}

/**
 * Check if a template is used by any theme.
 * Returns array of theme slugs that reference this template_id.
 * Used for dependency check before delete.
 */
export async function getTemplateUsage(client: SupabaseClient, templateId: string) {
  const { data, error } = await client
    .from('themes')
    .select('slug, meta')
    .eq('template_id', templateId)
  if (error) throw error
  return (data ?? []).map(t => ({ slug: t.slug, name: (t.meta as { name?: string })?.name ?? t.slug }))
}
