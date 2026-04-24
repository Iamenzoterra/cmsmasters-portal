import * as React from 'react';
import type { BlockVariants } from '@cmsmasters/db';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  Button,
} from '@cmsmasters/ui';
import { renderForPreview } from '@cmsmasters/block-forge-core';
import { composeSrcDoc } from '../lib/preview-assets';

/**
 * VariantsDrawer — tools/block-forge surface. WP-028 Phase 3 CRUD + Phase 4 editor.
 * Tabbed (Manage + per-variant) with 300ms debounced update-content dispatch.
 * Mirror: apps/studio/src/pages/block-editor/responsive/VariantsDrawer.tsx
 */

/** Ordered list of known reveal-rule names (Ruling M — convention). */
const CONVENTION_NAMES = ['sm', 'md', 'lg'] as const
const CONVENTION_NUMERIC = /^[467]\d\d$/

/** Validator regex from packages/validators/src/block.ts L39 — mirrored here for inline feedback. */
const NAME_REGEX = /^[a-z0-9-]+$/

export type VariantAction =
  | { kind: 'create'; name: string; html: string; css: string }
  | { kind: 'rename'; from: string; to: string }
  | { kind: 'delete'; name: string }
  | { kind: 'update-content'; name: string; html: string; css: string }

export interface VariantsDrawerProps {
  /** Controlled open flag. */
  open: boolean
  /** Close handler — ESC / backdrop / explicit close button. */
  onOpenChange: (open: boolean) => void
  /** Current variants map (from block.variants or form.getValues('variants')). */
  variants: BlockVariants
  /** Base block content — snapshot used to seed new variants at fork time (Ruling N). */
  baseHtml: string
  baseCss: string
  /** Dispatch a variant mutation. Parent wires to session reducer OR form.setValue. */
  onAction: (action: VariantAction) => void
  'data-testid'?: string
}

function validateName(
  name: string,
  existing: readonly string[],
): { ok: boolean; error?: string; warning?: string } {
  if (name.length < 2) return { ok: false, error: 'Name must be at least 2 characters' }
  if (name.length > 50) return { ok: false, error: 'Name must be at most 50 characters' }
  if (!NAME_REGEX.test(name))
    return { ok: false, error: 'Name may only contain a-z, 0-9, and dashes' }
  if (existing.includes(name)) return { ok: false, error: `Variant "${name}" already exists` }
  const isConvention =
    CONVENTION_NAMES.includes(name as (typeof CONVENTION_NAMES)[number]) ||
    CONVENTION_NUMERIC.test(name)
  if (!isConvention) {
    return {
      ok: true,
      warning: `Name "${name}" is not in convention (sm|md|lg|4**|6**|7**) — reveal rule will be skipped.`,
    }
  }
  return { ok: true }
}

/** Ruling CC — default preview width per variant name convention. */
function revealBpForName(name: string): number {
  if (name === 'sm' || /^4\d\d$/.test(name)) return 480
  if (name === 'md' || /^6\d\d$/.test(name)) return 640
  if (name === 'lg' || /^7\d\d$/.test(name)) return 768
  return 640 // non-convention fallback (Ruling CC)
}

