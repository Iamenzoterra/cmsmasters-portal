// @vitest-environment jsdom
// WP-028 Phase 3 — VariantsDrawer real-UI tests (tools/block-forge surface).
// Cross-surface mirror: apps/studio/src/pages/block-editor/responsive/__tests__/VariantsDrawer.test.tsx
// Describes stay generic so the `.snap` stays byte-identical between surfaces
// (lesson from Phase 2a: surface-specific describes break snap parity).

// Radix UI Dialog + Slider rely on ResizeObserver + Pointer-capture; jsdom has
// neither by default. Polyfill before imports so portal-mount doesn't crash.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!(globalThis as typeof globalThis & { ResizeObserver?: unknown }).ResizeObserver) {
  ;(globalThis as typeof globalThis & { ResizeObserver?: unknown }).ResizeObserver =
    ResizeObserverMock
}
if (typeof Element !== 'undefined') {
  const P = Element.prototype as unknown as {
    hasPointerCapture?: () => boolean
    setPointerCapture?: () => void
    releasePointerCapture?: () => void
    scrollIntoView?: () => void
  }
  if (!P.hasPointerCapture) P.hasPointerCapture = () => false
  if (!P.setPointerCapture) P.setPointerCapture = () => undefined
  if (!P.releasePointerCapture) P.releasePointerCapture = () => undefined
  if (!P.scrollIntoView) P.scrollIntoView = () => undefined
}

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { act, render, cleanup, fireEvent } from '@testing-library/react'
import { VariantsDrawer, type VariantAction } from '../components/VariantsDrawer'

afterEach(cleanup)

describe('VariantsDrawer — empty state', () => {
  it('renders empty state when variants is {}', () => {
    const { getByTestId } = render(
      <VariantsDrawer
        open={true}
        onOpenChange={() => {}}
        variants={{}}
        baseHtml="<h2>base</h2>"
        baseCss=".x { color: red }"
        onAction={() => {}}
      />,
    )
    expect(getByTestId('variants-drawer-empty')).toBeDefined()
  })

  it('shows Create button disabled when fork input is empty', () => {
    const { getByTestId } = render(
      <VariantsDrawer
        open={true}
        onOpenChange={() => {}}
        variants={{}}
        baseHtml=""
        baseCss=""
        onAction={() => {}}
      />,
    )
    expect(
      (getByTestId('variants-drawer-fork-submit') as HTMLButtonElement).disabled,
    ).toBe(true)
  })
})

describe('VariantsDrawer — populated state', () => {
  it('renders variant list sorted alphabetically', () => {
    const { getByTestId } = render(
      <VariantsDrawer
        open={true}
        onOpenChange={() => {}}
        variants={{
          md: { html: '<h2>md</h2>', css: '' },
          sm: { html: '<h2>sm</h2>', css: '' },
          lg: { html: '<h2>lg</h2>', css: '' },
        }}
        baseHtml=""
        baseCss=""
        onAction={() => {}}
      />,
    )
    const list = getByTestId('variants-drawer-list')
    const items = list.querySelectorAll('[data-testid^="variants-drawer-item-"]')
    const names = Array.from(items).map((n) => n.getAttribute('data-testid'))
    expect(names).toEqual([
      'variants-drawer-item-lg',
      'variants-drawer-item-md',
      'variants-drawer-item-sm',
    ])
  })
})

