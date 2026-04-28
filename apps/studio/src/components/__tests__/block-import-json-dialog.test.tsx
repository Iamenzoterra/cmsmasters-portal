// @vitest-environment jsdom
// WP-035 Phase 2 — BlockImportJsonDialog unit tests.
// Saved memory feedback_vitest_globals_false_cleanup: Studio inherits the
// explicit afterEach(cleanup) pattern (RTL doesn't auto-cleanup).

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup, waitFor, act } from '@testing-library/react'

vi.mock('../../lib/block-api', () => ({
  importBlockApi: vi.fn(),
  fetchAllBlocks: vi.fn().mockResolvedValue([]),
  authHeaders: vi.fn(),
}))

import { BlockImportJsonDialog } from '../block-import-json-dialog'
import * as blockApi from '../../lib/block-api'

const validPayload = {
  slug: 'my-block',
  name: 'My Block',
  html: '<div>hello</div>',
  css: '.x { color: red; }',
  hooks: { price: { selector: '.price' } },
  metadata: {},
}

const validJson = JSON.stringify(validPayload)

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  ;(blockApi.fetchAllBlocks as ReturnType<typeof vi.fn>).mockResolvedValue([])
})

function renderDialog(overrides: Partial<React.ComponentProps<typeof BlockImportJsonDialog>> = {}) {
  const props: React.ComponentProps<typeof BlockImportJsonDialog> = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    onShowToast: vi.fn(),
    ...overrides,
  }
  return { props, ...render(<BlockImportJsonDialog {...props} />) }
}

