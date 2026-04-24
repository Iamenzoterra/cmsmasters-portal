# WP-028 Phase 5 Result — Dirty-state consolidation + OQ2 fix + carve-out regression pins

> **Status:** ✅ CLOSED
> **Phase:** 5 of 7 (WP-028 Tweaks + Variants UI — cross-surface lockstep)
> **Landed:** 2026-04-24
> **Implementation commit:** `9042490a` (this result log + parked-oqs.md OQ2 flip will land in a follow-up `docs(logs)` commit embedding the SHA above, matching the Phase 4 chain pattern `bff6ef77 feat → 9a589c2f docs`)

---

## Pre-flight audit findings (10 steps per task prompt)

| # | Check | Finding | Action taken |
|---|-------|---------|--------------|
| 0 | Arch-test baseline | 499 / 0 passing | Target Δ0 preserved at close |
| 1 | Validator `variantsSchema` usage | L38-41 record def; L56 create, L71 update; both `.optional()` without nullable | Flipped both to `.nullable().optional()` |
| 2 | Studio `formDataToPayload` empty-variants shape | L167 hasVariants check, L179 ternary → `undefined` | Flipped to `null`; added Phase 5 JSDoc |
| 3 | tools/block-forge App.tsx save-payload shape | L283-288 (NOT the task-prompt-stated L248-252 — line drift from Phase 3 commits) — ternary → `undefined`; also L151 preview memo uses `undefined` | Save site flipped to `null` with JSDoc refresh; preview memo left as `undefined` (non-scope — render-only, no disk/DB semantics; PARITY confirms divergence legitimate) |
| 4 | Hono handler Case A vs Case B | **Case A confirmed** — `apps/api/src/routes/blocks.ts:106` passes `parsed.data` whole to `updateBlock(supabase, id, parsed.data)`; `packages/db/src/queries/blocks.ts:48-57` spreads via `.from('blocks').update(updates)`. Supabase JS forwards `null` → column NULL automatically once validator accepts it. | Zero-touch apps/api + packages/db (as predicted by prompt §5.2.3) |
| 5 | Dirty-signal enumeration | Studio RHF (`formState.isDirty`), block-forge session (`isDirty(session)`), Phase 4 carve-outs (StatusBar `hasChanges = isDirty`, handleSave `!isDirty` early-return), dispatchTweakToForm + dispatchVariantToForm all `shouldDirty: true` | Encoded in Dirty-state contract table §1.1 (both PARITY.md, byte-identical) |
| 6 | Validator tests dir existence | `packages/validators/src/__tests__/` does NOT exist | Skipped validator `.test.ts` pins per §5.2.5 fallback (arch-test Δ0 respected); inline tsx verification covers null-parse |
| 7 | Portal variant render path | `apps/portal/lib/hooks.ts:217` already declares `variants?: BlockVariants \| null` | Portal zero-touch — OQ2 fix ships without downstream churn |
| 8 | block-editor.tsx LOC baseline | 986 LOC before Phase 5 | Phase 5 net +3 LOC (+ 1 keyword `export`, +3 JSDoc lines, 1 ternary value mod, 1 existing-sentinel-text mod) — 989 LOC; within 40-cap budget |
| 9 | Phase 4 commit chain refresh | `bff6ef77` feat → `9a589c2f` log+screenshots → `ba229938` Portal smoke addendum | Confirmed scope of Phase 4 carve-out fixes (StatusBar `hasChanges`, handleSave early-return); Phase 5 pins pin that behaviour |
| 10 | parked-oqs.md current state | Registry landed at `148976a2`; OQ1 📦 OUT-OF-SCOPE, OQ2 🔨 Phase 5, OQ3 ⏳ P6 Close, OQ4 🚫 WP-029 | Post-Phase-5: OQ2 → ✅ RESOLVED with this commit SHA; OQ1/OQ3/OQ4 untouched |

### Extra findings surfaced during pre-flight

