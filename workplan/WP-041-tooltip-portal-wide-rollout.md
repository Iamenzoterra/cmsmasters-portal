# WP-041 — Tooltip Primitive Portal-Wide Rollout

> **Status:** 🟡 BACKLOG (drafted 2026-04-28 as WP-037 polish queue carryover)
> **Origin:** WP-034 Phase 2 Close `logs/wp-034/phase-2-result.md` §"What's next" item 3 + WP-037 Phase 3 result.md
> **Estimated effort:** 1–2 phases, ~2–4h depending on adoption breadth
> **Layer:** Cross-portal (`@cmsmasters/ui` consumers across all apps)
> **Priority:** P3 — opportunistic; adopt as features touch label-info patterns
> **Prerequisites:** WP-037 ✅ DONE (Tooltip primitive shipped in `packages/ui/src/primitives/tooltip.tsx`)

---

## TL;DR

WP-037 introduced the first DS-level Tooltip primitive (`packages/ui/src/primitives/tooltip.tsx`) — a Radix-backed convenience component with portal-wide token coupling (`--popover` / `--popover-foreground` / `--shadow-md` / `--rounded-md` / `--spacing-xs/2xs` / `--text-xs-*`). Currently consumed only by Inspector PropertyRow (block-forge + Studio mirror).

WP-041 audits the portal apps for hand-rolled tooltip patterns (`title="..."` attrs, custom hover-info popovers, ad-hoc Radix Tooltip imports) and migrates them to the shared primitive. Also covers consumer onboarding: ensuring `<TooltipProvider>` is wired at app root in any app that adopts.

---

## Problem (from WP-034 phase-2-result.md §What's next)

> **Tooltip primitive portal-wide rollout** — beyond Inspector, future WPs can consume `Tooltip` from `@cmsmasters/ui` for any label-info pattern (carryover from WP-037).

---

## Acceptance criteria

- [ ] **Audit** (Phase 0): catalog every `title=` attr, hand-rolled tooltip, and ad-hoc Radix Tooltip in `apps/portal`, `apps/dashboard`, `apps/studio`, `apps/admin`, `apps/support`, `apps/command-center` — output to `logs/wp-041/phase-0-audit.md`.
- [ ] **Migrate** (Phase 1): replace each catalogued instance with `<Tooltip content="...">` from `@cmsmasters/ui`. Skip command-center (own theme; out of DS scope per CLAUDE.md).
- [ ] **TooltipProvider wiring**: each adopting app has a single `<TooltipProvider>` at root (Studio + block-forge already wired post-WP-037; verify others).
- [ ] **Native `title=` attr policy**: deprecate raw `title=` for non-debug use cases; document in `.context/CONVENTIONS.md` §Tooltips. Hover-info MUST use `<Tooltip>`.
- [ ] **Visual smoke**: spot-check 3+ migrated instances per app for hover delay (400ms), positioning (side="right" default works in most contexts), and z-index above modals.
- [ ] **PARITY trio note**: add §"Tooltip primitive portal-wide" to relevant PARITY.md files (Studio + block-forge already cite it; portal/dashboard/admin/support add cross-references if they adopt).
- [ ] No regression in existing Inspector tooltip behavior (WP-037 baseline).

---

## Constraints

- ❌ No command-center adoption (CC has own theme; per CLAUDE.md "command-center has its OWN theme... DO NOT overwrite or merge CC tokens").
- ❌ No Tooltip primitive API changes — current shape (`<Tooltip content="...">{trigger}</Tooltip>` + compound API) is V1-locked.
- ✅ All adopting apps must wire `<TooltipProvider>` at root.
- ✅ Empty-content escape hatch preserved (Tooltip with empty `content` returns children unwrapped — established WP-037).

---

## Implementation sketch

```tsx
// Before
<button title="Save changes">Save</button>

// After
import { Tooltip } from '@cmsmasters/ui'
<Tooltip content="Save changes">
  <button>Save</button>
</Tooltip>
```

Audit grep targets:
- `\\btitle="` — native HTML title attrs (must be filtered for non-debug, non-iframe-srcDoc instances)
- `@radix-ui/react-tooltip` — direct imports bypassing the DS primitive
- Custom `Tooltip|HoverInfo|Popover` components with hover triggers

---

## Phase budget (estimate)

| Phase | Effort | Scope |
|---|---|---|
| 0 Audit | 1h | Catalog all current tooltip patterns across 5 apps; surface migration counts; Brain ruling on adoption breadth (full sweep vs opportunistic) |
| 1 Migrate | 1–2h | Replace catalogued instances; wire TooltipProvider; smoke |
| 2 Close | 30m | CONVENTIONS update; PARITY note; status flip |

Total: ~2–4h across 1–2 phases.

---

## Cross-references

- WP-037 Phase 1 commit: Tooltip primitive shipped (`packages/ui/src/primitives/tooltip.tsx`)
- WP-037 PARITY trio §Inspector Typed Inputs + Tooltips
- WP-034 Phase 2 Close: `logs/wp-034/phase-2-result.md` §What's next item 3
- `CLAUDE.md` §Use `@cmsmasters/ui` components when they exist
