# WP-041 Phase 0 — Audit & RECON Result

> **Phase:** 0 (Audit — catalog tooltip patterns + Brain ruling on adoption breadth)
> **Date:** 2026-04-28
> **Workpackage:** WP-041 Tooltip Primitive Portal-Wide Rollout
> **Author:** Hands (autonomous mode)
> **Status:** ✅ COMPLETE
> **Phase 1 commit:** TBD

---

## TL;DR

Audit grep across 5 portal apps + tools: native HTML `title=` attrs are **almost
exclusively concentrated in `apps/studio`** (10 sites). Other portal apps
(`apps/portal`, `apps/dashboard`, `apps/admin`) have **zero native title-attr
hover-info patterns** — all `title=` matches in those apps are component props
(`<PageHeader title="...">`, `<DetailCard title="...">`, etc.). `apps/support`
**does not exist** in the workspace (typo in WP doc).

**Migration count: 9 sites in studio.** PropertyRow ↺ button (PARITY-locked
across Forge mirror) is deferred. Block-preview iframe `title=` is required a11y.

**Brain ruling: Option A (opportunistic full sweep within studio).** Migrate
all 9 sites in this WP. TooltipProvider already wired in studio main.tsx
(WP-037 baseline) — no new provider wiring needed. Other apps not adopting
this WP — wire opportunistically as features land.

---

## Audit grep methodology

Three target patterns per WP doc §"Audit grep targets":

| Pattern | Targets |
|---|---|
| `\btitle="` | Native HTML `title` attrs on focusable DOM elements |
| `@radix-ui/react-tooltip` | Direct Radix imports bypassing the DS primitive |
| Custom `Tooltip\|HoverInfo\|Popover` | Hand-rolled hover-info components |

Component-prop noise filtered manually (e.g., `<PageHeader title="...">`,
`<FormSection title="...">`, `<DeleteConfirmModal title="...">`,
`<TaxonomyPickerModal title="...">`, `<Section title="...">`) — these are
React component props with semantic meaning ≠ native HTML hover tooltip.

---

## Findings — by app

### `apps/studio` (10 native title-attr sites — 9 migrate + 1 deferred)

| File | Line | Element | Title text | Migrate? |
|---|---|---|---|---|
| `src/components/preset-bar.tsx` | 101 | `<Button>` | "Load preset" | ✅ |
| `src/components/preset-bar.tsx` | 111 | `<Button>` | "Save as preset" | ✅ |
| `src/components/preset-bar.tsx` | 121 | `<Button>` | "Delete preset" | ✅ |
| `src/components/editor-sidebar.tsx` | 264 | `<Button>` | "Remove discount" | ✅ |
| `src/pages/slots-list.tsx` | 15 | `<button>` | "Copy to clipboard" | ✅ |
| `src/pages/theme-editor.tsx` | 970 | `<button>` | "Select icon" | ✅ |
| `src/pages/theme-editor.tsx` | 1004 | `<button>` | "Remove" | ✅ |
| `src/pages/media.tsx` | 139 | `<button>` | "New category" | ✅ |
| `src/pages/media.tsx` | 362 | `<button>` | "Delete icon" | ✅ |
| `src/pages/block-editor/responsive/inspector/PropertyRow.tsx` | 194 | `<button>` | "Revert to base value (remove tweak)" | ❌ PARITY-locked |
| `src/components/block-preview.tsx` | 200 | `<iframe>` | "Block preview" | ❌ a11y-required |

**PropertyRow ↺ button** — byte-mirror with `tools/block-forge/src/components/PropertyRow.tsx:208`
(WP-040 PARITY trio Ruling 1B retired → unified single-cell shape). Migrating
Studio without Forge would re-break PARITY. Tools are out of WP-041 scope per
WP doc. **Deferral ruling:** keep native `title=` on both surfaces; revisit
in a coordinated PARITY mirror WP if/when Inspector gets a broader Tooltip
sweep.

**Block-preview iframe** — `<iframe title="...">` is **required for a11y** per
WCAG 2.1 SC 4.1.2 (iframe needs accessible name). Native `title=` here is the
correct pattern; Tooltip primitive does not apply.

### `apps/portal` — 0 sites

No `title=` attr matches anywhere in `apps/portal/src/**/*.tsx`. No adoption
needed in this WP.

### `apps/dashboard` — 0 sites

No `title=` attr matches anywhere in `apps/dashboard/src/**/*.tsx`. No
adoption needed in this WP.

### `apps/admin` — 0 sites (after filtering component props)

All 11 `title=` matches in `apps/admin/src/**/*.tsx` are component props on
`<PageHeader>` / `<DetailCard>`. No native HTML title attrs. No adoption
needed in this WP.

### `apps/support` — N/A

Workspace `ls apps/` returns: `admin, api, command-center, dashboard, portal,
studio`. **`support` app does not exist.** WP doc references a phantom app —
suggest removing from acceptance criteria in Phase 2 Close.

### `apps/command-center` — explicit out of scope

CLAUDE.md: "command-center has its OWN theme... DO NOT overwrite or merge CC
tokens with Portal DS." Skip per WP doc constraint #1.

The one `Tooltip` import in `apps/command-center/components/BurndownChart.tsx`
is the **`recharts` Tooltip**, not the DS primitive — unrelated to WP-041.

---

## Findings — `@radix-ui/react-tooltip` direct imports

Grep for `@radix-ui/react-tooltip` across `apps/`: **0 matches**.

Same grep across `packages/ui/`: **2 matches** (`packages/ui/package.json`
declared dep + `packages/ui/src/primitives/tooltip.tsx` consumer — the DS
primitive itself).

