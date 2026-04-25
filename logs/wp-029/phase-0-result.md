# WP-029 Phase 0 RECON — Result Log

**Phase:** 0 — RECON
**Status:** ⚠️ DRIFT-FOUND (1 material drift to surface for Brain ruling — see §Open Questions; otherwise complete)
**Commit SHA:** <embed after commit>
**Duration:** ~50min
**Brain rulings consumed:** C1 (reveal-rule audit) + C2 (PostCSS exit criteria) + C4 preview (drift detector codification — preview only)

---

## §0.1 — Context load

Read in full:
- `.claude/skills/domains/studio-blocks/SKILL.md` — Tweaks+Variants integration section, dispatchTweakToForm live-read invariant, `formDataToPayload` null-on-empty contract.
- `.claude/skills/domains/infra-tooling/SKILL.md` — Tweaks+Variants authoring section, OQ5 fix site, VariantEditor mini-preview reserved-slug rule.
- `.claude/skills/domains/pkg-block-forge-core/SKILL.md` — public API surface (6 fns), PostCSS-AST internals, fixture freezing rules.
- `logs/wp-028/parked-oqs.md` — entirety; OQ4 + OQ6 verbatim quotes captured below.

### OQ4 verbatim (source: §OQ4 Historical):

> Portal's `renderBlock` (apps/portal/lib/hooks.ts L222-224) inlines variant CSS verbatim without auto-scoping to `[data-variant="NAME"]` — per ADR-025 convention, authors write reveal rules themselves. Phase 4 smoke caught this the hard way: first test variant CSS (`.block-fast-loading-speed { background: red }` un-scoped, no reveal rule) leaked to base variant. Real-world authors will make the same mistake.
>
> **Proposal:** Studio-side validator warns at edit time when variant CSS lacks either:
> - `[data-variant="NAME"]` prefix scoping, OR
> - `@container slot (max-width: Npx) { ... }` reveal rule

### OQ6 verbatim (source: §OQ6 Historical):

> Phase 5 carve-out regression pins (3 block-forge tests in `integration.test.tsx`) exercise `assembleSavePayload` — a test-local function mirroring App.tsx `handleSave` payload-assembly. If production `handleSave` drifts away from the mirror (e.g. re-introduces `if (accepted.length === 0) return` early-return), the pins do NOT fire — they exercise the harness, not production code.

---

## §0.2 — End-state check

`npm run arch-test` → **499 passed / 0 failed**, 487ms.

Matches WP-028 close (`288281b9`) baseline. **No drift.** Proceeding.

---

## §0.3 — VariantEditor target inspection

**File path correction:** task brief named `VariantEditor.tsx`; actual file is `apps/studio/src/pages/block-editor/responsive/VariantsDrawer.tsx`. The variant editor exists as inline component `VariantEditorPanel` (L342–478) within VariantsDrawer.tsx. Same component is mirrored byte-identical in `tools/block-forge/src/components/VariantsDrawer.tsx` (Ruling GG cross-surface body discipline).

**Findings on `VariantEditorPanel` (L342–478):**

- **CSS textarea binding** — L439–448, `data-testid="variants-editor-variant-css"`. Bound to **local controlled state** `css` (L346) via `useState`, NOT directly to RHF. Local state syncs to parent via 300ms debounced `dispatch(html, css)` callback (L356–365) → `onUpdate(html, css)` → `onAction({ kind: 'update-content', name, html, css })` (L175–177) → parent's `dispatchVariantToForm` writes `form.variants` with `shouldDirty: true`.

- **Existing warning slot** — present in **manage view** at L299–306 (forkCheck `forkCheck.warning` paragraph, status-warning-fg color, ⚠ prefix). **NOT present in `VariantEditorPanel` editor body.** Empty space between width slider (L451–467) and iframe (L468–475) is a natural insertion point; alternatively between textareas grid (L401–450) and width slider.

