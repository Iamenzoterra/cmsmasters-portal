import { useRef, useState } from 'react'
import type { LayoutSummary, ScopeEntry } from '../lib/types'
import { api } from '../lib/api-client'

interface Props {
  layouts: LayoutSummary[]
  activeScope: string | null
  scopes: ScopeEntry[]
  view: 'layouts' | 'settings'
  onSelect: (scope: string) => void
  onRefresh: () => void
  onExport: () => void
  onNavigate: (view: 'layouts' | 'settings') => void
}

export function LayoutSidebar({
  layouts,
  activeScope,
  scopes,
  view,
  onSelect,
  onRefresh,
  onExport,
  onNavigate,
}: Props) {
  const importInputRef = useRef<HTMLInputElement>(null)
  const [createDialogState, setCreateDialogState] = useState<
    | null
    | { mode: 'new'; name: string; scope: string }
    | { mode: 'clone'; name: string; scope: string }
    | { mode: 'import'; html: string; name: string; scope: string }
  >(null)

  const availableScopes = scopes.filter(
    (s) => !layouts.some((l) => l.scope === s.id),
  )

  function handleNewClick() {
    if (availableScopes.length === 0) {
      alert('No free scopes available. Add a scope in Settings first.')
      onNavigate('settings')
      return
    }
    setCreateDialogState({ mode: 'new', name: '', scope: availableScopes[0].id })
  }

  function handleCloneClick() {
    if (!activeScope) return
    if (availableScopes.length === 0) {
      alert('No free scopes available. Add a scope in Settings first.')
      onNavigate('settings')
      return
    }
    setCreateDialogState({ mode: 'clone', name: '', scope: availableScopes[0].id })
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
    if (availableScopes.length === 0) {
      alert('No free scopes available. Add a scope in Settings first.')
      onNavigate('settings')
      return
    }
    importInputRef.current?.click()
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const baseName = file.name.replace(/\.html?$/i, '')
    const html = await file.text()
    setCreateDialogState({
      mode: 'import',
      html,
      name: baseName,
      scope: availableScopes[0]?.id ?? '',
    })
    e.target.value = ''
  }

  async function handleCreateConfirm() {
    if (!createDialogState) return
    const { mode, name, scope } = createDialogState
    if (!name.trim() || !scope) return

    try {
      if (mode === 'new') {
        await api.createLayout({ name: name.trim(), scope })
      } else if (mode === 'clone') {
        if (!activeScope) return
        await api.cloneLayout(activeScope, { name: name.trim(), scope })
      } else {
        await api.importLayout({ html: createDialogState.html, name: name.trim(), scope })
      }
      setCreateDialogState(null)
      onRefresh()
      onSelect(scope)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create layout')
    }
  }

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
          className={`lm-sidebar__nav-btn ${view === 'settings' ? 'lm-sidebar__nav-btn--active' : ''}`}
          onClick={() => onNavigate('settings')}
        >
          Settings
        </button>
      </div>

      {view === 'layouts' && (
        <>
          <div className="lm-sidebar__list">
            {layouts.map((layout) => {
              const scopeEntry = scopes.find((s) => s.id === layout.scope)
              return (
                <div
                  key={layout.scope}
                  className={`lm-sidebar__item ${layout.scope === activeScope ? 'lm-sidebar__item--active' : ''}`}
                  onClick={() => onSelect(layout.scope)}
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
            <button className="lm-btn lm-btn--primary" onClick={handleNewClick}>New</button>
            <button className="lm-btn" onClick={handleImportClick}>Import</button>
            <button className="lm-btn" onClick={handleCloneClick} disabled={!activeScope}>Clone</button>
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
        </>
      )}

      {createDialogState && (
        <div className="lm-dialog-overlay" onClick={(e) => e.target === e.currentTarget && setCreateDialogState(null)}>
          <div className="lm-dialog">
            <div className="lm-dialog__header">
              {createDialogState.mode === 'new' && 'New Layout'}
              {createDialogState.mode === 'clone' && 'Clone Layout'}
              {createDialogState.mode === 'import' && 'Import Layout'}
            </div>
            <div className="lm-dialog__body">
              <label className="lm-dialog__field">
                <span className="lm-dialog__label">Name</span>
                <input
                  type="text"
                  className="lm-settings__input"
                  value={createDialogState.name}
                  onChange={(e) => setCreateDialogState({ ...createDialogState, name: e.target.value })}
                  autoFocus
                />
              </label>
              <label className="lm-dialog__field">
                <span className="lm-dialog__label">Scope</span>
                <select
                  className="lm-settings__input"
                  value={createDialogState.scope}
                  onChange={(e) => setCreateDialogState({ ...createDialogState, scope: e.target.value })}
                >
                  {availableScopes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label} ({s.id})
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="lm-dialog__actions">
              <button className="lm-btn" onClick={() => setCreateDialogState(null)}>Cancel</button>
              <button
                className="lm-btn lm-btn--primary"
                onClick={handleCreateConfirm}
                disabled={!createDialogState.name.trim() || !createDialogState.scope}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