export function VariantsDrawer(props: VariantsDrawerProps) {
  const { open, onOpenChange, variants, baseHtml, baseCss, onAction } = props
  const testid = props['data-testid'] ?? 'variants-drawer'
  const names = React.useMemo(() => Object.keys(variants).sort(), [variants])

  // Fork + rename inline state — no AlertDialog primitive (Ruling O — native confirm for delete).
  const [forkInput, setForkInput] = React.useState('')
  const [renameState, setRenameState] = React.useState<{ from: string; input: string } | null>(
    null,
  )

  // Phase 4 — active tab: 'manage' OR a variant name. Auto-returns to 'manage' when the active
  // variant disappears (delete / rename away).
  const [activeTab, setActiveTab] = React.useState<'manage' | string>('manage')
  React.useEffect(() => {
    if (activeTab !== 'manage' && !(activeTab in variants)) {
      setActiveTab('manage')
    }
  }, [variants, activeTab])

  const forkCheck = React.useMemo(
    () => (forkInput.length === 0 ? null : validateName(forkInput, names)),
    [forkInput, names],
  )

  const handleFork = React.useCallback(() => {
    if (!forkCheck?.ok) return
    onAction({ kind: 'create', name: forkInput, html: baseHtml, css: baseCss })
    setForkInput('')
  }, [forkInput, forkCheck, onAction, baseHtml, baseCss])

  const handleRename = React.useCallback(() => {
    if (!renameState) return
    const { from, input } = renameState
    if (input === from) {
      setRenameState(null)
      return
    }
    const check = validateName(
      input,
      names.filter((n) => n !== from),
    )
    if (!check.ok) return
    onAction({ kind: 'rename', from, to: input })
    setRenameState(null)
  }, [renameState, names, onAction])

  const handleDelete = React.useCallback(
    (name: string) => {
      // Ruling O — native window.confirm; no custom modal in Phase 3.
      const go = window.confirm(`Delete variant "${name}"? Undo available in session.`)
      if (!go) return
      onAction({ kind: 'delete', name })
    },
    [onAction],
  )

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent data-testid={testid} className="flex flex-col gap-4">
        <DrawerHeader>
          <DrawerTitle>Variants</DrawerTitle>
          <p className="text-[length:var(--text-sm-font-size)] text-[hsl(var(--text-muted))]">
            Named forks shown via @container reveal at matching breakpoint. Convention: sm | md | lg | 4** | 6** | 7**.
          </p>
        </DrawerHeader>

        <div
          className="flex gap-1 border-b border-[hsl(var(--border-default))] px-6 pt-3"
          data-testid="variants-drawer-tabs"
        >
          <Button
            data-testid="variants-drawer-tab-manage"
            variant={activeTab === 'manage' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('manage')}
          >
            Manage
          </Button>
          {names.map((name) => (
            <Button
              key={name}
              data-testid={`variants-drawer-tab-${name}`}
              variant={activeTab === name ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(name)}
            >
              {name}
            </Button>
          ))}
        </div>

        {activeTab !== 'manage' && variants[activeTab] ? (
          <VariantEditorPanel
            name={activeTab}
            baseHtml={baseHtml}
            baseCss={baseCss}
            variant={variants[activeTab]}
            onUpdate={(html, css) =>
              onAction({ kind: 'update-content', name: activeTab, html, css })
            }
          />
        ) : (
          <div className="flex flex-col gap-3 px-6 pb-4" data-testid="variants-drawer-body">
            {names.length === 0 ? (
              <div
                data-testid="variants-drawer-empty"
                className="rounded-md border border-dashed border-[hsl(var(--border-default))] p-4 text-center text-[length:var(--text-sm-font-size)] text-[hsl(var(--text-muted))]"
              >
                No variants yet. Fork from the base block below.
              </div>
            ) : (
              <ul className="flex flex-col gap-2" data-testid="variants-drawer-list">
                {names.map((name) => {
                  const isRenaming = renameState?.from === name
                  const renameCheck = isRenaming
                    ? validateName(
                        renameState.input,
                        names.filter((n) => n !== name),
                      )
                    : null
                  return (
                    <li
                      key={name}
                      data-testid={`variants-drawer-item-${name}`}
                      className="flex items-center gap-2 rounded-md border border-[hsl(var(--border-default))] p-2"
                    >
                      {isRenaming ? (
                        <>
                          <input
                            data-testid={`variants-drawer-rename-input-${name}`}
                            className="flex-1 rounded border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] px-2 py-1 text-[length:var(--text-sm-font-size)]"
                            value={renameState.input}
                            onChange={(e) =>
                              setRenameState({ from: name, input: e.target.value })
                            }
                            autoFocus
                          />
                          <Button
                            data-testid={`variants-drawer-rename-confirm-${name}`}
                            size="sm"
                            onClick={handleRename}
                            disabled={!renameCheck?.ok}
                          >
                            Save
                          </Button>
                          <Button
                            data-testid={`variants-drawer-rename-cancel-${name}`}
                            size="sm"
                            variant="ghost"
                            onClick={() => setRenameState(null)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <span
                            data-testid={`variants-drawer-name-${name}`}
                            className="flex-1 font-[number:var(--font-weight-medium)]"
                          >
                            {name}
                          </span>
                          <Button
                            data-testid={`variants-drawer-rename-${name}`}
                            size="sm"
                            variant="ghost"
                            onClick={() => setRenameState({ from: name, input: name })}
                          >
                            Rename
                          </Button>
                          <Button
                            data-testid={`variants-drawer-delete-${name}`}
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(name)}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}

            <div
              className="mt-2 flex flex-col gap-2 border-t border-[hsl(var(--border-default))] pt-3"
              data-testid="variants-drawer-fork"
            >
              <label
                htmlFor={`${testid}-fork-input`}
                className="text-[length:var(--text-xs-font-size)] font-[number:var(--font-weight-medium)] text-[hsl(var(--text-muted))]"
              >
                Create variant (deep-copy of base)
              </label>
              <div className="flex gap-2">
                <input
                  id={`${testid}-fork-input`}
                  data-testid="variants-drawer-fork-input"
                  className="flex-1 rounded border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] px-2 py-1 text-[length:var(--text-sm-font-size)]"
                  value={forkInput}
                  onChange={(e) => setForkInput(e.target.value)}
                  placeholder="sm | md | lg | custom-name"
                />
                <Button
                  data-testid="variants-drawer-fork-submit"
                  onClick={handleFork}
                  disabled={!forkCheck?.ok}
                >
                  Create
                </Button>
              </div>
              {forkCheck?.error && (
                <p
                  data-testid="variants-drawer-fork-error"
                  className="text-[length:var(--text-xs-font-size)] text-[hsl(var(--status-error-fg))]"
                >
                  {forkCheck.error}
                </p>
              )}
              {forkCheck?.warning && (
                <p
                  data-testid="variants-drawer-fork-warning"
                  className="text-[length:var(--text-xs-font-size)] text-[hsl(var(--status-warning-fg))]"
                >
                  ⚠ {forkCheck.warning}
                </p>
              )}
            </div>
          </div>
        )}

        <DrawerClose asChild>
          <Button
            data-testid="variants-drawer-close"
            variant="ghost"
            className="self-end mr-4 mb-4"
          >
            Close
          </Button>
        </DrawerClose>
      </DrawerContent>
    </Drawer>
  )
}

interface VariantEditorPanelProps {
  name: string
  baseHtml: string
  baseCss: string
  variant: { html: string; css: string }
  onUpdate: (html: string, css: string) => void
}

/**
 * Phase 4 editor panel — 4 textareas (2 ro base / 2 rw variant) + width slider + mini-preview.
 * Ruling BB: 300ms debounce on textarea edits; flush-on-unmount so closing the drawer mid-edit
 * never drops content. Flush uses a latest-values ref + empty-deps cleanup effect to avoid
 * firing on every keystroke (the deps-array approach fires cleanup on every re-render, which
 * collapses the debounce window).
 * Ruling II: iframe uses reserved slug 'variant-preview' — TweakPanel listener filters by
 * currentSlug, so cross-iframe element-click postMessages from this preview get dropped.
 */
function VariantEditorPanel(props: VariantEditorPanelProps) {
  const { name, baseHtml, baseCss, variant, onUpdate } = props
  // Local controlled state — editor is the live source; debounce pushes to parent.
  const [html, setHtml] = React.useState(variant.html)
  const [css, setCss] = React.useState(variant.css)

  // Sync local state if parent variant changes (e.g. after rename or undo restore).
  React.useEffect(() => {
    setHtml(variant.html)
    setCss(variant.css)
  }, [variant])

  // Ruling BB — 300ms debounce + flush-on-unmount.
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const dispatch = React.useCallback(
    (nextHtml: string, nextCss: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null
        onUpdate(nextHtml, nextCss)
      }, 300)
    },
    [onUpdate],
  )
  // Keep latest values in a ref so the unmount cleanup sees the newest html/css/onUpdate
  // without re-running on every keystroke (which would collapse the debounce window).
  const latestRef = React.useRef({ html, css, onUpdate })
  latestRef.current = { html, css, onUpdate }
  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
        const { html: h, css: c, onUpdate: u } = latestRef.current
        u(h, c)
      }
    }
  }, [])

  // Ruling CC — width slider default per variant name.
  const [previewWidth, setPreviewWidth] = React.useState(() => revealBpForName(name))

  // Mini-preview srcdoc — rebuilt on content/width change. Ruling II reserved slug.
  const srcdoc = React.useMemo(() => {
    const variantList = [{ name, html, css }]
    const preview = renderForPreview(
      { slug: 'variant-preview', html: baseHtml, css: baseCss },
      { variants: variantList },
    )
    return composeSrcDoc({
      html: preview.html,
      css: preview.css,
      width: previewWidth,
      slug: 'variant-preview',
    })
  }, [name, html, css, baseHtml, baseCss, previewWidth])

  return (
    <div className="flex flex-col gap-3 px-6 pb-4" data-testid={`variants-drawer-editor-${name}`}>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <label className="text-[length:var(--text-xs-font-size)] text-[hsl(var(--text-muted))]">
            Base HTML (read-only)
          </label>
          <textarea
            data-testid="variants-editor-base-html"
            className="h-32 rounded border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] px-2 py-1 font-[family-name:var(--font-family-monospace)] text-[length:var(--text-xs-font-size)]"
            value={baseHtml}
            readOnly
          />
          <label className="text-[length:var(--text-xs-font-size)] text-[hsl(var(--text-muted))]">
            Base CSS (read-only)
          </label>
          <textarea
            data-testid="variants-editor-base-css"
            className="h-32 rounded border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] px-2 py-1 font-[family-name:var(--font-family-monospace)] text-[length:var(--text-xs-font-size)]"
            value={baseCss}
            readOnly
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[length:var(--text-xs-font-size)] text-[hsl(var(--text-muted))]">
            Variant HTML
          </label>
          <textarea
            data-testid="variants-editor-variant-html"
            className="h-32 rounded border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] px-2 py-1 font-[family-name:var(--font-family-monospace)] text-[length:var(--text-xs-font-size)]"
            value={html}
            onChange={(e) => {
              const v = e.target.value
              setHtml(v)
              dispatch(v, css)
            }}
          />
          <label className="text-[length:var(--text-xs-font-size)] text-[hsl(var(--text-muted))]">
            Variant CSS
          </label>
          <textarea
            data-testid="variants-editor-variant-css"
            className="h-32 rounded border border-[hsl(var(--border-default))] bg-[hsl(var(--bg-surface))] px-2 py-1 font-[family-name:var(--font-family-monospace)] text-[length:var(--text-xs-font-size)]"
            value={css}
            onChange={(e) => {
              const v = e.target.value
              setCss(v)
              dispatch(html, v)
            }}
          />
        </div>
      </div>
      <div className="flex items-center gap-2" data-testid="variants-editor-width-slider">
        <label className="text-[length:var(--text-xs-font-size)] text-[hsl(var(--text-muted))]">
          Preview width
        </label>
        <input
          type="range"
          min={320}
          max={1440}
          step={10}
          value={previewWidth}
          onChange={(e) => setPreviewWidth(Number(e.target.value))}
          className="flex-1"
        />
        <span className="font-[number:var(--font-weight-medium)] text-[length:var(--text-sm-font-size)] tabular-nums">
          {previewWidth}px
        </span>
      </div>
      <iframe
        data-testid={`variants-editor-preview-iframe-${name}`}
        title={`Variant ${name} preview`}
        srcDoc={srcdoc}
        sandbox="allow-scripts allow-same-origin"
        className="h-64 rounded border border-[hsl(var(--border-default))]"
        style={{ width: `${previewWidth}px`, maxWidth: '100%' }}
      />
    </div>
  )
}
