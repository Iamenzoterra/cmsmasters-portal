/**
 * @vitest-environment jsdom
 *
 * WP-029 Phase 2 — `<App />` render-level regression pins (Task B).
 *
 * Replaces the WP-028 Phase 5 + Phase 6 OQ5 harness-mirror pins (which lived
 * in `integration.test.tsx`) with live <App /> mounts so production
 * `App.tsx::handleSave` is the system under test, not a parallel harness.
 *
 * Five active scenarios mirror the historical pin matrix:
 *   1. tweak-only        — accept tweak via TweakPanel, click Save
 *   2. variant-only      — fork variant via VariantsDrawer, click Save
 *   3. mixed             — tweak + variant, click Save
 *   4. variants-clear    — delete pre-loaded variant, click Save (OQ2 null)
 *   5. tweak-compose     — tweak-only assertion of compose-on-save (OQ5)
 *
 * Sixth `test.skip` codifies the drift-detector experiment (Brain C4).
 *
 * Manifest: not registered — `infra-tooling` convention excludes test files.
 */

// Radix UI Dialog/Slider rely on ResizeObserver + Pointer-capture; jsdom has
// neither. Polyfill BEFORE imports so portal-mount doesn't crash on first
// render (mirrors VariantsDrawer.test.tsx L7–28).
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

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { App } from '../App'
import * as apiClient from '../lib/api-client'
import type { BlockJson } from '../types'

// 1. apiClient mocks (Phase 0 carry-over (e)).
//    `vi.mock` is hoisted; subsequent `import * as apiClient` resolves to the
//    mocked module. `vi.mocked()` provides typed access so apiClient signature
//    drift surfaces as a compile error rather than a silent runtime mismatch.
vi.mock('../lib/api-client', () => ({
  listBlocks: vi.fn(),
  getBlock: vi.fn(),
  saveBlock: vi.fn(),
}))

const FIXTURE_BLOCK: BlockJson = {
  id: 'fixture-id',
  slug: 'fixture-block',
  name: 'Fixture Block',
  html: '<div class="hero"><span>Hero</span></div>',
  css: '.hero { padding: 16px; color: red }',
}

const FIXTURE_BLOCK_WITH_VARIANT: BlockJson = {
  ...FIXTURE_BLOCK,
  variants: {
    sm: { html: '<div class="hero">sm</div>', css: '.hero { padding: 8px }' },
  },
}

function freshBlock(overrides: Partial<BlockJson> = {}): BlockJson {
  return { ...FIXTURE_BLOCK, ...overrides }
}

async function mountAppAndSelectBlock(initialBlock: BlockJson) {
  vi.mocked(apiClient.listBlocks).mockResolvedValue({
    sourceDir: '/mock/blocks',
    blocks: [
      { slug: initialBlock.slug, name: initialBlock.name, filename: `${initialBlock.slug}.json` },
    ],
  })
  vi.mocked(apiClient.getBlock).mockResolvedValue(initialBlock)
  vi.mocked(apiClient.saveBlock).mockResolvedValue({
    ok: true,
    slug: initialBlock.slug,
    backupCreated: true,
  })

  const renderResult = render(<App />)

  // Wait for listBlocks to populate the picker.
  await waitFor(() => {
    expect(
      document.querySelector(`option[value="${initialBlock.slug}"]`),
    ).not.toBeNull()
  })

  // Pick block.
  const select = document.querySelector('select') as HTMLSelectElement
  await act(async () => {
    fireEvent.change(select, { target: { value: initialBlock.slug } })
  })

  // Wait for getBlock to resolve — variants drawer trigger flips enabled.
  await waitFor(() => {
    const trigger = document.querySelector(
      '[data-testid="variants-drawer-trigger"]',
    ) as HTMLButtonElement | null
    expect(trigger).not.toBeNull()
    expect(trigger!.disabled).toBe(false)
  })

  return renderResult
}

/**
 * Dispatches the element-click postMessage that App's window listener
 * (App.tsx L165–185) consumes to populate the TweakPanel selection. Then
 * switches BP to 768 so subsequent tweaks compose into an `@container slot
 * (max-width: 768px)` chunk (rather than the 1440-base bp).
 */
async function dispatchElementClickAndSwitchBp(slug: string, selector: string) {
  await act(async () => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          type: 'block-forge:element-click',
          slug,
          selector,
          computedStyle: { padding: '16px', fontSize: '16px', gap: '0px', display: 'block' },
        },
      }),
    )
  })

  // Switch to 768 BP so the tweak composes into a reveal chunk.
  await waitFor(() => {
    expect(
      document.querySelector('[data-testid="tweak-panel-bp-768"]'),
    ).not.toBeNull()
  })
  const bp768 = document.querySelector(
    '[data-testid="tweak-panel-bp-768"]',
  ) as HTMLButtonElement
  await act(async () => {
    fireEvent.click(bp768)
  })
}