- **Component structure (≤30-line tree summary):**
  ```
  VariantsDrawer (L77–323)
  └─ <Drawer>
     └─ <DrawerContent>
        ├─ <DrawerHeader>  // title + convention hint (L137–142)
        ├─ <div tabs>      // Manage + per-variant buttons (L144–167)
        ├─ <VariantEditorPanel /> if activeTab !== 'manage'   ← editor mount site
        │   OR <div manage-body> with rename/delete list + fork form
        └─ <DrawerClose>

  VariantEditorPanel (L342–478)
  ├─ local state: html, css (L345–352, useState + useEffect parent-sync)
  ├─ debounce: dispatch (L356–365, 300ms timer + flush-on-unmount via latestRef)
  ├─ previewWidth state (L382, revealBpForName default per Ruling CC)
  ├─ srcdoc memo (L385–397, renderForPreview + composeSrcDoc, slug='variant-preview')
  └─ render
     ├─ grid 2-col textareas (base RO L402–421 / variant RW L422–449)
     ├─ width slider row (L451–467)
     └─ iframe with sandbox="allow-scripts allow-same-origin" (L468–475)
  ```

- **Existing debounce/validation pattern** — debounce: yes (300ms via `setTimeout` + `clearTimeout`; latestRef pattern Ruling BB to avoid debounce-window collapse). Validator: only `validateName` (L48–67) wired to fork/rename inputs (manage view); **NO validator currently runs on textarea content**. Phase 1 validator MUST add fresh — cannot reuse fork validator (different semantics).

**Carry-over (b):** Phase 1 inserts validator into `VariantEditorPanel` after the 2-col textareas grid (around L450), reading from local `css` state with debounced dispatch (reuse 300ms debounceRef OR add separate one to keep concerns isolated). Validator output renders as warning paragraph mirroring L299–306 styling.

---

## §0.3.a — Reveal-rule convention audit (Brain C1)

**`composeVariants` emits (verbatim from `packages/block-forge-core/src/compose/compose-variants.ts` L82–85 + container-query.ts L1–3):**

```typescript
// compose-variants.ts L82–85
const revealBody =
  `  [data-variant="base"] { display: none; }\n` +
  `  [data-variant="${v.name}"] { display: block; }`
cssChunks.push(buildAtContainer(bp, revealBody))
```

```typescript
// container-query.ts L1–3
export function buildAtContainer(bp: number, body: string): string {
  return `@container slot (max-width: ${bp}px) {\n${body}\n}`
}
```

→ Production code emits `@container slot (max-width: Npx)` with `bp ∈ {480, 640, 768}` per the `variantBp` map (L20–25).

**ADR-025 documents (verbatim from `workplan/adr/025-responsive-blocks.md`):**

L96–104 Layer 4 example uses **`@container block (max-width: 480px)`** (named `block`, NOT `slot`):
```css
.block-hero-cta { container-type: inline-size; container-name: block; }
.block-hero-cta [data-variant="base"] { display: block; }
.block-hero-cta [data-variant="mobile"] { display: none; }
@container block (max-width: 480px) {
  .block-hero-cta [data-variant="base"]   { display: none; }
  .block-hero-cta [data-variant="mobile"] { display: block; }
}
```

Layers 1–2 examples (L47–52) use **unnamed** queries: `@container (max-width: 768px) { … }`.

**`.context/CONVENTIONS.md` says (verbatim L468–471):**

> Layout Maker's css-generator emits `container-type: inline-size; container-name: slot` on the generic `[data-slot] > .slot-inner` rule. Block CSS may author `@container slot (max-width: …) { … }` to react to the block's slot width.

L477:
> @container rules inside block CSS reveal the matching variant at each slot width

**Cross-check verdict: ALIGNED with caveat — ADR-025 example uses illustrative `block` container-name; production realized convention is `slot` (matches the slot wrapper LM emits). CONVENTIONS.md L469 documents the `slot` name explicitly. Implementation + CONVENTIONS aligned; ADR-025 example is illustrative-only and not load-bearing for the validator. NOT a blocking ADR drift.**

**Accepted reveal-rule syntaxes (carry-over h):**