describe('VariantsDrawer — fork', () => {
  it('fork with convention name → onAction({kind:create, deep-copy of base})', () => {
    const onAction = vi.fn<(action: VariantAction) => void>()
    const { getByTestId } = render(
      <VariantsDrawer
        open={true}
        onOpenChange={() => {}}
        variants={{}}
        baseHtml="<h2>base</h2>"
        baseCss=".x { color: red }"
        onAction={onAction}
      />,
    )
    const input = getByTestId('variants-drawer-fork-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'sm' } })
    fireEvent.click(getByTestId('variants-drawer-fork-submit'))
    expect(onAction).toHaveBeenCalledWith({
      kind: 'create',
      name: 'sm',
      html: '<h2>base</h2>',
      css: '.x { color: red }',
    })
  })

  it('fork with non-convention name → warning shown but submit allowed', () => {
    const onAction = vi.fn<(action: VariantAction) => void>()
    const { getByTestId, queryByTestId } = render(
      <VariantsDrawer
        open={true}
        onOpenChange={() => {}}
        variants={{}}
        baseHtml=""
        baseCss=""
        onAction={onAction}
      />,
    )
    const input = getByTestId('variants-drawer-fork-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'custom-name' } })
    expect(getByTestId('variants-drawer-fork-warning')).toBeDefined()
    expect(queryByTestId('variants-drawer-fork-error')).toBeNull()
    expect(
      (getByTestId('variants-drawer-fork-submit') as HTMLButtonElement).disabled,
    ).toBe(false)
  })

  it('fork with invalid name (uppercase) → error + submit disabled', () => {
    const onAction = vi.fn<(action: VariantAction) => void>()
    const { getByTestId } = render(
      <VariantsDrawer
        open={true}
        onOpenChange={() => {}}
        variants={{}}
        baseHtml=""
        baseCss=""
        onAction={onAction}
      />,
    )
    const input = getByTestId('variants-drawer-fork-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'BAD' } })
    expect(getByTestId('variants-drawer-fork-error')).toBeDefined()
    expect(
      (getByTestId('variants-drawer-fork-submit') as HTMLButtonElement).disabled,
    ).toBe(true)
    fireEvent.click(getByTestId('variants-drawer-fork-submit'))
    expect(onAction).not.toHaveBeenCalled()
  })

  it('fork with duplicate name → error + submit disabled', () => {
    const onAction = vi.fn<(action: VariantAction) => void>()
    const { getByTestId } = render(
      <VariantsDrawer
        open={true}
        onOpenChange={() => {}}
        variants={{ sm: { html: '<h2>x</h2>', css: '' } }}
        baseHtml=""
        baseCss=""
        onAction={onAction}
      />,
    )
    const input = getByTestId('variants-drawer-fork-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'sm' } })
    expect(getByTestId('variants-drawer-fork-error').textContent).toMatch(/already exists/i)
    expect(
      (getByTestId('variants-drawer-fork-submit') as HTMLButtonElement).disabled,
    ).toBe(true)
  })
})

describe('VariantsDrawer — rename', () => {
  it('rename inline → onAction({kind:rename}) on Save click', () => {
    const onAction = vi.fn<(action: VariantAction) => void>()
    const { getByTestId } = render(
      <VariantsDrawer
        open={true}
        onOpenChange={() => {}}
        variants={{ sm: { html: '<h2>x</h2>', css: '' } }}
        baseHtml=""
        baseCss=""
        onAction={onAction}
      />,
    )
    fireEvent.click(getByTestId('variants-drawer-rename-sm'))
    const input = getByTestId('variants-drawer-rename-input-sm') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'mobile' } })
    fireEvent.click(getByTestId('variants-drawer-rename-confirm-sm'))
    expect(onAction).toHaveBeenCalledWith({ kind: 'rename', from: 'sm', to: 'mobile' })
  })

  it('rename to existing name → Save disabled', () => {
    const { getByTestId } = render(
      <VariantsDrawer
        open={true}
        onOpenChange={() => {}}
        variants={{
          sm: { html: '<h2>a</h2>', css: '' },
          md: { html: '<h2>b</h2>', css: '' },
        }}
        baseHtml=""
        baseCss=""
        onAction={() => {}}
      />,
    )
    fireEvent.click(getByTestId('variants-drawer-rename-sm'))
    const input = getByTestId('variants-drawer-rename-input-sm') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'md' } })
    expect(
      (getByTestId('variants-drawer-rename-confirm-sm') as HTMLButtonElement).disabled,
    ).toBe(true)
  })
})

describe('VariantsDrawer — delete', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('delete after window.confirm=true → onAction({kind:delete})', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const onAction = vi.fn<(action: VariantAction) => void>()
    const { getByTestId } = render(
      <VariantsDrawer
        open={true}
        onOpenChange={() => {}}
        variants={{ sm: { html: '<h2>x</h2>', css: '' } }}
        baseHtml=""
        baseCss=""
        onAction={onAction}
      />,
    )
    act(() => {
      fireEvent.click(getByTestId('variants-drawer-delete-sm'))
    })
    expect(onAction).toHaveBeenCalledWith({ kind: 'delete', name: 'sm' })
  })

  it('delete after window.confirm=false → no action', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const onAction = vi.fn<(action: VariantAction) => void>()
    const { getByTestId } = render(
      <VariantsDrawer
        open={true}
        onOpenChange={() => {}}
        variants={{ sm: { html: '<h2>x</h2>', css: '' } }}
        baseHtml=""
        baseCss=""
        onAction={onAction}
      />,
    )
    fireEvent.click(getByTestId('variants-drawer-delete-sm'))
    expect(onAction).not.toHaveBeenCalled()
  })
})

