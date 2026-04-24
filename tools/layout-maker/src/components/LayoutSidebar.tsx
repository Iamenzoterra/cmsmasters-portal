import { useRef, useState } from 'react'
import type { LayoutSummary, ScopeEntry } from '../lib/types'
import { api } from '../lib/api-client'

interface Props {
  layouts: LayoutSummary[]
  activeId: string | null
  scopes: ScopeEntry[]
  view: 'layouts' | 'scopes'
  errorCount?: number
  onSelect: (id: string) => void
  onRefresh: () => void
  onExport: () => void
  onNavigate: (view: 'layouts' | 'scopes') => void
}

type DialogState =
  | { mode: 'new'; name: string; scope: string }
  | { mode: 'clone'; name: string; scope: string }
  | { mode: 'import'; html: string; name: string; scope: string }
  | { mode: 'rename'; targetId: string; name: string; scope: string }

export function LayoutSidebar({
  layouts,
  activeId,
  scopes,
  view,
  errorCount = 0,
  onSelect,
  onRefresh,
  onExport,
  onNavigate,
}: Props) {
  const importInputRef = useRef<HTMLInputElement>(null)
  const [dialog, setDialog] = useState<DialogState | null>(null)

  function guardScopesConfigured(): boolean {
    if (scopes.length === 0) {
      alert('No scopes registered. Add one in Scopes first.')
      onNavigate('scopes')
      return false
    }
    return true
  }

  function handleNewClick() {
    if (!guardScopesConfigured()) return
    setDialog({ mode: 'new', name: '', scope: scopes[0].id })
  }

  function handleCloneClick() {
    if (!activeId || !guardScopesConfigured()) return
    const src = layouts.find((l) => l.id === activeId)
    setDialog({
      mode: 'clone',
      name: src ? `${src.name} (copy)` : '',
      scope: src?.scope ?? scopes[0].id,
    })
  }

  function handleRenameClick() {
    if (!activeId || !guardScopesConfigured()) return
    const src = layouts.find((l) => l.id === activeId)
    if (!src) return
    const scope = scopes.some((s) => s.id === src.scope) ? src.scope : scopes[0].id
    setDialog({ mode: 'rename', targetId: src.id, name: src.name, scope })
  }

  async function handleDelete() {
    if (!activeId) return
    const src = layouts.find((l) => l.id === activeId)
    const label = src ? `"${src.name}"` : activeId
    if (!window.confirm(`Delete layout ${label}?`)) return

    try {
      await api.deleteLayout(activeId)
      onRefresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete layout')
    }
  }

  function handleImportClick() {
    if (!guardScopesConfigured()) return
    importInputRef.current?.click()
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const baseName = file.name.replace(/\.html?$/i, '')
    const html = await file.text()
    setDialog({
      mode: 'import',
      html,
      name: baseName,
      scope: scopes[0]?.id ?? '',
    })
    e.target.value = ''
  }

  async function handleConfirm() {
    if (!dialog) return
    const { mode, name, scope } = dialog
    if (!name.trim() || !scope) return

    try {
      if (mode === 'new') {
        const created = await api.createLayout({ name: name.trim(), scope })
        setDialog(null)
        onRefresh()
        if (created.id) onSelect(created.id)
      } else if (mode === 'clone') {
        if (!activeId) return
        const created = await api.cloneLayout(activeId, { name: name.trim(), scope })
        setDialog(null)
        onRefresh()
        if (created.id) onSelect(created.id)
      } else if (mode === 'import') {
        const created = await api.importLayout({ html: dialog.html, name: name.trim(), scope })
        setDialog(null)
        onRefresh()
        if (created.id) onSelect(created.id)
      } else {
        // rename — PUT existing layout with new name + scope
        const current = await api.getLayout(dialog.targetId)
        const updated = { ...current, name: name.trim(), scope }
        await api.updateLayout(dialog.targetId, updated)
        setDialog(null)
        onRefresh()
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Operation failed')
    }
  }

  const dialogTitle =
    dialog?.mode === 'new' ? 'New Layout'
    : dialog?.mode === 'clone' ? 'Clone Layout'
    : dialog?.mode === 'import' ? 'Import Layout'
    : dialog?.mode === 'rename' ? 'Rename Layout'
    : ''

  return (
    <div className="lm-sidebar">
      <div className="lm-sidebar__nav">
        <button
          className={`lm-sidebar__nav-btn ${view === 'layouts' ? 'lm-sidebar__nav-btn--active' : ''}`}
          onClick={() => onNavigate('layouts')}
        >
          Layouts
        </button>
        <button
          className={`lm-sidebar__nav-btn ${view === 'scopes' ? 'lm-sidebar__nav-btn--active' : ''}`}
          onClick={() => onNavigate('scopes')}
        >
          Scopes
        </button>
      </div>

      {view === 'layouts' && (
        <>
          <div className="lm-sidebar__list">
            {layouts.map((layout) => {
              const scopeEntry = scopes.find((s) => s.id === layout.scope)
              return (
                <div
                  key={layout.id}
                  className={`lm-sidebar__item ${layout.id === activeId ? 'lm-sidebar__item--active' : ''}`}
                  onClick={() => onSelect(layout.id)}
                >
                  <div className="lm-sidebar__item-name">{layout.name}</div>
                  <div className="lm-sidebar__item-scope">
                    {scopeEntry ? scopeEntry.label : layout.scope}
                  </div>
                </div>
              )
            })}

            {layouts.length === 0 && (
              <div className="lm-sidebar__item" style={{ cursor: 'default', color: 'var(--lm-text-muted)' }}>
                No layouts yet
              </div>
            )}
          </div>

          <div className="lm-sidebar__actions">
            <div className="lm-sidebar__group">
              <div className="lm-sidebar__group-label">Create</div>
              <div className="lm-sidebar__group-row">
                <button className="lm-btn lm-btn--primary" onClick={handleNewClick}>New</button>
                <button className="lm-btn" onClick={handleCloneClick} disabled={!activeId}>Clone</button>
              </div>
            </div>

            <div className="lm-sidebar__group">
              <div className="lm-sidebar__group-label">Transfer</div>
              <div className="lm-sidebar__group-row">
                <button
                  className="lm-btn lm-btn--primary"
                  onClick={onExport}
                  disabled={!activeId}
                  aria-describedby={errorCount > 0 ? 'lm-validation-summary' : undefined}
                >
                  {errorCount > 0 ? `Export (${errorCount} errors)` : 'Export'}
                </button>
                <button className="lm-btn lm-btn--ghost" onClick={handleImportClick}>Import</button>
              </div>
            </div>

            <div className="lm-sidebar__group">
              <div className="lm-sidebar__group-label">Manage</div>
              <div className="lm-sidebar__group-row">
                <button className="lm-btn" onClick={handleRenameClick} disabled={!activeId}>Rename</button>
              </div>
              <div className="lm-sidebar__group-row lm-sidebar__group-row--danger">
                <button className="lm-btn lm-btn--danger" onClick={handleDelete} disabled={!activeId}>Delete</button>
              </div>
            </div>

            <input
              ref={importInputRef}
              type="file"
              accept=".html,.htm"
              style={{ display: 'none' }}
              onChange={handleImportFile}
            />
          </div>
        </>
      )}

      {dialog && (
        <div className="lm-dialog-overlay" onClick={(e) => e.target === e.currentTarget && setDialog(null)}>
          <div className="lm-dialog">
            <div className="lm-dialog__header">{dialogTitle}</div>
            <div className="lm-dialog__body">
              <label className="lm-dialog__field">
                <span className="lm-dialog__label">Name</span>
                <input
                  type="text"
                  className="lm-settings__input"
                  value={dialog.name}
                  onChange={(e) => setDialog({ ...dialog, name: e.target.value })}
                  autoFocus
                />
              </label>
              <label className="lm-dialog__field">
                <span className="lm-dialog__label">Scope</span>
                <select
                  className="lm-settings__input"
                  value={dialog.scope}
                  onChange={(e) => setDialog({ ...dialog, scope: e.target.value })}
                >
                  {scopes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label} ({s.id})
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="lm-dialog__actions">
              <button className="lm-btn" onClick={() => setDialog(null)}>Cancel</button>
              <button
                className="lm-btn lm-btn--primary"
                onClick={handleConfirm}
                disabled={!dialog.name.trim() || !dialog.scope}
              >
                {dialog.mode === 'rename' ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
