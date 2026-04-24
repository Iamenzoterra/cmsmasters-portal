/// <reference types="vitest/globals" />
import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ExportDialog } from './ExportDialog'
import type { ExportResult } from '../lib/types'

// Phase 3 Task 3.1 contract: export dialog never renders the Studio
// `status` concept. The payload still carries `status: 'draft'` (P3
// non-goal keeps the wire format), but the UI must not surface it.

vi.mock('../lib/api-client', () => ({
  api: {
    exportLayout: vi.fn(),
  },
}))

import { api } from '../lib/api-client'

const draftResult: ExportResult = {
  payload: {
    slug: 'test-layout',
    title: 'Test layout',
    type: 'layout',
    scope: 'theme',
    html: '<div></div>',
    css: '.x{}',
    layout_slots: {},
    slot_config: {},
    status: 'draft',
  },
  files: { html: 'theme.html', css: 'theme.css' },
}

describe('ExportDialog — status row removed (P3 Task 3.1)', () => {
  beforeEach(() => {
    vi.mocked(api.exportLayout).mockResolvedValue(draftResult)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders meta rows without a status label or draft value', async () => {
    const { queryByText, findByText } = render(
      <ExportDialog id="test-layout" onClose={vi.fn()} onShowToast={vi.fn()} />,
    )

    await findByText('scope')
    await waitFor(() => {
      expect(queryByText('status')).toBeNull()
      expect(queryByText('draft')).toBeNull()
    })

    expect(queryByText('slug')).not.toBeNull()
    expect(queryByText('title')).not.toBeNull()
    expect(queryByText('scope')).not.toBeNull()
  })
})
