import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import type { ThemeStatus } from '@cmsmasters/db'

const variants: Record<ThemeStatus, { bg: string; dot: string; label: string }> = {
  draft: {
    bg: 'hsl(var(--status-warn-bg))',
    dot: 'hsl(var(--status-warn-fg))',
    label: 'Draft',
  },
  published: {
    bg: 'hsl(var(--status-success-bg))',
    dot: 'hsl(var(--status-success-fg))',
    label: 'Published',
  },
  archived: {
    bg: 'hsl(var(--bg-surface-alt))',
    dot: 'hsl(var(--text-muted))',
    label: 'Archived',
  },
}

const statuses: ThemeStatus[] = ['draft', 'published', 'archived']

interface StatusSelectProps {
  value: ThemeStatus
  onChange: (value: ThemeStatus) => void
}

export function StatusSelect({ value, onChange }: StatusSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const v = variants[value]

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center border-0 bg-transparent"
        style={{
          gap: 'var(--spacing-xs)',
          cursor: 'pointer',
          padding: '4px 8px 4px 4px',
          borderRadius: 'var(--rounded-md)',
        }}
      >
        <span
          className="inline-flex items-center shrink-0"
          style={{
            backgroundColor: v.bg,
            borderRadius: '9999px',
            padding: '6px',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '9999px',
              backgroundColor: v.dot,
            }}
          />
        </span>
        <span style={{
          fontSize: 'var(--text-sm-font-size)',
          color: 'hsl(var(--text-primary))',
          fontWeight: 'var(--font-weight-medium)',
        }}>
          {v.label}
        </span>
        <ChevronDown size={14} style={{ color: 'hsl(var(--text-muted))' }} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '4px',
            backgroundColor: 'hsl(var(--bg-surface))',
            border: '1px solid hsl(var(--border-default))',
            borderRadius: 'var(--rounded-lg)',
            boxShadow: 'var(--shadow-md)',
            padding: '4px',
            zIndex: 50,
            minWidth: '140px',
          }}
        >
          {statuses.map((s) => {
            const sv = variants[s]
            const isActive = s === value
            return (
              <button
                key={s}
                type="button"
                onClick={() => { onChange(s); setOpen(false) }}
                className="flex items-center w-full border-0 bg-transparent"
                style={{
                  gap: 'var(--spacing-sm)',
                  padding: '6px 8px',
                  borderRadius: 'var(--rounded-md)',
                  cursor: 'pointer',
                  backgroundColor: isActive ? 'hsl(var(--bg-surface-alt))' : 'transparent',
                }}
              >
                <span
                  className="inline-flex items-center shrink-0"
                  style={{
                    backgroundColor: sv.bg,
                    borderRadius: '9999px',
                    padding: '5px',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '9999px',
                      backgroundColor: sv.dot,
                    }}
                  />
                </span>
                <span style={{
                  fontSize: 'var(--text-sm-font-size)',
                  color: 'hsl(var(--text-primary))',
                  fontWeight: isActive ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
                }}>
                  {sv.label}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
