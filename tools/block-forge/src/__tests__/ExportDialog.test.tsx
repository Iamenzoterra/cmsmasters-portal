// @vitest-environment jsdom
// WP-035 Phase 1 — ExportDialog interaction + byte-parity coverage.
// Saved memory feedback_vitest_globals_false_cleanup: tools/block-forge runs
// vitest globals:false; afterEach(cleanup) is mandatory.
// Saved memory feedback_fixture_snapshot_ground_truth: pretty-print byte-parity
// is asserted against vite.config.ts:150 writer format
// (JSON.stringify(block, null, 2) + '\n').

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { ExportDialog } from '../components/ExportDialog'
import type { BlockJson } from '../types'

const fixture: BlockJson = {
  id: 1,
  slug: 'test-block',
  name: 'Test Block',
  html: '<div class="x">hello</div>\n<p>world</p>',
  css: '.x { color: red; }\n.y { padding: 10px; }',
}

const fixtureWithJsAndVariants: BlockJson = {
  ...fixture,
  js: 'console.log("hi")\nconsole.log("bye")',
  variants: {
    sm: { html: '<div>sm</div>', css: '.x { color: blue; }' },
  },
}

let clipboardWrite: ReturnType<typeof vi.fn>
let originalCreateObjectURL: typeof URL.createObjectURL | undefined
let originalRevokeObjectURL: typeof URL.revokeObjectURL | undefined

beforeEach(() => {
  clipboardWrite = vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal('navigator', {
    ...globalThis.navigator,
    clipboard: { writeText: clipboardWrite },
  })
  originalCreateObjectURL = URL.createObjectURL
  originalRevokeObjectURL = URL.revokeObjectURL
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  if (originalCreateObjectURL) URL.createObjectURL = originalCreateObjectURL
  if (originalRevokeObjectURL) URL.revokeObjectURL = originalRevokeObjectURL
})