| Syntax | Evidence | Validator decision |
|---|---|---|
| `@container slot (max-width: Npx) { … }` | Production: `compose-variants.ts` + `container-query.ts buildAtContainer` emit this verbatim. CONVENTIONS.md L469 documents. | **MUST accept** — primary convention. |
| `@container (max-width: Npx) { … }` (unnamed) | ADR-025 Layers 1–2 examples L47–52. Browsers query nearest container ancestor — works at runtime for blocks placed in slots. | **SHOULD accept** defensively (per Brain C1 minimum hypothesis) — false-negative risk if rejected. |
| `@container <name> (max-width: Npx) { … }` (named ≠ slot) | ADR-025 Layer 4 hypothetical example uses `block`. Hand-authored blocks may declare own `container-name`. | **SHOULD accept** any `@container [name?] (max-width: …)` shape — prefix-scoping under `[data-variant="NAME"]` is the orthogonal validator concern. |
| `[data-variant="NAME"] .selector { … }` | ADR-025 + variant scoping convention; `composeVariants` auto-prefixes via `scopeUnderVariant` L28–36 for variant overlay CSS. Authors can pre-prefix manually instead. | **MUST accept** — prefix-scoping satisfies the scoping invariant independent of reveal rule. |

**Validator pass criteria (proposed for Phase 1):** a top-level rule in variant CSS passes if EITHER:
1. nested under any `@container (…)` at-rule (named or unnamed), OR
2. its selector is prefixed with `[data-variant="<this-variant-name>"]` token.

Top-level rules that satisfy NEITHER are flagged at edit time → warning banner.

---

## §0.4 — PostCSS audit + exit criteria (Brain C2)

**PostCSS import sites found (production code, excluding worktrees):**

| Site | Path | Note |
|---|---|---|
| 1 | `packages/block-forge-core/src/analyze/parse-css.ts:1` | `postcss, { type AtRule, type Container, type Document }` |
| 2 | `packages/block-forge-core/src/compose/compose-variants.ts:1` | `postcss, { type Rule as PcssRule }` — variant scoping walker |
| 3 | `packages/block-forge-core/src/compose/emit-tweak.ts:1` | `postcss, { type AtRule as PcssAtRule, type Rule as PcssRule }` |
| 4 | `packages/block-forge-core/src/lib/css-scoping.ts:1` | `postcss, { type Rule as PcssRule }` — `scopeBlockCss` helper |
| 5 | **`apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx:10`** | `postcss, { type AtRule as PcssAtRule, type Rule as PcssRule }` — **already imports postcss directly in Studio surface** |

**Re-exports from `@cmsmasters/block-forge-core` public API:** none. `packages/block-forge-core/src/index.ts` exports the 6 functions + 11 types only; no `postcss` re-export.

**Reusable scoping-aware walker:** `packages/block-forge-core/src/lib/css-scoping.ts` exports `scopeBlockCss` (root prefix logic) and `compose-variants.ts` has private `scopeUnderVariant` (file-internal, not exported). Neither is shaped as a "validator-friendly walker"; Phase 1 builds fresh PostCSS walk in Studio rather than re-export.

**Studio `apps/studio/package.json`:**
- `dependencies` keys: `@cmsmasters/auth, @cmsmasters/block-forge-core, @cmsmasters/db, @cmsmasters/ui, @cmsmasters/validators, @hookform/resolvers, lucide-react, react, react-dom, react-hook-form, react-router-dom`
- `devDependencies` keys: `@tailwindcss/postcss, @testing-library/dom, @testing-library/react, @types/react, @types/react-dom, @vitejs/plugin-react, autoprefixer, jsdom, postcss, tailwindcss, typescript, vite, vitest`

**Note:** Studio has **`postcss: ^8` as devDep** (Tailwind/PostCSS pipeline). Plus transitively via `@cmsmasters/block-forge-core` (workspace `*` → its `postcss: 8.5.10` runtime dep).

**`packages/block-forge-core/package.json`:**
- `dependencies`: `@cmsmasters/db, postcss: 8.5.10, node-html-parser: 7.1.0`

**Hard call (carry-over a): (b) TRANSITIVE PATH — proven empirically.**

ResponsiveTab.tsx:10 already uses `import postcss, { type AtRule, type Rule } from 'postcss'` and ships in production. Resolution chain:
```
apps/studio
  → @cmsmasters/block-forge-core (workspace *)
    → postcss@8.5.10 (its dep)
  + apps/studio devDependency postcss@^8 (Tailwind pipeline)
  → npm hoist resolves to single postcss copy at root node_modules
```

Phase 1 validator inserts `import postcss, { type Rule as PcssRule, type AtRule as PcssAtRule } from 'postcss'` at top of VariantsDrawer.tsx (or a dedicated `apps/studio/src/pages/block-editor/responsive/variant-css-validator.ts` module). **No package-level changes; no devDep additions; no version-pin contingency triggered.**

