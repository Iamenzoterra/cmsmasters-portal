import { useRef } from 'react'
import type { LayoutSummary } from '../lib/types'
import { api } from '../lib/api-client'

interface Props {
  layouts: LayoutSummary[]
  activeScope: string | null
  onSelect: (scope: string) => void
  onRefresh: () => void
  onExport: () => void
}

export function LayoutSidebar({ layouts, activeScope, onSelect, onRefresh, onExport }: Props) {
  const importInputRef = useRef<HTMLInputElement>(null)

  async function handleNew() {
    const name = window.prompt('Layout name:')
    if (!name) return
    const scope = window.prompt('Scope (lowercase, hyphens):')
    if (!scope) return

    try {
      await api.createLayout({ name, scope })
      onRefresh()
      onSelect(scope)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to create layout')
    }
  }

  async function handleClone() {
    if (!activeScope) return
    const name = window.prompt('New layout name:')
    if (!name) return
    const scope = window.prompt('New scope:')
    if (!scope) return

    try {
      await api.cloneLayout(activeScope, { name, scope })
      onRefresh()
      onSelect(scope)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to clone layout')
    }
  }

  async function handleDelete() {
    if (!activeScope) return
    if (!window.confirm(`Delete layout "${activeScope}"?`)) return

    try {
      await api.deleteLayout(activeScope)
      onRefresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete layout')
    }
  }

  function handleImportClick() {
    importInputRef.current?.click()
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Derive defaults from filename
    const baseName = file.name.replace(/\.html?$/i, '')
    const defaultScope = baseName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-')

    const name = window.prompt('Layout name:', baseName) ?? ''
    if (!name) return
    const scope = window.prompt('Scope (lowercase, hyphens):', defaultScope) ?? ''
    if (!scope) return

    try {
      const html = await file.text()
      await api.importLayout({ html, name, scope })
      onRefresh()
      onSelect(scope)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to import layout')
    }

    // Reset input so the same file can be re-imported
    e.target.value = ''
  }

  return (
    <div className="lm-sidebar">
      <div className="lm-sidebar__header">Layouts</div>

      <div className="lm-sidebar__list">
        {layouts.map((layout) => (
          <div
            key={layout.scope}
            className={`lm-sidebar__item ${layout.scope === activeScope ? 'lm-sidebar__item--active' : ''}`}
            onClick={() => onSelect(layout.scope)}
          >
            <div className="lm-sidebar__item-name">{layout.name}</div>
            <div className="lm-sidebar__item-scope">{layout.scope}</div>
          </div>
        ))}

        {layouts.length === 0 && (
          <div className="lm-sidebar__item" style={{ cursor: 'default', color: 'var(--lm-text-muted)' }}>
            No layouts yet
          </div>
        )}
      </div>

      <div className="lm-sidebar__actions">
        <button className="lm-btn lm-btn--primary" onClick={handleNew}>New</button>
        <button className="lm-btn" onClick={handleImportClick}>Import</button>
        <button className="lm-btn" onClick={handleClone} disabled={!activeScope}>Clone</button>
        <button className="lm-btn" onClick={onExport} disabled={!activeScope}>Export</button>
        <button className="lm-btn lm-btn--danger" onClick={handleDelete} disabled={!activeScope}>Delete</button>
        <input
          ref={importInputRef}
          type="file"
          accept=".html,.htm"
          style={{ display: 'none' }}
          onChange={handleImportFile}
        />
      </div>
    </div>
  )
}