**No bypassing the DS primitive in any app.** ✓

---

## Findings — custom hover-info components

Grep `Tooltip|HoverCard|hoverPopover` across `apps/`:

- `apps/studio/src/main.tsx` — TooltipProvider wired (WP-037 baseline) ✓
- `apps/studio/src/pages/block-editor/responsive/inspector/PropertyRow.tsx` — Tooltip primitive (WP-037 baseline) ✓
- `apps/studio/src/pages/block-editor/responsive/inspector/__tests__/{Inspector,InspectorPanel,PropertyRow}.test.tsx` — TooltipProvider test wrappers (WP-037 baseline) ✓
- `apps/command-center/components/BurndownChart.tsx` — recharts Tooltip (NOT DS — out of scope)

**No hand-rolled hover popover components** in any portal app. ✓

---

## Findings — TooltipProvider wiring

| App | TooltipProvider at root? | Notes |
|---|---|---|
| `apps/studio` | ✅ wired (`src/main.tsx:13`) | WP-037 baseline |
| `apps/portal` | ❌ not wired | Lazy — wire only if first migration lands |
| `apps/dashboard` | ❌ not wired | Lazy — wire only if first migration lands |
| `apps/admin` | ❌ not wired | Lazy — wire only if first migration lands |
| `apps/support` | N/A | App does not exist |
| `apps/command-center` | N/A | Out of scope (own theme) |

**Wiring decision:** lazy. Only wire `<TooltipProvider>` in an app the first
time it adopts a `<Tooltip>`. Pre-wiring providers in apps that don't use the
primitive yet adds dead React tree depth. Per AC #3: "each adopting app".

---

## Decision matrix (Brain ruling)

| Option | Pros | Cons |
|---|---|---|
| **A ⭐ — Opportunistic full sweep within studio** | All 9 studio sites migrate this WP; consistent UX across studio; small enough to ship in one phase (~1.5h) | Other apps remain on hand-rolled patterns indefinitely (but: no patterns exist in those apps yet) |
| **B — Migrate per-page on demand** | Lowest risk per phase | Defers value; 9 sites stays as polish queue debt |
| **C — Full sweep including PropertyRow ↺ + Forge mirror** | Maximum unification; PropertyRow ↺ also gets the polish | Extends scope into tools (out of WP-041 scope per doc); breaks the WP boundary |

**Brain ruling: Option A.** Reasoning:

1. Scope is empirically tiny (9 sites in one app) — the risk profile fits one
   phase, not three.
2. PropertyRow ↺ deferral is principled (PARITY-locked); not a workaround for
   complexity.
3. Other portal apps having 0 sites means there's nothing to "sweep" there —
   adoption naturally tracks new feature work.
4. CLAUDE.md mandates `@cmsmasters/ui` consumption when primitives exist —
   Option A satisfies that for studio's existing surface area.

---

## Phase 1 implementation plan

For each of the 9 sites:

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

**Per-file edits:**

| File | Sites | Import added? |
|---|---|---|
| `src/components/preset-bar.tsx` | 3 (Load/Save/Delete preset) | yes |
| `src/components/editor-sidebar.tsx` | 1 (Remove discount) | yes |
| `src/pages/slots-list.tsx` | 1 (Copy to clipboard) | yes |
| `src/pages/theme-editor.tsx` | 2 (Select icon / Remove) | yes |
| `src/pages/media.tsx` | 2 (New category / Delete icon) | yes |

**Constraint checks:**

- ✅ Each migration site has a single focusable child element (Tooltip's
  `asChild` discipline — saved memory `feedback_radix_slot_aschild`).
- ✅ TooltipProvider already wired in studio main.tsx → all 9 sites have
  provider context.
- ✅ Empty-content escape hatch preserved (Tooltip primitive returns child
  unwrapped when content is null/undefined/empty — established WP-037).
- ✅ No PROPERTY_META / dispatchInspectorEdit / WP-040 PARITY surface touched.

---

## Verification gates (Phase 1)

| Gate | Command | Expected |
|---|---|---|
| Studio vitest | `npm --workspace=@cmsmasters/studio test` | 317/317 GREEN |
| Studio tsc | `npm --workspace=@cmsmasters/studio exec tsc --noEmit` | clean |
| arch-test | `npm run arch-test` | 597/597 GREEN |
| DS lint | `bash scripts/lint-ds.sh apps/studio/src/components/preset-bar.tsx apps/studio/src/components/editor-sidebar.tsx apps/studio/src/pages/slots-list.tsx apps/studio/src/pages/theme-editor.tsx apps/studio/src/pages/media.tsx` | clean |
| Visual smoke | Studio :5173 hover preset-bar buttons + dashboard pages | Tooltips appear with 400ms delay, side="right", popover styling, arrow visible |

---

## Phase 1 scope locked

- 9 sites in 5 studio files
- ~25 LOC source delta (5 imports + 9 wrap pairs)
- 0 test edits expected (none of the 9 sites have tests pinning the title attr)
- 0 PARITY trio doc edits in Phase 1 (Phase 2 Close handles CONVENTIONS + PARITY)
- Single commit: `feat(studio): WP-041 phase 1 — adopt Tooltip primitive across 9 studio sites`

---

## Cross-references

- WP-037 Tooltip primitive (`packages/ui/src/primitives/tooltip.tsx`)
- WP-040 PropertyRow PARITY mirror (PARITY-locked deferral rationale)
- CLAUDE.md §Use `@cmsmasters/ui` components when they exist
- Saved memory `feedback_radix_slot_aschild` (asChild discipline)
- Saved memory `feedback_preflight_recon_load_bearing` (Phase 0 RECON gate)
