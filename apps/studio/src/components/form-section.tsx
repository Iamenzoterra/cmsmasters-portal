import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

interface FormSectionProps {
  title: string
  children: ReactNode
  defaultOpen?: boolean
  /** When set, collapsed/expanded state persists to localStorage under this key */
  storageKey?: string
}

function readStored(key: string | undefined, fallback: boolean): boolean {
  if (!key) return fallback
  try {
    const v = localStorage.getItem(`section:${key}`)
    if (v === '0') return false
    if (v === '1') return true
  } catch { /* SSR / quota */ }
  return fallback
}

export function FormSection({ title, children, defaultOpen = true, storageKey }: FormSectionProps) {
  const [open, setOpen] = useState(() => readStored(storageKey, defaultOpen))

  function toggle() {
    const next = !open
    setOpen(next)
    if (storageKey) {
      try { localStorage.setItem(`section:${storageKey}`, next ? '1' : '0') } catch { /* quota */ }
    }
  }

  return (
    <div
      className="border"
      style={{
        borderColor: 'hsl(var(--border-default))',
        borderRadius: 'var(--rounded-xl)',
        backgroundColor: 'hsl(var(--bg-surface))',
      }}
    >
      <button
        type="button"
        onClick={toggle}
        className="flex w-full cursor-pointer items-center justify-between border-0 bg-transparent"
        style={{
          padding: 'var(--spacing-lg) var(--spacing-xl)',
        }}
      >
        <span
          style={{
            fontSize: 'var(--text-base-font-size)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'hsl(var(--text-primary))',
          }}
        >
          {title}
        </span>
        <ChevronDown
          size={18}
          style={{
            color: 'hsl(var(--text-muted))',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 150ms',
          }}
        />
      </button>
      {open && (
        <div
          style={{
            padding: '0 var(--spacing-xl) var(--spacing-xl)',
          }}
        >
          <div className="flex flex-col" style={{ gap: 'var(--spacing-md)' }}>
            {children}
          </div>
        </div>
      )}
    </div>
  )
}
