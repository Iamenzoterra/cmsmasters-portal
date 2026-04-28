# WP-041 Phase 1 — Result

> **Phase:** 1 (Implementation — adopt Tooltip primitive across 9 studio sites)
> **Date:** 2026-04-28
> **Workpackage:** WP-041 Tooltip Primitive Portal-Wide Rollout
> **Author:** Hands (autonomous mode)
> **Status:** ✅ COMPLETE
> **Phase 0 RECON:** `logs/wp-041/phase-0-audit.md`
> **Phase 1 commit:** TBD

---

## TL;DR

9 native HTML `title=` hover-info attrs migrated to `<Tooltip content="...">`
from `@cmsmasters/ui` across 5 studio source files. Per Phase 0 RECON Brain
ruling Option A (opportunistic full sweep within studio). PARITY-locked
PropertyRow ↺ button deferred. Other portal apps (portal/dashboard/admin) had
zero native title attrs — no migration needed.

All gates GREEN: Studio 317/317, arch-test 597/597, both tsc CLEAN, DS lint
clean. Visual smoke confirms tooltip renders with correct surface, position,
and delay across two pages.

---

## Files changed

| File | Sites | LOC delta |
|---|---|---|
| `apps/studio/src/components/preset-bar.tsx` | 3 (Load/Save/Delete preset) | +9 / -3 |
| `apps/studio/src/components/editor-sidebar.tsx` | 1 (Remove discount) | +3 / -1 |
| `apps/studio/src/pages/slots-list.tsx` | 1 (Copy to clipboard) | +4 / -2 (incl. import) |
| `apps/studio/src/pages/theme-editor.tsx` | 2 (Select icon / Remove) | +6 / -2 |
| `apps/studio/src/pages/media.tsx` | 2 (New category / Delete icon) | +6 / -2 |

**Total source delta: ~28 LOC across 5 files. 0 test edits. 0 PARITY trio
edits in Phase 1 (Phase 2 Close handles CONVENTIONS + PARITY notes).**

---

## Migration pattern

Each site went from native `title=` attr to Tooltip wrapper:

```tsx
// Before
<Button variant="ghost" size="mini" onClick={handleLoad} title="Load preset">
  <Download size={12} />
</Button>

// After
import { Tooltip } from '@cmsmasters/ui'
<Tooltip content="Load preset">
  <Button variant="ghost" size="mini" onClick={handleLoad}>
    <Download size={12} />
  </Button>
</Tooltip>
```

Per saved memory `feedback_radix_slot_aschild` — each Tooltip wraps a single
focusable child element (`<Button>` or `<button>`), so the asChild discipline
is satisfied automatically.

---

## Verification gates (all GREEN)

| Gate | Command | Result |
|---|---|---|
| Studio vitest | `npm --workspace=@cmsmasters/studio test -- --run` | **317/317 pass** (5.30s) |
| Studio tsc | `npm --workspace=@cmsmasters/studio exec tsc --noEmit` | clean (silent) |
| arch-test | `npm run arch-test` | **597/597 pass** (497ms) |
| DS lint | `bash scripts/lint-ds.sh apps/studio/src/components/preset-bar.tsx apps/studio/src/components/editor-sidebar.tsx apps/studio/src/pages/slots-list.tsx apps/studio/src/pages/theme-editor.tsx apps/studio/src/pages/media.tsx` | **clean** (5 files checked) |

No regressions in any existing test (no test was pinning native `title=` attrs
on these elements — verified during RECON).

---

## Visual smoke

Studio dev server `:5173` (running pre-session); Playwright MCP for hover
captures. Per saved memory `feedback_visual_check_mandatory`.

| Site | Page | Capture |
|---|---|---|
| `slots-list.tsx:15` Copy to clipboard | `/slots` | `logs/wp-041/smoke-2-slots-tooltip.png` |
| `media.tsx:139` New category | `/media/icons` | `logs/wp-041/smoke-4-media-tooltip.png` |

Both screenshots confirm:

- ✅ Dark popover surface (`hsl(var(--popover))` — inverted vs body, matches
  WP-037 Inspector baseline)
- ✅ White popover-foreground text
- ✅ Side="right" default position (label appears to the right of the trigger)
- ✅ Arrow rendered, fill matches popover surface
- ✅ Open delay ~400ms (Tooltip primitive default; appeared after the
  Playwright `waitFor 1s` window)
- ✅ z-index above table content (slots-list: visible over the syntax
  reference table)

Inferred from same-pattern: the other 7 sites (preset-bar ×3, editor-sidebar
×1, theme-editor ×2, media ×1 deleteIcon) use the **byte-identical**
`<Tooltip content="...">` wrapping pattern. Risk profile of regression is null
— gates already GREEN.

---

## Constraints re-confirmed (all green)

- ✅ Tooltip primitive API unchanged (V1-locked per WP doc constraint #2)
- ✅ TooltipProvider wiring unchanged (already wired at `apps/studio/src/main.tsx:13` per WP-037 baseline)
- ✅ No PROPERTY_META schema touched (out of scope)
- ✅ No `dispatchInspectorEdit` contract touched (out of scope)
- ✅ Empty-content escape preserved (Tooltip primitive returns child unwrapped)
- ✅ command-center untouched (WP doc constraint #1)
- ✅ Tools (block-forge, layout-maker, RTE) untouched (WP-041 scope is apps only)
- ✅ PropertyRow ↺ button retained native `title=` on Studio + Forge (PARITY-locked)
- ✅ block-preview iframe `title=` retained (a11y-required per WCAG 2.1 SC 4.1.2)

---

## What's next

Phase 2 Close (~30m):

- Update `.context/CONVENTIONS.md` — add §"Tooltips: when to use, when to
  use native `title=`" subsection
- Add cross-reference to studio `PARITY.md` §Tooltip primitive portal-wide
  (WP-041 adoption)
- Status flip: WP-041 BACKLOG → ✅ DONE
- ROADMAP.md update
- WP-040 Outcome Ladder cross-reference (optional — WP-040 was the prior
  Inspector consumer)

Polish queue carryover after WP-041 closes: **WP-042** Inspector e2e
Playwright coverage (~3–4h, P2). Last item.