---

## §0.5 — Studio warning banner convention check

**Existing warning UI patterns surfaced via grep (`Banner|Warning|Alert|status-warning|⚠`):**

- `apps/studio/src/pages/block-editor/responsive/VariantsDrawer.tsx:299–306` — inline `<p>` with `text-[length:var(--text-xs-font-size)] text-[hsl(var(--status-warning-fg))]` + `⚠ ` prefix. **Closest precedent.**
- `apps/studio/src/pages/block-editor.tsx:928` — `backgroundColor: 'hsl(var(--status-warning-fg))'` inline-style dot indicator.
- `apps/studio/src/pages/template-editor.tsx:387` — same pattern (dot indicator).
- `apps/studio/src/pages/slots-list.tsx:206, 297` — icons colored via `status-warning-fg`.

**No reusable `<WarningBanner />` / `<Alert />` primitive in `@cmsmasters/ui` consulted by these sites — all hand-rolled inline.** SuggestionList.tsx has its own warnings region, but it's tightly coupled to suggestion shape (not a generic banner).

**Token availability — drift finding:**

- `apps/studio` references `--status-warning-fg` in **6 sites** including VariantsDrawer.tsx L302.
- **`packages/ui/src/theme/tokens.css` does NOT define `--status-warning-*`.** Real tokens are `--status-warn-bg` (L124) + `--status-warn-fg` (L125) — note the `-warn-` not `-warning-` namespace.
- This is **pre-existing Studio drift** — silent fallback to `hsl(undefined)` → no color applied. Caught and noted in `logs/wp-027/phase-3-result.md` Row 2 ("Prompt referenced non-existent tokens: --status-warning-* … Real names: --status-error-* (warnings, mirrors block-forge reference)") but Studio code never updated.

**Hard call (carry-over c): BUILD FRESH inline (no new component) — mirror VariantsDrawer.tsx L299–306 styling pattern.**

Phase 1 inserts a `<p data-testid="variants-editor-css-warning" className="text-[length:var(--text-xs-font-size)] text-[hsl(var(--status-warn-fg))]">⚠ {warning}</p>` next to the variant CSS textarea. **MUST use `--status-warn-fg`** (real token) NOT `--status-warning-fg` (broken inheritance from existing drift). Optional: add bg variant `--status-warn-bg` for higher visibility if Brain wants emphasis.

**Surfacing to Brain:** see §Open Questions for ruling on whether Phase 1 also fixes the 6 Studio drift sites OR limits to Phase 1 scope (clean validator only, file separate cleanup task).

---

## §0.6 — handleSave + Phase 5 pins (carry-over d)

**File:** `tools/block-forge/src/__tests__/integration.test.tsx` (located via grep `assembleSavePayload`).

**handleSave (App.tsx L256–319) shape — payload assembly:**

```typescript
// Early-return on session.isDirty (post-Phase-4 — replaces accepted.length gate)
if (!isDirty(session)) return
const accepted = pickAccepted(session, suggestions)

// WP-028 Phase 6 / OQ5 — composeTweakedCss BEFORE applySuggestions
const composedCss =
  session.tweaks.length > 0
    ? composeTweakedCss(block.css, session.tweaks)
    : block.css

const applied =
  accepted.length > 0
    ? applySuggestions(
        { slug: block.slug, html: block.html, css: composedCss },
        accepted,
      )
    : { html: block.html, css: composedCss }

const hasVariants = Object.keys(session.variants).length > 0
const updatedBlock: BlockJson = {
  ...block,
  html: applied.html,
  css: applied.css,
  variants: hasVariants ? session.variants : null,  // OQ2 null sentinel
}
const requestBackup = !session.backedUp
await saveBlock({ block: updatedBlock, requestBackup })
const refreshed = await getBlock(block.slug)
setBlock(refreshed)
setSession((prev) => clearAfterSave(prev, refreshed.variants ?? {}))
```

**This is the production payload Phase 2 `<App />` mounts must exercise.**

**Phase 5 contract-mirror pins (4 tests in `Phase 5 — Carve-out regression pins + OQ2 clear-signal` describe block, L574–677):**

