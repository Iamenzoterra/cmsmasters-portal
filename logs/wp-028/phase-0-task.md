# WP-028 Phase 0: RECON + extract-vs-reimplement ruling

> Workplan: WP-028 Tweaks + Variants UI — cross-surface lockstep
> Phase: 0 of 7
> Priority: P0
> Estimated: ~2 hours
> Type: RECON (audit-only — no code writes)
> Previous: WP-027 Phase 5 ✅ (docs sync, close, commit `1112991f`, result log `b5a5df25`)
> Next: Phase 1 (foundation + extract-vs-reimplement scaffold — Brain writes prompt AFTER reading Phase 0 result log)
> Affected domains: pkg-block-forge-core (read-only), infra-tooling (audit), studio-blocks (audit), pkg-validators (audit), pkg-ui (audit)

---

## Context

WP-024 → WP-027 shipped the "automatic responsive" spine:
- **WP-024** Foundation: `@container` slot wrapper + `blocks.variants` JSONB + portal inline render
- **WP-025** Engine: `analyzeBlock` / `generateSuggestions` / `applySuggestions` / `composeVariants` / `renderForPreview` / **`emitTweak`**
- **WP-026** tools/block-forge: file-based authoring surface (suggestions + save; variants deferred to WP-028)
- **WP-027** Studio Responsive tab: DB-backed authoring surface (suggestions + save; variants end-to-end via Path B `renderForPreview(block, { variants })`)

```
CURRENT:
  engine shipped:  emitTweak + composeVariants                                      ✅
  surface 1:       tools/block-forge/ with suggestions + file save                  ✅ (variants deferred)
  surface 2:       apps/studio Responsive tab with suggestions + DB save            ✅ (variants render-only)
  contract:        dual-PARITY.md files proven on simple injection contract         ✅

MISSING:
  TweakPanel UI — click-to-edit + per-BP sliders (padding/font-size/gap/hide/show)  ❌
  VariantsDrawer UI — fork/rename/delete/undo + side-by-side editor                 ❌
  First real `blocks.variants` non-null DB write (Studio)                           ❌
  tools/block-forge Path B switch (variants require it — forward-compat in §7)      ❌
  empirical extract-vs-reimplement ruling for shared UI                             ❌
```

WP-028 is the **stress test** for dual-PARITY discipline at complexity that matters. Phase 0 is the **decision moment** — it produces the empirical input for the extract-vs-reimplement ruling that gates the rest of the WP. No code is written this phase. The deliverable is `logs/wp-028/phase-0-result.md` with 10 carry-overs.

**Pre-flight by Brain already caught 9 material path / shape corrections** — see "Pre-flight corrections" below. Hands re-verifies them live as part of audit.

---

## Domain Context

**pkg-block-forge-core** (`status: full`):
- Key invariants (from SKILL): pure-function pipeline; opaque suggestion IDs; deterministic output; engine is a **read-only consumer target** — NEVER edit `packages/block-forge-core/` in WP-028.
- Public API for WP-028: `emitTweak(tweak, css)`, `composeVariants(base, variants[], onWarning?)`, `renderForPreview(block, { variants })`, plus existing `analyzeBlock` / `generateSuggestions` / `applySuggestions` already consumed.
- Known trap: **reveal-rule name gap** — `composeVariants` only emits `@container` reveal rules for names matching `sm|md|lg` OR `/^4\d\d$/`, `/^6\d\d$/`, `/^7\d\d$/` (maps to 480/640/768px). Other names (`mobile`, `tablet`, `custom-xl`) trigger `onWarning` and are scoped but **not revealed**. Phase 0.5 audits whether validators are stricter/looser than engine convention.

**infra-tooling** (`status: full`) — WP-026 consumer:
- Key invariants: PARITY discipline; port 7702; file-based I/O (`fs.writeFileSync`); WP-027 diverges on wrap LOCATION per `tools/block-forge/PARITY.md` "WP-027 Studio Responsive tab cross-reference" + Studio PARITY.md §7.
- Traps: WP-028 **structurally refactors** tools/block-forge to switch from inline-wrap composeSrcDoc → engine-upstream `renderForPreview(block, { variants })` Path B per Studio PARITY §7 forward-compat clause. Dropping inner wrap must land with re-converged §7.

**studio-blocks** (`status: full`) — WP-027 consumer:
- Key invariants: RHF `formState.isDirty` is canonical; session-state is pure (no dirty coupling); Path B preview via `renderForPreview`; cache-wide revalidate via Hono POST `{}`.
- Traps: **`variants` RHF field registration** — `block-editor.tsx` L231 `useForm<BlockFormData>` does NOT currently register `variants`. WP-028 Phase 1 must extend the form type + initial values. `form.setValue('variants', …, { shouldDirty: true })` is a no-op until then.

**pkg-ui** (`status: full`):
- Read-only consumer: tokens via `packages/ui/src/theme/tokens.css`. Phase 0 checks whether a Slider primitive exists; if not, Phase 1 may add one (tokens-driven, CVA).

