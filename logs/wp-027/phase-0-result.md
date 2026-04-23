# WP-027 Phase 0 — RECON Result

**Date:** 2026-04-23
**Duration:** ~1h recon + ~30min log
**Commits:**
- Task prompt: `b0e44713` — `logs/wp-027/phase-0-task.md`
- Result: `ea38aec8` — `logs/wp-027/phase-0-result.md` (SHA pre-amend; this commit embeds it)

**Arch-test baseline:** 477 / 0
**No code written.** Zero source/manifest/doc edits this phase.

---

## ⚠️ Escalation Summary (read first)

Recon uncovered **two plan-level ambiguities beyond the two Brain pre-ruled on**. Per the task's escalation protocol (prompt L17 + L353–355), I continued the recon but surface both below as **Open Questions for Brain**. Neither is a tooling issue — both are design calls that affect Phase 1 scope materially:

1. **Studio's block editor has no tab switcher.** The plan assumes Basic / Process tabs exist and that WP-027 registers a third tab after Process. Reality: `apps/studio/src/pages/block-editor.tsx` is a single-page form with collapsible `FormSection` accordions (Basic Info / Code / Animation & Interaction JS / Advanced) plus a top-bar "Process" button that toggles a side panel (`BlockImportPanel`). No tabs, no shared tab primitive in `@cmsmasters/ui` or Studio components. See §0.2.
2. **Domain ownership of the new `responsive/` subtree contradicts the plan.** The plan's Key Decisions table assigns new files to `studio-core` with rationale "block editor route and all tab components live there today". Manifest reality: `apps/studio/src/pages/block-editor.tsx` is owned by `studio-blocks` (slug description: "Block editor, import panel, CSS token scanner, token map — the processing pipeline"). `studio-blocks.allowed_imports_from` already lists pkg-ui / pkg-db / pkg-validators / pkg-api-client / studio-core but NOT pkg-block-forge-core. See §0.1 + §0.8.

Both are listed in **Open Questions for Brain** with options + my recommendation. Phase 1 cannot proceed cleanly until Brain rules on them.