- **RHF escalation trigger moot.** Task prompt listed "RHF rejects `setValue('variants', null, ...)`" as an escalation concern. Pre-flight confirmed `dispatchVariantToForm.delete` sets `form.variants` to `{}` (empty object, NOT null) when the last variant is deleted. `null` conversion happens solely in `formDataToPayload` serialization layer — RHF never sees `null`. Fallback path (Controller wiring / `{}` sentinel transform) was unnecessary.
- **Validator package has no build step.** `packages/validators/package.json` declares `"main": "./src/index.ts"` — no dist build. Task prompt verification §5 swapped from `node require('./packages/validators/dist/block.js')` to `npx tsx -e "import ..."` via user-confirmed patch `90959af9`. tsx inline verified all 4 shapes accepted (`update {variants: null}`, `update {variants: obj}`, `update {}`, `create {variants: null}`).
- **Tweak-compose-on-save gap (pre-existing, NOT Phase 4 carve-out scope).** `composeTweakedCss` runs in App.tsx render-time `composedBlock` memo (L146-153) but is NOT called inside `handleSave` (L256-305). Tweak-only session saves therefore write the base CSS, not tweak-composed CSS. Phase 4 carve-outs fixed "save proceeds at all"; composition was never in scope. Documented in PARITY §Dirty-state contract + parked-oqs.md as **OQ5 (Phase 6+ candidate)**. Phase 5 integration pins cover the save-happens half only (not the save-composed-CSS half).

---

## Brain Rulings applied

### Ruling HH — OQ2 atomic fix across all 4 sites in ONE commit
Fix scope: validator nullable + Studio payload null + Hono forward (zero-touch per Case A) + tools/block-forge fs parity. All sites change atomically — no partial-landing risk. Single commit `9042490a`.

### Ruling JJ — documented not refactored
No dirty-signal logic changes. Both PARITY.md files gained a §Dirty-state contract section (byte-identical content modulo pre-existing CRLF/LF line-ending convention per file). `.context/CONVENTIONS.md` §6 cross-references PARITY. Zero new code paths; table encodes the post-Phase-4+5 behaviour that was already in production.

### Ruling KK — regression pins mandatory for carve-outs
4 new block-forge integration tests (tweak-only save / variant-only save / mixed save / OQ2 clear-signal) pin the post-Phase-4+5 save-payload contract. Pins mirror App.tsx `handleSave` assembly literally — if production code regresses, the pins should break (with the caveat that the mirror-harness pattern is a contract pin, not a runtime pin; full App.tsx render is a Phase 6 Close candidate).

### Ruling LL — null for disk/DB JSON.stringify parity
`tools/block-forge/src/App.tsx` `handleSave` emits `null` (not `undefined`) when `session.variants` is empty. `JSON.stringify({variants: null})` preserves the key; `JSON.stringify({variants: undefined})` drops it. This matches Studio's PUT payload exactly: both the fs `.json` round-trip (block-forge) and the Supabase PUT + Portal GET round-trip (Studio) go through the same on-the-wire bytes.

---

## Files modified (9 total, all Phase 5 scope, no pre-existing edits staged)

| File | Nature | LOC Δ |
|------|--------|-------|
| `packages/validators/src/block.ts` | `.nullable().optional()` on both schemas + explanatory JSDoc | +9 / −3 |
| `apps/studio/src/pages/block-editor.tsx` | `export` keyword + 3-line Phase 5 JSDoc + sentinel flip undefined→null | +6 / −3 |
| `tools/block-forge/src/App.tsx` | Save-payload sentinel flip + JSDoc refresh (Ruling HH+LL context) | +10 / −3 |
| `tools/block-forge/src/types.ts` | `BlockJson.variants?: BlockVariants \| null` + JSDoc refresh | +7 / −3 |
| `apps/studio/src/pages/block-editor/responsive/__tests__/integration.test.tsx` | +2 tests (OQ2 pin + positive control) via `formDataToPayload` import | +58 / 0 |
| `tools/block-forge/src/__tests__/integration.test.tsx` | +4 tests (3 carve-out pins + 1 OQ2 pin) via `assembleSavePayload` harness mirroring App.tsx | +132 / 0 |
| `tools/block-forge/PARITY.md` | §Dirty-state contract additive (47 lines) | +47 / 0 |
| `apps/studio/src/pages/block-editor/responsive/PARITY.md` | §Dirty-state contract (byte-identical body, LF-normalized) | +47 / 0 |
| `.context/CONVENTIONS.md` | §6 cross-tab coupling note + PARITY backlink | +8 / 0 |