describe('VariantsDrawer — parity snapshot', () => {
  it('rendered DOM matches cross-surface mirror contract', () => {
    const { container } = render(
      <VariantsDrawer
        open={true}
        onOpenChange={() => {}}
        variants={{ sm: { html: '<h2>x</h2>', css: '' } }}
        baseHtml=""
        baseCss=""
        onAction={() => {}}
      />,
    )
    // Radix Dialog portals content; snapshot the body (where portal renders).
    expect(document.body.innerHTML).toMatchSnapshot()
    // Keep container snapshot too for completeness (likely empty aside from trigger).
    expect(container.innerHTML).toMatchSnapshot()
  })
})

describe('VariantsDrawer — editor tab (Phase 4)', () => {
  it('renders Manage tab active by default', () => {
    const { getByTestId } = render(
      <VariantsDrawer
        open={true}
        onOpenChange={() => {}}
        variants={{ sm: { html: '<h2>x</h2>', css: '' } }}
        baseHtml=""
        baseCss=""
        onAction={() => {}}
      />,
    )
    // Manage tab visible + Manage body rendered (no editor panel yet).
    expect(getByTestId('variants-drawer-tab-manage')).toBeDefined()
    expect(getByTestId('variants-drawer-tab-sm')).toBeDefined()
    expect(getByTestId('variants-drawer-body')).toBeDefined()
  })

  it('switches to editor panel when variant tab clicked', () => {
    const { getByTestId, queryByTestId } = render(
      <VariantsDrawer
        open={true}
        onOpenChange={() => {}}
        variants={{ sm: { html: '<h2>sm-original</h2>', css: '.x{}' } }}
        baseHtml="<h2>base</h2>"
        baseCss=".base {}"
        onAction={() => {}}
      />,
    )
    act(() => {
      fireEvent.click(getByTestId('variants-drawer-tab-sm'))
    })
    // Editor panel + 4 textareas mounted.
    expect(getByTestId('variants-drawer-editor-sm')).toBeDefined()
    expect(getByTestId('variants-editor-base-html')).toBeDefined()
    expect(getByTestId('variants-editor-base-css')).toBeDefined()
    expect(getByTestId('variants-editor-variant-html')).toBeDefined()
    expect(getByTestId('variants-editor-variant-css')).toBeDefined()
    // Manage body unmounted while editor is active.
    expect(queryByTestId('variants-drawer-body')).toBeNull()
  })

  it('variant HTML textarea edit fires debounced update-content after 300ms', () => {
    vi.useFakeTimers()
    const onAction = vi.fn<(action: VariantAction) => void>()
    const { getByTestId } = render(
      <VariantsDrawer
        open={true}
        onOpenChange={() => {}}
        variants={{ sm: { html: '<h2>orig</h2>', css: '' } }}
        baseHtml="<h2>base</h2>"
        baseCss=""
        onAction={onAction}
      />,
    )
    act(() => {
      fireEvent.click(getByTestId('variants-drawer-tab-sm'))
    })
    const textarea = getByTestId('variants-editor-variant-html') as HTMLTextAreaElement
    act(() => {
      fireEvent.change(textarea, { target: { value: '<h2>edited</h2>' } })
    })
    // Not yet — debounce pending.
    expect(onAction).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(onAction).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(onAction).toHaveBeenCalledWith({
      kind: 'update-content',
      name: 'sm',
      html: '<h2>edited</h2>',
      css: '',
    })
    vi.useRealTimers()
  })

  it('flushes pending debounce on unmount (no lost edits)', () => {
    vi.useFakeTimers()
    const onAction = vi.fn<(action: VariantAction) => void>()
    const { getByTestId, unmount } = render(
      <VariantsDrawer
        open={true}
        onOpenChange={() => {}}
        variants={{ sm: { html: '<h2>orig</h2>', css: '' } }}
        baseHtml=""
        baseCss=""
        onAction={onAction}
      />,
    )
    act(() => {
      fireEvent.click(getByTestId('variants-drawer-tab-sm'))
    })
    const textarea = getByTestId('variants-editor-variant-html') as HTMLTextAreaElement
    act(() => {
      fireEvent.change(textarea, { target: { value: '<h2>pending</h2>' } })
    })
    // Unmount before the 300ms debounce window elapses.
    act(() => {
      vi.advanceTimersByTime(50)
      unmount()
    })
    expect(onAction).toHaveBeenCalledWith({
      kind: 'update-content',
      name: 'sm',
      html: '<h2>pending</h2>',
      css: '',
    })
    vi.useRealTimers()
  })

  it('deleted active-tab variant → auto-returns to Manage tab', () => {
    const { getByTestId, queryByTestId, rerender } = render(
      <VariantsDrawer
        open={true}
        onOpenChange={() => {}}
        variants={{ sm: { html: '<h2>x</h2>', css: '' } }}
        baseHtml=""
        baseCss=""
        onAction={() => {}}
      />,
    )
    act(() => {
      fireEvent.click(getByTestId('variants-drawer-tab-sm'))
    })
    expect(getByTestId('variants-drawer-editor-sm')).toBeDefined()
    // Parent removes the variant — simulate by rerender with empty variants.
    act(() => {
      rerender(
        <VariantsDrawer
          open={true}
          onOpenChange={() => {}}
          variants={{}}
          baseHtml=""
          baseCss=""
          onAction={() => {}}
        />,
      )
    })
    expect(queryByTestId('variants-drawer-editor-sm')).toBeNull()
    expect(getByTestId('variants-drawer-body')).toBeDefined()
    expect(getByTestId('variants-drawer-empty')).toBeDefined()
  })

  it('mini-preview iframe uses reserved slug "variant-preview" — TweakPanel isolation (Ruling II)', () => {
    const { getByTestId } = render(
      <VariantsDrawer
        open={true}
        onOpenChange={() => {}}
        variants={{ sm: { html: '<h2>x</h2>', css: '' } }}
        baseHtml="<h2>base</h2>"
        baseCss=""
        onAction={() => {}}
      />,
    )
    act(() => {
      fireEvent.click(getByTestId('variants-drawer-tab-sm'))
    })
    const iframe = getByTestId('variants-editor-preview-iframe-sm') as HTMLIFrameElement
    const srcdoc = iframe.getAttribute('srcdoc') ?? ''
    // composeSrcDoc injects the element-click script with literal slug string.
    // TweakPanel listener filters by currentSlug (the real block slug) — the
    // reserved slug 'variant-preview' never matches, so postMessages are dropped.
    expect(srcdoc).toContain('"variant-preview"')
    expect(srcdoc).toContain('data-block-shell="variant-preview"')
  })

  it('width slider default per variant name convention (sm→480 / md→640 / lg→768 / custom→640)', () => {
    const cases: Array<[string, number]> = [
      ['sm', 480],
      ['md', 640],
      ['lg', 768],
      ['custom', 640],
    ]
    for (const [name, expectedWidth] of cases) {
      cleanup()
      const { getByTestId } = render(
        <VariantsDrawer
          open={true}
          onOpenChange={() => {}}
          variants={{ [name]: { html: '<h2>x</h2>', css: '' } }}
          baseHtml=""
          baseCss=""
          onAction={() => {}}
        />,
      )
      act(() => {
        fireEvent.click(getByTestId(`variants-drawer-tab-${name}`))
      })
      const slider = getByTestId('variants-editor-width-slider')
        .querySelector('input[type="range"]') as HTMLInputElement
      expect(slider.value).toBe(String(expectedWidth))
    }
  })

  it('parity snapshot — editor tab active with populated variant', () => {
    const { getByTestId } = render(
      <VariantsDrawer
        open={true}
        onOpenChange={() => {}}
        variants={{ sm: { html: '<h2>variant</h2>', css: '.x{color:red}' } }}
        baseHtml="<h2>base</h2>"
        baseCss=".base{color:blue}"
        onAction={() => {}}
      />,
    )
    act(() => {
      fireEvent.click(getByTestId('variants-drawer-tab-sm'))
    })
    // Snapshot only the editor panel region (iframe srcdoc contains large CSS blob).
    const panel = getByTestId('variants-drawer-editor-sm')
    // Drop the iframe srcdoc attribute which carries the full injected bundle —
    // byte-identical between surfaces but noisy and unstable on dep bumps.
    const cloned = panel.cloneNode(true) as HTMLElement
    cloned.querySelectorAll('iframe').forEach((el) => el.removeAttribute('srcdoc'))
    expect(cloned.outerHTML).toMatchSnapshot('editor-panel-sm')
  })
})