Three other material findings that do NOT block Phase 1 but ARE new scope not explicit in the plan:
- **Studio has no vitest config and no vitest devDep.** Outcome **j3** per §0.12 — Phase 1 adds vitest from scratch (larger scope than the plan's "session-state tests green" one-liner).
- **`@cmsmasters/block-forge-core` is not in `apps/studio/package.json`.** Phase 1 adds the workspace dep.
- **Studio's block save path does not revalidate at all.** `updateBlockApi` → Hono `PUT /api/blocks/:id` writes the row and returns — no portal cache bust. The plan's saved-memory reference (`feedback_revalidate_default.md`, bare `{}` → all tags) applies to **Portal's `/api/revalidate`**, not Studio's `/api/content/revalidate` (which is path-specific and currently only called from theme Publish). See §0.4 / §0.7. This is a Phase 4 wiring call, not a Phase 1 blocker.

---

## Task-by-task findings

### 0.1 Domain skills

Read: `studio-core`, `pkg-block-forge-core`, `pkg-db`, `pkg-ui`, `app-portal`, `tools/block-forge/PARITY.md`, `tools/block-forge/README.md`. Notable bits Phase 1–4 must respect:

- **`studio-core` SKILL** `status: full`. Critical invariant: "All editors use react-hook-form + zodResolver". Form state lives in react-hook-form, validated against Zod schemas from `@cmsmasters/validators`. `formState.isDirty` is the canonical dirty signal. **Trap:** "All editors duplicate `inputStyle`/`labelStyle` inline objects — no shared style constants." Any new Responsive-tab styles must follow the same inline-object convention or be flagged as deviation.
- **`pkg-block-forge-core` SKILL** `status: full`. Invariants engine-side: "Never auto-apply" (consumer must present accept/reject), "Heuristics skip unsafe values" (var/calc/clamp/min/max/%/vw/vh/em — rem allowed), "Fixed dispatcher order", "Deterministic IDs" (djb2 hash), "`bp: 0` = top-level rule (media-maxwidth only)". **Traps:** "`renderForPreview` uses `data-block-shell` wrapper, NOT `.block-{slug}`." Engine's portal-parity output hardcodes `<div data-block-shell="{slug}">…</div>` + `stripGlobalPageRules(css)`.
- **`pkg-db` SKILL** `status: full`. Plan's Domain Impact row warned about a "types.ts hand-maintained hybrid (WP-024 trap still live)". SKILL says "types.ts is auto-generated from Supabase — `supabase gen types` overwrites it". The two are compatible: `BlockVariant` / `BlockVariants` types were added in WP-024 and must be preserved across regenerations (hybrid = auto + hand-patched for variants). Neither WP-027 Phase 4 nor anything else here should run `supabase gen types`. `BlockVariants = Record<string, BlockVariant>` where `BlockVariant = { html: string; css: string }` — verified `packages/db/src/types.ts:97-102`.
- **`pkg-ui` SKILL** `status: full`. **Critical:** "`tokens.responsive.css` is hand-maintained, clamp-based companion to tokens.css. `/sync-tokens` does NOT touch it — manual edits are mandatory for responsive rhythm. Currently a 2-token scaffold (`--space-section`, `--text-display`); real population deferred to WP-029." — WP-027 preview injection inherits this scaffold as-is. Byte-parity against portal theme-page render for tokens.responsive.css content is trivial today (2 tokens).
- **`app-portal` SKILL** `status: full`. **CRITICAL FORWARD-RISK (WP-024 flagged, still live):** "Theme-page `.slot-inner` wrapper bypasses slot container-type. `apps/portal/app/themes/[slug]/page.tsx:189` injects a hand-written `<div class="slot-inner">` NOT inside `[data-slot]` — LM-generated `[data-slot] > .slot-inner { container-type: inline-size }` does NOT apply to it. Blocks rendered through the theme-page slot-blocks closure cannot use `@container slot` queries against that wrapper's width. Composed pages (`[[...slug]]/page.tsx`) unaffected." **Implication for WP-027 PARITY AC:** the "1440 byte-identical vs portal theme-page render" check in Phase 2.6 has a known-stale-parity corner: variant-bearing blocks in theme-page slot-blocks DO NOT display variants on the portal (because no `@container slot` context) but DO display them in Studio preview (because `.slot-inner` in iframe has container-type). Phase 2 manual parity check must pick a **composed-page** block, not a theme-page slot block, to avoid chasing a pre-existing divergence. I'll pre-write this caution into carry-over (d) so Phase 2 Hands doesn't burn cycles on it.

Also: **Two scope-wrapper conventions coexist.** `BlockRenderer` RSC emits `<div class="block-{slug}">`; `renderBlock()` string helper emits `<div data-block-shell="{slug}">`. `renderForPreview` mirrors `renderBlock()` exactly (data-block-shell). WP-026's block-forge consumes `renderForPreview` verbatim. WP-027 does the same — no choice to make.

### 0.2 Studio block-editor shell

- **Route:** `/blocks/:id` (also `/elements/:id`, `/global-elements/:id` — same editor page, branches on `location.pathname`). Entry file: `apps/studio/src/pages/block-editor.tsx`, component `BlockEditor`, wired in `app.tsx` (router config). Also handles `/blocks/new?category=...` for creates.
- **Tab registration file + line:** **NONE. There are no tabs.** Block editor renders a single `<div className="flex flex-col">` page with (top-bar buttons) / (2-column body: left = form, right = side panel) / (footer with Save).
- **Tab switcher mechanism:** N/A. Closest analogue is:
  - `showProcess: boolean` state (L278, `useState(false)`) — toggled by top-bar "Process" button → renders `<BlockImportPanel>` as a right-side panel occupying the sidebar slot.
  - Top-bar buttons: Import HTML, Process, Preview (opens `window.open('', '_blank')` popup), Export.
  - Inside the form: four collapsible `<FormSection>` accordions (Basic Info, Code, Animation & Interaction JS, Advanced).
- **Block-to-tab passing:** N/A. The full Block comes in as `existingBlock` state (loaded in `useEffect`), form values read via `useWatch` / `form.getValues()`. Any new Responsive surface would read from the same react-hook-form state or from `existingBlock` directly.
- **Shared tab primitive in pkg-ui or apps/studio?** **No.** Grep for `Tab` across `apps/studio/src` + `packages/ui/src` found:
  - Zero `Tab*` components anywhere.
  - One local tab-bar pattern in `apps/studio/src/pages/theme-meta.tsx` — local `useState<TabKey>` + inline buttons with `borderBottom` highlight for active tab. Bespoke, not a reusable component.

**This is the first Brain-level ambiguity** (see Escalation Summary §1 + Open Questions).

**Feeds carry-over (a):** No file+line exists today. Carry-over's content depends on Brain ruling.

### 0.3 block-preview.tsx current state

Path: `apps/studio/src/components/block-preview.tsx` (220 lines). Owned by `studio-core` per manifest.

`?raw` imports (lines 4–7):
- `'../../../../packages/ui/src/theme/tokens.css?raw'`
- `'../../../../packages/ui/src/theme/tokens.responsive.css?raw'`  ← present
- `'../../../../packages/ui/src/portal/portal-blocks.css?raw'`
- `'../../../../packages/ui/src/portal/animate-utils.js?raw'`

Injection contract state:
- `tokens.css` / `tokens.responsive.css` / `portal-blocks.css` — **YES** but only in `interactive` mode (gated by `interactive ? … : ''`)
- `animate-utils.js` — **YES** but only when `interactive && js` (inlined as `<script type="module">`)
- `@layer tokens, reset, shared, block` ordering — **NO.** All styles concatenated flatly inside one `<style>` block.
- `.slot-inner { container-type: inline-size; container-name: slot }` wrapper — **NO.** Content is injected as raw `${html}` into `<body>` directly.
- iframe sandbox — `"allow-same-origin"` static or `"allow-same-origin allow-scripts"` interactive. **Differs from WP-026** (which uses `"allow-scripts allow-same-origin"` always; attribute order difference is cosmetic).
- ResizeObserver — **YES** but for the iframe container (auto-detect panel width and scale-to-fit via `transform: scale(...)`), NOT for height postMessage sync. Zoom steps `[1, 1.5, 2, 3, 4]` with explicit UI controls.
- No `data-block-shell` wrapper.
- No composeVariants call.
- Animation-killing override CSS in static mode.

**Usage:** Used for block-list thumbnails, elements list, picker modal previews, and the block-editor top-bar "Preview" popup (the popup actually uses inline HTML, not `<BlockPreview>`, but the same `?raw` imports live in block-editor.tsx L20–22). Touching this file risks regressions in all of those surfaces. **Phase 2 decision locked:** `ResponsivePreview.tsx` is a new file; block-preview.tsx stays untouched.

### 0.4 Save mutation

- **Import path + function:** `import { fetchBlockById, createBlockApi, updateBlockApi, deleteBlockApi } from '../lib/block-api'` — `apps/studio/src/lib/block-api.ts`.
- **Payload shape** (`updateBlockApi`, lines 68–89):
  ```ts
  updateBlockApi(id: string, payload: {
    name?: string
    html?: string
    css?: string
    hooks?: Record<string, unknown>
    metadata?: Record<string, unknown>
    // ⚠️ variants NOT listed in the TS payload type
  }): Promise<Block>
  ```
  Method: `PUT /api/blocks/:id` with `await authHeaders()` (Bearer token from Supabase session).
- **Variants field supported:**
  - **Backend (`packages/validators/src/block.ts:71`):** `updateBlockSchema` DOES include `variants: variantsSchema.optional()` (a `z.record(/^[a-z0-9-]+$/, {html, css})`). Backend validates and persists it (Hono `PUT` handler in `apps/api/src/routes/blocks.ts:86-113` passes the parsed body straight through to `updateBlock(supabase, id, parsed.data)`).
  - **Frontend (`updateBlockApi` in Studio block-api.ts):** `variants` is NOT in the TS payload type. JSON.stringify would still serialize it if you smuggle it in via `as any`, but typed code cannot pass it without a type error.
  - **Phase 4 implication:** one-line TS change — add `variants?: BlockVariants` to the `updateBlockApi` payload type. No runtime / backend change needed. (Plan carry-over (b) predicted this.)
- **Auto-revalidate:** **NO.** `block-api.ts` has zero `/revalidate` calls. Hono `PUT /api/blocks/:id` route has zero `/revalidate` calls. Studio's `/api/content/revalidate` endpoint exists but is only invoked from `theme-editor.tsx:339` on theme Publish, with body `{ slug, type: 'theme' }`. Block saves currently leave portal state stale until a full ISR cycle or until a human hits theme Publish. See §0.7.
- **Debounce / batch:** Not debounced in block-api.ts. `block-editor.tsx:handleSave` (L297) uses a `saving: boolean` gate + disabled state on the Save button (`disabled={busy || !isDirty}`) — double-click protection is via React re-render on `setSaving(true)`, not a formal debounce. Fires a single fetch per click.
- **Error surface:** `useToast()` from `apps/studio/src/components/toast.tsx`. `handleSave` catches, calls `toast({ type: 'error', message: error.message })`. Same toast primitive is used across all editors.

**Feeds carry-over (b).**

### 0.5 Dirty-state

- **Outcome: c1 — canonical pattern exists.** Studio uses **react-hook-form's `formState.isDirty`** as the single source of truth for "this editor has unsaved changes".
  - Evidence in `block-editor.tsx`:
    - L237: `const { register, control, reset, formState: { errors, isDirty } } = form`
    - L289–295: `beforeunload` guard fires if `isDirty`
    - L797: dirty dot indicator (`isDirty && <span …/>`)
    - L810: Discard button `disabled={!isDirty || busy}`
    - L819: dynamic label "Unsaved changes" vs "No changes" from `isDirty`
    - L845: Save button `disabled={busy || !isDirty}`
- **How other editors plug in:** `theme-editor.tsx`, `template-editor.tsx`, `page-editor.tsx` use the same pattern (react-hook-form `formState.isDirty`). It's a convention by repetition, not a shared hook.
- **Phase 4 integration plan:** When the Responsive tab accepts/rejects a suggestion, it needs to make the form dirty so the footer's Save button + dirty indicator + beforeunload all fire correctly. Two workable options:
  - **Option A — `form.setValue('code', newCode, { shouldDirty: true })`.** When Accept is clicked, call `applySuggestions(block, [accepted])` in memory, derive the new combined code string via `blockToCode({ …block, css: newCss })`, and `setValue('code', …, { shouldDirty: true })`. Any re-render of the Code textarea shows the new CSS immediately (useful for author transparency), and `isDirty = true` propagates to the footer. Save button fires existing `handleSave` path unchanged (with `variants?` payload addition from §0.4). **This keeps one dirty-state source — existing RHF pattern.**
  - **Option B — Parallel dirty slice in session-state.ts + sum into `isDirty`.** More complex; doesn't gain anything unless we need per-tab isolation (we don't — a single Save button covers the whole block).
  - **Recommendation: Option A.** Matches existing studio-core invariant ("all editors use react-hook-form"). No new dirty-state primitive. Session-state stays pure/in-memory for accept/reject bookkeeping; dirty-state lives in RHF.