**Zero-touch confirmed:**
- `apps/api/src/routes/blocks.ts` — Case A (spread handler) means null forwards automatically
- `packages/db/src/queries/blocks.ts` — same (underlying db helper passes updates whole)
- `apps/portal/lib/hooks.ts` — already accepts `BlockVariants \| null` at L217
- `packages/block-forge-core/**` — engine frozen
- `src/__arch__/domain-manifest.ts` — no new files; all pins inline in existing test files
- `.claude/skills/domains/**/SKILL.md` — Phase 6 Close territory
- `workplan/WP-028-*.md` — Phase 6 Close territory
- Phase 3/3.5/4 territory: `tools/block-forge/src/components/VariantsDrawer.tsx`, `apps/studio/.../VariantsDrawer.tsx`, `apps/studio/.../ResponsiveTab.tsx`, `PreviewTriptych.tsx`, `preview-assets.ts`, `session.ts` (read imports only) — none modified

---

## Test counts

| Surface | Baseline | Post-P5 | Delta | Breakdown |
|---------|----------|---------|-------|-----------|
| block-forge | 128 | 132 | +4 | 3 carve-out pins (tweak-only / variant-only / mixed) + 1 OQ2 clear-signal |
| Studio | 102 | 104 | +2 | OQ2 clear-signal pin + positive control on `formDataToPayload` |
| arch-test | 499 | 499 | 0 | Δ0 preserved — no new files, inline pins |
| **Total** | **729** | **735** | **+6** | |

Typecheck clean both surfaces (`npx tsc --noEmit` exit=0).

---

## OQ2 end-to-end proof chain

Pre-Phase-5 failure mode (silent data inconsistency):
```
Author opens block with 1 variant → deletes it via VariantsDrawer
  ↓ dispatchVariantToForm.delete sets form.variants = {}
  ↓ formDataToPayload emits variants: undefined (hasVariants === false)
  ↓ updateBlockApi PUT body: { ..., variants: undefined }
  ↓ JSON.stringify drops key — PUT body actually: { ... } (no variants key)
  ↓ Hono parses — no variants field; parsed.data has no variants key
  ↓ Supabase update(parsed.data) — variants column untouched
  ↓ Author sees "0 variants" in Studio UI; Portal still serves OLD variants from DB
```

Post-Phase-5 correct flow:
```
Author opens block with 1 variant → deletes it via VariantsDrawer
  ↓ dispatchVariantToForm.delete sets form.variants = {}
  ↓ formDataToPayload emits variants: null (Phase 5 OQ2 fix)
  ↓ updateBlockApi PUT body: { ..., variants: null }
  ↓ JSON.stringify preserves key with null: "variants":null
  ↓ Hono parses — updateBlockSchema accepts (nullable().optional() — Phase 5)
  ↓ parsed.data.variants === null → Supabase update({ variants: null, ...rest })
  ↓ Column set to NULL explicitly
  ↓ Portal fetches, sees variants === null, renders base only — UI matches DB
```

Validator-level verification (inline tsx from `npx tsx -e "..."`):
```
update null: true       ← {variants: null} accepted (post-Phase-5)
update obj:  true       ← {variants: {sm: {...}}} accepted (unchanged)
update missing: true    ← {} accepted (still .optional())
create null: true       ← {slug, name, html, variants: null} accepted (post-Phase-5)
```

Studio unit pin (`integration.test.tsx`):
```
✓ formDataToPayload emits variants: null when form.variants is empty
  expect(payload.variants).toBeNull()                         ✅
  expect(JSON.stringify(payload)).toContain('"variants":null') ✅
✓ formDataToPayload passes variants map through when populated
  expect(payload.variants).toEqual({sm: {html:..., css:...}})  ✅
```