**pkg-validators** (`status: skeleton`) — first WP that writes a non-null `variants` payload through this layer:
- Schema at `packages/validators/src/block.ts` L38: `variantsSchema = z.record(z.string().regex(/^[a-z0-9-]+$/), variantPayloadSchema)`.
- Accept: `sm`, `md`, `lg`, `mobile-extra`, `my-custom-1`, `499` (any kebab-case).
- Reject: uppercase, underscores, spaces, dots, unicode.
- **Engine ⇄ validator alignment check:** validator is strictly permissive-er than engine — validator accepts `mobile`, engine warns + skips reveal. Phase 0.5 records this gap as author-UX input for Phase 3 name-validation warnings.

**app-portal** (`status: full`):
- No code change. WP-028 Phase 4 is the second time real variant-bearing blocks reach production data path (WP-024 verified on synthetic fixtures); Playwright E2E at Phase 4 is the author-round-trip proof.

---

## PHASE 0: Audit (the whole phase IS the audit — execute every step before writing the result log)

All commands below produce findings recorded in the result log. Nothing is written to any file except `logs/wp-028/phase-0-result.md`.

### Pre-flight corrections Brain already verified (re-confirm live, do NOT trust blindly)

The WP-028 workplan body at `workplan/WP-028-tweaks-variants-ui.md` contains several stale path assumptions that Brain pre-flight caught. Hands re-verifies each live via Read/ls; if any NEW divergence appears, escalate per triggers below.

| Workplan claim | Actual (Brain pre-flight) | Action |
|---|---|---|
| `packages/block-forge-core/src/emit/emit-tweak.ts` | `packages/block-forge-core/src/compose/emit-tweak.ts` | Read actual path; record verbatim signature (carry-over a) |
| `tools/block-forge/src/hooks/useElementSelection.ts` (planned) | `tools/block-forge/src/hooks/` does NOT exist; existing hooks live in `tools/block-forge/src/lib/` (`useAnalysis.ts`) | Note for Phase 1 naming decision |
| WP-026 session primitive in `components/` | `tools/block-forge/src/lib/session.ts` (9 exports, 113 LOC) | Confirm via Grep |
| WP-027 session primitive name | `apps/studio/src/pages/block-editor/responsive/session-state.ts` (9 exports, ~97 LOC) | Confirm via Grep |
| "First real variants DB write unaudited" | Studio PARITY.md §7 forward-compat clause explicitly names WP-028 as the migration point for tools/block-forge Path B switch | Record as carry-over (k) — new addition |

### 0-prep: Baseline (ALWAYS — do not skip)

```bash
# 0. Baseline — arch-test must be 489/0 (WP-027 Phase 5 close)
npm run arch-test
# expected: 489 tests, 0 failures, no drift since commit b5a5df25

# 0a. Git state clean
git status --porcelain
# expected: zero staged/modified (untracked .claude/* OK)

# 0b. HEAD sanity
git log --oneline -1
# expected: b5a5df25 chore(logs): embed phase-5 commit SHA...
```

---

### 0.1: Read all relevant skills + PARITY files (full, not skim)

```bash
# Skills
cat .claude/skills/domains/pkg-block-forge-core/SKILL.md
cat .claude/skills/domains/infra-tooling/SKILL.md
cat .claude/skills/domains/studio-blocks/SKILL.md
cat .claude/skills/domains/pkg-ui/SKILL.md
cat .claude/skills/domains/app-portal/SKILL.md
cat .claude/skills/domains/pkg-validators/SKILL.md   # ← status: skeleton; audit mindful

# PARITY contracts (dual + cross-ref)
cat tools/block-forge/PARITY.md
cat apps/studio/src/pages/block-editor/responsive/PARITY.md
```

**Record:** one-line-per-file "what I learned that Phase 1+ needs" digest. Flag any SKILL-documented invariant that feels incompatible with WP-028 plan.

---

### 0.2: Engine API audit — record signatures VERBATIM from source

```bash
# emitTweak — Brain pre-flight verified path correction
cat packages/block-forge-core/src/compose/emit-tweak.ts
# expected: export function emitTweak(tweak: Tweak, css: string): string
# PostCSS-based, 3 cases (A/B/C), bp===0 escape-hatch (top-level, no @container)

# composeVariants
cat packages/block-forge-core/src/compose/compose-variants.ts
# expected: export function composeVariants(base, variants, onWarning?) → BlockOutput
# variantCondition: sm|md|lg OR /^4\d\d$/, /^6\d\d$/, /^7\d\d$/
# Unknown name → onWarning + skip reveal rule

# Tweak + Variant TS types (the input shapes)
grep -n "^export" packages/block-forge-core/src/lib/types.ts

# Public API export surface
cat packages/block-forge-core/src/index.ts
```

