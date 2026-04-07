import { useState, useRef, useEffect } from 'react'
import { Pencil, Trash2, Check, X } from 'lucide-react'
import { Button } from '@cmsmasters/ui'
import { StyledSelect } from './styled-select'
import { DeleteConfirmModal } from './delete-confirm-modal'

interface TaxonomyItem {
  id: string
  name: string
  slug: string
  type?: string
}

interface TaxonomyListProps {
  items: TaxonomyItem[]
  loading: boolean
  onAdd: (name: string, slug: string, type?: string) => Promise<void>
  onUpdate: (id: string, name: string, slug: string, type?: string) => Promise<void>
  onDelete: (id: string, name: string) => Promise<void>
  /** When provided, shows a type selector with these options */
  typeOptions?: string[]
}

function nameToSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

const inputStyle: React.CSSProperties = {
  height: '36px',
  padding: '0 var(--spacing-sm)',
  backgroundColor: 'hsl(var(--input))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 'var(--rounded-lg)',
  boxShadow: 'var(--shadow-xs)',
  fontSize: 'var(--text-sm-font-size)',
  color: 'hsl(var(--foreground))',
}


export function TaxonomyList({ items, loading, onAdd, onUpdate, onDelete, typeOptions }: TaxonomyListProps) {
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState(typeOptions?.[0] ?? '')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editType, setEditType] = useState('')
  const [deleteItem, setDeleteItem] = useState<TaxonomyItem | null>(null)
  const addInputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingId && editInputRef.current) editInputRef.current.focus()
  }, [editingId])

  async function handleAdd() {
    const name = newName.trim()
    if (!name) return
    setAdding(true)
    try {
      await onAdd(name, nameToSlug(name), typeOptions ? newType : undefined)
      setNewName('')
      addInputRef.current?.focus()
    } finally {
      setAdding(false)
    }
  }

  function startEdit(item: TaxonomyItem) {
    setEditingId(item.id)
    setEditName(item.name)
    setEditType(item.type ?? typeOptions?.[0] ?? '')
  }

  async function handleSaveEdit() {
    if (!editingId) return
    const name = editName.trim()
    if (!name) return
    try {
      await onUpdate(editingId, name, nameToSlug(name), typeOptions ? editType : undefined)
    } finally {
      setEditingId(null)
    }
  }

  function cancelEdit() {
    setEditingId(null)
  }

  if (loading) {
    return (
      <p style={{ fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--text-muted))' }}>
        Loading...
      </p>
    )
  }

  return (
    <div className="flex flex-col" style={{ gap: 'var(--spacing-md)' }}>
      {/* Add row */}
      <div className="flex items-center" style={{ gap: 'var(--spacing-sm)' }}>
        <input
          ref={addInputRef}
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
          placeholder="New item name..."
          className="flex-1 outline-none"
          style={inputStyle}
          disabled={adding}
        />
        {typeOptions && (
          <StyledSelect compact value={newType} onChange={(e) => setNewType(e.target.value)}>
            {typeOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </StyledSelect>
        )}
        <Button variant="primary" size="sm" onClick={handleAdd} disabled={!newName.trim() || adding}>
          Add
        </Button>
      </div>

      {newName.trim() && (
        <p style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))', margin: 0, marginTop: '-8px' }}>
          Slug: {nameToSlug(newName)}
        </p>
      )}

      {/* Items */}
      {items.length === 0 ? (
        <p style={{ fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--text-muted))', textAlign: 'center', padding: 'var(--spacing-xl) 0' }}>
          No items yet. Add one above.
        </p>
      ) : (
        <div className="flex flex-col" style={{ border: '1px solid hsl(var(--border-default))', borderRadius: 'var(--rounded-lg)', overflow: 'hidden' }}>
          {items.map((item, i) => (
            <div
              key={item.id}
              className="flex items-center justify-between"
              style={{
                padding: 'var(--spacing-sm) var(--spacing-md)',
                borderTop: i > 0 ? '1px solid hsl(var(--border-default))' : undefined,
                backgroundColor: editingId === item.id ? 'hsl(var(--bg-surface-alt))' : undefined,
              }}
            >
              {editingId === item.id ? (
                /* Edit mode */
                <div className="flex flex-1 items-center" style={{ gap: 'var(--spacing-sm)' }}>
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit()
                      if (e.key === 'Escape') cancelEdit()
                    }}
                    className="flex-1 outline-none"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  {typeOptions && (
                    <StyledSelect compact value={editType} onChange={(e) => setEditType(e.target.value)}>
                      {typeOptions.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </StyledSelect>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="flex items-center border-0 bg-transparent p-1"
                    style={{ color: 'hsl(var(--status-success-fg))', cursor: 'pointer' }}
                  >
                    <Check size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex items-center border-0 bg-transparent p-1"
                    style={{ color: 'hsl(var(--text-muted))', cursor: 'pointer' }}
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                /* Display mode */
                <>
                  <div className="flex flex-col" style={{ gap: '2px' }}>
                    <span style={{ fontSize: 'var(--text-sm-font-size)', color: 'hsl(var(--text-primary))', fontWeight: 'var(--font-weight-medium)' }}>
                      {item.name}
                    </span>
                    <div className="flex items-center" style={{ gap: '6px' }}>
                      <span style={{ fontSize: 'var(--text-xs-font-size)', color: 'hsl(var(--text-muted))' }}>
                        {item.slug}
                      </span>
                      {item.type && (
                        <span
                          style={{
                            fontSize: 'var(--text-xs-font-size)',
                            color: item.type === 'discount' ? 'hsl(var(--status-warn-fg))' : 'hsl(var(--text-secondary))',
                            backgroundColor: item.type === 'discount' ? 'hsl(var(--status-warn-bg))' : 'hsl(var(--bg-surface-alt))',
                            borderRadius: '9999px',
                            padding: '1px 8px',
                            fontWeight: 'var(--font-weight-medium)',
                          }}
                        >
                          {item.type}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center" style={{ gap: 'var(--spacing-xs)' }}>
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="flex items-center border-0 bg-transparent p-1"
                      style={{ color: 'hsl(var(--text-secondary))', cursor: 'pointer' }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteItem(item)}
                      className="flex items-center border-0 bg-transparent p-1"
                      style={{ color: 'hsl(var(--status-error-fg))', cursor: 'pointer' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm */}
      {deleteItem && (
        <DeleteConfirmModal
          title="Delete item"
          itemName={deleteItem.name}
          onConfirm={async () => {
            await onDelete(deleteItem.id, deleteItem.name)
            setDeleteItem(null)
          }}
          onCancel={() => setDeleteItem(null)}
        />
      )}
    </div>
  )
}
