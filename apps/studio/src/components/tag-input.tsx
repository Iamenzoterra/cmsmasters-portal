import { useState, useRef, useEffect, useCallback, useId } from 'react'
import { Plus, X } from 'lucide-react'

export interface TagInputItem {
  id: string
  name: string
  slug: string
}

export interface TagInputProps {
  /** All available items (fallback when no search) */
  items: TagInputItem[]
  /** Currently selected item IDs */
  selectedIds: string[]
  /** Called when selection changes */
  onChange: (ids: string[]) => void
  /** Search items by query (debounced ILIKE) */
  onSearch: (query: string) => Promise<TagInputItem[]>
  /** Create a new item from typed text */
  onCreate: (name: string) => Promise<TagInputItem>
  /** Permanently delete an item */
  onDelete: (id: string) => Promise<void>
  /** Placeholder text */
  placeholder?: string
}

export function TagInput({
  items,
  selectedIds,
  onChange,
  onSearch,
  onCreate,
  onDelete,
  placeholder = 'Add use case...',
}: TagInputProps) {
  const uid = useId()
  const listboxId = `${uid}-listbox`
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TagInputItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const [creating, setCreating] = useState(false)
  const [popoverId, setPopoverId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [popoverPos, setPopoverPos] = useState<{ top: number; right: number } | null>(null)

  // Resolve selected items for chip display
  const selectedItems = selectedIds
    .map((id) => items.find((i) => i.id === id))
    .filter((i): i is TagInputItem => i != null)

  // Check if typed text already exists (case-insensitive)
  const trimmed = query.trim()
  const exactMatch = trimmed
    ? results.some((r) => r.name.toLowerCase() === trimmed.toLowerCase()) ||
      items.some((i) => i.name.toLowerCase() === trimmed.toLowerCase())
    : true
  const showCreate = trimmed.length >= 2 && !exactMatch && !creating

  // Build dropdown options: filtered results + optional create
  const filteredResults = results.filter((r) => !selectedIds.includes(r.id))
  const disabledResults = results.filter((r) => selectedIds.includes(r.id))
  const totalOptions = filteredResults.length + disabledResults.length + (showCreate ? 1 : 0)

  // Debounced search
  useEffect(() => {
    if (trimmed.length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }

    const timer = setTimeout(() => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setIsLoading(true)
      onSearch(trimmed)
        .then((data) => {
          if (!controller.signal.aborted) {
            setResults(data)
            setIsOpen(true)
            setHighlightIdx(-1)
            setIsLoading(false)
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setIsLoading(false)
          }
        })
    }, 250)

    return () => {
      clearTimeout(timer)
      abortRef.current?.abort()
    }
  }, [trimmed, onSearch])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setPopoverId(null)
        setConfirmDeleteId(null)
        setPopoverPos(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectItem = useCallback(
    (item: TagInputItem) => {
      if (selectedIds.includes(item.id)) return
      onChange([...selectedIds, item.id])
      setQuery('')
      setIsOpen(false)
      setResults([])
      inputRef.current?.focus()
    },
    [selectedIds, onChange],
  )

  const handleCreate = useCallback(async () => {
    if (!trimmed || creating) return
    setCreating(true)
    try {
      const created = await onCreate(trimmed)
      onChange([...selectedIds, created.id])
      setQuery('')
      setIsOpen(false)
      setResults([])
    } catch {
      // toast handled by parent
    } finally {
      setCreating(false)
      inputRef.current?.focus()
    }
  }, [trimmed, creating, onCreate, selectedIds, onChange])

  function handleRemoveFromTheme(id: string) {
    onChange(selectedIds.filter((sid) => sid !== id))
    setPopoverId(null)
    setConfirmDeleteId(null)
    setPopoverPos(null)
    inputRef.current?.focus()
  }

  async function handleDeleteEverywhere(id: string) {
    try {
      await onDelete(id)
      onChange(selectedIds.filter((sid) => sid !== id))
    } catch {
      // toast handled by parent
    }
    setPopoverId(null)
    setConfirmDeleteId(null)
    setPopoverPos(null)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) {
      if (e.key === 'ArrowDown' && trimmed.length >= 2) {
        setIsOpen(true)
        e.preventDefault()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightIdx((prev) => Math.min(prev + 1, totalOptions - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightIdx((prev) => (prev <= 0 ? -1 : prev - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (highlightIdx >= 0 && highlightIdx < filteredResults.length) {
          selectItem(filteredResults[highlightIdx])
        } else if (
          showCreate &&
          highlightIdx === filteredResults.length + disabledResults.length
        ) {
          handleCreate()
        } else if (filteredResults.length > 0 && highlightIdx === -1) {
          selectItem(filteredResults[0])
        } else if (showCreate && highlightIdx === -1) {
          handleCreate()
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        break
    }
  }

  const activeDescendant =
    highlightIdx >= 0 ? `${uid}-option-${highlightIdx}` : undefined

  return (
    <div ref={containerRef} className="flex flex-col" style={{ gap: 'var(--spacing-sm)', position: 'relative' }}>
      {/* Chips */}
      {selectedItems.length > 0 && (
        <div
          className="flex flex-wrap"
          role="list"
          aria-label="Selected use cases"
          style={{ gap: '6px', maxHeight: '120px', overflowY: 'auto' }}
        >
          {selectedItems.map((item) => (
            <div
              key={item.id}
              role="listitem"
              className="inline-flex items-center"
              style={{
                backgroundColor: 'hsl(var(--bg-surface-alt))',
                color: 'hsl(var(--text-secondary))',
                borderRadius: '9999px',
                padding: '2px 4px 2px 8px',
                fontSize: '11px',
                fontWeight: 'var(--font-weight-medium)',
                height: '24px',
                maxWidth: '100%',
                whiteSpace: 'nowrap',
                position: 'relative',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                {item.name}
              </span>
              <button
                type="button"
                aria-label={`Remove ${item.name}`}
                onClick={(e) => {
                  e.stopPropagation()
                  if (popoverId === item.id) {
                    setPopoverId(null)
                    setConfirmDeleteId(null)
                    setPopoverPos(null)
                  } else {
                    // Calculate position relative to the TagInput container
                    const btn = e.currentTarget
                    const container = containerRef.current
                    if (container) {
                      const btnRect = btn.getBoundingClientRect()
                      const containerRect = container.getBoundingClientRect()
                      setPopoverPos({
                        top: btnRect.bottom - containerRect.top + 4,
                        right: containerRect.right - btnRect.right,
                      })
                    }
                    setPopoverId(item.id)
                    setConfirmDeleteId(null)
                  }
                }}
                className="inline-flex items-center justify-center"
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '9999px',
                  background: 'transparent',
                  color: 'hsl(var(--text-muted))',
                  cursor: 'pointer',
                  flexShrink: 0,
                  border: 'none',
                  padding: '0',
                  // Expand hit area
                  margin: '-4px -4px -4px 0',
                  boxSizing: 'content-box',
                  paddingInline: '4px',
                  paddingBlock: '4px',
                  transition: 'background-color 150ms ease, color 150ms ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'hsl(var(--status-error-fg) / 0.12)'
                  e.currentTarget.style.color = 'hsl(var(--status-error-fg))'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = 'hsl(var(--text-muted))'
                }}
              >
                <X size={10} />
              </button>

            </div>
          ))}
        </div>
      )}

      {/* Delete popover — rendered at container level to avoid overflow clipping */}
      {popoverId && popoverPos && (() => {
        const popoverItem = selectedItems.find((i) => i.id === popoverId)
        if (!popoverItem) return null
        return (
          <div
            style={{
              position: 'absolute',
              top: `${popoverPos.top}px`,
              right: `${popoverPos.right}px`,
              zIndex: 60,
              backgroundColor: 'hsl(var(--bg-surface))',
              border: '1px solid hsl(var(--border-default))',
              borderRadius: 'var(--rounded-lg)',
              boxShadow: 'var(--shadow-md)',
              padding: '4px',
              minWidth: '160px',
              maxWidth: '200px',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setPopoverId(null)
                setConfirmDeleteId(null)
                setPopoverPos(null)
              }
            }}
          >
            {/* Close button */}
            <button
              type="button"
              aria-label="Close"
              onClick={() => {
                setPopoverId(null)
                setConfirmDeleteId(null)
                setPopoverPos(null)
              }}
              style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--rounded-md)',
                border: 'none',
                background: 'transparent',
                color: 'hsl(var(--text-muted))',
                cursor: 'pointer',
                transition: 'background-color 100ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'hsl(var(--bg-surface-alt))' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              <X size={12} />
            </button>
            {confirmDeleteId === popoverId ? (
              <div className="flex flex-col" style={{ gap: '4px', padding: '4px' }}>
                <span
                  style={{
                    fontSize: 'var(--text-xs-font-size)',
                    color: 'hsl(var(--foreground))',
                    fontWeight: 'var(--font-weight-medium)',
                    lineHeight: '1.4',
                  }}
                >
                  Delete &ldquo;{popoverItem.name}&rdquo; from all themes?
                </span>
                <div className="flex" style={{ gap: '4px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    style={{
                      flex: 1,
                      padding: '4px 8px',
                      borderRadius: 'var(--rounded-md)',
                      border: '1px solid hsl(var(--border-default))',
                      background: 'transparent',
                      fontSize: 'var(--text-xs-font-size)',
                      color: 'hsl(var(--text-secondary))',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteEverywhere(popoverId)}
                    style={{
                      flex: 1,
                      padding: '4px 8px',
                      borderRadius: 'var(--rounded-md)',
                      border: 'none',
                      background: 'hsl(var(--status-error-fg))',
                      color: 'hsl(var(--primary-foreground))',
                      fontSize: 'var(--text-xs-font-size)',
                      fontWeight: 'var(--font-weight-medium)',
                      cursor: 'pointer',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <>
                <PopoverOption
                  label="Remove from this theme"
                  onClick={() => handleRemoveFromTheme(popoverId)}
                />
                <PopoverOption
                  label="Delete everywhere"
                  destructive
                  onClick={() => setConfirmDeleteId(popoverId)}
                />
              </>
            )}
          </div>
        )
      })()}

      {/* Input + Dropdown wrapper */}
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={activeDescendant}
          aria-autocomplete="list"
          aria-label="Add perfect-for use case"
          value={query}
          placeholder={placeholder}
          disabled={creating}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (trimmed.length >= 2 && results.length > 0) setIsOpen(true)
          }}
          style={{
            width: '100%',
            height: '32px',
            padding: '0 var(--spacing-sm)',
            backgroundColor: 'hsl(var(--input))',
            border: '1px solid hsl(var(--border-default))',
            borderRadius: 'var(--rounded-md)',
            fontSize: 'var(--text-sm-font-size)',
            color: 'hsl(var(--foreground))',
            outline: 'none',
            transition: 'border-color 150ms ease, box-shadow 150ms ease',
          }}
          onFocusCapture={(e) => {
            e.currentTarget.style.borderColor = 'hsl(var(--primary))'
            e.currentTarget.style.boxShadow = '0 0 0 2px hsl(var(--primary) / 0.15)'
          }}
          onBlurCapture={(e) => {
            e.currentTarget.style.borderColor = 'hsl(var(--border-default))'
            e.currentTarget.style.boxShadow = 'none'
          }}
        />

        {/* Dropdown */}
        {isOpen && (
          <div
            id={listboxId}
            role="listbox"
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              zIndex: 50,
              backgroundColor: 'hsl(var(--bg-surface))',
              border: '1px solid hsl(var(--border-default))',
              borderRadius: 'var(--rounded-lg)',
              boxShadow: 'var(--shadow-md)',
              maxHeight: '200px',
              overflowY: 'auto',
              padding: '4px',
            }}
          >
            {isLoading ? (
              <div
                className="flex items-center justify-center"
                style={{
                  padding: '12px 8px',
                  gap: '8px',
                  fontSize: 'var(--text-sm-font-size)',
                  color: 'hsl(var(--text-muted))',
                }}
              >
                <Spinner />
                Searching...
              </div>
            ) : (
              <>
                {/* Selectable items */}
                {filteredResults.map((item, idx) => (
                  <div
                    key={item.id}
                    id={`${uid}-option-${idx}`}
                    role="option"
                    aria-selected={highlightIdx === idx}
                    onClick={() => selectItem(item)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '6px 8px',
                      borderRadius: 'var(--rounded-md)',
                      fontSize: 'var(--text-sm-font-size)',
                      color: 'hsl(var(--foreground))',
                      cursor: 'pointer',
                      backgroundColor:
                        highlightIdx === idx ? 'hsl(var(--bg-surface-alt))' : 'transparent',
                      transition: 'background-color 100ms ease',
                    }}
                    onMouseEnter={() => setHighlightIdx(idx)}
                  >
                    {item.name}
                  </div>
                ))}

                {/* Already selected (dimmed) */}
                {disabledResults.map((item, idx) => (
                  <div
                    key={item.id}
                    id={`${uid}-option-${filteredResults.length + idx}`}
                    role="option"
                    aria-selected={false}
                    aria-disabled
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '6px 8px',
                      borderRadius: 'var(--rounded-md)',
                      fontSize: 'var(--text-sm-font-size)',
                      color: 'hsl(var(--text-muted))',
                      opacity: 0.5,
                      cursor: 'default',
                    }}
                  >
                    {item.name}
                  </div>
                ))}

                {/* Create option */}
                {showCreate && (
                  <>
                    {(filteredResults.length > 0 || disabledResults.length > 0) && (
                      <div
                        style={{
                          height: '1px',
                          backgroundColor: 'hsl(var(--border))',
                          margin: '4px 0',
                        }}
                      />
                    )}
                    <div
                      id={`${uid}-option-${filteredResults.length + disabledResults.length}`}
                      role="option"
                      aria-selected={
                        highlightIdx === filteredResults.length + disabledResults.length
                      }
                      onClick={handleCreate}
                      className="flex items-center"
                      style={{
                        gap: '6px',
                        padding: '6px 8px',
                        borderRadius: 'var(--rounded-md)',
                        fontSize: 'var(--text-sm-font-size)',
                        color: 'hsl(var(--primary))',
                        fontWeight: 'var(--font-weight-medium)',
                        cursor: 'pointer',
                        backgroundColor:
                          highlightIdx === filteredResults.length + disabledResults.length
                            ? 'hsl(var(--primary) / 0.06)'
                            : 'transparent',
                        transition: 'background-color 100ms ease',
                      }}
                      onMouseEnter={() =>
                        setHighlightIdx(filteredResults.length + disabledResults.length)
                      }
                    >
                      <Plus size={14} style={{ flexShrink: 0 }} />
                      <span>
                        Create &ldquo;<strong>{trimmed}</strong>&rdquo;
                      </span>
                    </div>
                  </>
                )}

                {/* Empty state: no results AND can't create */}
                {filteredResults.length === 0 &&
                  disabledResults.length === 0 &&
                  !showCreate && (
                    <div
                      style={{
                        padding: '12px 8px',
                        textAlign: 'center',
                        fontSize: 'var(--text-sm-font-size)',
                        color: 'hsl(var(--text-muted))',
                        fontStyle: 'italic',
                      }}
                    >
                      No matching use cases
                    </div>
                  )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Internal components ── */

function PopoverOption({
  label,
  destructive,
  onClick,
}: {
  label: string
  destructive?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        padding: '6px 8px',
        borderRadius: 'var(--rounded-md)',
        border: 'none',
        background: 'transparent',
        fontSize: 'var(--text-sm-font-size)',
        fontWeight: destructive ? 'var(--font-weight-medium)' : '400',
        color: destructive ? 'hsl(var(--status-error-fg))' : 'hsl(var(--foreground))',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background-color 100ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = destructive
          ? 'hsl(var(--status-error-fg) / 0.08)'
          : 'hsl(var(--bg-surface-alt))'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      {label}
    </button>
  )
}

function Spinner() {
  return (
    <div
      style={{
        width: '14px',
        height: '14px',
        border: '2px solid hsl(var(--border))',
        borderTopColor: 'hsl(var(--primary))',
        borderRadius: '9999px',
        animation: 'spin 600ms linear infinite',
        flexShrink: 0,
      }}
    />
  )
}