**Record in carry-over (a):** exact `emitTweak` signature + 3-case behavior summary + bp===0 note.
**Record in carry-over (b):** exact `composeVariants` signature + name convention regex + unknown-name behavior.

---

### 0.3: Component divergence audit — EMPIRICAL INPUT for extract ruling

This is the load-bearing audit. The extract-vs-reimplement decision depends on the metric computed here.

```bash
# List both surfaces' component dirs
ls tools/block-forge/src/components/
# expected (per pre-flight): BlockPicker.tsx, PreviewPanel.tsx, PreviewTriptych.tsx,
#                            StatusBar.tsx, SuggestionList.tsx, SuggestionRow.tsx

ls apps/studio/src/pages/block-editor/responsive/
# expected: PARITY.md, PreviewPanel.tsx, ResponsivePreview.tsx, ResponsiveTab.tsx,
#           SuggestionList.tsx, SuggestionRow.tsx, __tests__/, preview-assets.ts, session-state.ts
```

**Pair inventory (confirmed by Brain pre-flight):**

| Pair | WP-026 | WP-027 | Audit |
|---|---|---|---|
| 1 | `components/PreviewPanel.tsx` | `PreviewPanel.tsx` | diff + score |
| 2 | `components/SuggestionList.tsx` | `SuggestionList.tsx` | diff + score |
| 3 | `components/SuggestionRow.tsx` | `SuggestionRow.tsx` | diff + score |
| 4 | `lib/session.ts` | `session-state.ts` | diff + score (9 exports identical API) |
| 5 | `lib/preview-assets.ts` | `preview-assets.ts` | diff + score (deliberate §7 wrap divergence) |
| 6 | `components/PreviewTriptych.tsx` | `ResponsivePreview.tsx` | abstraction-level diff (NOT 1:1) |

**For each pair run:**

```bash
# Pair 1 example; repeat for 2–6
diff -u tools/block-forge/src/components/PreviewPanel.tsx \
        apps/studio/src/pages/block-editor/responsive/PreviewPanel.tsx \
        | head -200
wc -l tools/block-forge/src/components/PreviewPanel.tsx \
      apps/studio/src/pages/block-editor/responsive/PreviewPanel.tsx
```

**Record per pair:** (a) LOC both sides, (b) **non-cosmetic** differences (logic / props API / state shape / side-effects / import targets), (c) cosmetic differences (className / token usage / Tailwind arbitrary / ordering).

**Metric for extract ruling (carry-over c):**
- **Extract threshold:** non-cosmetic diffs > 3 per pair OR > 15 total across pairs 1–5 → extract to `packages/block-forge-ui/`.
- **Reimplement threshold:** < 3 per pair AND < 15 total → reimplement-in-both continues with tightened PARITY + component-snapshot tests.
- **Pair 6 (Triptych vs ResponsivePreview)** is NOT counted in the metric — it's abstraction-level divergence, informational only.

**Ruling format in result log:** "Non-cosmetic diffs per pair: [1: N, 2: N, 3: N, 4: N, 5: N]; total: N. Threshold: N. **Decision: extract | reimplement.**"

---

### 0.4: Variants data-flow audit — file-based and DB-based

```bash
# WP-026 (file-based) — how does the JSON on disk look today?
ls content/db/blocks/ | head -5
cat content/db/blocks/homepage-hero.json | head -40
# record: where would `variants` key land; what does empty-state look like

# WP-027 (DB-based) — updateBlockApi payload shape
grep -n "updateBlockApi\|updateBlockSchema\|variants" apps/studio/src/lib/block-api.ts 2>/dev/null \
  || find apps/studio -name "block-api.ts" -exec grep -nH "variants\|updateBlock" {} \;

# Zod validator — first real contract the variants payload hits
cat packages/validators/src/block.ts
# expected: variantsSchema = z.record(z.string().regex(/^[a-z0-9-]+$/), variantPayloadSchema)

# Hono route — what runs on PUT /api/blocks/:id
grep -rn "updateBlockSchema\|variants" apps/api/src/routes/blocks.ts 2>/dev/null \
  || find apps/api -name "*.ts" -exec grep -lH "updateBlockSchema" {} \;

# Portal inline render — is the variant-bearing path proven?
grep -n "data-variant\|variants" apps/portal/lib/hooks.ts 2>/dev/null
grep -rn "composeVariants\|renderForPreview" apps/portal/ 2>/dev/null | head -10
```

**Record in carry-over (d):**
- Validator regex (ground truth): `/^[a-z0-9-]+$/`
- Engine regex (ground truth): `sm|md|lg|/^4\d\d$/|/^6\d\d$/|/^7\d\d$/`
- **Gap:** author names like `mobile`, `tablet`, `custom-xl` pass validator but trigger engine `onWarning` (no reveal rule). Phase 3 name-validation UX must warn on the engine-stricter boundary.
- Hono route accepts `variants` via `updateBlockSchema` (optional passthrough — already in place per WP-027 Phase 4).
- Save flow per surface:
  - tools/block-forge: `fs.writeFileSync(json)` via `lib/file-io.ts`
  - Studio: `form.setValue('variants', …, { shouldDirty: true })` → `updateBlockApi` → Hono `PUT /api/blocks/:id` → Supabase → `POST /api/content/revalidate` with `{}` (cache-wide, WP-027 Phase 4)