async function clickHideTweak() {
  const hideBtn = document.querySelector(
    '[data-testid="tweak-panel-visibility-hide"]',
  ) as HTMLButtonElement
  expect(hideBtn).not.toBeNull()
  await act(async () => {
    fireEvent.click(hideBtn)
  })
  // Flush 300ms tweak debounce (App.tsx L195–201). Real timers; brief sleep.
  await act(async () => {
    await new Promise((r) => setTimeout(r, 350))
  })
}

async function openVariantsDrawerAndFork(name: string) {
  const trigger = document.querySelector(
    '[data-testid="variants-drawer-trigger"]',
  ) as HTMLButtonElement
  await act(async () => {
    fireEvent.click(trigger)
  })
  await waitFor(() => {
    expect(
      document.querySelector('[data-testid="variants-drawer-fork-input"]'),
    ).not.toBeNull()
  })
  const forkInput = document.querySelector(
    '[data-testid="variants-drawer-fork-input"]',
  ) as HTMLInputElement
  await act(async () => {
    fireEvent.change(forkInput, { target: { value: name } })
  })
  const forkSubmit = document.querySelector(
    '[data-testid="variants-drawer-fork-submit"]',
  ) as HTMLButtonElement
  await act(async () => {
    fireEvent.click(forkSubmit)
  })
}

async function openVariantsDrawerAndDelete(name: string) {
  const trigger = document.querySelector(
    '[data-testid="variants-drawer-trigger"]',
  ) as HTMLButtonElement
  await act(async () => {
    fireEvent.click(trigger)
  })
  await waitFor(() => {
    expect(
      document.querySelector(`[data-testid="variants-drawer-delete-${name}"]`),
    ).not.toBeNull()
  })
  const deleteBtn = document.querySelector(
    `[data-testid="variants-drawer-delete-${name}"]`,
  ) as HTMLButtonElement
  await act(async () => {
    fireEvent.click(deleteBtn)
  })
}

async function clickSave() {
  await waitFor(() => {
    const btn = document.querySelector(
      '[data-action="save"]',
    ) as HTMLButtonElement | null
    expect(btn).not.toBeNull()
    expect(btn!.disabled).toBe(false)
  })
  const saveBtn = document.querySelector(
    '[data-action="save"]',
  ) as HTMLButtonElement
  await act(async () => {
    fireEvent.click(saveBtn)
  })
  await waitFor(() => {
    expect(vi.mocked(apiClient.saveBlock)).toHaveBeenCalled()
  })
}

function lastSaveBlockArg() {
  const calls = vi.mocked(apiClient.saveBlock).mock.calls
  expect(calls.length).toBeGreaterThan(0)
  const arg = calls[calls.length - 1]![0]
  return arg
}