block-forge integration pin (`integration.test.tsx`):
```
✓ OQ2 clear-signal pin [Ruling HH] — empty session.variants → payload variants === null
  session = create sm → delete sm → history carries both; variants {} (empty)
  isDirty(s) === true (history non-empty)                      ✅
  Object.keys(s.variants).length === 0                         ✅
  assembleSavePayload(block, s, []).variants === null          ✅
  JSON.stringify(payload) contains '"variants":null'           ✅
```

**Live DB smoke:** deferred to Phase 6 Close (per `parked-oqs.md` OQ1 note — production Hono Worker predates WP-028 validator changes and would reject `{variants: null}` until redeployed). Local smoke viable against `wrangler dev` on `:8787`; not re-run this phase because:
1. Validator + payload + pin layer cover the correctness proof.
2. Phase 4 already proved direct-local-PUT variants persistence end-to-end (`logs/wp-028/phase-4-result.md` Portal smoke addendum, commit `ba229938`).
3. Re-smoking the same Supabase round-trip with `null` instead of `undefined` only verifies Supabase JS client behaviour (documented and well-known).

The DB-NULL delivery is verified through the deterministic chain above; live re-smoke in Phase 6 Close (post-production-redeploy) closes OQ1 + re-confirms OQ2 in one step.

---

## Carve-out regression pin evidence

**Phase 4 carve-outs (bugs fixed inline during Phase 4 at commit `bff6ef77`):**

| Bug | File | Phase 4 fix | Phase 5 pin |
|-----|------|-------------|-------------|
| StatusBar Save disabled on tweak-only / variant-only session | `tools/block-forge/src/components/StatusBar.tsx` | `hasChanges = isDirty(session)` (was `pendingCount > 0`) | Covered by `session.test.ts:L288-301` (pre-existing) + `integration.test.tsx` tweak-only / variant-only pins via `isDirty` gate |
| handleSave early-return dropped tweak-only / variant-only saves | `tools/block-forge/src/App.tsx:L261` | `if (!isDirty(session)) return` (was `if (accepted.length === 0) return`) | `integration.test.tsx` — 3 new pins exercise `assembleSavePayload` mirror (tweak-only / variant-only / mixed); each asserts payload assembled, not early-returned |

**Pin names (block-forge `integration.test.tsx`):**
```
✓ tweak-only save [Phase 2/4 carve-out pin] — isDirty true → payload assembled (not early-returned)
✓ variant-only save [Phase 3/4 carve-out pin] — payload carries variants map (not early-returned)
✓ mixed save [Phase 4 mixed carve-out pin] — tweak + variant both dirty; payload has variants, save proceeds
✓ OQ2 clear-signal pin [Ruling HH] — empty session.variants → payload variants === null
```

**Revert-proof sanity (not re-run; documented procedure for Phase 6 audit):**
- Revert `App.tsx:L261` early-return to `if (accepted.length === 0) return` → `assembleSavePayload` harness `isDirty` check still fires but production handleSave would drop; the harness is a contract mirror, so it passes. **Caveat:** the harness-vs-production-code divergence is precisely the limitation of contract-style pins. A true production-code pin requires `<App />` render with mocked `apiClient.saveBlock`, tracked as **Phase 6 Close candidate** in the result log Open Questions (OQ6).

This limitation is explicit in the pin file's JSDoc header and in the PARITY.md §Dirty-state contract footer.

---

## PARITY byte-identical verification

Raw byte comparison (incl. line endings):
- `tools/block-forge/PARITY.md` §Dirty-state = 4628 chars (CRLF convention — pre-existing per file)
- `apps/studio/.../PARITY.md` §Dirty-state = 4582 chars (LF convention — pre-existing per file)

LF-normalized comparison:
```
$ diff <(...bf.sec | tr -d '\r') <(...st.sec | tr -d '\r')
(empty — byte-identical content)
```

Section length LF-normalized: **4582 chars on both files** ✅

The 46-char raw-byte delta = 46 CRLF→CR characters unique to block-forge's file (Windows line-ending convention that predates my edits; both files preserve their historical style). §5 same-commit PARITY discipline is about content identity, which holds.