---

### 0.5: Validator vs engine convention gap (combine with 0.4)

Already mostly covered in 0.4. **Additional concrete check:**

```bash
# Will validator accept the engine's warned names?
# Paste into node REPL:
# node -e "const {createBlockSchema, updateBlockSchema} = require('./packages/validators/dist/block.js'); console.log(updateBlockSchema.safeParse({variants: {mobile: {html: '<b/>', css: ''}}}).success)"
# Simpler: just grep/trace regex
echo '/^[a-z0-9-]+$/' | grep -E '^\/(.+)\/$'
```

Record: confirm validator ACCEPTS any kebab-case name, engine emits reveal rule ONLY for the 6-case match. This is a design choice, not a bug — but it IS author-UX input for WP-028 Phase 3 name-validation warnings.

---

### 0.6: Iframe postMessage contract audit

```bash
# What postMessage types already exist?
grep -rn "block-forge:" tools/block-forge/src/ apps/studio/src/pages/block-editor/responsive/ \
  | grep -v __tests__

# Existing height-sync pin (PARITY contract, both sides)
grep -n "'block-forge:iframe-height'" tools/block-forge/src/lib/preview-assets.ts \
                                      apps/studio/src/pages/block-editor/responsive/preview-assets.ts

# How are message listeners mounted on the parent side?
grep -rn "addEventListener.*message\|onMessage" tools/block-forge/src/ \
                                                apps/studio/src/pages/block-editor/responsive/ \
  | head -20
```

**Record in carry-over (e):** existing postMessage types ({iframe-height}), listener lifecycle (mount/unmount), proposed new types for WP-028:
- `{ type: 'block-forge:element-click', selector, rect, computedStyle }` — Phase 2 introduces
- `{ type: 'block-forge:element-hover', selector }` (optional, for outline preview)
- Parent-side cleanup obligations on unmount (prevent memory leaks when switching tabs / blocks).

---

### 0.7: Test strategy per path (branch on 0.3 ruling)

**If extract path:**
- Single test set under `packages/block-forge-ui/src/__tests__/`.
- Component snapshot tests; both surfaces consume shared package, no parallel duplication.
- New Vitest workspace entry required.

**If reimplement path:**
- Parallel test files under both surfaces' `__tests__/`.
- **Component-level snapshot tests**: render WP-026 TweakPanel and WP-027 TweakPanel with identical mock block; byte-compare rendered DOM (or serialized output). Fail on divergence.
- Snapshot file naming: `TweakPanel.parity.snap` on each side, cross-referenced.

**Record in carry-over (f):** decision + test-harness cost (LOC estimate, number of new snap files).

---

### 0.8: Effort recalc + split decision

Based on 0.3 ruling + 0.7 test-harness cost:

| Path | Phases 1–6 estimate | Include Phase 0 | Total |
|---|---|---|---|
| Extract | ~16–18h | +2h | ~18–20h |
| Reimplement | ~20–24h | +2h | ~22–26h |

**Trigger:** if total > 24h, **flag Phase 1 as WP-028a candidate split** (Tweaks to WP-028, Variants to WP-028a). Brain reviews at Phase 1 prompt handoff.

Record in carry-over (g).

---

### 0.9: Arch-test baseline record + projected target

```bash
npm run arch-test
```

Record: current 489 / 0 at WP-028 Phase 0 entry.

**Project target:**
- Phase 0 itself: Δ0 (no new files registered). Final target end of Phase 0: **489 / 0**.
- Extract path end of Phase 1: +N for `packages/block-forge-ui/src/` owned_files + skeleton→full flip eventually at Close (+6 per `feedback_arch_test_status_flip.md`).
- Reimplement path end of Phase 1: +N for new test files + new empty TweakPanel / VariantsDrawer placeholders on both surfaces.
- Close (Phase 6) projection ranges per path — record both, commit to final in Phase 1.

Record in carry-over (h) — include the `feedback_arch_test_status_flip` +6 accounting explicitly.

---

### 0.10: RHF `variants` field registration check

```bash
# Current form shape
grep -nA 2 "useForm<" apps/studio/src/pages/block-editor.tsx
# expected: useForm<BlockFormData>({...})

# BlockFormData type
grep -rn "BlockFormData\b" apps/studio/src/ | head -5

# Does any existing form call reference 'variants'?
grep -n "variants" apps/studio/src/pages/block-editor.tsx
```

**Expected Brain pre-flight finding:** `block-editor.tsx` does NOT currently register `variants`. Phase 1 must extend `BlockFormData` type + initial values + (implicitly) `register('variants')` via `setValue`.

