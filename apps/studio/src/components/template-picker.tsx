import { useState, useEffect } from 'react'
import type { Template } from '@cmsmasters/db'
import { LayoutTemplate } from 'lucide-react'
import { fetchAllTemplates } from '../lib/template-api'

interface TemplatePickerProps {
  selectedId: string
  onSelect: (template: Template) => void
}

export function TemplatePicker({ selectedId, onSelect }: TemplatePickerProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAllTemplates()
      .then(setTemplates)
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <p style={{
        fontSize: 'var(--text-sm-font-size)',
        color: 'hsl(var(--text-muted))',
        fontFamily: "'Manrope', sans-serif",
        margin: 0,
      }}>
        Loading templates...
      </p>
    )
  }

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <LayoutTemplate size={32} style={{ color: 'hsl(var(--text-muted))' }} />
        <p style={{
          fontSize: 'var(--text-sm-font-size)',
          color: 'hsl(var(--text-muted))',
          fontFamily: "'Manrope', sans-serif",
          margin: 0,
        }}>
          No templates available
        </p>
        <a
          href="/templates/new"
          style={{
            fontSize: 'var(--text-sm-font-size)',
            color: 'hsl(var(--text-link))',
            fontFamily: "'Manrope', sans-serif",
          }}
        >
          Create a template
        </a>
      </div>
    )
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--spacing-sm)' }}>
      {templates.map((t) => {
        const isSelected = t.id === selectedId
        const filledCount = t.positions.filter((p) => p.block_id).length
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t)}
            className="flex cursor-pointer flex-col items-start border text-left transition-shadow hover:shadow-sm"
            style={{
              padding: 'var(--spacing-md)',
              borderRadius: 'var(--rounded-lg)',
              borderColor: isSelected ? 'hsl(var(--text-primary))' : 'hsl(var(--border-default))',
              borderWidth: isSelected ? '2px' : '1px',
              backgroundColor: isSelected ? 'hsl(var(--bg-surface-alt))' : 'hsl(var(--bg-surface))',
              gap: '4px',
            }}
          >
            <span style={{
              fontSize: 'var(--text-sm-font-size)',
              fontWeight: 600,
              color: 'hsl(var(--text-primary))',
              fontFamily: "'Manrope', sans-serif",
            }}>
              {t.name}
            </span>
            {t.description && (
              <span
                className="truncate"
                style={{
                  fontSize: 'var(--text-xs-font-size)',
                  color: 'hsl(var(--text-secondary))',
                  fontFamily: "'Manrope', sans-serif",
                  width: '100%',
                }}
              >
                {t.description}
              </span>
            )}
            <span style={{
              fontSize: 'var(--text-xs-font-size)',
              color: 'hsl(var(--text-muted))',
              fontFamily: "'Manrope', sans-serif",
            }}>
              {filledCount > 0
                ? `${filledCount} / ${t.max_positions} positions filled`
                : `${t.max_positions} positions`
              }
            </span>
          </button>
        )
      })}
    </div>
  )
}