describe('App save regression — production handleSave pins (WP-029 Phase 2)', () => {
  beforeEach(() => {
    // window.confirm always-true so VariantsDrawer delete proceeds without
    // prompting (Ruling O — native confirm).
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  test('1. tweak-only: accept Hide tweak → saveBlock called with composed CSS, variants null', async () => {
    await mountAppAndSelectBlock(freshBlock())
    await dispatchElementClickAndSwitchBp(FIXTURE_BLOCK.slug, '.hero')
    await clickHideTweak()
    await clickSave()

    const arg = lastSaveBlockArg()
    expect(arg.requestBackup).toBe(true)
    expect(arg.block.slug).toBe(FIXTURE_BLOCK.slug)
    // Tweak compose-on-save invariant — payload CSS contains the @container
    // reveal chunk emitted by composeTweakedCss for bp 768.
    expect(arg.block.css).toMatch(/@container slot \(max-width: 768px\)/)
    expect(arg.block.css).toContain('display:')
    expect(arg.block.css).toContain('none')
    // No variants authored → null sentinel (Phase 5 OQ2 / Ruling LL).
    expect(arg.block.variants).toBeNull()
  })

  test('2. variant-only: fork "sm" variant → saveBlock css unchanged, variants populated', async () => {
    await mountAppAndSelectBlock(freshBlock())
    await openVariantsDrawerAndFork('sm')
    await clickSave()

    const arg = lastSaveBlockArg()
    expect(arg.block.slug).toBe(FIXTURE_BLOCK.slug)
    // No tweaks → CSS passes through verbatim from base block.
    expect(arg.block.css).toBe(FIXTURE_BLOCK.css)
    // Variants object emitted with deep-copy of base.
    expect(arg.block.variants).not.toBeNull()
    expect(arg.block.variants).toEqual({
      sm: { html: FIXTURE_BLOCK.html, css: FIXTURE_BLOCK.css },
    })
  })

  test('3. mixed: tweak + variant fork → saveBlock has composed CSS AND variants', async () => {
    await mountAppAndSelectBlock(freshBlock())
    // Tweak first.
    await dispatchElementClickAndSwitchBp(FIXTURE_BLOCK.slug, '.hero')
    await clickHideTweak()
    // Then fork.
    await openVariantsDrawerAndFork('md')
    await clickSave()

    const arg = lastSaveBlockArg()
    expect(arg.block.css).toMatch(/@container slot \(max-width: 768px\)/)
    expect(arg.block.variants).not.toBeNull()
    expect(arg.block.variants).toHaveProperty('md')
  })

  test('4. variants clear-signal (OQ2): pre-loaded variant deleted → saveBlock variants === null', async () => {
    // Block arrives WITH a variant; user deletes it; save must emit null
    // (NOT undefined — JSON.stringify drops undefined keys).
    await mountAppAndSelectBlock(FIXTURE_BLOCK_WITH_VARIANT)
    await openVariantsDrawerAndDelete('sm')
    await clickSave()

    const arg = lastSaveBlockArg()
    expect(arg.block.variants).toBeNull()
    // Disk parity (Ruling LL) — JSON.stringify preserves the null key.
    const serialized = JSON.stringify(arg.block)
    expect(serialized).toContain('"variants":null')
  })

  test('5. tweak-compose path (OQ5): tweak-only save persists composed CSS [Ruling MM regression pin]', async () => {
    // Phase 6 OQ5 fix — handleSave invokes composeTweakedCss before payload
    // assembly. Pre-fix the saved css was raw block.css. This pin asserts the
    // composed @container chunk reaches the saveBlock payload, mirroring the
    // historical Phase 6 OQ5 pin (integration.test.tsx L727–746) at the live
    // <App /> render-level.
    await mountAppAndSelectBlock(freshBlock())
    await dispatchElementClickAndSwitchBp(FIXTURE_BLOCK.slug, '.hero')
    await clickHideTweak()
    await clickSave()

    const arg = lastSaveBlockArg()
    expect(arg.block.css).toMatch(/@container slot \(max-width: 768px\)/)
    expect(arg.block.css).toContain('.hero')
    expect(arg.block.css).toContain('display:')
    expect(arg.block.css).toContain('none')
    // And the BASE css survives intact (compose layers on top, doesn't replace).
    expect(arg.block.css).toContain('color: red')
  })

  // ─────────────────────────────────────────────────────────────────────
  // Drift detector — Brain C4 ruling. Stays test.skip in committed state.
  // `git diff --quiet` AC gate (Task 2.6) catches accidental un-skip.
  // ─────────────────────────────────────────────────────────────────────
  test.skip(
    'drift detector — adding `if (accepted.length === 0) return` to handleSave kills tweak-only pin',
    async () => {
      // ACTIVATION:
      // 1. Open tools/block-forge/src/App.tsx → find handleSave (L256+).
      // 2. Add at the top of the try-block (just after `setSaveError(null)`):
      //      if (accepted.length === 0) return
      //    This re-introduces the pre-WP-028 Phase 4 carve-out bug.
      // 3. Change `test.skip` above to `test` to un-skip.
      // 4. Run: cd tools/block-forge && npm test
      // 5. EXPECTED:
      //    a. THIS test PASSES (proves drift is now detectable).
      //    b. Test #1 (tweak-only) FAILS (proves the live render-level pin
      //       catches what the harness-mirror in WP-028 Phase 5 missed).
      // 6. REVERT: undo the App.tsx mutation AND change `test` back to
      //    `test.skip`. Then verify `git diff --quiet` exits 0 before commit.
      //
      // The assertion is intentionally inverted: when the drift mutation is
      // present, saveBlock should NOT be called (because handleSave's early
      // return kills it before the await). The skip exists to prove the live
      // render pins are render-level, not harness-mirrored — the WP-028 Phase
      // 5 `assembleSavePayload` harness would have passed silently under the
      // same drift, because it didn't model the early-return guard's location.

      await mountAppAndSelectBlock(freshBlock())
      await dispatchElementClickAndSwitchBp(FIXTURE_BLOCK.slug, '.hero')
      await clickHideTweak()

      const saveBtn = document.querySelector(
        '[data-action="save"]',
      ) as HTMLButtonElement
      await act(async () => {
        fireEvent.click(saveBtn)
      })
      await new Promise((r) => setTimeout(r, 50))

      expect(vi.mocked(apiClient.saveBlock)).not.toHaveBeenCalled()
    },
  )
})
