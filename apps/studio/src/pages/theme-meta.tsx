import { useState, useEffect, useCallback } from 'react'
import type { Category, Tag } from '@cmsmasters/db'
import {
  getCategories, createCategory, updateCategory, deleteCategory,
  getTags, createTag, updateTag, deleteTag,
} from '@cmsmasters/db'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/toast'
import { TaxonomyList } from '../components/taxonomy-list'

type TabKey = 'categories' | 'tags'

const tabs: { key: TabKey; label: string }[] = [
  { key: 'categories', label: 'Categories' },
  { key: 'tags', label: 'Tags' },
]

export function ThemeMeta() {
  const [tab, setTab] = useState<TabKey>('categories')
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loadingCats, setLoadingCats] = useState(true)
  const [loadingTags, setLoadingTags] = useState(true)
  const { toast } = useToast()

  const fetchCategories = useCallback(async () => {
    setLoadingCats(true)
    try {
      const data = await getCategories(supabase)
      setCategories(data)
    } catch (err) {
      toast({ type: 'error', message: 'Failed to load categories' })
    } finally {
      setLoadingCats(false)
    }
  }, [toast])

  const fetchTags = useCallback(async () => {
    setLoadingTags(true)
    try {
      const data = await getTags(supabase)
      setTags(data)
    } catch (err) {
      toast({ type: 'error', message: 'Failed to load tags' })
    } finally {
      setLoadingTags(false)
    }
  }, [toast])

  useEffect(() => { fetchCategories() }, [fetchCategories])
  useEffect(() => { fetchTags() }, [fetchTags])

  const activeItems = tab === 'categories' ? categories : tags
  const activeLoading = tab === 'categories' ? loadingCats : loadingTags

  async function handleAddCategory(name: string, slug: string) {
    try {
      await createCategory(supabase, { name, slug })
      toast({ type: 'success', message: `Category "${name}" created` })
      await fetchCategories()
    } catch (err: any) {
      toast({ type: 'error', message: err?.message?.includes('unique') ? `Slug already exists` : 'Failed to create category' })
    }
  }

  async function handleUpdateCategory(id: string, name: string, slug: string) {
    try {
      await updateCategory(supabase, id, { name, slug })
      toast({ type: 'success', message: 'Category updated' })
      await fetchCategories()
    } catch (err: any) {
      toast({ type: 'error', message: err?.message?.includes('unique') ? `Slug already exists` : 'Failed to update category' })
    }
  }

  async function handleDeleteCategory(id: string, name: string) {
    try {
      await deleteCategory(supabase, id)
      toast({ type: 'success', message: `Category "${name}" deleted` })
      await fetchCategories()
    } catch (err) {
      toast({ type: 'error', message: 'Failed to delete category' })
    }
  }

  async function handleAddTag(name: string, slug: string) {
    try {
      await createTag(supabase, { name, slug })
      toast({ type: 'success', message: `Tag "${name}" created` })
      await fetchTags()
    } catch (err: any) {
      toast({ type: 'error', message: err?.message?.includes('unique') ? `Slug already exists` : 'Failed to create tag' })
    }
  }

  async function handleUpdateTag(id: string, name: string, slug: string) {
    try {
      await updateTag(supabase, id, { name, slug })
      toast({ type: 'success', message: 'Tag updated' })
      await fetchTags()
    } catch (err: any) {
      toast({ type: 'error', message: err?.message?.includes('unique') ? `Slug already exists` : 'Failed to update tag' })
    }
  }

  async function handleDeleteTag(id: string, name: string) {
    try {
      await deleteTag(supabase, id)
      toast({ type: 'success', message: `Tag "${name}" deleted` })
      await fetchTags()
    } catch (err) {
      toast({ type: 'error', message: 'Failed to delete tag' })
    }
  }

  return (
    <div className="flex flex-col" style={{ padding: 'var(--spacing-xl)', gap: 'var(--spacing-lg)', maxWidth: '720px' }}>
      {/* Header */}
      <div className="flex flex-col" style={{ gap: '4px' }}>
        <h1 style={{
          margin: 0,
          fontSize: 'var(--h3-font-size)',
          lineHeight: 'var(--h3-line-height)',
          fontWeight: 'var(--font-weight-bold)',
          color: 'hsl(var(--text-primary))',
        }}>
          Theme Meta
        </h1>
        <p style={{ margin: 0, fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--text-secondary))' }}>
          Manage categories and tags for your themes.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex" style={{ borderBottom: '1px solid hsl(var(--border-default))' }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className="border-0 bg-transparent"
            style={{
              padding: 'var(--spacing-sm) var(--spacing-md)',
              fontSize: 'var(--text-sm-font-size)',
              fontWeight: tab === t.key ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
              color: tab === t.key ? 'hsl(var(--text-primary))' : 'hsl(var(--text-muted))',
              borderBottom: tab === t.key ? '2px solid hsl(var(--text-primary))' : '2px solid transparent',
              cursor: 'pointer',
              marginBottom: '-1px',
            }}
          >
            {t.label}
            <span style={{
              marginLeft: '6px',
              fontSize: 'var(--text-xs-font-size)',
              color: 'hsl(var(--text-muted))',
              fontWeight: 'var(--font-weight-medium)',
            }}>
              {t.key === 'categories' ? categories.length : tags.length}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      <TaxonomyList
        items={activeItems}
        loading={activeLoading}
        onAdd={tab === 'categories' ? handleAddCategory : handleAddTag}
        onUpdate={tab === 'categories' ? handleUpdateCategory : handleUpdateTag}
        onDelete={tab === 'categories' ? handleDeleteCategory : handleDeleteTag}
      />
    </div>
  )
}
