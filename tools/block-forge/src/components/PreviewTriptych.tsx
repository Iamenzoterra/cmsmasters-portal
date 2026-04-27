// Tabbed preview viewport (post-WP-030 polish — Phase 2's "auto-scale-to-fit"
// follow-up). Was 3 fixed-width panels stacked horizontally (1440 / 768 / 375 →
// ~2623px combined → forced parent horizontal scroll); now ONE BP at a time via
// tab switching + a fullscreen toggle. File name kept (`PreviewTriptych.tsx`)
// to avoid arch-test owned_files churn — the export name is unchanged so
// App.tsx's import is byte-stable.
//
// WP-028 Phase 3.5 — Path B re-converge: this surface emits ONLY the outer
// `.slot-inner` wrap; the inner `<div data-block-shell="{slug}">` comes
// pre-wrapped via `renderForPreview()` upstream. Iframe DOM contract is
// unchanged by this UI change — see PARITY.md.
//
// WP-030 redesign — per-BP fluid toggle (Fluid|Static) is rendered next to the
// fullscreen control whenever the active tab is tablet or mobile. Desktop tab
// hides the toggle: at desktop viewport the fluid clamp already evaluates to
// maxPx, so a desktop opt-out is visually a no-op.

import { useEffect, useMemo, useState } from 'react'
import { renderForPreview, type Variant } from '@cmsmasters/block-forge-core'
import type { BlockJson } from '../types'
import type { BpFluid, FluidMode } from '../lib/fluid-mode'
import { PreviewPanel } from './PreviewPanel'
import { FluidModeControl } from './FluidModeControl'

const VIEWPORTS = [
  { id: 'desktop', label: 'Desktop', width: 1440 },
  { id: 'tablet', label: 'Tablet', width: 768 },
  { id: 'mobile', label: 'Mobile', width: 375 },
] as const

type ViewportId = (typeof VIEWPORTS)[number]['id']

type Props = {
  block: BlockJson | null
  fluidMode: FluidMode
  onFluidModeChange: (mode: FluidMode) => void
}

export function PreviewTriptych({ block, fluidMode, onFluidModeChange }: Props) {
  const [activeId, setActiveId] = useState<ViewportId>('desktop')
  const [fullscreen, setFullscreen] = useState(false)

  // ESC exits fullscreen. Listener is parent-window-scoped; iframe keydowns
  // don't bubble across the sandbox boundary so this does not conflict with
  // any potential in-iframe Escape handlers.
  useEffect(() => {
    if (!fullscreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreen])

  // WP-028 Phase 3.5 — Path B: engine single-call. composeVariants runs inside
  // renderForPreview when variantList is non-empty; output html is pre-wrapped
  // with `<div data-block-shell="{slug}">…</div>`. PreviewPanel's composeSrcDoc
  // then adds only the outer `.slot-inner` wrap (single-wrap, matches Studio).
  const previewBlock = useMemo<BlockJson | null>(() => {
    if (!block) return null
    const variantList: Variant[] = block.variants
      ? Object.entries(block.variants).map(([name, v]) => ({
          name,
          html: v.html,
          css: v.css,
        }))
      : []
    const preview = renderForPreview(
      { slug: block.slug, html: block.html, css: block.css },
      { variants: variantList },
    )
    return { ...block, html: preview.html, css: preview.css }
  }, [block])

  if (!previewBlock) {
    return (
      <div className="flex h-full items-center justify-center text-[length:var(--text-sm-font-size)] text-[hsl(var(--text-muted))]">
        Select a block to preview
      </div>
    )
  }

  const active = VIEWPORTS.find((v) => v.id === activeId) ?? VIEWPORTS[0]
  const toggleableBp = activeId === 'tablet' || activeId === 'mobile' ? activeId : null

  const handlePerBpChange = (bp: 'tablet' | 'mobile', value: BpFluid) => {
    onFluidModeChange({ ...fluidMode, [bp]: value })
  }

  const stage = (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-[hsl(var(--bg-page))]">
      <div
        data-region="preview-tabs"
        className="flex flex-wrap items-center justify-between gap-2 border-b border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] px-4 py-2"
      >
        <div role="tablist" aria-label="Preview viewport" className="flex gap-1">
          {VIEWPORTS.map((v) => {
            const selected = v.id === activeId
            return (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={selected}
                data-testid={`preview-tab-${v.id}`}
                onClick={() => setActiveId(v.id)}
                className={
                  selected
                    ? 'inline-flex items-center gap-2 rounded-md bg-[hsl(var(--bg-surface-alt))] px-3 py-1.5 text-[length:var(--text-sm-font-size)] font-medium text-[hsl(var(--text-primary))]'
                    : 'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-[length:var(--text-sm-font-size)] text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--bg-surface-alt))]'
                }
              >
                <span>{v.label}</span>
                <span className="text-[length:var(--text-xs-font-size)] text-[hsl(var(--text-muted))]">
                  {v.width}px
                </span>
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-2">
          {toggleableBp && (
            <FluidModeControl
              bp={toggleableBp}
              value={fluidMode[toggleableBp]}
              onChange={(value) => handlePerBpChange(toggleableBp, value)}
            />
          )}
          <button
            type="button"
            data-testid="preview-fullscreen-toggle"
            onClick={() => setFullscreen((f) => !f)}
            aria-label={fullscreen ? 'Exit fullscreen (Esc)' : 'Enter fullscreen'}
            aria-pressed={fullscreen}
            className="inline-flex items-center gap-2 rounded-md border border-[hsl(var(--border-default))] px-3 py-1.5 text-[length:var(--text-sm-font-size)] text-[hsl(var(--text-primary))] hover:bg-[hsl(var(--bg-surface-alt))]"
          >
            {fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            <span className="text-[length:var(--text-xs-font-size)] text-[hsl(var(--text-muted))]">
              {fullscreen ? 'Esc' : ''}
            </span>
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="flex min-h-full min-w-max items-start justify-center p-6">
          <PreviewPanel
            block={previewBlock}
            width={active.width}
            label={active.label}
            showLabel={false}
          />
        </div>
      </div>
    </div>
  )

  if (fullscreen) {
    return (
      <div
        data-testid="preview-fullscreen-overlay"
        className="fixed inset-0 z-50 bg-[hsl(var(--bg-page))]"
      >
        {stage}
      </div>
    )
  }
  return stage
}