| Test name (`it(...)`) | Assertion summary | Phase 2 conversion target |
|---|---|---|
| `tweak-only save [Phase 2/4 carve-out pin] — isDirty true → payload assembled (not early-returned)` | tweak-only session → `isDirty(s) === true` + payload non-null + slug preserved. Tweak composition deliberately NOT asserted (gap noted in header L567–572 — pre-Phase-6). | Convert to `<App />` render: addTweak via UI element-click + slider, click Save, assert API request contains updated CSS. |
| `variant-only save [Phase 3/4 carve-out pin] — payload carries variants map (not early-returned)` | variant-only session → payload.variants equals `{ sm: { html, css } }`. | Convert to `<App />`: open VariantsDrawer, fork 'sm' variant, click Save, assert API request `body.block.variants.sm` matches. |
| `mixed save [Phase 4 mixed carve-out pin] — tweak + variant both dirty; payload has variants, save proceeds` | mixed session → payload.variants populated. | Convert to `<App />`: addTweak + create variant, click Save, assert both reach payload. |
| `OQ2 clear-signal pin [Ruling HH] — empty session.variants → payload variants === null` | create+delete cycle → `variants === null` + JSON.stringify preserves `"variants":null`. | Convert to `<App />`: fork variant, delete it, click Save, assert API request body `variants: null` (and JSON-roundtrip preserved). |

**Phase 6 OQ5 pin (1 test in `Phase 6 — OQ5 tweak-compose-on-save regression pin`, L693–747):**

| Test name | Assertion summary | Phase 2 retention |
|---|---|---|
| `tweak-only save persists composed CSS to disk [OQ5 regression pin]` | payload.css contains `@container slot (max-width: 480px)` chunk + property:value (full composeTweakedCss verification). | Convert to `<App />` mount: same scenario, assert API request body.block.css includes the chunk. |

**Phase 2.4 conversion plan:** all 5 test names + assertions above are preserved as documentation comments in the new `app-save-regression.test.tsx`. Production-render `<App />` pins replace harness; assembleSavePayload + assembleSavePayloadV2 stay in integration.test.tsx as documentation for the contract shape (per OQ6 resolution path step 3).

---

## §0.7 — apiClient + BlockPicker + fs middleware mocks (carry-over e)

**`apiClient` import path:** `tools/block-forge/src/lib/api-client.ts` (relative). Imported in App.tsx as named imports `saveBlock, getBlock, listBlocks` (NOT a default `apiClient` namespace — task brief used shorthand).

**Named exports tools/block-forge consumes:**

| Export | Signature | Purpose |
|---|---|---|
| `listBlocks` | `() => Promise<{ sourceDir: string; blocks: BlockListEntry[] }>` | BlockPicker dropdown source. |
| `getBlock` | `(slug: string) => Promise<BlockJson>` | Initial load + post-save refetch. |
| `saveBlock` | `(req: { block: BlockJson; requestBackup: boolean }) => Promise<{ ok: true; slug: string; backupCreated: boolean }>` | Persist payload. |

Where `BlockListEntry = { slug: string; name: string; filename: string }`.

**BlockPicker data fetch shape:** `BlockPicker.tsx` L23–41 — calls `listBlocks()` on mount via `useEffect`, sets local state. Mock approach for Phase 2: inject `vi.mock('../lib/api-client', () => ({ listBlocks, getBlock, saveBlock }))` returning a single fixture block (e.g. `block-spacing-font` from existing fixtures, mirroring Phase 5 pin pattern).

**fs middleware (vite.config.ts `blocksApiPlugin`):** dev-server-only Vite middleware; Vitest does NOT exercise it (jsdom environment, no Vite middleware bridge). **No mock needed** — the api-client `vi.mock` short-circuits before fetch hits any fs layer.

**Mock shape for Phase 2 (proposed):**

```typescript
vi.mock('../lib/api-client', () => ({
  listBlocks: vi.fn(async () => ({
    sourceDir: '/test',
    blocks: [{ slug: FIXTURE_SLUG, name: 'Spacing+Font fixture', filename: `${FIXTURE_SLUG}.json` }],
  })),
  getBlock: vi.fn(async (slug: string) => {
    if (slug === FIXTURE_SLUG) return loadFixture(FIXTURE_SLUG)
    throw new Error(`unknown slug: ${slug}`)
  }),
  saveBlock: vi.fn(async (req) => ({ ok: true, slug: req.block.slug, backupCreated: req.requestBackup })),
}))
```