**Feeds carry-over (c).**

### 0.6 Variant-display rehearsal

#### 0.6.a composeVariants signature (verbatim)

Source file: `packages/block-forge-core/src/compose/compose-variants.ts:47–91`. Public export: `packages/block-forge-core/src/index.ts:21`.

```ts
import type { BlockInput, BlockOutput, Variant } from '../lib/types'

// BlockInput = { slug: string; html: string; css: string }
// Variant    = { name: string; html: string; css: string }
// BlockOutput = { slug: string; html: string; css: string; variants?: BlockVariants }
//   (BlockVariants = Record<string, { html: string; css: string }> from @cmsmasters/db)

export function composeVariants(
  base: BlockInput,
  variants: readonly Variant[],           // ← ARRAY, not record
  onWarning?: (msg: string) => void,
): BlockOutput
```

Behaviour (from source):
- `variants.length === 0` → returns `{ slug, html, css }` identity (no `variants` field).
- Non-empty → wraps base html in `<div data-variant="base">…</div>`, each variant in `<div data-variant="{name}" hidden>…</div>`, concatenates.
- CSS chunks: base css trimmed → each variant css scoped under `[data-variant="{name}"]` via postcss `walkRules` → reveal rule via `buildAtContainer(bp, body)` at the bp derived from variant name (sm=480, md=640, lg=768, or regex `/^[467]\d\d$/`).
- Unknown name → `onWarning?.(...)` callback + skip reveal rule, but CSS is still scoped + inlined.
- Returns `{ slug, html, css, variants: { [name]: { html, css } } }` (record, same shape as DB column).

**DB block shape** (per `@cmsmasters/db` types):
```ts
interface BlockVariant  { html: string; css: string }
type BlockVariants = Record<string, BlockVariant>
// Block.variants: BlockVariants | null
```

Note: `Variant[]` (engine input) is a **flat array** keyed by `name` field. `BlockVariants` (DB column) is a **record** keyed by variant name. Consumer must convert `Object.entries(...).map(...)` when going from DB to engine.

#### 0.6.b Rehearsed call chain