describe('ExportDialog — render baseline', () => {
  it('renders dialog with slug, name, and HTML/CSS line counts', () => {
    const { getByText, getByTestId } = render(
      <ExportDialog block={fixture} onClose={() => {}} onShowToast={() => {}} />,
    )
    expect(getByTestId('bf-export-overlay')).toBeDefined()
    expect(getByText('Export: test-block')).toBeDefined()
    expect(getByText(/HTML \(2 lines\)/)).toBeDefined()
    expect(getByText(/CSS \(2 lines\)/)).toBeDefined()
  })

  it('omits JS section when block.js is undefined', () => {
    const { queryByText } = render(
      <ExportDialog block={fixture} onClose={() => {}} onShowToast={() => {}} />,
    )
    expect(queryByText(/JS \(\d+ lines\)/)).toBeNull()
  })

  it('omits variants section when block.variants is null/empty', () => {
    const { queryByText } = render(
      <ExportDialog
        block={{ ...fixture, variants: null }}
        onClose={() => {}}
        onShowToast={() => {}}
      />,
    )
    expect(queryByText(/^variants \(/)).toBeNull()
  })

  it('renders JS section when block.js is non-empty', () => {
    const { getByText } = render(
      <ExportDialog
        block={fixtureWithJsAndVariants}
        onClose={() => {}}
        onShowToast={() => {}}
      />,
    )
    expect(getByText(/JS \(2 lines\)/)).toBeDefined()
  })

  it('renders variants section when block.variants populated', () => {
    const { getByText } = render(
      <ExportDialog
        block={fixtureWithJsAndVariants}
        onClose={() => {}}
        onShowToast={() => {}}
      />,
    )
    expect(getByText(/variants \(1\)/)).toBeDefined()
  })
})

describe('ExportDialog — close paths', () => {
  it('calls onClose when backdrop (overlay) is clicked', () => {
    const onClose = vi.fn()
    const { getByTestId } = render(
      <ExportDialog block={fixture} onClose={onClose} onShowToast={() => {}} />,
    )
    const overlay = getByTestId('bf-export-overlay')
    fireEvent.click(overlay, { target: overlay, currentTarget: overlay })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does NOT call onClose when inner dialog is clicked', () => {
    const onClose = vi.fn()
    const { container } = render(
      <ExportDialog block={fixture} onClose={onClose} onShowToast={() => {}} />,
    )
    const inner = container.querySelector('.bf-export-dialog') as HTMLElement
    fireEvent.click(inner)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls onClose when Close header button is clicked', () => {
    const onClose = vi.fn()
    const { container } = render(
      <ExportDialog block={fixture} onClose={onClose} onShowToast={() => {}} />,
    )
    const closeBtn = container.querySelector('[data-action="close"]') as HTMLElement
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when footer Close button is clicked', () => {
    const onClose = vi.fn()
    const { container } = render(
      <ExportDialog block={fixture} onClose={onClose} onShowToast={() => {}} />,
    )
    const closeFooter = container.querySelector('[data-action="close-footer"]') as HTMLElement
    fireEvent.click(closeFooter)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('ExportDialog — toggle previews', () => {
  it('reveals HTML preview content on toggle click', () => {
    const { container } = render(
      <ExportDialog block={fixture} onClose={() => {}} onShowToast={() => {}} />,
    )
    expect(container.querySelector('[data-section="html"]')).toBeNull()
    const toggle = container.querySelector('[data-action="toggle-html"]') as HTMLElement
    fireEvent.click(toggle)
    const pre = container.querySelector('[data-section="html"]') as HTMLElement | null
    expect(pre).not.toBeNull()
    expect(pre!.textContent).toBe(fixture.html)
  })

  it('reveals CSS preview content on toggle click', () => {
    const { container } = render(
      <ExportDialog block={fixture} onClose={() => {}} onShowToast={() => {}} />,
    )
    expect(container.querySelector('[data-section="css"]')).toBeNull()
    const toggle = container.querySelector('[data-action="toggle-css"]') as HTMLElement
    fireEvent.click(toggle)
    expect(container.querySelector('[data-section="css"]')).not.toBeNull()
  })

  it('hides HTML preview on second toggle click', () => {
    const { container } = render(
      <ExportDialog block={fixture} onClose={() => {}} onShowToast={() => {}} />,
    )
    const toggle = container.querySelector('[data-action="toggle-html"]') as HTMLElement
    fireEvent.click(toggle)
    expect(container.querySelector('[data-section="html"]')).not.toBeNull()
    fireEvent.click(toggle)
    expect(container.querySelector('[data-section="html"]')).toBeNull()
  })
})

describe('ExportDialog — Copy payload', () => {
  it('writes pretty-printed payload + trailing newline to clipboard (byte-parity)', async () => {
    const onShowToast = vi.fn()
    const { container } = render(
      <ExportDialog block={fixture} onClose={() => {}} onShowToast={onShowToast} />,
    )
    const copyBtn = container.querySelector('[data-action="copy-payload"]') as HTMLElement
    fireEvent.click(copyBtn)
    // Wait for the async clipboard call to flush
    await Promise.resolve()
    await Promise.resolve()
    const expected = JSON.stringify(fixture, null, 2) + '\n'
    expect(clipboardWrite).toHaveBeenCalledWith(expected)
    expect(onShowToast).toHaveBeenCalledWith('Payload copied to clipboard.')
  })
})

describe('ExportDialog — Download JSON', () => {
  it('creates a blob URL and fires onShowToast', () => {
    const onShowToast = vi.fn()
    const { container } = render(
      <ExportDialog block={fixture} onClose={() => {}} onShowToast={onShowToast} />,
    )
    const downloadBtn = container.querySelector(
      '[data-action="download-json"]',
    ) as HTMLElement
    fireEvent.click(downloadBtn)
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    expect(onShowToast).toHaveBeenCalledWith('JSON downloaded.')
  })

  it('passes pretty-printed payload + trailing newline as the blob content', () => {
    const blobConstructorSpy = vi.spyOn(globalThis, 'Blob')
    const { container } = render(
      <ExportDialog block={fixture} onClose={() => {}} onShowToast={() => {}} />,
    )
    const downloadBtn = container.querySelector(
      '[data-action="download-json"]',
    ) as HTMLElement
    fireEvent.click(downloadBtn)
    const expected = JSON.stringify(fixture, null, 2) + '\n'
    expect(blobConstructorSpy).toHaveBeenCalledWith([expected], {
      type: 'application/json',
    })
    blobConstructorSpy.mockRestore()
  })
})
