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

/**
 * VariantsDrawer — Studio Responsive tab surface. WP-028 Phase 3 real UI.
 * Fork/rename/delete through form.setValue('variants', ...) (Ruling Q).
 * Mirror: tools/block-forge/src/components/VariantsDrawer.tsx
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

export function VariantsDrawer(props: VariantsDrawerProps) {
  const { open, onOpenChange, variants, baseHtml, baseCss, onAction } = props
  const testid = props['data-testid'] ?? 'variants-drawer'
  const names = React.useMemo(() => Object.keys(variants).sort(), [variants])

  // Fork + rename inline state — no AlertDialog primitive (Ruling O — native confirm for delete).
  const [forkInput, setForkInput] = React.useState('')
  const [renameState, setRenameState] = React.useState<{ from: string; input: string } | null>(
    null,
  )

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