describe('BlockImportJsonDialog — render', () => {
  it('returns null when isOpen=false', () => {
    const { container } = render(
      <BlockImportJsonDialog
        isOpen={false}
        onClose={() => {}}
        onSuccess={() => {}}
        onShowToast={() => {}}
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders dialog with title, paste textarea, file input, and disabled Import button when open', () => {
    const { getByText, getByTestId, container } = renderDialog()
    expect(getByText('Import block (JSON)')).toBeDefined()
    expect(getByTestId('bijd-paste')).toBeDefined()
    expect(getByTestId('bijd-file-input')).toBeDefined()
    const importBtn = container.querySelector(
      '[data-action="import"]',
    ) as HTMLButtonElement
    expect(importBtn).not.toBeNull()
    expect(importBtn.disabled).toBe(true)
  })
})

describe('BlockImportJsonDialog — close paths', () => {
  it('calls onClose when backdrop clicked', () => {
    const { props, getByTestId } = renderDialog()
    const overlay = getByTestId('bijd-overlay')
    fireEvent.click(overlay, { target: overlay, currentTarget: overlay })
    expect(props.onClose).toHaveBeenCalledTimes(1)
  })

  it('does NOT call onClose when inner dialog clicked', () => {
    const { props, getByTestId } = renderDialog()
    const inner = getByTestId('bijd-dialog')
    fireEvent.click(inner)
    expect(props.onClose).not.toHaveBeenCalled()
  })

  it('calls onClose when Close (X) header button clicked', () => {
    const { props, container } = renderDialog()
    const closeBtn = container.querySelector(
      '[data-action="close"]',
    ) as HTMLElement
    fireEvent.click(closeBtn)
    expect(props.onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Cancel footer button clicked', () => {
    const { props, container } = renderDialog()
    const cancelBtn = container.querySelector(
      '[data-action="cancel"]',
    ) as HTMLElement
    fireEvent.click(cancelBtn)
    expect(props.onClose).toHaveBeenCalledTimes(1)
  })
})

describe('BlockImportJsonDialog — JSON parse states', () => {
  it('shows no error and disabled Import on empty paste', () => {
    const { container } = renderDialog()
    expect(container.querySelector('[data-testid="bijd-json-error"]')).toBeNull()
    expect(container.querySelector('[data-testid="bijd-schema-error"]')).toBeNull()
    const importBtn = container.querySelector(
      '[data-action="import"]',
    ) as HTMLButtonElement
    expect(importBtn.disabled).toBe(true)
  })

  it('shows invalid-JSON banner on malformed JSON', async () => {
    const { container, getByTestId } = renderDialog()
    fireEvent.change(getByTestId('bijd-paste'), {
      target: { value: '{ "slug": "x" ' },
    })
    await waitFor(() => {
      expect(container.querySelector('[data-testid="bijd-json-error"]')).not.toBeNull()
    })
    const importBtn = container.querySelector(
      '[data-action="import"]',
    ) as HTMLButtonElement
    expect(importBtn.disabled).toBe(true)
  })

  it('shows invalid-schema banner with issue paths on missing required fields', async () => {
    const { container, getByTestId } = renderDialog()
    fireEvent.change(getByTestId('bijd-paste'), {
      target: { value: JSON.stringify({ slug: 'x' }) },
    })
    await waitFor(() => {
      const err = container.querySelector('[data-testid="bijd-schema-error"]')
      expect(err).not.toBeNull()
      expect(err!.textContent).toContain('name')
    })
    const importBtn = container.querySelector(
      '[data-action="import"]',
    ) as HTMLButtonElement
    expect(importBtn.disabled).toBe(true)
  })

  it('enables Import and shows preview toggle on valid payload', async () => {
    const { container, getByTestId, getByText } = renderDialog()
    fireEvent.change(getByTestId('bijd-paste'), {
      target: { value: validJson },
    })
    await waitFor(() => {
      const importBtn = container.querySelector(
        '[data-action="import"]',
      ) as HTMLButtonElement
      expect(importBtn.disabled).toBe(false)
    })
    expect(getByText(/Preview payload \(\d+ fields\)/)).toBeDefined()
    expect(container.querySelector('[data-testid="bijd-json-error"]')).toBeNull()
    expect(container.querySelector('[data-testid="bijd-schema-error"]')).toBeNull()
  })

  it('reveals payload preview <pre> on toggle click', async () => {
    const { container, getByTestId } = renderDialog()
    fireEvent.change(getByTestId('bijd-paste'), { target: { value: validJson } })
    await waitFor(() => {
      expect(
        (container.querySelector('[data-action="import"]') as HTMLButtonElement)
          .disabled,
      ).toBe(false)
    })
    expect(container.querySelector('[data-testid="bijd-preview"]')).toBeNull()
    const toggle = container.querySelector(
      '[data-action="toggle-preview"]',
    ) as HTMLElement
    fireEvent.click(toggle)
    expect(container.querySelector('[data-testid="bijd-preview"]')).not.toBeNull()
  })
})

describe('BlockImportJsonDialog — file upload', () => {
  it('replaces textarea contents with uploaded file text', async () => {
    const { container, getByTestId } = renderDialog()
    const fileInput = getByTestId('bijd-file-input') as HTMLInputElement
    const file = new File([validJson], 'block.json', { type: 'application/json' })

    Object.defineProperty(fileInput, 'files', {
      value: [file],
      configurable: true,
    })
    fireEvent.change(fileInput)

    await waitFor(() => {
      const ta = getByTestId('bijd-paste') as HTMLTextAreaElement
      expect(ta.value).toBe(validJson)
    })
    await waitFor(() => {
      expect(
        (container.querySelector('[data-action="import"]') as HTMLButtonElement)
          .disabled,
      ).toBe(false)
    })
  })
})

describe('BlockImportJsonDialog — slug collision', () => {
  it('shows collision warning + flips Import button label when slug exists in DB', async () => {
    ;(blockApi.fetchAllBlocks as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { id: 'b1', slug: 'my-block', name: 'Existing' },
    ])
    const { container, getByTestId } = renderDialog()
    // Wait for fetchAllBlocks promise
    await waitFor(() => expect(blockApi.fetchAllBlocks).toHaveBeenCalled())
    fireEvent.change(getByTestId('bijd-paste'), { target: { value: validJson } })
    await waitFor(() => {
      expect(
        container.querySelector('[data-testid="bijd-collision-warning"]'),
      ).not.toBeNull()
    })
    const importBtn = container.querySelector(
      '[data-action="import"]',
    ) as HTMLButtonElement
    expect(importBtn.textContent).toContain('Overwrite')
  })

  it('does NOT show collision warning when slug is novel', async () => {
    ;(blockApi.fetchAllBlocks as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { id: 'b1', slug: 'other-block' },
    ])
    const { container, getByTestId } = renderDialog()
    await waitFor(() => expect(blockApi.fetchAllBlocks).toHaveBeenCalled())
    fireEvent.change(getByTestId('bijd-paste'), { target: { value: validJson } })
    await waitFor(() => {
      expect(
        (container.querySelector('[data-action="import"]') as HTMLButtonElement)
          .disabled,
      ).toBe(false)
    })
    expect(
      container.querySelector('[data-testid="bijd-collision-warning"]'),
    ).toBeNull()
    const importBtn = container.querySelector(
      '[data-action="import"]',
    ) as HTMLButtonElement
    expect(importBtn.textContent?.trim()).toBe('Import')
  })
})