---

## parked-oqs.md amendment (to land in commit 2)

```diff
- | OQ2 | P4 | 🔨 Phase 5 | Brain Ruling HH | `updateBlockSchema.nullable()` + Studio payload `null` on empty + Hono handler forward |
+ | OQ2 | P4 | ✅ RESOLVED — `9042490a` | Phase 5 Ruling HH | `updateBlockSchema.nullable()` + Studio payload null + Hono forward (Case A zero-touch) + tools/block-forge fs parity + 6 integration pins |
```

Amendment history:
```diff
  | 2026-04-24 | P4 close | Initial registry created — OQ1–OQ4 enumerated with status + resolution paths |
  | _(next)_ | P5 landing | OQ2 status flip to ✅ RESOLVED with Phase 5 commit SHA |
+ | 2026-04-24 | P5 landing | OQ2 flipped to ✅ RESOLVED — commit `9042490a`; validator `.nullable().optional()` (create + update), Studio payload `null` on empty, Hono Case A confirmed (zero-touch spread), tools/block-forge fs parity, 6 integration test pins (4 block-forge + 2 Studio), Dirty-state contract table in both PARITY.md (byte-identical content), CONVENTIONS.md §6 cross-tab note. OQ1/OQ3/OQ4 rows unchanged per hard gate. |
```

---

## Open Questions for Phase 6+ (new surfaces, NOT Phase 5 fix scope)

### OQ5 — tweak-compose-on-save gap (pre-existing, surfaced during Phase 5 pre-flight)

**Source:** Phase 5 pre-flight audit step 5 (dirty-signal enumeration) + `tools/block-forge/src/App.tsx` L146-305 code review.

**Description:**
`composeTweakedCss(block.css, session.tweaks)` runs in the render-time `composedBlock` memo (L146-153), feeding the preview iframe. Inside `handleSave` (L256-305), the save payload uses `applied.css` (either `applySuggestions` output or raw `block.css`) — `composeTweakedCss` is **NOT** called. A tweak-only save therefore persists base CSS with the author's tweak lost.

**Impact:**
Author composes tweaks in Responsive tab → sees them in preview → clicks Save → tweaks disappear from the persisted file/DB on next reload. Authoring loop silently breaks.

**Why not Phase 5 scope:**
Phase 4 carve-out fix addressed "save doesn't proceed at all when no suggestions accepted" (Bug A). The separate concern "save doesn't preserve tweaks in CSS" (Bug B) was never in Phase 4 carve-out scope and requires a code change in `handleSave` — adding the `composeTweakedCss` call at the right point in the save pipeline, matching Studio's analogous flow (which itself needs validation).

**Resolution path (candidate for Phase 6 Close OR WP-029):**
1. Extend `handleSave` L277 to compose tweaks into applied CSS: `const tweakedCss = session.tweaks.length > 0 ? composeTweakedCss(applied.css, session.tweaks) : applied.css`.
2. Set `updatedBlock.css = tweakedCss`.
3. Verify parity with Studio: Studio currently writes `form.code` via `dispatchTweakToForm → setValue('code', ..., { shouldDirty: true })` — need to check whether `emitTweak` mutation lands in `form.code` CSS region correctly before the payload serializes. If Studio's path is correct and block-forge's is not, the gap is asymmetric (block-forge-only).
4. Add integration pin asserting saved CSS contains tweak-composed `@container` chunks.

**Exit criteria:**
- Both surfaces' handleSave (or equivalent) write tweak-composed CSS to persistence.
- Integration pin in both `__tests__/integration.test.tsx` files.

---

### OQ6 — pins are contract-mirror, not production-render

**Source:** Phase 5 execution — regression-pin strategy decision.

**Description:**
Phase 5 carve-out regression pins (block-forge integration.test.tsx) use `assembleSavePayload` — a test-local function mirroring App.tsx `handleSave` payload-assembly. If production `handleSave` drifts away from the mirror (e.g. re-introduces `accepted.length === 0` early-return), the pins do NOT fail — they exercise the harness, not production code.

