import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api-client'
import type { LMSettings, ScopeEntry } from '../lib/types'

interface Props {
  onShowToast: (message: string) => void
}

export { SettingsPage as ScopesPage }
export function SettingsPage({ onShowToast }: Props) {
  const [settings, setSettings] = useState<LMSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newId, setNewId] = useState('')
  const [newLabel, setNewLabel] = useState('')

  useEffect(() => {
    api
      .getSettings()
      .then((s) => {
        setSettings(s)
        setLoading(false)
      })
      .catch((e: Error) => {
        onShowToast(e.message)
        setLoading(false)
      })
  }, [onShowToast])

  const handleAdd = useCallback(async () => {
    if (!settings) return
    const id = newId.trim().toLowerCase()
    const label = newLabel.trim()
    if (!id || !label) {
      onShowToast('Both id and label are required')
      return
    }
    if (!/^[a-z0-9-]+$/.test(id)) {
      onShowToast('Id must be lowercase with hyphens only')
      return
    }
    if (settings.scopes.some((s) => s.id === id)) {
      onShowToast(`Scope "${id}" already exists`)
      return
    }
    const next: LMSettings = {
      scopes: [...settings.scopes, { id, label }],
    }
    setSaving(true)
    try {
      const saved = await api.updateSettings(next)
      setSettings(saved)
      setNewId('')
      setNewLabel('')
      onShowToast(`Added scope "${id}"`)
    } catch (e) {
      onShowToast(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [settings, newId, newLabel, onShowToast])

  const handleDelete = useCallback(async (id: string) => {
    if (!settings) return
    if (!window.confirm(`Remove scope "${id}"? Existing layouts with this scope will stay.`)) return
    const next: LMSettings = {
      scopes: settings.scopes.filter((s) => s.id !== id),
    }
    setSaving(true)
    try {
      const saved = await api.updateSettings(next)
      setSettings(saved)
      onShowToast(`Removed scope "${id}"`)
    } catch (e) {
      onShowToast(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [settings, onShowToast])

  const handleUpdateLabel = useCallback(async (id: string, label: string) => {
    if (!settings) return
    const next: LMSettings = {
      scopes: settings.scopes.map((s) => (s.id === id ? { ...s, label } : s)),
    }
    setSaving(true)
    try {
      const saved = await api.updateSettings(next)
      setSettings(saved)
    } catch (e) {
      onShowToast(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [settings, onShowToast])

  if (loading) return <div className="lm-settings__loading">Loading settings…</div>
  if (!settings) return <div className="lm-settings__loading">Failed to load settings</div>

  return (
    <div className="lm-settings">
      <div className="lm-settings__header">
        <h2 className="lm-settings__title">Scopes</h2>
        <p className="lm-settings__subtitle">
          Register scopes for layouts. Each scope maps to a portal query.
        </p>
      </div>

      <div className="lm-settings__section">
        <h3 className="lm-settings__section-title">Scopes</h3>

        <div className="lm-settings__table">
          <div className="lm-settings__table-head">
            <div>ID</div>
            <div>Label</div>
            <div></div>
          </div>
          {settings.scopes.length === 0 && (
            <div className="lm-settings__empty">No scopes defined. Add one below.</div>
          )}
          {settings.scopes.map((scope: ScopeEntry) => (
            <div key={scope.id} className="lm-settings__row">
              <code className="lm-settings__id">{scope.id}</code>
              <input
                type="text"
                className="lm-settings__input"
                defaultValue={scope.label}
                onBlur={(e) => {
                  const v = e.target.value.trim()
                  if (v && v !== scope.label) handleUpdateLabel(scope.id, v)
                }}
                disabled={saving}
              />
              <button
                className="lm-btn lm-btn--danger"
                onClick={() => handleDelete(scope.id)}
                disabled={saving}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="lm-settings__add">
          <input
            type="text"
            className="lm-settings__input"
            placeholder="id (e.g. blog-post)"
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
            disabled={saving}
          />
          <input
            type="text"
            className="lm-settings__input"
            placeholder="Label (e.g. Blog post)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            disabled={saving}
          />
          <button
            className="lm-btn lm-btn--primary"
            onClick={handleAdd}
            disabled={saving || !newId || !newLabel}
          >
            Add scope
          </button>
        </div>
      </div>
    </div>
  )
}
