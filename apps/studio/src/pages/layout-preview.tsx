import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import type { Page } from '@cmsmasters/db'
import { fetchPageById } from '../lib/page-api'
import { LayoutSchematic } from '../components/layout-schematic'

type Viewport = { id: string; label: string; width: number | 'fluid' }

const VIEWPORTS: Viewport[] = [
  { id: 'mobile-sm', label: '320', width: 320 },
  { id: 'mobile', label: '375', width: 375 },
  { id: 'tablet', label: '768', width: 768 },
  { id: 'laptop', label: '1024', width: 1024 },
  { id: 'desktop', label: '1280', width: 1280 },
  { id: 'wide', label: '1440', width: 1440 },
  { id: 'fluid', label: 'Fluid', width: 'fluid' },
]

export function LayoutPreview() {
  const { id } = useParams<{ id: string }>()
  const [page, setPage] = useState<Page | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [vp, setVp] = useState<Viewport>(VIEWPORTS[4]) // 1280 default

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchPageById(id)
      .then((data) => { if (!cancelled) setPage(data) })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load layout') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  useEffect(() => {
    if (page?.title) document.title = `Preview: ${page.title} — Studio`
  }, [page?.title])

  return (
    <div
      className="flex h-screen w-screen flex-col"
      style={{ backgroundColor: 'hsl(var(--bg-surface-alt))' }}
    >
      {/* Sticky toolbar */}
      <header
        className="flex shrink-0 items-center border-b"
        style={{
          height: '48px',
          padding: '0 var(--spacing-md)',
          gap: 'var(--spacing-lg)',
          backgroundColor: 'hsl(var(--bg-surface))',
          borderColor: 'hsl(var(--border-default))',
        }}
      >
        {/* Title */}
        <div className="flex items-center" style={{ gap: 'var(--spacing-sm)', minWidth: 0, flex: 1 }}>
          <span
            style={{
              fontSize: 'var(--text-xs-font-size)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'hsl(var(--text-muted))',
              fontWeight: 'var(--font-weight-semibold)',
            }}
          >
            Preview
          </span>
          <span
            className="truncate"
            style={{
              fontSize: 'var(--text-sm-font-size)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'hsl(var(--text-primary))',
            }}
          >
            {page?.title ?? (loading ? 'Loading…' : 'Untitled')}
          </span>
          {page?.slug && (
            <code
              className="font-mono"
              style={{
                fontSize: 'var(--text-xs-font-size)',
                color: 'hsl(var(--text-muted))',
              }}
            >
              /{page.slug}
            </code>
          )}
        </div>

        {/* Viewport switcher */}
        <div
          className="flex items-center"
          style={{
            gap: '2px',
            padding: '2px',
            borderRadius: 'var(--rounded-lg)',
            backgroundColor: 'hsl(var(--bg-surface-alt))',
            border: '1px solid hsl(var(--border-default))',
          }}
        >
          {VIEWPORTS.map((v) => {
            const active = v.id === vp.id
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setVp(v)}
                className="border-0 font-mono"
                style={{
                  height: '28px',
                  minWidth: '48px',
                  padding: '0 var(--spacing-sm)',
                  borderRadius: 'var(--rounded-md)',
                  backgroundColor: active ? 'hsl(var(--bg-surface))' : 'transparent',
                  boxShadow: active ? 'var(--shadow-xs)' : 'none',
                  color: active ? 'hsl(var(--text-primary))' : 'hsl(var(--text-muted))',
                  fontSize: 'var(--text-xs-font-size)',
                  fontWeight: active ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
                  cursor: 'pointer',
                }}
              >
                {v.label}
              </button>
            )
          })}
        </div>

        {/* Back to editor */}
        {id && (
          <Link
            to={`/layouts/${id}`}
            className="flex items-center no-underline"
            style={{
              gap: 'var(--spacing-xs)',
              fontSize: 'var(--text-xs-font-size)',
              color: 'hsl(var(--text-link))',
              fontWeight: 'var(--font-weight-medium)',
            }}
          >
            <ExternalLink size={12} />
            Open editor
          </Link>
        )}
      </header>

      {/* Canvas */}
      <main
        className="flex-1 overflow-auto"
        style={{ padding: 'var(--spacing-xl)' }}
      >
        {loading && (
          <p
            style={{
              textAlign: 'center',
              fontSize: 'var(--text-sm-font-size)',
              color: 'hsl(var(--text-muted))',
            }}
          >
            Loading layout…
          </p>
        )}

        {error && (
          <p
            style={{
              textAlign: 'center',
              fontSize: 'var(--text-sm-font-size)',
              color: 'hsl(var(--status-error-fg))',
            }}
          >
            {error}
          </p>
        )}

        {!loading && !error && page && (
          <div
            style={{
              width: vp.width === 'fluid' ? '100%' : `${vp.width}px`,
              maxWidth: '100%',
              margin: '0 auto',
              backgroundColor: 'hsl(var(--bg-surface))',
              border: '1px solid hsl(var(--border-default))',
              borderRadius: 'var(--rounded-lg)',
              boxShadow: 'var(--shadow-md)',
              overflow: 'hidden',
            }}
          >
            <LayoutSchematic
              html={page.html ?? ''}
              css={page.css ?? ''}
              layoutSlots={page.layout_slots ?? {}}
              slotConfig={page.slot_config ?? {}}
            />
          </div>
        )}
      </main>
    </div>
  )
}