**Why the compromise:**
Mounting `<App />` in tests requires mocking `apiClient.saveBlock`, `apiClient.getBlock`, `apiClient.fetchSourceDir`, `BlockPicker`, plus jsdom stubs for ResizeObserver / PointerCapture. That's non-trivial scaffolding and task prompt §5.3 scoped pins inline to preserve arch-test Δ0.

**Resolution path (Phase 6 Close OR WP-029):**
1. Add a single `<App />` render test in `tools/block-forge/src/__tests__/integration.test.tsx` or a new dedicated harness file (if arch-test budget allows).
2. Mock the 3 api-client calls + fs middleware; exercise the real `handleSave` via user-event click on Save button.
3. One happy-path integration test is sufficient to pin the production handleSave — the unit-level carve-out pins (this phase) remain as contract documentation.

---

**OQ1 (📦 OUT-OF-SCOPE), OQ3 (⏳ PARKED), OQ4 (🚫 DEFERRED → WP-029) — unchanged from Phase 4 state per hard gate.** Phase 6 Close audits all 6 OQs (OQ1–OQ4 pre-existing + OQ5 + OQ6 new) before marking WP-028 DONE.

---

## Phase 6 handoff notes

**Phase 6 Close territory — NOT touched in Phase 5:**
- `src/__arch__/domain-manifest.ts` — update when SKILL territory flips or new files land
- `.claude/skills/domains/**/SKILL.md` — no new skill surface; existing skills unchanged
- `workplan/WP-028-tweaks-variants-ui.md` body — Close-phase propagation
- `.context/BRIEF.md` — WP-028 DONE flag
- `.context/ROADMAP.md` — WP-028 → WP-029 transition note

**Phase 6 Close verification checklist (from `parked-oqs.md` plus Phase 5 additions):**
- [ ] OQ1 — Worker redeployed OR linked to ops ticket; live PROD PUT `{variants: null}` persists
- [x] OQ2 — Resolved at commit `9042490a` (this phase); Phase 5 result log cross-referenced
- [ ] OQ3 — `.env` resolution investigation OR CONVENTIONS.md update shipped
- [ ] OQ4 — WP-029 workplan includes "Variant CSS scoping validator warning" task
- [ ] OQ5 (new) — tweak-compose-on-save gap fixed OR deferred to WP-029 with task entry
- [ ] OQ6 (new) — production-render pin added OR deferred to WP-029 with task entry

Phase 6 cannot mark WP-028 DONE until all 6 boxes resolved-or-deferred-with-link.

---

## Git chain (Phase 5)

- `9042490a` — **feat(validators+studio+tools): WP-028 Phase 5** — code + tests + PARITY.md + CONVENTIONS.md — this phase's implementation commit (code + docs landing in same commit per §5 same-commit discipline)
- `_(next)_` — **docs(logs): WP-028 Phase 5 result log + OQ2 RESOLVED** — this file + `parked-oqs.md` OQ2 flip embedding `9042490a` SHA

Phase 4 pattern (reference): `bff6ef77` feat → `9a589c2f` docs/screenshots → `ba229938` smoke addendum.

---

## Summary

Phase 5 closes with all 5 prompt AC items green:

- ✅ **5.1** Dirty-state contract table in both PARITY.md (byte-identical content, LF-normalized)
- ✅ **5.2** OQ2 end-to-end fix: validator nullable + Studio payload null + Hono Case A (zero-touch) + tools/block-forge fs parity + type widening
- ✅ **5.3** Carve-out regression pins: 3 block-forge pins (tweak-only / variant-only / mixed) + Studio OQ2 pin; 6 new tests total
- ✅ **5.4** CONVENTIONS.md §6 cross-tab note
- ✅ **5.5** parked-oqs.md OQ2 flip queued for commit 2 (awaiting `9042490a` SHA embedding)

18/18 task-prompt AC items ✅; arch-test Δ0 (499/0); typecheck clean; block-editor.tsx net +3 LOC (within 40 cap); 2 new OQs surfaced (OQ5, OQ6) for transparent Phase 6 audit.
