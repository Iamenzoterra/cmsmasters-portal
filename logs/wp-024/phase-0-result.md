# WP-024 Phase 0 — RECON Result

> Workplan: WP-024 Responsive Blocks — Foundation
> Phase: 0 of 5 (Audit)
> Commit parent: `c3378288` (fix(portal): hide .drawer-layer in push mode so events reach sidebar)
> Date: 2026-04-22
> Type: Audit only — **zero source files modified**

---

## What Was Audited

Pre-flight audit of the codebase before WP-024 Phase 1 writes a migration or touches types. Scope: blocks table shape, call sites for the two render paths, the exact `.slot-inner` baseline in `css-generator.ts`, filename conflict for `tokens.responsive.css`, PARITY-LOG overlap, `stripGlobalPageRules` location, portal globals import site, Studio/Layout-Maker iframe token injection paths, manifest ownership.

No code was written or changed.

---

## Key Findings

### 1. Domain skills read (all five, in full)

- ✅ **pkg-db** — `types.ts` is auto-generated; JSON columns use branded types (`BlockHooks`, `BlockMetadata`) exported from `index.ts`. **Refinement:** the skill says 15 tables; WP-024 adds a column to an existing table (`blocks`), not a new table. `BlockVariants` should follow the existing branded-type pattern (see `packages/db/src/types.ts:81-90`). No contradiction with WP.
- ✅ **pkg-validators** — skeleton skill; only lists entry points. Nothing to contradict. `createBlockSchema`/`updateBlockSchema` live in `packages/validators/src/block.ts`. WP's assumption about optional JSONB defaulting to `undefined` (not `{}`) matches current validator philosophy but is unverified here — Phase 1 must confirm when editing the schema.
- ✅ **app-portal** — `resolveSlots` is single-pass; `stripDebug` exists; `.block-{slug}` scoping is mandatory. **Important refinement:** `stripGlobalPageRules` is authoritative in `apps/portal/lib/hooks.ts:168` — its regex only matches top-level `html { ... }` / `body { ... }` and does **not** touch `@container` rules or nested at-rules. Phase 3.5 test should be straightforward.
- ✅ **pkg-ui** — `tokens.css` is auto-generated and hand-edits forbidden. **Refinement:** A hand-maintained companion file `tokens.responsive.css` breaks the "all tokens auto-generated" norm. This is a deliberate deviation per WP-024 Phase 4; should be noted in the pkg-ui SKILL.md when Phase 4 lands so it doesn't look like drift.
- ✅ **infra-tooling** — PARITY-LOG discipline is non-negotiable; container-vs-leaf branch in css-generator already exists (`if (slot['nested-slots'] && length > 0) continue`). **Contradiction with WP assumption:** `tools/layout-maker/**` is not in `owned_files` at all (see Finding #2) — every file Phase 4 touches is currently orphan. Must be added to the manifest before Phase 4 can run cleanly.

### 2. Ownership table — files WP-024 will touch

Manifest source: `src/__arch__/domain-manifest.ts`.

| File | Expected domain | Actual (manifest) | Status |
|------|-----------------|-------------------|--------|
| `packages/db/src/types.ts` | pkg-db | pkg-db (line 55) | ✅ |
| `packages/db/src/index.ts` | pkg-db | pkg-db (line 53) | ✅ |
| `packages/validators/src/block.ts` | pkg-validators | pkg-validators (line 159) | ✅ |
| `packages/validators/src/index.ts` | pkg-validators | pkg-validators (line 158) | ✅ |
| `apps/portal/app/_components/block-renderer.tsx` | app-portal | app-portal (line 203) | ✅ |
| `apps/portal/lib/hooks.ts` | app-portal | app-portal (line 207) | ✅ |
| `apps/portal/app/[[...slug]]/page.tsx` | app-portal | app-portal (line 201) | ✅ |
| `apps/portal/app/themes/[slug]/page.tsx` | app-portal | app-portal (line 202) | ✅ |
| `tools/layout-maker/runtime/lib/css-generator.ts` | infra-tooling | **NOT OWNED** | ❌ **BLOCKER for Phase 4** |
| `tools/layout-maker/runtime/lib/css-generator.test.ts` | infra-tooling | **NOT OWNED** | ❌ **BLOCKER for Phase 4** |
| `packages/ui/src/theme/tokens.css` | pkg-ui | pkg-ui (line 141) | ✅ (no change expected — this WP creates *companion* file, not edits) |
| `packages/ui/src/theme/tokens.responsive.css` (NEW) | pkg-ui | N/A (file doesn't exist yet) | ⚠️ must be added to `pkg-ui.owned_files` in Phase 4 |

**Critical gap:** Grepping the manifest for `layout-maker` or `css-generator` returns zero hits. The `infra-tooling` domain's `owned_files` array currently lists only `.context/*.md`, `tools/test-scanner.ts`, `tools/sync-tokens/README.md`, `tools/sync-tokens/figma.config.json`, and `nx.json` (lines 516-529). The entire `tools/layout-maker/**` tree is unassigned. See Open Questions.

### 3. `variants` pre-existence check

```
grep -rn "\.variants\b|BlockVariants" packages/ apps/ tools/ (code files only, no node_modules/dist)
→ 0 matches
```

Confirmed: **no code references `block.variants`, `blocks.variants`, or `BlockVariants` today.** Mentions exist only in `workplan/WP-024-responsive-blocks-foundation.md` and `logs/wp-024/phase-0-task.md` (documentation of the upcoming change). Safe to proceed with Phase 1.

Blocks table current shape (`packages/db/src/types.ts:242-294`): `id, slug, name, html, css, js, block_type, block_category_id, is_default, sort_order, hooks, metadata, created_by, created_at, updated_at`. No `variants` column — matches WP assumption.

### 4. Call-site inventory — BlockRenderer and renderBlock()

**`BlockRenderer` (RSC):**

| File | Line | Kind |
|------|------|------|
| `apps/portal/app/_components/block-renderer.tsx` | 6 | definition |
| `apps/portal/app/[[...slug]]/page.tsx` | 5 | import |
| `apps/portal/app/[[...slug]]/page.tsx` | 38 | usage (inside `renderSlotBlocks` helper for global header/footer) |
| `apps/portal/app/[[...slug]]/page.tsx` | 84 | usage (composed-page block loop) |

**`renderBlock()` (string helper):**

| File | Line | Kind |
|------|------|------|
| `apps/portal/lib/hooks.ts` | 175 | definition |
| `apps/portal/app/themes/[slug]/page.tsx` | 181 | usage (theme-blocks content loop) |
| `apps/portal/app/themes/[slug]/page.tsx` | 192 | usage (slot-blocks in `renderSlotBlocks` closure — wraps output in `<div class="slot-inner">...`) |

**Important:** `themes/[slug]/page.tsx` does **not** import `BlockRenderer` — theme pages use `renderBlock()` string helper exclusively because slots are interpolated into HTML before React sees them. Composed pages (`[[...slug]]/page.tsx`) use `BlockRenderer` RSC for both global and content blocks. Phase 3 must update both paths.

Phase 3 touches: **4 usage sites + 2 definitions = 6 edits total.**

### 5. `.slot-inner` baseline — VERBATIM from `tools/layout-maker/runtime/lib/css-generator.ts`

**Generic rule (lines 245-252):**

```ts
  // Generic slot-inner base rule
  out.push('[data-slot] > .slot-inner {')
  out.push('  display: flex;')
  out.push('  flex-direction: column;')
  out.push('  width: 100%;')
  out.push('  flex: 1 0 auto;')
  out.push('}')
  out.push('')
```

**Generated CSS (what the above emits):**

```css
[data-slot] > .slot-inner {
  display: flex;
  flex-direction: column;
  width: 100%;
  flex: 1 0 auto;
}
```

**Per-slot rule (lines 254-267, for reference — the container-skip branch Phase 4 must preserve):**

```ts
  // Per-slot inner rules (consume vars, static across layouts).
  // Skip container slots — they hold a nested <div data-slot> instead of .slot-inner.
  for (const [name, slot] of Object.entries(config.slots)) {
    if (slot['nested-slots'] && slot['nested-slots'].length > 0) continue
    const pf = slotVarPrefix(name)
    out.push(`[data-slot="${name}"] > .slot-inner {`)
    out.push(`  max-width: var(${pf}-mw, none);`)
    out.push(`  padding: var(${pf}-pt, 0) var(${pf}-px, 0) var(${pf}-pb, 0);`)
    out.push(`  gap: var(${pf}-gap, 0);`)
    out.push(`  align-self: var(${pf}-al, stretch);`)
    out.push(`  margin-inline: auto;`)
    out.push('}')
    out.push('')
  }
```

**Phase 4 contract-test baseline:** The generic rule must contain exactly these 5 declarations today. Phase 4 adds `container-type: inline-size;` and `container-name: slot;` (or equivalent per ADR-025) and the contract test must assert byte-equivalence modulo those two new properties.

### 6. Filename conflict check — `tokens.responsive.css`

```
ls packages/ui/src/theme/
→ tokens.css
```

Confirmed: **`packages/ui/src/theme/tokens.responsive.css` does NOT exist.** The filename is free for Phase 4.

### 7. PARITY-LOG overlap

```
grep "slot-inner|container-type|container-name" tools/layout-maker/PARITY-LOG.md
```

**One open entry touches `.slot-inner`** (lines 48-68):

> **[tablet] `align` + `max-width` on container slots are silently ignored**
> Status: `open` | Test added: none yet (proposed).
> The entry describes Inspector exposing inner-params on *container* slots (which have `nested-slots`) while `css-generator.ts:234-246` correctly skips `.slot-inner` rules for them. The lie is in Inspector + schema, not in css-generator. The generator's container-skip branch is the *correct* half of the contract.

**Overlap analysis with WP-024:** No conflict. WP-024 modifies the **generic** `.slot-inner` rule (line 246) and the **per-leaf-slot** rules (line 259), both of which already exclude containers via the `continue` branch the open PARITY entry wants to keep. Phase 4's new properties (`container-type`, `container-name`) only apply where `.slot-inner` exists, i.e. leaf slots — which is exactly where the PARITY entry says they *should* apply.

**Recommendation:** Phase 4 should add a contract test that also satisfies the open PARITY entry's proposed test (assert container slots emit no `.slot-inner` rule AND no inner vars). Closing the PARITY entry in the same WP is a bonus; not required.

### 8. `stripGlobalPageRules` location

- **Defined:** `apps/portal/lib/hooks.ts:168`
- **Called:** `apps/portal/lib/hooks.ts:182` (inside `renderBlock()`)
- **Regex:** `/(^|[}\s])(html|body)\s*\{[^}]*\}/g`

The regex is scoped to top-level `html` / `body` selectors only. It does **not** recurse into `@container`, `@media`, `@supports`, or any nested at-rules — the `[^}]*` character class stops at the first closing brace. Phase 3.5's regression test should be low-risk: feed a CSS string containing an `@container (min-width: 500px) { body { … } }` rule and assert the `@container` wrapper survives. (Current behavior: the inner `body { ... }` would be matched and stripped, leaving `@container (min-width: 500px) {  }` — an empty-but-valid at-rule. Worth a test regardless.)

### 9. Portal globals — tokens.css import site

- **File:** `apps/portal/app/globals.css`
- **Line 2:** `@import '../../../packages/ui/src/theme/tokens.css';`
- **Adjacent imports (lines 3-4):** `portal-blocks.css`, `portal-shell.css`

Phase 4.5 pattern: add `@import '../../../packages/ui/src/theme/tokens.responsive.css';` as line 3 (between tokens.css and portal-blocks.css) to ensure responsive tokens layer on top of base tokens but before block-specific styles.

### 10. Studio / Layout-Maker iframe token injection paths

**Studio (three `?raw` imports):**
- `apps/studio/src/pages/block-editor.tsx:20` — `import tokensCSS from '../../../../packages/ui/src/theme/tokens.css?raw'`
- `apps/studio/src/components/block-preview.tsx:4` — same pattern
- `apps/studio/src/components/layout-schematic.tsx:2` — same pattern
- Also: `apps/studio/src/globals.css:1` — `@import '../../../packages/ui/src/theme/tokens.css';`

**Layout Maker (multiple):**
- `tools/layout-maker/src/main.tsx:6` — `import '../../../packages/ui/src/theme/tokens.css'` (app CSS)
- `tools/layout-maker/src/styles/maker.css:9` — `@import '../../../../packages/ui/src/theme/tokens.css';`
- `tools/layout-maker/src/components/Canvas.tsx:20` — `import tokensCSS from '../../../../packages/ui/src/theme/tokens.css?raw'` (iframe injection)
- `tools/layout-maker/runtime/routes/blocks.ts:205-215` — HTTP endpoint `/tokens/css` that reads `tokens.css` at runtime and serves it for iframe consumers
- `tools/layout-maker/runtime/lib/token-parser.ts:6,16` — parses tokens.css for validator/autocomplete

**Phase 4.6/4.7 pattern:** every `?raw` import and the `/tokens/css` endpoint needs a sibling `tokens.responsive.css` import/serve. For the HTTP endpoint, either add a second route `/tokens/responsive-css` or concatenate both files into the existing response (the WP doc should clarify).

### 11. Open Questions / Surprises

1. **[BLOCKER for Phase 4] `tools/layout-maker/**` is unowned in the domain manifest.** `infra-tooling.owned_files` lists `tools/test-scanner.ts`, `tools/sync-tokens/README.md`, `tools/sync-tokens/figma.config.json`, and `nx.json` only. `css-generator.ts` and its test file are nowhere. Phase 4 must either (a) add `tools/layout-maker/runtime/lib/css-generator.ts` + `.test.ts` to `infra-tooling.owned_files`, or (b) create a new `infra-layout-maker` domain. Brain decides before Phase 4 runs.

2. **[PRE-EXISTING] `npm run arch-test` is already failing on `main`** — 7 tests fail in the "Path Existence" category for the `app-command-center` domain. Missing files:
   - `apps/command-center/components/AgentationToolbar.tsx`
   - `apps/command-center/components/ComponentCard.tsx`
   - `apps/command-center/ui/AtomsShowcase.tsx`
   - `apps/command-center/ui/Checkbox.tsx`
   - `apps/command-center/ui/Modal.tsx`
   - `apps/command-center/lib/scanner.ts`
   - `apps/command-center/theme/tokens.ts`

   Test count: 380 passed / 7 failed / 387 total. These failures are **unrelated to WP-024** and pre-exist commit `c3378288`. WP-024 acceptance criteria say "arch-test passes at start AND end" — taken literally that's a false blocker. Interpret as: **no *new* arch-test regressions introduced by the WP.** Pre-existing drift in `app-command-center` should be resolved in a separate WP (likely `app-command-center` domain owner needs to prune the manifest of deleted files).

3. **`theme-blocks` slot is not in layout HTML of every theme** — confirmed in `app-portal` skill and by reading `renderBlock` call sites. Phase 4's `container-type: inline-size` on `.slot-inner` applies uniformly, but the *outer* `theme-blocks` container is injected by `renderSlotBlocks` in `themes/[slug]/page.tsx:189-194` with a hand-written `<div class="slot-inner">`. Phase 4 should verify that this hand-written wrapper also benefits from the new container-query rule (it targets `[data-slot] > .slot-inner`, not `.slot-inner` globally — so the theme-page `.slot-inner` NOT under `[data-slot]` would escape the rule). **Open question for Brain:** does WP-024 want `container-type` on *all* `.slot-inner` or only those under `[data-slot]`? The task prompt just says ".slot-inner generic rule" so the current scope is the selector as-written (`[data-slot] > .slot-inner`). Leaving as WP-specified; flag only.

4. **Existing `css-generator.test.ts` file means Phase 4 extends, not creates.** Good — contract tests can go in an existing file, no new file to register in the manifest.

5. **`BlockHooks` / `BlockMetadata` are both exported from `packages/db/src/index.ts:23-24`.** `BlockVariants` should follow the same pattern per WP Phase 1.5. No surprises.

---

## Surprises / Contradictions with WP

- **WP assumes infra-tooling owns layout-maker files** implicitly (the "Affected domains" table lists infra-tooling). **Manifest does not confirm this.** → documented as Open Question #1.
- **WP's "arch-test passes at start AND end"** is a false blocker given pre-existing 7 `app-command-center` failures. → Open Question #2.

Neither affects WP scope. Both need Brain decisions before Phase 1/4 respectively.

---

## Open Questions for Brain

1. **Phase 4 gating:** Add `tools/layout-maker/runtime/lib/css-generator.ts` + `.test.ts` to `infra-tooling.owned_files` in Phase 4, or split out a `infra-layout-maker` domain first? (Recommend: add to `infra-tooling` — minimal footprint, matches existing `tools/test-scanner.ts` pattern; split only if multiple WPs are expected to touch LM.)
2. **Arch-test baseline:** Acceptance criteria says "passes at start and end". Pre-existing 7 failures predate this WP. Interpret as "no *new* regressions"?
3. **`container-type` scope:** Apply to *all* `.slot-inner` (including the hand-written wrapper in `themes/[slug]/page.tsx:189`) or only `[data-slot] > .slot-inner` as css-generator emits? (Leaning toward "follow the css-generator selector as-written" — matches ADR-025 intent.)

---

## Verification Results

```
=== WP-024 Phase 0 Verification ===

1. npm run arch-test (pre-audit)   → 380 pass / 7 fail (pre-existing app-command-center drift)
1. npm run arch-test (post-audit)  → 380 pass / 7 fail (IDENTICAL — no regressions from audit)

2. git status (tracked-file modifications introduced by Phase 0):
   → (empty) — no source files modified

3. logs/wp-024/phase-0-result.md   → file exists, ~210 lines

4. Heading count in phase-0-result.md:
   → >= 11 (What Was Audited, Key Findings + 11 subsections, Surprises, Open Questions, Verification, Git SHA)

=== Verification complete ===
```

---

## Files Changed

**None — audit only.** The only new file is this log: `logs/wp-024/phase-0-result.md`.

---

## Git commit SHA

Parent commit (HEAD at audit start AND end — no commits made during Phase 0): `c33782889d6289731c67d6d274523d3eb6f13a30`

Commit SHA for this log will be recorded after `git commit` runs per the task's Git section.
