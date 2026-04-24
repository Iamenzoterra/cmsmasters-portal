/// <reference types="vitest/globals" />
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LayoutSidebar } from './LayoutSidebar'
import type { LayoutSummary, ScopeEntry } from '../lib/types'

// Phase 5 contract — locks the sidebar action-grouping shape (Brain #5). Four
// assertions: all three group labels render, variant classes land on the
// intended buttons, and Delete is isolated in its own row (no sibling of
// Rename). Guards against accidental ungrouping in later refactors.

import '../styles/maker.css'

const scopes: ScopeEntry[] = [{ id: 'theme', label: 'Theme' }]
const layouts: LayoutSummary[] = [
  { id: 'l1', name: 'Page layout', scope: 'theme' },
]

function renderSidebar() {
  return render(
    <LayoutSidebar
      layouts={layouts}
      activeId="l1"
      scopes={scopes}
      view="layouts"
      onSelect={vi.fn()}
      onRefresh={vi.fn()}
      onExport={vi.fn()}
      onNavigate={vi.fn()}
    />,
  )
}

describe('LayoutSidebar action grouping (Phase 5)', () => {
  afterEach(() => cleanup())

  it('renders the three group labels: Create, Transfer, Manage', () => {
    const { getByText } = renderSidebar()
    expect(getByText('Create')).toBeTruthy()
    expect(getByText('Transfer')).toBeTruthy()
    expect(getByText('Manage')).toBeTruthy()
  })

  it('Export button carries .lm-btn--primary (strongest weight in Transfer)', () => {
    const { getByRole } = renderSidebar()
    const exportBtn = getByRole('button', { name: /^export$/i })
    expect(exportBtn.classList.contains('lm-btn--primary')).toBe(true)
  })

  it('Import button carries .lm-btn--ghost (demoted alongside Export)', () => {
    const { getByRole } = renderSidebar()
    const importBtn = getByRole('button', { name: /^import$/i })
    expect(importBtn.classList.contains('lm-btn--ghost')).toBe(true)
  })

  it('Delete carries .lm-btn--danger AND sits in its own row (not a sibling of Rename)', () => {
    const { getByRole } = renderSidebar()
    const deleteBtn = getByRole('button', { name: /^delete$/i })
    const renameBtn = getByRole('button', { name: /^rename$/i })
    expect(deleteBtn.classList.contains('lm-btn--danger')).toBe(true)
    // Divider isolation: Delete's parent row must not be the same row as Rename's.
    expect(deleteBtn.parentElement).not.toBe(renameBtn.parentElement)
    // And Delete's parent row must carry the danger modifier (locks the divider rule).
    expect(deleteBtn.parentElement?.classList.contains('lm-sidebar__group-row--danger')).toBe(true)
  })
})