Record in carry-over (i): RHF gap + exact file/line where extension lands.

---

### 0.11: Dirty-state conflict rehearsal (paper)

Walk through the scenario: author opens a block → types CSS in Editor tab Code textarea → switches to Responsive tab → clicks element → tweaks padding → clicks Save. Trace:

1. Does the tweak propagate to `form.code`? (Expected: yes — Phase 2 dispatch calls `form.setValue('code', patchedCss, { shouldDirty: true })`.)
2. Does the Editor tab's pending textarea edit persist on tab switch? (WP-027 ruling: CSS `display: none` preserves; verify still true post-WP-028.)
3. If author edits textarea AFTER tweak, then tweaks again, is the tweak applied to POST-textarea CSS or PRE-textarea CSS? (Expected: live `form.getValues('code')` at dispatch time — post-textarea.)
4. Save submits `form.getValues()` → full payload incl. tweaked CSS + variants.

Record in carry-over (j): conflict model documented; no code change in Phase 0; Phase 5 may revisit if Phase 2/3/4 surface a real data-loss bug.

---

### 0.12: Path B forward-compat inventory (NEW carry-over — from Studio PARITY §7)

Studio PARITY.md §7 explicitly names WP-028 as the trigger point for tools/block-forge switching to engine-upstream `renderForPreview`:

> "when WP-028 adds variants to tools/block-forge, that surface will also switch to calling `renderForPreview` upstream — at which point tools/block-forge's composeSrcDoc should adopt Studio's single-wrap pattern, re-converging PARITY."

```bash
# tools/block-forge current wrap location
grep -n "data-block-shell\|slot-inner" tools/block-forge/src/lib/preview-assets.ts

# Studio current wrap location (single-wrap)
grep -n "data-block-shell\|slot-inner" apps/studio/src/pages/block-editor/responsive/preview-assets.ts

# Studio's composeSrcDoc — the converged-target pattern
grep -nA 5 "composeSrcDoc\|slot-inner" apps/studio/src/pages/block-editor/responsive/preview-assets.ts | head -40
```

Record in carry-over (k): tools/block-forge structural refactor plan — drop inner `data-block-shell` wrap in composeSrcDoc + consume `renderForPreview(block, { variants })` Path B → re-converges PARITY §7 as "resolved" in WP-028 Close.

---

### 0.13: UI primitives inventory

```bash
# Does pkg-ui ship a Slider primitive?
ls packages/ui/src/primitives/ | grep -i slider
grep -rn "Slider\b" packages/ui/src/ | head -5

# Drawer / Sheet primitive?
ls packages/ui/src/primitives/ | grep -iE "drawer|sheet|dialog"

# Existing input range usage in monorepo
grep -rn 'type="range"' apps/ packages/ tools/ 2>/dev/null | grep -v node_modules | head -10
```

Record in carry-over (l): Slider primitive (exists | missing — Phase 1 adds); Drawer/Sheet primitive (exists | missing — Phase 3 adds or reuses Dialog).

---

## Files to Modify

- `logs/wp-028/phase-0-result.md` — **NEW** — the phase deliverable. Contains carry-overs (a)–(l), the extract-vs-reimplement ruling, and the Phase 1 handoff brief.

**Nothing else.** No code, no manifest edits, no SKILL edits, no PARITY edits, no WP body edits.

---

## Acceptance Criteria

- [ ] `npm run arch-test` green — **489 / 0 unchanged**
- [ ] All 13 audit steps (0.1–0.13) executed with findings recorded
- [ ] `emitTweak` signature captured verbatim in carry-over (a); path correction confirmed (`src/compose/emit-tweak.ts`)
- [ ] `composeVariants` signature captured verbatim in carry-over (b); name-convention regex recorded
- [ ] Component divergence metric (carry-over c): per-pair non-cosmetic diff counts + total + **extract vs reimplement ruling**
- [ ] Variants data-flow traced end-to-end both surfaces; validator/engine gap documented (carry-over d)
- [ ] Iframe postMessage contract inventoried + WP-028 additions proposed (carry-over e)
- [ ] Test strategy committed per path (carry-over f)
- [ ] Effort recalc per path + WP-028a split decision (carry-over g)
- [ ] Arch-test baseline + projected target range recorded (carry-over h)
- [ ] RHF `variants` field gap confirmed + Phase 1 extension point noted (carry-over i)
- [ ] Dirty-state conflict model documented — no code action this phase (carry-over j)
- [ ] Path B forward-compat refactor for tools/block-forge inventoried (carry-over k)
- [ ] UI primitives inventory recorded (carry-over l)
- [ ] Result log committed as `chore(logs): WP-028 Phase 0 RECON result`
- [ ] Zero code files touched; zero SKILL / PARITY / workplan edits; `git diff` shows only the new log file

---

## MANDATORY: Verification (do NOT skip)