Each `<App />` test inspects `vi.mocked(saveBlock).mock.calls[0][0]` for the assembled payload.

---

## §0.8 — jsdom stubs (carry-over f)

**Existing stubs surveyed:**

- `tools/block-forge/src/__tests__/TweakPanel.test.tsx` L11–25 — file-level `ResizeObserverMock` + `setPointerCapture` / `releasePointerCapture` polyfills on `window.HTMLElement.prototype`.
- `tools/block-forge/src/__tests__/VariantsDrawer.test.tsx` L7–27 — same pattern, file-level.
- **No `vitest.setup.ts`** — `tools/block-forge/vitest.setup*` glob returned empty.
- **No `tools/block-forge/src/test-utils*` directory** — glob returned empty.
- `tools/block-forge/vite.config.ts` L213–218 → `test: { css: true }` only; no `setupFiles` config.

**Hard call (carry-over f): FILE-LEVEL inside the new `app-save-regression.test.tsx`.**

Reasoning: existing pattern is file-level, no global setup file exists, and isolating the polyfills per-test-file matches the surrounding convention (avoids cross-test pollution risk per task brief). Mirror the TweakPanel.test.tsx L11–25 + VariantsDrawer.test.tsx L7–27 stub block byte-for-byte.

**Other DOM APIs likely needed for `<App />` mount:**

- `IntersectionObserver` — not directly used in App tree per grep (no matches in tools/block-forge/src). **No stub required.**
- `URL.createObjectURL` — none in App tree. **No stub required.**
- `requestAnimationFrame` — jsdom provides. **No stub required.**
- Drawer (`@radix-ui/react-dialog`) + Slider (`@radix-ui/react-slider`) → ResizeObserver + PointerCapture cover their needs (Radix Slot asChild rule per saved memory `feedback_radix_slot_aschild.md` is a separate type concern, not a runtime stub).

Phase 2 stubs: 2 polyfills (ResizeObserverMock + PointerCapture pair). No more.

---

## §0.9 — Baseline test counts (carry-over g)

| Package | Test files | Passed | Failed | Skipped | Runtime |
|---|---|---|---|---|---|
| `@cmsmasters/studio` | 6 | 104 | 0 | 0 | 3.31s |
| `tools/block-forge` | 6 | 133 | 0 | 0 | 2.28s |

`tools/block-forge` is NOT a root npm workspace (per `infra-tooling/SKILL.md` install dance); ran via `cd tools/block-forge && npm test`. No pre-existing failures, no skips. Phase 1 + Phase 2 deltas land against these clean baselines.

---

## §0.10 — Task C deferral anchor

> Task C (real-usage heuristic polish) is deferred to WP-030 per `workplan/WP-029-heuristic-polish.md` §Not in scope. Phase 0 RECON did NOT audit `packages/block-forge-core/src/heuristics/` and did NOT inspect heuristic confidence scoring. Any phase 1/2/3 prompt that proposes touching `packages/block-forge-core/src/heuristics/` is a stop-and-Brain-review trigger.

Disciplinary anchor recorded; no audit performed; no findings here.

---

## Carry-overs summary (Phase 1+2 input)