describe('BlockImportJsonDialog — Import flow', () => {
  it('calls importBlockApi(payload) once with parsed data; fires onSuccess + onShowToast + onClose on success', async () => {
    const importMock = blockApi.importBlockApi as ReturnType<typeof vi.fn>
    importMock.mockResolvedValueOnce({
      data: { id: 'new-id', slug: 'my-block', name: 'My Block' },
      action: 'created',
      revalidated: true,
    })
    const { props, container, getByTestId } = renderDialog()
    fireEvent.change(getByTestId('bijd-paste'), { target: { value: validJson } })
    await waitFor(() => {
      expect(
        (container.querySelector('[data-action="import"]') as HTMLButtonElement)
          .disabled,
      ).toBe(false)
    })
    await act(async () => {
      fireEvent.click(
        container.querySelector('[data-action="import"]') as HTMLElement,
      )
    })
    expect(importMock).toHaveBeenCalledTimes(1)
    const callArg = importMock.mock.calls[0]?.[0]
    expect(callArg.slug).toBe('my-block')
    expect(callArg.name).toBe('My Block')
    expect(callArg.html).toBe('<div>hello</div>')
    expect(props.onShowToast).toHaveBeenCalledWith(
      expect.stringContaining('created'),
      'success',
    )
    expect(props.onShowToast).toHaveBeenCalledWith(
      expect.stringContaining('revalidated'),
      'success',
    )
    expect(props.onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'new-id', slug: 'my-block' }),
      'created',
    )
    expect(props.onClose).toHaveBeenCalled()
  })

  it('reports error toast and keeps dialog open on import failure', async () => {
    const importMock = blockApi.importBlockApi as ReturnType<typeof vi.fn>
    importMock.mockRejectedValueOnce(new Error('Validation failed'))
    const { props, container, getByTestId } = renderDialog()
    fireEvent.change(getByTestId('bijd-paste'), { target: { value: validJson } })
    await waitFor(() => {
      expect(
        (container.querySelector('[data-action="import"]') as HTMLButtonElement)
          .disabled,
      ).toBe(false)
    })
    await act(async () => {
      fireEvent.click(
        container.querySelector('[data-action="import"]') as HTMLElement,
      )
    })
    expect(props.onShowToast).toHaveBeenCalledWith('Validation failed', 'error')
    expect(props.onClose).not.toHaveBeenCalled()
  })

  it('marks toast revalidation pending when revalidated=false', async () => {
    const importMock = blockApi.importBlockApi as ReturnType<typeof vi.fn>
    importMock.mockResolvedValueOnce({
      data: { id: 'new-id', slug: 'my-block', name: 'My Block' },
      action: 'updated',
      revalidated: false,
    })
    const { props, container, getByTestId } = renderDialog()
    fireEvent.change(getByTestId('bijd-paste'), { target: { value: validJson } })
    await waitFor(() => {
      expect(
        (container.querySelector('[data-action="import"]') as HTMLButtonElement)
          .disabled,
      ).toBe(false)
    })
    await act(async () => {
      fireEvent.click(
        container.querySelector('[data-action="import"]') as HTMLElement,
      )
    })
    expect(props.onShowToast).toHaveBeenCalledWith(
      expect.stringContaining('Revalidation pending'),
      'success',
    )
  })

  it('disables Cancel and Import while submitting', async () => {
    const importMock = blockApi.importBlockApi as ReturnType<typeof vi.fn>
    let resolveFn: (v: unknown) => void = () => {}
    importMock.mockImplementationOnce(
      () =>
        new Promise((res) => {
          resolveFn = res
        }),
    )
    const { container, getByTestId } = renderDialog()
    fireEvent.change(getByTestId('bijd-paste'), { target: { value: validJson } })
    await waitFor(() => {
      expect(
        (container.querySelector('[data-action="import"]') as HTMLButtonElement)
          .disabled,
      ).toBe(false)
    })
    fireEvent.click(
      container.querySelector('[data-action="import"]') as HTMLElement,
    )
    await waitFor(() => {
      const importBtn = container.querySelector(
        '[data-action="import"]',
      ) as HTMLButtonElement
      const cancelBtn = container.querySelector(
        '[data-action="cancel"]',
      ) as HTMLButtonElement
      expect(importBtn.disabled).toBe(true)
      expect(cancelBtn.disabled).toBe(true)
      expect(importBtn.textContent).toContain('Importing')
    })
    await act(async () => {
      resolveFn({
        data: { id: 'x', slug: 'my-block' },
        action: 'created',
        revalidated: false,
      })
    })
  })
})