```bash
echo "=== WP-028 Phase 0 Verification ==="

# 1. Arch-test unchanged
npm run arch-test
echo "(expect: 489 tests, 0 failures — same as WP-027 Phase 5 close)"

# 2. No code drift — only the result log is new
git status --porcelain
echo "(expect: A logs/wp-028/phase-0-result.md — nothing else tracked-modified)"

# 3. Ground-truth engine-path confirmation (re-verify pre-flight)
test -f packages/block-forge-core/src/compose/emit-tweak.ts && echo "emit-tweak path OK"
test -f packages/block-forge-core/src/compose/compose-variants.ts && echo "compose-variants path OK"
test ! -d packages/block-forge-core/src/emit && echo "no /emit/ dir (pre-flight confirmed)"

# 4. Both surfaces' session modules exist where pre-flight said
test -f tools/block-forge/src/lib/session.ts && echo "WP-026 session.ts OK"
test -f apps/studio/src/pages/block-editor/responsive/session-state.ts && echo "WP-027 session-state.ts OK"

# 5. Validator file layout
test -f packages/validators/src/block.ts && echo "block validator OK"
grep -q "variantsSchema" packages/validators/src/block.ts && echo "variantsSchema present"

# 6. Result log well-formed
test -f logs/wp-028/phase-0-result.md && echo "result log written"
grep -c "^## " logs/wp-028/phase-0-result.md
echo "(expect: section count ≥ 8)"

echo "=== Verification complete ==="
```

---

## MANDATORY: Write Execution Log (do NOT skip)

After verification (before committing), create:
`logs/wp-028/phase-0-result.md`

**Structure (fill all sections — write N/A if not applicable, do NOT omit sections):**

```markdown
# Execution Log: WP-028 Phase 0 — RECON + extract-vs-reimplement ruling
> Epic: WP-028 Tweaks + Variants UI
> Executed: {ISO}
> Duration: {minutes}
> Status: ✅ COMPLETE
> Domains affected: RECON-only (no owned_files changed)

## What Was Audited
{2-5 sentences — 13 audit steps, 12 carry-overs, extract-vs-reimplement metric}

## Pre-flight Corrections Confirmed Live
| Workplan claim | Actual | Impact |
|---|---|---|
| `src/emit/emit-tweak.ts` | `src/compose/emit-tweak.ts` | path-only; plan text only |
| ... | ... | ... |

## Carry-overs (Phase 1 INPUT)
### (a) emitTweak signature (verbatim)
```ts
export function emitTweak(tweak: Tweak, css: string): string
// Tweak = { selector, bp, property, value }
// PostCSS-based, 3 cases (A=new @container chunk, B=new rule inside, C=update decl)
// bp===0 → top-level rule (no @container)
```

### (b) composeVariants signature (verbatim) + name convention
```ts
export function composeVariants(
  base: BlockInput,
  variants: readonly Variant[],
  onWarning?: (msg: string) => void,
): BlockOutput
// Reveal rule names: 'sm'|/^4\d\d$/, 'md'|/^6\d\d$/, 'lg'|/^7\d\d$/ → 480/640/768 (max-width)
// Unknown name → onWarning + no reveal rule
```

### (c) Component divergence audit
| Pair | WP-026 LOC | WP-027 LOC | Non-cosmetic diffs | Cosmetic |
|---|---|---|---|---|
| PreviewPanel | N | N | N | N |
| SuggestionList | N | N | N | N |
| SuggestionRow | N | N | N | N |
| session(-state) | 113 | 97 | N | N |
| preview-assets | N | N | N (deliberate §7) | N |

**Total non-cosmetic: N**
**Threshold: 15**
**Ruling: EXTRACT | REIMPLEMENT**
**Rationale (2-3 sentences)**

### (d) Variants data-flow + validator/engine gap
- Validator regex: `/^[a-z0-9-]+$/`
- Engine reveal-rule regex: `sm|md|lg|/^[467]\d\d$/`
- Gap: `mobile`, `tablet`, `custom-*` → pass validator, no reveal rule → Phase 3 warns author

### (e) Iframe postMessage additions for WP-028
- Existing: `block-forge:iframe-height`
- Proposed: `block-forge:element-click` `{ type, selector, rect, computedStyle }`

### (f) Test strategy
- Chosen: {extract-single-set | reimplement-parallel+snapshot}
- Snapshot files: N new

### (g) Effort estimate + split decision
- Total: Nh
- Split WP-028a? {yes|no}

### (h) Arch-test projection
- Baseline: 489/0
- Extract path projected at Close: 489 + N (new owned_files) + 6 (skill flip) = N
- Reimplement path projected at Close: 489 + N = N
- Phase 0 delta: 0

### (i) RHF `variants` field gap
- `block-editor.tsx` L231 `useForm<BlockFormData>` does NOT register `variants`
- Phase 1 extension point: `apps/studio/src/pages/block-editor.tsx` L~{exact line}
- Type: `BlockFormData` at `{exact file}:{line}`

### (j) Dirty-state conflict rehearsal
- Tweak → `form.setValue('code', ..., { shouldDirty: true })` → `isDirty` ✅
- Textarea edit + tweak concurrency → last write wins, no data loss (paper-verified)
- Phase 5 acknowledges only; no new logic

### (k) Path B forward-compat refactor for tools/block-forge
- Current: inline double-wrap in composeSrcDoc
- Target: engine-upstream `renderForPreview(block, { variants })` + drop inner wrap
- Lands in Phase {2|3} alongside first variants integration
- Re-converges PARITY §7 as "resolved" in WP-028 Close

### (l) UI primitives inventory
- Slider primitive: {exists|missing — Phase 1 adds}
- Drawer/Sheet primitive: {exists|missing — reuse Dialog or add}

## Key Decisions
| Decision | Chosen | Why |
|---|---|---|
| Extract vs reimplement | ... | metric + rationale |
| Test harness | ... | path-dependent |
| Split WP-028a? | ... | effort threshold |

## Files Changed
| File | Change | Description |
|---|---|---|
| `logs/wp-028/phase-0-result.md` | created | this log |

## Issues & Workarounds
{None if clean; otherwise discrepancies between pre-flight and live}

## Open Questions
{Non-blocking questions for Brain at Phase 1 prompt time}

## Verification Results
| Check | Result |
|---|---|
| arch-test | ✅ 489/0 unchanged |
| git-clean (only result log) | ✅/❌ |
| all 12 carry-overs populated | ✅/❌ |
| AC met | ✅/❌ |

## Git
- Commit: `{sha}` — `chore(logs): WP-028 Phase 0 RECON result [WP-028 phase 0]`
```