| ID | Carry-over | Decision / Value |
|---|---|---|
| (a) | PostCSS resolution path | **(b) Transitive** — `import postcss, { type Rule, type AtRule } from 'postcss'` works in Studio today (proven at ResponsiveTab.tsx:10). No package change; no devDep addition. |
| (b) | VariantEditor integration point | `apps/studio/src/pages/block-editor/responsive/VariantsDrawer.tsx::VariantEditorPanel` (L342–478). Insert validator after textareas grid (~L450), local controlled-state binding via 300ms debounceRef pattern; warning paragraph mirrors L299–306 styling. NOTE: file is **VariantsDrawer.tsx** not VariantEditor.tsx. |
| (c) | Studio banner pattern | **Build fresh inline** (no new component). Tokens: `--status-warn-fg` + optional `--status-warn-bg` (NOT `--status-warning-*` — drift, see §0.5). |
| (d) | handleSave shape + Phase 5 pin file | `tools/block-forge/src/__tests__/integration.test.tsx`. Phase 5 pins: 4 tests in `Phase 5 — Carve-out regression pins + OQ2 clear-signal` (L574–677). Phase 6 OQ5 pin: 1 test in `Phase 6 — OQ5 tweak-compose-on-save regression pin` (L693–747). All 5 convertible to `<App />` mount tests; harnesses retained as documentation. |
| (e) | apiClient/BlockPicker/fs mock shapes | `vi.mock('../lib/api-client', { listBlocks, getBlock, saveBlock })` with fixture-backed responses. fs middleware no-op (Vitest doesn't exercise Vite middleware). BlockPicker data via `listBlocks` mock — single fixture entry. |
| (f) | jsdom stubs scope | **File-level** inside `app-save-regression.test.tsx`. Mirror `TweakPanel.test.tsx` L11–25 + `VariantsDrawer.test.tsx` L7–27 pattern. Stubs: ResizeObserverMock + setPointerCapture/releasePointerCapture only. No global setup file exists in tools/block-forge. |
| (g) | Baseline test counts | Studio 104/0/0 (3.31s); block-forge 133/0/0 (2.28s). arch-test 499/0 (487ms). |
| (h) | Accepted reveal-rule syntaxes | Validator passes a top-level rule if EITHER (1) nested under any `@container (…)` at-rule (named or unnamed) OR (2) selector is prefixed with `[data-variant="<this-variant-name>"]`. Reject only if NEITHER. See §0.3.a table for full evidence. |

---

## Open Questions for Brain

### OQ-α — Pre-existing `--status-warning-*` drift in Studio (6 sites)

**Finding (§0.5):** Studio references `hsl(var(--status-warning-fg))` in 6 production sites (VariantsDrawer.tsx L302, block-editor.tsx L928, template-editor.tsx L387, slots-list.tsx L206 + L297, plus VariantsDrawer cross-surface mirror in tools/block-forge/src/components/VariantsDrawer.tsx L302 — Ruling GG byte-identical body). Real tokens are `--status-warn-fg` / `--status-warn-bg` (no `-ing` suffix). Silent fallback → no color applied. Pre-existing drift, noted in `logs/wp-027/phase-3-result.md` Row 2 but never fixed in Studio code.

**Question for Brain:** which of (1) / (2) / (3)?

1. **Phase 1 fixes only the new validator banner** (use `--status-warn-fg` correctly) — leave existing 6 sites alone, file separate cleanup task. **Recommended** — keeps Phase 1 scope tight; matches saved memory `feedback_no_blocker_no_ask.md` minimal-blast-radius default.
2. **Phase 1 fixes all 7 sites** (validator + 6 existing) in same commit — atomically resolves drift but expands scope ~30min.
3. **Defer entirely** — accept new validator inherits the same broken token (matches existing visual state — no color applied, just `⚠` glyph). NOT recommended; saved memory `feedback_no_hardcoded_styles.md` rules out broken-token shortcut.

**Note:** Affects the byte-identical cross-surface mirror invariant — fixing only Studio's VariantsDrawer.tsx L302 would diverge from `tools/block-forge/src/components/VariantsDrawer.tsx` L302. Either both sites flip together (cross-surface sync per CONVENTIONS.md L235–242) or neither.

### OQ-β — Task brief filename mismatch (logged for traceability, not blocking)

Task §0.3 named the target `VariantEditor.tsx`. Actual location: `apps/studio/src/pages/block-editor/responsive/VariantsDrawer.tsx::VariantEditorPanel` (inline component L342–478). Phase 1 prompt should reference correct path. **Not a blocker** — path resolved during RECON.

---

## Phase 1 + Phase 2 readiness

- [x] All 10 tasks executed
- [x] All 8 carry-overs (a)–(h) recorded
- [x] No code written
- [x] arch-test confirmed at WP-028 baseline (499/0, matches `288281b9`)
- [x] Brain unblocked to write Phase 1 prompt **PENDING OQ-α ruling** (token fix scope — Phase 1 should know which path before writing code)

---

## Commit

(After Brain reviews phase-0-result.md → commit message `docs(logs): WP-029 Phase 0 RECON result log [WP-029 phase 0]`)