```ts
// Given block from DB:
// const block: Block = { id, slug, html, css, variants: { sm: { html, css } } | null, ... }

// Step 1 — Tab reads block from existing form state (studio-core convention §0.5).
//   In Phase 2, ResponsiveTab receives it as a prop OR reads from form.getValues() / existingBlock.
//   block.variants is BlockVariants | null per pkg-db types.

// Step 2 — Convert DB record → engine array IF non-null.
const variantList: Variant[] = block.variants
  ? Object.entries(block.variants).map(([name, v]) => ({ name, html: v.html, css: v.css }))
  : []

// Step 3 — Two equivalent paths; pick ONE (Phase 2 ruling):

// Path A — explicit compose then render (plan L258 wording):
const composed = composeVariants(
  { slug: block.slug, html: block.html, css: block.css ?? '' },
  variantList,
  msg => console.warn(`[block-forge-core] ${msg}`),
)
// composed: BlockOutput — has html with data-variant wrappers + css with reveal rules
const preview = renderForPreview(composed /* as BlockOutput */)

// Path B — renderForPreview with opts.variants (engine convenience):
const preview = renderForPreview(
  { slug: block.slug, html: block.html, css: block.css ?? '' } as BlockOutput,
  { variants: variantList },
)
// Internally calls composeVariants when variants.length > 0; identity otherwise.

// Either path yields:
// preview = {
//   html: '<div data-block-shell="{slug}"><div data-variant="base">…</div><div data-variant="sm" hidden>…</div></div>',
//   css:  '<base css, stripped of global html/body rules>\n<variant css scoped under [data-variant="sm"]>\n@container slot (max-width: 480px) { [data-variant="base"] { display: none; } [data-variant="sm"] { display: block; } }\n'
// }

// Step 4 — srcdoc (composeSrcDoc mirrors tools/block-forge WP-026 contract):
const srcdoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=${renderWidth}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    @layer tokens, reset, shared, block;
    @layer tokens { ${tokensCSS} ${tokensResponsiveCSS} }
    @layer reset {
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: 'Manrope', system-ui, sans-serif;
        width: ${renderWidth}px;
        overflow: hidden;
        background: white;
      }
    }
    @layer shared {
      ${portalBlocksCSS}
      .slot-inner { container-type: inline-size; container-name: slot; }
    }
    @layer block { ${preview.css} }
  </style>
</head>
<body>
  <div class="slot-inner">
    ${preview.html}  <!-- <div data-block-shell="{slug}"><div data-variant="base">…</div><div data-variant="sm" hidden>…</div></div> -->
  </div>
  <script type="module">${animateUtilsJS}</script>
  <script>/* ResizeObserver → postMessage({ type: 'block-forge:iframe-height', ... }) */</script>
</body>
</html>`
```

Phase 2 picks Path A or Path B — same output, Path B is one function call fewer. I recommend Path B for readability; plan L258 wording leaned Path A; either is faithful to ADR-025.

#### 0.6.c Snapshot-as-ground-truth trap reminder (pre-written carry-over (e) text)

> **Phase 3 MUST cross-reference `packages/block-forge-core/src/__tests__/__snapshots__/snapshot.test.ts.snap` before asserting `expect(suggestions).toContain(...)` for any reused fixture.** Fixture filename is aspirational; snapshot is authority. Example: `block-spacing-font.css` suggests the fixture triggers both spacing-clamp and font-clamp heuristics by name, but the authoritative suggestion set is whatever `analyzeBlock → generateSuggestions` actually returns for that fixture as frozen in the snapshot. Writing `toContain('font-clamp-…')` against a filename-based assumption that doesn't match the snap will produce a flaky/false-positive test. Saved memory: `feedback_fixture_snapshot_ground_truth.md`.

**Feeds carry-over (e).**

### 0.7 Revalidate

- **Outcome: absent for blocks.** `updateBlockApi` does not trigger `/revalidate`. The Hono `PUT /api/blocks/:id` handler does not trigger `/revalidate`. No other code path in Studio calls revalidate after a block save. (grep `revalidate` on `apps/studio/src` returned only `apps/studio/src/pages/theme-editor.tsx:339` for theme Publish.)
- **Existing Studio revalidate plumbing** (for theme Publish, not block save):
  - Frontend: `fetch(\`${apiUrl}/api/content/revalidate\`, { method: 'POST', body: JSON.stringify({ slug, type: 'theme' }) })`.
  - Backend: Hono route `apps/api/src/routes/revalidate.ts` — `POST /content/revalidate`, authMiddleware + requireRole('content_manager', 'admin'), accepts `{ slug?, type? }`, derives a portal `path` string, and calls Portal's `POST /api/revalidate` with `{ path }` + `x-revalidate-token`. Path derivation: `slug && type==='theme'` → `/themes/${slug}`; `slug` alone → `/${slug}` (or `/` if slug==='homepage'); neither → `/`.
  - Portal: `apps/portal/app/api/revalidate/route.ts` — accepts `{ path?, tags? }`; if NEITHER provided → revalidates ALL tags (`themes`, `blocks`, `layouts`, `pages`, `templates`, `global-elements`). **This is the behaviour saved memory `feedback_revalidate_default.md` describes** — Portal's endpoint, bare `{}` = all tags.
- **Plan reconciliation:**
  - The plan's "bare `/revalidate` POSTs `{}` to invalidate every tag" is correct **at Portal's `/api/revalidate`**. It is NOT directly reachable from Studio — Studio goes through Hono's `/api/content/revalidate`, which currently only forwards a `path` (not empty body → `{}` → all-tags) to Portal.
  - **Phase 4 options:**
    - **Option 1 — Call Hono `/api/content/revalidate` with `{}`.** With current Hono logic, empty body resolves to `path = '/'` and Portal sees `{ path: '/' }` — revalidates only `/`, not all tags. Insufficient for block saves.
    - **Option 2 — Extend Hono `/content/revalidate` with an `all: true` branch** that forwards `{}` (empty body) to Portal → triggers Portal's all-tags path. Small API change. Auth stays the same (content_manager/admin).
    - **Option 3 — Tag-specific revalidate.** Phase 4 calls Hono with body like `{ tags: ['blocks', 'themes'] }` — requires Hono forward-tags support (not currently wired).
    - **Option 4 — Per-theme revalidate.** After block save, look up themes that use the block (reverse index does not exist today; would need query), loop call `{ slug, type: 'theme' }`. Out of scope.
  - **Recommendation:** Option 2 (extend Hono `/content/revalidate` to accept bare `{}` or `{ all: true }` and forward as `{}` to Portal). One-line backend patch, matches saved-memory default-to-all-tags semantics, no secret exposure.
- **Phase 4 action:** explicit call after successful `updateBlockApi`. Fire-and-forget pattern (matches theme Publish code in `theme-editor.tsx:337–346`). Non-fatal on failure — toast warning only.

**Feeds carry-over (b).**

### 0.8 Arch-test baseline

- **Current count: 477 / 0** (ran `npm run arch-test`, duration 501ms).
- **Hardcoded domain-count assertions:** none. Greps for `DOMAINS.length`, `domains.length`, `.toHaveLength(…)`, `.toBe(…)` in `src/__arch__/` returned zero matches. WP-027 adds no new domain → no domain-count bump needed.
- **Full-Status-Skill-Sections regex** confirmed at `src/__arch__/domain-manifest.test.ts:147`: `new RegExp(\`^## ${section}\`, 'm')` — H2-only, prefix-match, per Brain's WP-026 ruling 1.
- **Phase 1 target (pending Brain's domain ruling — Open Question 2):**
  - If new files land in **studio-core**:  baseline + **8** new owned_files = **485 / 0**.
  - If new files land in **studio-blocks** (matches manifest neighbor `block-editor.tsx`): baseline + **8** new owned_files = **485 / 0**.
  - Count is the same either way; the plan's "baseline + 8" holds regardless of which domain absorbs the files.
  - **Owned_files to register** (Phase 1, `apps/studio/src/pages/block-editor/responsive/…`):
    1. `ResponsiveTab.tsx`
    2. `ResponsivePreview.tsx`
    3. `PreviewPanel.tsx`
    4. `SuggestionList.tsx`
    5. `SuggestionRow.tsx`
    6. `session-state.ts`
    7. `preview-assets.ts`
    8. `PARITY.md`
  - Plus `allowed_imports_from` on the chosen domain must gain `pkg-block-forge-core` (currently absent in both studio-core and studio-blocks).
  - Test files (`__tests__/session-state.test.ts`, `__tests__/preview-assets.test.ts`, `__tests__/suggestion-row.test.tsx`, `__tests__/integration.test.tsx`) also count per WP-025 pattern — pkg-block-forge-core lists every test under its `owned_files`. Plan AC said "+8"; adding 4 tests = **+12 total**. **I recommend Phase 1 target = baseline + 12 = 489**, not 485. Call out for Brain confirmation.

**Feeds carry-over (g).**

### 0.9 studio-core SKILL status

- Current: `status: full` (frontmatter of `.claude/skills/domains/studio-core/SKILL.md`, line 5).
- **Phase 5 +6 flip:** **not applicable** — already full. No extra arch-tests from SKILL status change.
- **Studio-blocks SKILL** status (relevant to Open Question 2):
  - Checked: `.claude/skills/domains/studio-blocks/SKILL.md` frontmatter — will verify in Phase 1 recon confirmation, but quick grep shows it exists and is referenced in arch-test. If its status is `skeleton` and Phase 5 flips it to `full` because the Responsive tab is now material inside the domain, +6 arch-tests apply (per `feedback_arch_test_status_flip.md`).

**Feeds carry-over (h).**

### 0.10 Auth + RLS

- Studio's `block-api.ts` uses `await authHeaders()` (L12–18) which pulls the current session's `access_token` via `supabase.auth.getSession()`. The Responsive tab can reuse `updateBlockApi` (once the `variants` field is added to the TS payload type) — no new auth plumbing.
- Hono `PUT /api/blocks/:id` requires `authMiddleware` + `requireRole('content_manager', 'admin')`. Same constraints as all other block edits. If a user can currently Save a block from the form, they can save a variants-including block.
- RLS policy on `blocks` table applies for direct Supabase reads; Studio does NOT read blocks directly from the client — always via the API. No client-side RLS concerns for WP-027.

**Confirmed reuse.** No new auth work.

### 0.11 PARITY seed

Verbatim copy of `tools/block-forge/PARITY.md` (used in Phase 2 to seed `apps/studio/src/pages/block-editor/responsive/PARITY.md`):

<!-- fmt:verbatim-start -->

````markdown
# Block Forge Preview Parity Contract

> Source of truth for what block-forge's preview iframe injects and why.
> Every change to `src/lib/preview-assets.ts`, iframe srcdoc composition, slot wrapper, or injected assets MUST update this file in the same commit.

## Contract (as of Phase 2 seed, WP-026)

### Token injection (inside `@layer tokens`)
1. `packages/ui/src/theme/tokens.css` — portal design-system tokens (semantic colors, typography scale, spacing, radii, shadows).
2. `packages/ui/src/theme/tokens.responsive.css` — WP-024 clamp-based responsive companion (currently 2-token scaffold: `--space-section`, `--text-display`; WP-029 populates).

### Reset layer (`@layer reset`)
- Box-sizing + margin/padding normalize on `*, *::before, *::after`.
- `body { font-family: 'Manrope', system-ui, sans-serif; width: {renderWidth}px; overflow: hidden; background: white; }`
  - `width` is fixed per breakpoint panel (1440/768/375). `overflow: hidden` prevents double-scroll; parent `PreviewPanel` controls scroll via ResizeObserver → postMessage height sync.

### Shared layer (`@layer shared`)
1. `packages/ui/src/portal/portal-blocks.css` — shared component classes from ADR-024 (buttons, headings, containers shared across blocks).
2. `.slot-inner { container-type: inline-size; container-name: slot; }` — inline containment rule matching portal's theme-page hierarchy. Reference: `tools/layout-maker/runtime/lib/css-generator.ts:254-255`.

### Block layer (`@layer block`)
- Per-block CSS from `block.css` (verbatim, no preprocessing).

### DOM hierarchy in iframe body
```
<div class="slot-inner">                   ← containment context (inline-size, name=slot)
  <div data-block-shell="{slug}">          ← portal-parity block wrapper
    {block.html}
  </div>
</div>
```

Matches portal's `apps/portal/lib/hooks.ts:234` output + WP-024 slot wrapper. LM does NOT wrap (legacy blocks use `@media`, not `@container slot`) — block-forge's divergence from LM is deliberate.

### Runtime injection (after body DOM)
1. `packages/ui/src/portal/animate-utils.js` — ADR-023 animation layer (always-on for parity with portal runtime).
2. Block's own `block.js` (if present) — appended after animate-utils.
3. ResizeObserver → `postMessage({ type: 'block-forge:iframe-height', slug, width, height })` for parent-panel height sync.
   - `type` literal is pinned by `preview-assets.test.ts` case (i) — any rename forces test update.

### Canonical breakpoints
- Desktop: 1440px
- Tablet: 768px
- Mobile: 375px

### Sandbox policy
- `sandbox="allow-scripts allow-same-origin"`
- `allow-same-origin` is required for Google Fonts `<link>` loading inside srcdoc (matches LM iframe convention).

### Out of scope (explicit — do not mistake for divergence)
- Theme-page chrome (header, nav, footer, layout grid) — block-forge previews blocks in isolation.
- Any `[data-slot="…"]` outer grid rules from layout-maker — block-forge doesn't reconstruct the layout, only the `.slot-inner` containment context.
- Variants — `composeVariants` output is Phase 3+ territory; this contract covers single-block base rendering only.
- Save/backup behavior — Phase 4 wires POST; read-only this phase.

[…remaining sections of tools/block-forge/PARITY.md included verbatim by Phase 2 seed; see source file for Discipline / Open Divergences / Fixed / Discipline Confirmation / Cross-contract test layers…]
````

<!-- fmt:verbatim-end -->

**Studio-specific deviations flagged for the Phase 2 PARITY.md header block:**

1. **`?raw` path depth.** `tools/block-forge/src/lib/preview-assets.ts` uses 4 `..` to reach monorepo root. `apps/studio/src/pages/block-editor/responsive/preview-assets.ts` lives 2 levels deeper — **6 `..`** needed. Tests under `__tests__/` subdir need **7 `..`**. (Brain's task prompt showed 5 `..` as illustrative; actual verified depth is 6 for source, 7 for tests. Recording the correct numbers here per the "record exact paths" carry-over (f) brief. Not a plan contradiction — Brain explicitly said "Phase 0 only records the long-path strategy in carry-over (f). Phase 3 implements.")
2. **Variants — IN scope for Studio tab.** tools/block-forge PARITY says "Variants — `composeVariants` output is Phase 3+ territory; this contract covers single-block base rendering only." For Studio Responsive tab, variants are IN scope at Phase 2 per the plan (AC: "Variant-bearing blocks render both `data-variant` wrappers…"). Studio PARITY.md must document `composeVariants(base, variants)` → `renderForPreview` call chain inline.
3. **Sandbox attribute order.** `tools/block-forge` uses `allow-scripts allow-same-origin`; `apps/studio/src/components/block-preview.tsx` uses `allow-same-origin` (+ `allow-scripts` in interactive mode). Studio Responsive tab should standardize on `allow-scripts allow-same-origin` (WP-026 order) for cross-surface parity — noted as explicit deviation-from-block-preview.tsx.
4. **Dirty-state coupling** (Studio-only). WP-026 tools/block-forge uses in-memory session state only. Studio Responsive tab must feed accept/reject into react-hook-form's `isDirty` signal (per §0.5). PARITY.md should cross-reference studio-core invariant "all editors use react-hook-form + zodResolver".
5. **Auth context** (Studio-only). tools/block-forge runs without auth; Studio reuses `updateBlockApi` with Supabase session token. PARITY.md notes "Save path: authenticated via existing Studio `updateBlockApi` / Hono `PUT /api/blocks/:id`; no direct Supabase client write."

**Feeds carry-over (i).**

### 0.12 Studio vitest config

- **Outcome: j3 — Studio has no vitest config at all.**
- `apps/studio/vite.config.ts` (7 lines total):
  ```ts
  import { defineConfig } from 'vite'
  import react from '@vitejs/plugin-react'
  export default defineConfig({
    plugins: [react()],
    envDir: '../..',
  })
  ```
  No `test: {…}` block. No `/// <reference types="vitest" />`.
- `apps/studio/package.json`:
  - No `"test"` script (only `dev`, `build`, `preview`, `lint` where `lint` = `tsc --noEmit`).
  - No `vitest` devDep.
  - No `@testing-library/react`, `@testing-library/jsdom`, `jsdom` deps.
- **Phase 1 prerequisite scope (larger than plan assumed):**
  1. Add `vitest`, `@testing-library/react`, `@testing-library/user-event`, `jsdom` to `devDependencies`.
  2. Add `"test": "vitest run"` and `"test:watch": "vitest"` scripts.
  3. Extend `vite.config.ts` with `test: { css: true, environment: 'jsdom', globals: true, setupFiles: [...] }` block.
     - **`css: true` is MANDATORY** per saved memory `feedback_vitest_css_raw.md` — without it, `?raw` CSS imports load as empty strings in tests and assertions silently pass on nothing.
     - `environment: 'jsdom'` is needed globally for React component tests (SuggestionRow, integration). Alternative: per-file `@vitest-environment jsdom` pragma; but Studio has no tests today, so setting it once globally is simpler.
  4. Add a minimal setup file if RTL needs `@testing-library/jest-dom` matchers (`afterEach(cleanup)` boilerplate).
- **Recommendation:** Phase 1 does NOT split off a separate "vitest config" sub-phase. It's still ~30 minutes inside Phase 1's 2-hour budget. If Brain disagrees, flag for Phase-1 split. Phase 1's arch-test owned_files bump (+12) needs vitest running to keep `session-state.test.ts` green, so they have to happen together.
- **Cross-ref WP-026:** tools/block-forge uses its own `vitest.config.ts` (separate file, not inline in vite.config) with `css: true`. Studio can follow either pattern; I recommend inline `test: {…}` in vite.config.ts for one-file simplicity.

**Feeds carry-over (j).**

### 0.13 Studio dev port

- **Port: 5173** (Vite default). `apps/studio/package.json:7`: `"dev": "vite --port 5173"`.
- No port conflict with any Portal service (Portal on Next.js dev uses 3000) or tool (LM on 7700/7701; block-forge on 7702; studio-mockups on 7777).

---

## Carry-overs for Phase 1 (and later)

**(a) Tab-registration edit point:** **UNKNOWN — awaiting Brain ruling on Open Question 1** (tab system does not exist in block-editor.tsx). Phase 1 cannot start until Brain picks one of: build a minimal tab-bar primitive, use side-panel pattern like Process, use FormSection accordion, or use a button-toggled drawer. Recommendation: build a minimal in-file tab bar in block-editor.tsx between top-bar and 2-column body (3 tabs: Basic / Process → kept as button / Responsive). Tab order: add "Responsive" as a new navigation element; plan-intended "after Process" is not meaningful without tabs. (See Open Questions §1.)

**(b) Save mutation:**
- Signature: `updateBlockApi(id, payload: { name?, html?, css?, hooks?, metadata? })` — returns `Promise<Block>`.
- Variants field supported: **backend yes, frontend TS type no**. Phase 4 adds `variants?: BlockVariants` to the payload type (one-line, apps/studio/src/lib/block-api.ts:68–76).
- Auto-revalidate: **NO.** Phase 4 adds explicit fire-and-forget call to Hono `POST /api/content/revalidate`. Requires **plan decision on body shape** (Option 2 recommended: extend Hono endpoint to accept bare `{}`/`{all:true}` and forward to Portal as `{}` for all-tags invalidation). Saved memory `feedback_revalidate_default.md` describes Portal's `/api/revalidate` directly; Studio goes through Hono middle layer.
- Debounce: none; Save button `disabled={busy || !isDirty}` + `saving` gate protects against double-click.
- Error surface: `useToast()` from `apps/studio/src/components/toast.tsx`, `{ type: 'error', message }`.

**(c) Dirty-state:** **Outcome c1 — canonical pattern via react-hook-form `formState.isDirty`**. Phase 4 action: on Accept, call `form.setValue('code', newCode, { shouldDirty: true })` after `applySuggestions` — makes Save button enable, beforeunload fire, existing dirty UI light up. Session-state stays pure/in-memory for per-suggestion accept/reject bookkeeping. **No parallel dirty system.**

**(d) block-preview.tsx verbatim contract snapshot:** See §0.3. Key takeaways: all-flat-styles (no @layer), no .slot-inner wrapper, gated on `interactive` flag, sandbox `allow-same-origin (+allow-scripts)`. **Phase 2 does NOT touch this file.** New `ResponsivePreview.tsx` implements the full WP-026 contract from scratch. Also: **Phase 2.6 "1440 byte-identical parity" check MUST use a composed-page block, not a theme-page slot block** — the known `.slot-inner` bypass in `apps/portal/app/themes/[slug]/page.tsx:189` means variant-bearing blocks display differently between theme-page slot-blocks and the preview iframe, per `app-portal` SKILL's documented forward-risk. Otherwise Phase 2 will chase a pre-existing divergence thinking it's new.

**(e) composeVariants signature + call sequence + snapshot-as-ground-truth reminder for Phase 3:**
- Signature (verbatim from `packages/block-forge-core/src/compose/compose-variants.ts:47`):
  ```ts
  export function composeVariants(
    base: BlockInput,                     // { slug, html, css }
    variants: readonly Variant[],         // array of { name, html, css }
    onWarning?: (msg: string) => void,
  ): BlockOutput                          // { slug, html, css, variants?: BlockVariants }
  ```
  DB→engine conversion: `Object.entries(block.variants).map(([name, {html, css}]) => ({ name, html, css }))` when `block.variants !== null`.
- Call sequence (Path B recommended, see §0.6.b):
  ```ts
  const preview = renderForPreview(
    { slug: block.slug, html: block.html, css: block.css ?? '' } as BlockOutput,
    { variants: variantList },
  )
  ```
- **Snapshot-as-ground-truth reminder for Phase 3:** *Phase 3 MUST cross-reference `packages/block-forge-core/src/__tests__/__snapshots__/snapshot.test.ts.snap` before asserting `expect(suggestions).toContain(...)` for any reused fixture. Fixture filename is aspirational; snapshot is authority.* (Per saved memory `feedback_fixture_snapshot_ground_truth.md`.)

**(f) `?raw` paths from `apps/studio/src/pages/block-editor/responsive/` perspective:**
- From `preview-assets.ts` (source, 6 levels deep):
  - `tokens.css`: `'../../../../../../packages/ui/src/theme/tokens.css?raw'`
  - `tokens.responsive.css`: `'../../../../../../packages/ui/src/theme/tokens.responsive.css?raw'`
  - `portal-blocks.css`: `'../../../../../../packages/ui/src/portal/portal-blocks.css?raw'`
  - `animate-utils.js`: `'../../../../../../packages/ui/src/portal/animate-utils.js?raw'`
- From `__tests__/integration.test.tsx` or `__tests__/preview-assets.test.ts` (tests, 7 levels deep):
  - WP-025 fixtures (reuse per Brain ruling 1, verbatim):
    - `'../../../../../../../packages/block-forge-core/src/__tests__/fixtures/block-spacing-font.html?raw'`
    - `'../../../../../../../packages/block-forge-core/src/__tests__/fixtures/block-spacing-font.css?raw'`
    - (and `block-plain-copy.{html,css}`, `block-nested-row.{html,css}` as needed)
  - Tokens (same as source path, +1 `..`):
    - `'../../../../../../../packages/ui/src/theme/tokens.css?raw'`
    - etc.
- **Deviation from Brain's example in task prompt L47–48:** Brain illustrated 5 `..`; recounted from the concrete file paths in plan L138–142, source files need 6, tests need 7. Brain asked Phase 0 to "record the long-path strategy" — I'm recording the accurate depth. Path counts verified against `tools/block-forge/src/lib/preview-assets.ts` (4 `..`, 4-deep from root) + plan L129–142 target locations (2 levels deeper than block-forge, so +2).

**(g) Arch-test baseline / target:**
- Baseline: **477 / 0** (no hardcoded domain-count assertions).
- Phase 1 target: **baseline + 8 source owned_files + 4 test owned_files = 489 / 0** (following pkg-block-forge-core precedent of registering test files). Plan AC said "+8" which under-counts by tests — flagging for Brain confirmation.
- No domain-count bump (WP-027 adds zero new domains).

**(h) studio-core SKILL status:** `full`. **Phase 5 flip: out of scope** (already full; no +6 bump). Studio-blocks SKILL status to be confirmed in Phase 1 if Brain rules those new files belong there (Open Question 2).

**(i) PARITY seed draft:** Verbatim copy from `tools/block-forge/PARITY.md` included in §0.11 above. Studio-specific deviations flagged (5 items): ?raw path depth, variants in scope from Phase 2, sandbox attribute order, dirty-state coupling via RHF, auth context via existing updateBlockApi.

**(j) Studio vitest config:** **Outcome j3** — no vitest at all. Phase 1 action: add `vitest` + `@testing-library/*` + `jsdom` devDeps; add `test` script; extend `vite.config.ts` with `test: { css: true, environment: 'jsdom', globals: true }` block. Mandatory `css: true` per `feedback_vitest_css_raw.md`. Recommend keeping inline in `vite.config.ts` (one-file simplicity) vs. separate `vitest.config.ts`.

---

## Open Questions for Brain

### Q1 (blocks Phase 1 start) — Tab-registration strategy

The plan assumes `apps/studio/src/pages/block-editor.tsx` has a tab switcher registering "Basic" and "Process" tabs. Reality: zero tabs. The page is a single-view form with collapsible FormSection accordions, a top-bar "Process" button that toggles a `BlockImportPanel` side panel, and a top-bar "Preview" button opening a popup. No shared Tab primitive in `@cmsmasters/ui` or `apps/studio/src/`.

**Options (with my recommendation):**
- **Option A — Build a minimal in-file tab bar.** Add a simple 3-tab bar between the header and the 2-column body in `block-editor.tsx`. Tabs: **Basic** (current form view), **Process** (shows BlockImportPanel in the main content area instead of toggled sidebar), **Responsive** (new). Implementation: `useState<'basic'|'process'|'responsive'>('basic')` + a bespoke tab row (mirrors `theme-meta.tsx` bar style). **~80 lines, single-file change.** Converts existing "Process" button into a tab. **Recommended.**
- **Option B — Side-panel drawer.** Add a "Responsive" top-bar button (like the current "Process" button) that toggles a right-pane. Minimum-touch; but clashes with "Process" using the same side slot — they'd fight for real estate unless we nest them. Not recommended.
- **Option C — Fifth FormSection accordion.** Append a `<FormSection title="Responsive">` after Advanced. Simpler structurally, but the preview triptych doesn't fit in an accordion — it needs large horizontal real estate (3×1440 panels). Would need a full-width breakout. Not recommended.
- **Option D — Hidden behind Preview button.** Rebuild the existing Preview popup as a richer in-editor surface with tabs for Responsive/Preview-only. Largest scope, least consistent with Studio conventions. Not recommended.

**Recommendation: Option A.** Keeps Process button behaviour identical (moves to tab), slots Responsive in cleanly, adds one shared state var. Matches WP-027 plan intent; no new shared primitive. Plan's "tab order after Process" becomes meaningful.

### Q2 (blocks Phase 1 manifest edit) — Domain ownership of new `responsive/` subtree

- `apps/studio/src/pages/block-editor.tsx` is currently owned by **`studio-blocks`** per `src/__arch__/domain-manifest.ts:290`.
- WP-027 plan Key Decisions table assigns new files to **`studio-core`** with rationale "block editor route and all tab components live there today" — contradicts manifest. Plan also says "`studio-blocks` charter is post-import Process panel (tokens scanner, R2 upload), not editor tabs" — also contradicts manifest (studio-blocks slug description: "Block editor, import panel, CSS token scanner, token map — the processing pipeline").

**Options (with my recommendation):**
- **Option A — Add to `studio-blocks`** (matches manifest neighbor `block-editor.tsx`).
  - `studio-blocks.owned_files` gains 8 new paths + 4 test paths.
  - `studio-blocks.allowed_imports_from` gains `pkg-block-forge-core` (adds to its existing list of `['pkg-db', 'pkg-validators', 'pkg-api-client', 'pkg-ui', 'studio-core']`).
  - SKILL.md update for studio-blocks in Phase 5 Close — may involve `status: skeleton→full` flip ⇒ +6 arch-tests. Worth checking.
  - Principle: co-locate with direct neighbor (block-editor.tsx).
- **Option B — Add to `studio-core`** (matches plan intent).
  - `studio-core.owned_files` gains 12 paths.
  - `studio-core.allowed_imports_from` gains `pkg-block-forge-core`.
  - `studio-core` is already `full` — no +6 flip.
  - Principle: plan said so, but requires fighting the manifest's current ownership of the block-editor route.
- **Option C — Move block-editor.tsx to studio-core** (re-shuffle manifest).
  - Fixes the plan/manifest contradiction at the source.
  - Requires moving `block-editor.tsx`, `block-import-panel.tsx`, `block-processor.ts`, `token-map.ts` (?) out of studio-blocks into studio-core — bigger blast radius, risks WP-026-like "recovery from accidental contamination."
  - Might not even be correct: studio-blocks as a "processing pipeline" domain has its own scope logic that should keep these files.

**Recommendation: Option A.** The manifest is the single source of truth; the plan's description of studio-blocks' charter is wrong. If the ruling for Option A needs a parallel studio-blocks SKILL.md touch in Phase 5 (status flip or new Recipes section), factor that into the arch-test target then. Easier to update the plan's Domain Impact table for Brain than to reorganize the manifest mid-WP.

### Q3 (Phase 4, does not block Phase 1) — Revalidate body shape

See §0.7 Options 1–4. Recommendation: **Option 2 — extend Hono `/api/content/revalidate` to accept bare `{}` (or `{ all: true }`) and forward empty-body to Portal** to trigger all-tags invalidation. One-line Hono patch. Preserves secret-not-in-browser posture. Matches saved-memory intent for default-to-all-tags.

---

## Plan Corrections (Phase-0-discovered)

Minor plan wording to reconcile before Phase 1:

1. **WP-027 plan L84 + L95 (Key Decisions "Domain assignment") — studio-core claim**: Contradicts manifest (see Q2). Depending on Brain ruling, either:
   - Update plan Domain Impact table L104 + Key Decisions L95 to say `studio-blocks` (if Brain picks Option A), OR
   - Accept the inconsistency and document in Phase 1 result log (if Brain picks Option B).

2. **WP-027 plan L202 + Phases 1–4 tab-registration language**: Repeatedly references "Basic / Process tabs" and "register after Process." None exists (see Q1). Rewrite to reflect Option A (in-file tab bar in block-editor.tsx).

3. **WP-027 plan L237 + AC ("arch-test baseline + 8")**: Plan undercounts by test-file registrations (~+4). Rewrite to `baseline + 12`, pending Brain confirmation of the pkg-block-forge-core precedent (where every test file is listed in owned_files).

4. **WP-027 plan L120 + Phase 4 L305–307 ("existing update mutation likely auto-revalidates")**: Wrong. It does not. Rewrite to "existing update mutation does NOT revalidate; Phase 4 MUST add revalidation call per Q3 resolution."

5. **WP-027 plan Saved Memory reference** (Phase 4 L306 "per saved memory for default-to-all-tags"): Refine — saved memory `feedback_revalidate_default.md` targets Portal's `/api/revalidate`, but Studio browser cannot call Portal directly (secret exposure). Correct path: Hono middleman extended to forward bare `{}` (Q3 Option 2).

6. **WP-027 plan L84 (Fixture strategy in Brain ruling 1, task prompt L47)** — 5-dot relative path example: actual depth is 6 `..` from source, 7 `..` from `__tests__/` subdir. Carry-over (f) records the correct numbers; Phase 3 uses those.

7. **WP-027 plan Modified Files L170**: Mentions no edits to `packages/ui/**` — holds. Also mentions no edits to `tools/block-forge/src/**` — holds. But Phase 1 prerequisite: **add `@cmsmasters/block-forge-core: "*"` to `apps/studio/package.json` dependencies**. Not in plan's Modified Files table; add it.

8. **WP-027 plan AC L402 (`npm -w @cmsmasters/studio run build`)**: Plan AC assumes `build` works; `studio/package.json` has `build` today but no `test`. Rewrite to add `npm -w @cmsmasters/studio test` to AC after Phase 1 (which adds the test script).

---

## Ready for Phase 1 (pending Q1 + Q2 resolution)

Phase 1 will:

1. **Resolve Q2 domain decision**: add 12 new owned_files to `{studio-core | studio-blocks}` + `pkg-block-forge-core` to `allowed_imports_from`.
2. **Resolve Q1 tab-registration**: add tab-bar scaffold to `block-editor.tsx` (recommended Option A). Convert "Process" top-bar button into a tab trigger. Add "Responsive" as third tab. Tab order: Basic / Process / Responsive.
3. **Add Studio dep**: `@cmsmasters/block-forge-core` as workspace dep in `apps/studio/package.json`.
4. **Add vitest to Studio** (outcome j3 from §0.12): vitest + @testing-library/react + @testing-library/user-event + jsdom devDeps; `test` script; `test: { css: true, environment: 'jsdom', globals: true }` in `vite.config.ts`.
5. **Scaffold** the 8 responsive/ files as placeholders + seed PARITY.md from §0.11 (with the 5 Studio deviations noted).
6. **Implement `session-state.ts`** + unit tests (pure state machine — no engine calls here).
7. **Register manifest**: 12 owned_files + 1 allowed_imports_from addition per Q2 decision.
8. **Verify**: `npm run arch-test` green at **489 / 0** (or adjusted per Brain confirmation in Plan Correction #3); `npm run typecheck` clean; `npm -w @cmsmasters/studio test` green; `npm -w @cmsmasters/studio run dev` opens block editor → Responsive tab visible as empty shell.
