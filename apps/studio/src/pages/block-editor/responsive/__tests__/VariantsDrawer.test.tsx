// @vitest-environment jsdom
// WP-028 Phase 3 — VariantsDrawer real-UI tests (Studio Responsive tab surface).
// Cross-surface mirror: tools/block-forge/src/__tests__/VariantsDrawer.test.tsx
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
import { VariantsDrawer, type VariantAction } from '../VariantsDrawer'

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
    const onAction = vi.fn<[VariantAction], void>()
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
    const onAction = vi.fn<[VariantAction], void>()
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
    const onAction = vi.fn<[VariantAction], void>()
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
    const onAction = vi.fn<[VariantAction], void>()
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
    const onAction = vi.fn<[VariantAction], void>()
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
    const onAction = vi.fn<[VariantAction], void>()
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
    const onAction = vi.fn<[VariantAction], void>()
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