---

## Git

```bash
# First: commit the task prompt (this file) in a separate chore(logs) commit
# (this is Hands' standard workflow — see WP-027 phase-0-task.md precedent)

# After result log written:
git add logs/wp-028/phase-0-result.md
git commit -m "$(cat <<'EOF'
chore(logs): WP-028 Phase 0 RECON result [WP-028 phase 0]

Audit-only phase. Engine API signatures captured verbatim; component
divergence measured across 5 direct pairs; extract-vs-reimplement
ruling committed; all 12 carry-overs populated for Phase 1.

Arch-test unchanged: 489/0.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## IMPORTANT Notes for CC

- **Read domain skills FIRST** — pkg-block-forge-core + infra-tooling + studio-blocks + pkg-ui + pkg-validators + app-portal. RECON without skill context produces shallow findings.
- **NEVER edit `packages/block-forge-core/`** — engine is frozen for WP-028. This phase is read-only against the engine.
- **NEVER edit source code this phase** — Phase 0 is audit-only. If you feel a code change is "trivial," surface it as an Open Question in the result log instead.
- **Pre-flight corrections are a FLOOR not a ceiling** — Brain pre-flight caught 9 material items; Hands may catch more during live audit. Each new finding gets recorded in the "Pre-flight Corrections Confirmed Live" table.
- **Extract ruling is empirical, not ideological** — `feedback_preflight_recon_load_bearing.md`: the metric decides. If the number says reimplement, the correct decision is reimplement regardless of personal preference.
- **`npm run arch-test` before committing** — 489/0 is hard-gate. Any delta ≠ 0 this phase is a code leak.
- **Result log is the Phase 1 INPUT** — under-populated carry-overs force Phase 1 prompt to re-derive. Write as if Brain has not yet read the source.

---

## Escalation Triggers

Stop and surface to Brain if:

1. `npm run arch-test` shows ≠ 489 baseline → environment drift; do NOT proceed with RECON until reconciled.
2. Any Brain pre-flight path correction is wrong live (e.g., `src/compose/emit-tweak.ts` does not exist) → engine layout changed under WP-026; invalidates the plan.
3. Component divergence total non-cosmetic diffs is close to the threshold (12–17) — borderline metric deserves Brain review of per-pair rationale before ruling commits.
4. `packages/validators/src/block.ts` `variantsSchema` is MORE restrictive than Brain pre-flight recorded (e.g., enum-only) → Phase 0.5 surfaces a Phase 1 pre-req.
5. `block-editor.tsx` ALREADY registers `variants` (contradicts Brain pre-flight) → Phase 1 RHF extension plan is already done; confirm and continue.
6. Total effort estimate crosses 30h threshold → flag WP-028a split before writing Phase 1 prompt.
7. A SKILL-documented invariant in any audited domain appears incompatible with WP-028 plan → stop, surface the specific conflict with line reference.

---
---

# BRAIN → OPERATOR HANDOFF SUMMARY

(not part of the task file handed to Hands — this is the preamble Brain posts to the Operator)

Phase 0 промпт готовий: `logs/wp-028/phase-0-task.md`.

## Структура

**14 tasks (0-prep + 0.1–0.13), ~2h budget — audit-only, zero code:**

| # | Task | Scope |
|---|---|---|
| 0-prep | Baseline | `npm run arch-test` = 489/0; git clean; HEAD sanity |
| 0.1 | Skills + PARITY | 6 SKILLs + 2 PARITY.md full-read with digest |
| 0.2 | Engine API | `emitTweak` + `composeVariants` signatures verbatim (path corrected: `src/compose/`, not `/emit/`) |
| 0.3 | Component divergence | 5 pair-wise diffs + non-cosmetic metric → extract vs reimplement ruling (threshold: 15 total / 3 per pair) |
| 0.4 | Variants data-flow | File-based + DB-based trace + validator/engine gap |
| 0.5 | Validator audit | Zod regex `/^[a-z0-9-]+$/` vs engine `sm/md/lg/4**/6**/7**` gap for Phase 3 UX |
| 0.6 | postMessage inventory | Existing `iframe-height`; propose `element-click` shape for Phase 2 |
| 0.7 | Test strategy | Branch on 0.3 — single set (extract) vs parallel + snapshot (reimplement) |
| 0.8 | Effort recalc + split | WP-028a trigger if > 24h |
| 0.9 | Arch-test projection | Close target per path incl. `feedback_arch_test_status_flip` +6 |
| 0.10 | RHF variants gap | `block-editor.tsx` L231 `useForm<BlockFormData>` — no `variants` registered |
| 0.11 | Dirty-state rehearsal | Paper-walk textarea↔tweak concurrency (last write wins) |
| 0.12 | Path B forward-compat | tools/block-forge structural refactor for PARITY §7 re-convergence |
| 0.13 | UI primitives | Slider + Drawer audit (possible Phase 1 additions) |
| Gates | arch-test 489/0 unchanged | zero code / manifest / SKILL / PARITY edits this phase |

## 5 Brain rulings locked

1. **Engine path correction** — `src/compose/emit-tweak.ts` (not `/emit/`); `src/compose/compose-variants.ts`. Workplan body's `/emit/` path is stale; Hands re-verifies live + records verbatim signatures in carry-overs (a) + (b).
2. **Pair inventory is 5 + 1** — PreviewPanel, SuggestionList, SuggestionRow, session(-state), preview-assets count toward the extract metric; PreviewTriptych ↔ ResponsivePreview is informational only (abstraction-level divergence, not 1:1).
3. **Validator/engine gap is NOT a bug** — `variantsSchema` accepts any kebab-case; engine emits reveal rule only for `sm/md/lg|4**|6**|7**`. Phase 3 name-validation UX must warn on the engine-stricter boundary. Zero schema edits in WP-028.
4. **Path B refactor for tools/block-forge is WP-028 scope** — Studio PARITY §7 forward-compat clause explicitly names WP-028 as the trigger. Phase 0 inventories; Phase 2 or 3 executes; WP-028 Close re-converges PARITY §7 as "resolved."
5. **RHF `variants` field extension is Phase 1 work** — `block-editor.tsx` currently has no `variants` in `BlockFormData`. Phase 1 extends type + initial values; `form.setValue('variants', …, { shouldDirty: true })` becomes live at that point.

## Hard gates (inherited + Phase 0 additions)

- **Zero code writes** — Phase 0 is RECON only. Any "trivial" fix becomes an Open Question in the result log.
- **Zero edits to `packages/block-forge-core/`** — engine frozen for WP-028.
- **Zero edits to manifest, SKILLs, PARITY files, workplan body** — Phase 0 only produces `logs/wp-028/phase-0-result.md`.
- **Arch-test Δ0** — 489/0 in, 489/0 out. Any drift = code leak.
- **Extract ruling must be empirical** — non-cosmetic diff counts + threshold comparison. No ideological override.

## Escalation triggers

Written to catch load-bearing-assumption-class up-front:
- arch-test ≠ 489 → environment drift; reconcile before starting
- Any Brain pre-flight path correction wrong live → invalidates plan; stop and re-plan
- Divergence metric 12–17 (borderline) → Brain reviews per-pair before ruling commits
- `variantsSchema` more restrictive than pre-flight said → Phase 1 pre-req surfaces
- `block-editor.tsx` already registers `variants` → Phase 1 plan partially done; confirm
- Total effort > 30h → WP-028a split decision forced before Phase 1 prompt
- SKILL invariant conflicts with WP-028 plan → stop with specific conflict line

## Arch-test target

**489 / 0 — unchanged.** RECON phase; zero new owned_files; zero SKILL status flips.

## Git state

- `logs/wp-028/phase-0-task.md` — new untracked (this file)
- `logs/wp-028/phase-0-result.md` — will be new untracked after Hands runs
- Nothing staged, nothing committed yet

## Next

1. Review → commit task prompt (`chore(logs): WP-028 Phase 0 task prompt`) → handoff Hands
2. АБО правки (особливо ruling 4 — Path B refactor scope, або audit step 0.3 metric threshold)
3. АБО self-commit if workflow permits

Чекаю.
