# WP-028 Phase 5: Dirty-state consolidation + OQ2 fix + carve-out regression pins

> Workplan: WP-028 Tweaks + Variants UI — cross-surface lockstep
> Phase: 5 of 7
> Priority: P0 — OQ2 (variants clear-signal) is a silent data-inconsistency bug; must land before Close
> Estimated: 2.5h (RECON 20min + dirty-state contract table 30min + OQ2 end-to-end 60min + regression pins 40min + PARITY/CONVENTIONS doc 20min + verification + result log 30min)
> Type: Backend (validator + Hono) + Frontend (Studio + tools) + docs
> Previous: Phase 4 ✅ (variant editor + first real DB variants write + Portal verification + 2 scope carve-outs fixed)
> Next: Phase 6 — Close (doc propagation + OQ registry audit + WP-028 mark DONE)
> Affected domains: pkg-validators, app-api, studio-blocks, infra-tooling

---

## Inputs

- **`logs/wp-028/parked-oqs.md`** — authoritative OQ registry. Phase 5 resolves **OQ2**; **OQ1/OQ3/OQ4 stay tracked** per registry status columns. Phase 5 result log updates OQ2 row to ✅ RESOLVED with commit SHA.
- `logs/wp-028/phase-4-result.md` — 2 pre-existing block-forge bugs surfaced + fixed inline as scope carve-outs (StatusBar `hasChanges = isDirty(session)`; handleSave early-return removal). Phase 5 pins regression tests for these.
- Workplan WP-028 §Phase 5 — "Tighten dirty-state across tweaks + variants + existing Code textarea. No new logic unless Phase 0/2/3/4 surface a real bug." Phase 4 DID surface real bugs (carve-outs + OQ2); Phase 5 "expand here" clause invoked.

---

## Context

Phase 4 verified first real DB variants write end-to-end but surfaced three concerns:
1. **2 pre-existing block-forge bugs** silently broke tweak-only + variant-only save paths since shipped (Phase 2 tweaks never enabled Save; handleSave early-return dropped variant-only saves). Fixed as Phase 4 scope carve-outs; need regression pins so they don't return.
2. **OQ2 silent data inconsistency** — author deletes all variants → UI shows "0 variants" → payload emits `variants: undefined` → Hono ignores missing field → Supabase keeps old value → Portal renders stale variants. Cognitive dissonance + silent DB drift.
3. **Dirty-state source enumeration absent** — multiple dirty signals (RHF `formState.isDirty`, session `isDirty`, StatusBar `hasChanges`, Save footer) exist; no authoritative doc table. Cross-surface readers had to infer the contract from code.

```
CURRENT (entering Phase 5):
  Studio RHF.isDirty — canonical dirty signal for form fields                     ✅
  tools/block-forge session.isDirty — canonical dirty signal for accept/reject/tweak/variant  ✅
  StatusBar.hasChanges (Phase 4 fix) — reads session.isDirty now                  ✅
  handleSave (Phase 4 fix) — runs on any isDirty (tweak/variant/mixed)            ✅
  validator variants — optional but NOT nullable                                  ❌
  Studio formDataToPayload — emits variants: undefined when empty                 ❌
  Cross-tab concurrency (Code textarea + Responsive tweak + variant) behavior     📋  undocumented
  PreviewTriptych.test.tsx (P3.5 parked #1) — still no unit coverage              📋  parked

MISSING (Phase 5 adds):
  Dirty-state contract table — both surfaces, all sources listed                  ❌
  OQ2 end-to-end fix:
    validator variantsSchema — accept null                                        ❌
    Studio payload — null on empty instead of undefined                           ❌
    Hono handler — forward null to Supabase update                                ❌
    tools/block-forge save — parallel fs round-trip for clear-signal              ❌
  Carve-out regression pins — tweak-only + variant-only + mixed save tests        ❌
  Cross-tab concurrency note — CONVENTIONS.md + both PARITY.md                    ❌
  OQ2 status flip to ✅ RESOLVED in parked-oqs.md                                 ❌

OUT-OF-SCOPE (explicitly NOT Phase 5):
  OQ1 (prod Hono deploy)   → ops ticket per parked-oqs.md                          📦
  OQ3 (.env resolution)    → Phase 6 Close docs pass per parked-oqs.md            📦
  OQ4 (validator warning)  → WP-029 per parked-oqs.md                             📦
```

---

## Domain Context

**pkg-validators (`packages/validators/src/block.ts`):**
- Invariants: schemas mirror DB columns + Hono handler expectations
- Current: `variants: variantsSchema.optional()` L56 + L71 — allows missing, rejects `null`
- Known trap: schema change cascades through Hono handler + Studio payload serialization + tests
- Blast radius: `createBlockSchema` (L43-57) + `updateBlockSchema` (L60-72); any `.parse()` / `.safeParse()` call site

**app-api (`apps/api/src/routes/blocks.ts`):**
- Invariants: authMiddleware + requireRole preserved; `updateBlockSchema.safeParse(body)` validates PUT
- Current: L92 validates body; L14 imports schemas; Supabase update forwards validated object
- Known trap: Supabase `update({ variants: null })` must be explicit null (not undefined) to NULL the column
- Blast radius: PUT /api/blocks/:id handler; no other route touches variants

**studio-blocks (`apps/studio/src/pages/block-editor.tsx`):**
- Invariants: RHF `form.variants` canonical; payload parity with tools/block-forge
- Current: L167 `hasVariants = Object.keys(data.variants).length > 0`; L179 `variants: hasVariants ? data.variants : undefined`
- Phase 5 change: emit `null` (not `undefined`) when `!hasVariants`; validator + Hono forward null → Supabase NULL
- Known trap: block-editor.tsx LOC deviation at 31/40; this change is ~2 lines net (undefined → null switch + type widening) — within budget

**infra-tooling (`tools/block-forge/src/App.tsx`):**
- Invariants: session.variants round-trips via fs write
- Current: L248-252 (Phase 3 Task 3.4) `variants: Object.keys(session.variants).length > 0 ? session.variants : undefined`
- Phase 5 change: emit `undefined` OR `{}` OR `null` — whichever fs + re-read round-trip preserves. Pick option that matches Studio parity.
- fs writeFileSync: JSON.stringify drops undefined keys. If Studio sends `null`, block-forge must match for disk parity.

---

## PHASE 0: Audit (do FIRST)

```bash
# 0. Baseline
npm run arch-test
# (expect: 499 / 0 — unchanged since Phase 4)

# 1. Current validator variants schema
grep -B 2 -A 2 "variantsSchema" packages/validators/src/block.ts
# (expect: L38-41 schema def + L56, L71 .optional() usage — verify exact lines)

# 2. Current Studio payload empty-variants handling
grep -B 2 -A 6 "hasVariants" apps/studio/src/pages/block-editor.tsx
# (expect: L167 check + L179 undefined/data.variants ternary)

# 3. Current tools/block-forge save payload shape
grep -B 2 -A 4 "variants.*undefined\|Object.keys.*variants" tools/block-forge/src/App.tsx

# 4. Hono PUT handler — how it passes schema output to Supabase
grep -A 20 "updateBlockSchema.safeParse\|.from('blocks').update" apps/api/src/routes/blocks.ts | head -40

# 5. dispatchTweakToForm + dispatchVariantToForm + session reducers — enumerate dirty signals
grep -A 3 "shouldDirty\|setValue\|isDirty" \
  apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx \
  apps/studio/src/pages/block-editor.tsx \
  tools/block-forge/src/lib/session.ts \
  tools/block-forge/src/components/StatusBar.tsx \
  tools/block-forge/src/App.tsx | head -60

# 6. Test harness for validator-level parse — where Phase 5 new tests land
find packages/validators/src/__tests__ -name "*.test.ts" -o -name "*.test.tsx" 2>&1 | head -5

# 7. Portal render path for variants — zero-touch verification
grep -A 5 "variants" apps/portal/lib/hooks.ts | head -30

# 8. block-editor.tsx current deviation LOC (bump check)
wc -l apps/studio/src/pages/block-editor.tsx
# (expect: matches Phase 4 exit; Phase 5 net change ~+2 lines for undefined→null switch)

# 9. Phase 4 carve-out commit — refresh what actually changed
git log --oneline -5 | grep "phase 4\|Phase 4"
git show --stat bff6ef77 2>&1 | tail -20  # Implementation commit

# 10. parked-oqs.md current state (load context)
cat logs/wp-028/parked-oqs.md | head -40
```

**Document findings:**
- (a) Exact validator lines to change (L38-41 + L56 + L71 confirmed)
- (b) Studio payload current ternary shape (L179)
- (c) block-forge App.tsx current ternary shape (L248-252 per Phase 3 Task 3.4)
- (d) Hono handler — does it spread `parsed.data` directly OR cherry-pick fields? (affects whether null vs undefined matters)
- (e) Enumerated dirty-signal sources for contract table (Section 5.1)
- (f) block-editor.tsx LOC baseline for net-change tracking
- (g) parked-oqs.md OQ2 row current status — Phase 5 flips to ✅ on landing

**IMPORTANT gotchas:**
- `z.nullable().optional()` accepts `null`, `undefined`, or missing. `.optional().nullable()` same behavior; prefer `.nullable().optional()` for readability.
- Supabase JS client: `update({ variants: null })` sets column to NULL. `update({ variants: undefined })` OMITS the field — column keeps old value. This is the OQ2 root cause.
- `JSON.stringify({ variants: null })` → `{"variants":null}` (round-trips). `JSON.stringify({ variants: undefined })` → `{}` (key dropped). block-forge fs save must emit `null` if Studio emits `null` for disk/DB parity.
- RHF `form.setValue('variants', null, { shouldDirty: true })` — RHF may not accept null for nested object fields; might need explicit reset or use `{}` sentinel + payload transform. Verify during pre-flight.

---

## Task 5.1: Dirty-state contract table (documentation, both surfaces)

### What to Build

Add authoritative reference table to both `PARITY.md` files (same-commit §5 discipline). Section header: `## Dirty-state contract (WP-028 Phase 5)`.

```markdown
## Dirty-state contract (WP-028 Phase 5)

Authoritative enumeration of dirty signals + save-enabling sources. All rows
are canonical post-Phase-4 carve-outs (Phase 4 fixed StatusBar + handleSave
pre-existing bugs where tweak/variant edits were silently non-saving).

### Studio Responsive tab (RHF-driven)

| Source | Field | Triggers `formState.isDirty` | Save button reads |
|--------|-------|------------------------------|-------------------|
| Code textarea (Editor tab) | `form.code` | Yes (RHF native) | `formState.isDirty` |
| Suggestion Accept (Responsive tab) | `form.code` via `setValue('code', ..., { shouldDirty: true })` | Yes | same |
| Tweak slider dispatch | `form.code` via `dispatchTweakToForm → setValue('code', ..., { shouldDirty: true })` | Yes | same |
| Variant CRUD | `form.variants` via `dispatchVariantToForm → setValue('variants', ..., { shouldDirty: true })` | Yes | same |
| Variant editor (update-content) | `form.variants` via `dispatchVariantToForm({kind:'update-content'})` → setValue | Yes | same |

**Cross-tab concurrency:** Editor-tab Code textarea + Responsive-tab Tweak + Variant all write to `form.code` / `form.variants`. Last write wins — no per-tab isolation. This is the established RHF pattern; documented here for transparency, no new logic required.

### tools/block-forge (session-driven)

| Source | State mutation | `isDirty(session)` true | StatusBar `hasChanges` reads |
|--------|----------------|-------------------------|------------------------------|
| Suggestion Accept | `pending.push(id)` | Yes | `isDirty(session)` |
| Suggestion Reject | `rejected.push(id)` | Yes | same |
| Tweak dispatch | `tweaks.push(tweak)` | Yes (post-Phase-4 StatusBar fix) | same |
| Variant fork | `variants[name] = {...}` | Yes | same |
| Variant rename | variants key swap | Yes | same |
| Variant delete | variants key removal | Yes | same |
| Variant editor | `variants[name].html / .css` updated via `updateVariantContent` | Yes | same |
| Undo | history pop | If history non-empty, yes; else no-op | same |

**handleSave path (post-Phase-4):**
1. Early return if `!isDirty(session)` — prevents no-op PUTs
2. `applySuggestions` only runs if `accepted.length > 0`; else uses `block.html/css` as-is
3. Full block written via fs middleware (variants + tweaks-composed css + applied suggestion html)
4. `.bak` written iff `!session.backedUp`
5. `clearAfterSave(session, savedVariants)` — session aligns to disk state

### Cross-tab concurrency — last-write-wins semantics

Both surfaces follow last-write-wins. Example scenarios:
1. Editor textarea changes `form.code` → switches to Responsive tab → Tweak slider adjusts → dispatch also writes `form.code`. Result: tweak-composed CSS lands; manual textarea edits preserved iff within the CSS region the tweak didn't touch (PostCSS emitTweak targets specific rules).
2. block-forge: Accept suggestion → tweak element → variant fork. All three land in `session`; save writes all in one PUT.

No explicit conflict resolution UI — transparent last-write-wins is acceptable per workplan §5 "document last-write-wins behaviour. No new logic unless real data loss."

Phase 4 verified no data loss via integration tests + live smoke. This section is the canonical doc; Phase 6 cross-references it.
```

### Integration

- Copy identical content to `tools/block-forge/PARITY.md` AND `apps/studio/src/pages/block-editor/responsive/PARITY.md`.
- Both files land in the same commit as Task 5.2 code changes (§5 PARITY discipline).
- Byte-identical content in the new section — validates via `diff` of the new section only.

### Domain Rules

- Ruling JJ — **documented not refactored**; no dirty-signal logic changes in Phase 5 (Phase 4 already fixed the bugs).
- Cross-surface table content byte-identical modulo surface-specific headings.

---

## Task 5.2: OQ2 end-to-end fix — variants clear-signal

### 5.2.1 — validator (`packages/validators/src/block.ts`)

```typescript
// BEFORE (L56 + L71):
variants: variantsSchema.optional(),

// AFTER:
variants: variantsSchema.nullable().optional(),

// Keep both createBlockSchema + updateBlockSchema consistent.
```

### 5.2.2 — Studio payload (`apps/studio/src/pages/block-editor.tsx`)

```typescript
// BEFORE (L167-179):
const hasVariants = Object.keys(data.variants).length > 0
return {
  // ...
  variants: hasVariants ? data.variants : undefined,
}

// AFTER:
const hasVariants = Object.keys(data.variants).length > 0
return {
  // ...
  variants: hasVariants ? data.variants : null,
}
```

~2 LOC net change (undefined → null). Net block-editor.tsx deviation: 31 → 33 (still within 40 cap).

### 5.2.3 — Hono handler verification (`apps/api/src/routes/blocks.ts`)

Pre-flight step 4 audit determines approach:
- **Case A**: Handler spreads `parsed.data` into Supabase update → `null` forwards automatically once validator accepts it. Zero code change.
- **Case B**: Handler cherry-picks fields → add `variants` to the cherry-pick list.

Document chosen case in Phase 5 result log.

### 5.2.4 — tools/block-forge payload parity (`tools/block-forge/src/App.tsx`)

```typescript
// BEFORE (Phase 3 Task 3.4, ~L248-252):
const updatedBlock: BlockJson = {
  ...block,
  html: applied.html,
  css: applied.css,
  variants: Object.keys(session.variants).length > 0 ? session.variants : undefined,
}

// AFTER (Phase 5 parity):
// Note: BlockJson.variants type is currently `BlockVariants | undefined`.
// Phase 5 widens to `BlockVariants | null | undefined` for fs round-trip parity.
const updatedBlock: BlockJson = {
  ...block,
  html: applied.html,
  css: applied.css,
  variants: Object.keys(session.variants).length > 0 ? session.variants : null,
}
```

Also update `tools/block-forge/src/types.ts` BlockJson type:
```typescript
export type BlockJson = {
  // ...
  variants?: BlockVariants | null
}
```

### 5.2.5 — Integration tests — OQ2 regression pins

**Studio** (`__tests__/integration.test.tsx` — extend):
- `it('delete all variants → save payload has variants: null (OQ2 clear-signal)')`
- Mock `updateBlockApi`; render form with 1 variant; dispatch delete action; submit; assert mock called with `{..., variants: null}`.

**block-forge** (`__tests__/integration.test.tsx` — extend):
- `it('delete all variants → fs save body has variants: null (OQ2 parity)')`
- Existing fs mock pattern; fork + delete; save; assert POST body `block.variants === null`.

**Validator** (`packages/validators/src/__tests__/*.test.ts` — IF tests dir exists per pre-flight step 6):
- `it('updateBlockSchema accepts variants: null')`
- `it('createBlockSchema accepts variants: null')`
- If no tests dir exists, skip (arch-test δ0 rule) OR log as Phase 6 cleanup candidate.

### Domain Rules

- Ruling HH — fix scope: validator + payload + handler + parity. All 4 sites change in one commit (atomicity).
- Ruling LL (NEW) — block-forge fs save uses `null` for disk parity with Studio API; JSON.stringify preserves key with null value.
- block-editor.tsx LOC: 31 → 33 net (within 40 cap).

---

## Task 5.3: Carve-out regression pin tests

Phase 4 fixed 2 pre-existing bugs inline (StatusBar `hasChanges`; handleSave early-return). Phase 5 pins regression tests so they don't return.

### 5.3.1 — block-forge tweak-only save

`tools/block-forge/src/__tests__/integration.test.tsx` — extend:
```typescript
it('tweak-only save (no suggestions accepted) writes to disk [Phase 2/4 carve-out pin]', async () => {
  // Setup: block loaded, no suggestions accepted, 1 tweak in session
  // Dispatch: click Save
  // Assert: mock fs POST called with { block: { ...base, css: tweak-composed } }
  // Regression trigger: if handleSave early-returns on accepted.length === 0, test fails
})
```

### 5.3.2 — block-forge variant-only save

```typescript
it('variant-only save (no tweaks, no suggestions) writes to disk [Phase 3/4 carve-out pin]', async () => {
  // Setup: block loaded, session has 1 variant forked, no suggestions, no tweaks
  // Dispatch: Save
  // Assert: fs POST body.block.variants = {sm: {...}}
})
```

### 5.3.3 — block-forge mixed save

```typescript
it('mixed save (tweak + variant + no-suggestion) writes all three [Phase 4 carve-out pin]', async () => {
  // Setup: session with tweak AND variant, no accepted suggestions
  // Dispatch: Save
  // Assert: fs POST body contains tweak-composed CSS AND variants field
})
```

### 5.3.4 — StatusBar hasChanges regression

```typescript
// tools/block-forge/src/__tests__/StatusBar.test.tsx (if exists; else add to integration.test.tsx):
it('Save button enabled when session has ONLY tweak (no accepted suggestions) [Phase 4 StatusBar carve-out pin]')
it('Save button enabled when session has ONLY variant (no tweaks, no suggestions) [Phase 4 StatusBar carve-out pin]')
```

### Domain Rules

- Ruling KK — regression pins are mandatory; Phase 4 carve-outs are load-bearing fixes that were silent-broken since Phase 2/3 — only pins prevent re-regression.

---

## Task 5.4: CONVENTIONS.md + both PARITY.md cross-tab note

Add the Task 5.1 table content to both PARITY.md files (identical section). Add brief cross-tab concurrency note to `docs/CONVENTIONS.md` if that file exists per `.context/CONVENTIONS.md` structure (verify in pre-flight):

```markdown
### Dirty-state coupling across block-editor surfaces (WP-028)

Studio block-editor integrates 3 editing surfaces (Editor tab textarea, Responsive tab suggestion list, Responsive tab tweak/variant drawer). All write to the same RHF `form` instance → last-write-wins.
Full enumeration: see `apps/studio/src/pages/block-editor/responsive/PARITY.md` §Dirty-state contract.

block-forge has analogous multi-source state in `session.ts` reducer — see `tools/block-forge/PARITY.md` §Dirty-state contract for mirror.
```

Phase 6 Close consolidates this if redundancy appears.

---

## Task 5.5: Update `parked-oqs.md` — flip OQ2 to RESOLVED

```markdown
| OQ2 | P4 | ✅ RESOLVED — `{Phase 5 commit SHA}` | Phase 5 Ruling HH | `updateBlockSchema.nullable()` + Studio payload null + Hono forward + tools/block-forge fs parity + 5 integration tests |
```

Update amendment history table:
```markdown
| 2026-04-XX | P5 landing | OQ2 flipped to ✅ RESOLVED — commit SHA {...}; validator nullable + clear-signal end-to-end + regression pins |
```

Phase 5 **does NOT** touch OQ1, OQ3, OQ4 rows — they stay PARKED/OUT-OF-SCOPE/DEFERRED per their status columns. Phase 6 Close revisits them.

---

## Files to Modify

**Code:**
- `packages/validators/src/block.ts` — `variants: variantsSchema.nullable().optional()` (L56 + L71)
- `apps/studio/src/pages/block-editor.tsx` — L179 `undefined` → `null` (net +2 LOC)
- `tools/block-forge/src/App.tsx` — payload parity `undefined` → `null`
- `tools/block-forge/src/types.ts` — `variants?: BlockVariants | null`

**Tests:**
- `apps/studio/src/pages/block-editor/responsive/__tests__/integration.test.tsx` — +1 OQ2 pin
- `tools/block-forge/src/__tests__/integration.test.tsx` — +4 pins (OQ2 + 3 carve-out regression)
- `packages/validators/src/__tests__/block.test.ts` IF exists — +2 validator pins (null accepted)

**Docs:**
- `tools/block-forge/PARITY.md` — §Dirty-state contract additive
- `apps/studio/src/pages/block-editor/responsive/PARITY.md` — §Dirty-state contract additive (byte-identical body mod headings)
- `docs/CONVENTIONS.md` OR `.context/CONVENTIONS.md` (pre-flight decides) — cross-tab note with PARITY link
- `logs/wp-028/parked-oqs.md` — OQ2 row + amendment history

**Zero touch (VERIFY):**
- `packages/block-forge-core/**` — engine frozen
- `src/__arch__/domain-manifest.ts` — no new files (tests inline in existing files)
- `.claude/skills/domains/**/SKILL.md` — Close-phase territory
- `workplan/WP-028-*.md` body — Close-phase territory
- `packages/ui/**` — no UI changes
- `apps/api/src/routes/blocks.ts` — ONLY IF pre-flight step 4 Case B; else zero-touch
- `tools/block-forge/src/components/**` — Phase 4 scope; dirty-state is upstream concern
- `apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx` — Phase 4 scope; dispatchVariantToForm unchanged
- `apps/studio/src/pages/block-editor/responsive/VariantsDrawer.tsx` + block-forge mirror — Phase 4 scope
- `apps/portal/**` — OQ2 fix flows via validator + Supabase; Portal reads DB as-is

**Strictly off-limits per parked-oqs.md:**
- OQ1 resolution attempts (prod Worker redeploy is ops task)
- OQ3 investigation (.env resolution) — Phase 6 Close territory
- OQ4 implementation (Studio CSS validator warning) — WP-029 territory

---

## Acceptance Criteria

- [ ] Dirty-state contract table lands in both PARITY.md files (byte-identical section mod headings); §5 same-commit discipline held
- [ ] `updateBlockSchema.variants` + `createBlockSchema.variants` accept `null` per validator test pins
- [ ] Studio `formDataToPayload` emits `variants: null` when empty (not undefined)
- [ ] `updateBlockApi` PUT payload serialization preserves null (JSON.stringify round-trip)
- [ ] Hono handler forwards null to Supabase update — confirmed either zero-change (Case A) or 1-line change (Case B)
- [ ] tools/block-forge fs save emits `variants: null` for parity; `JSON.stringify` preserves key
- [ ] `BlockJson.variants?: BlockVariants | null` type widening in tools/block-forge types.ts
- [ ] **OQ2 end-to-end smoke**: delete all variants → Save → `SELECT variants FROM blocks WHERE id = ?` returns NULL (not prior value)
- [ ] **Carve-out regression pins** — tweak-only + variant-only + mixed save integration tests green; fail on intentional revert of Phase 4 carve-out fixes
- [ ] `parked-oqs.md` OQ2 row updated to ✅ RESOLVED with Phase 5 commit SHA; amendment history appended
- [ ] `npm run arch-test` = 499 / 0 (Δ0 preserved)
- [ ] `npx tsc --noEmit` clean both surfaces
- [ ] Studio tests: baseline 102 → ~104 (+2: 1 OQ2 pin + possibly 1 doc reference)
- [ ] block-forge tests: baseline 128 → ~132 (+4: 1 OQ2 pin + 3 carve-out regression)
- [ ] Validator tests: +0 or +2 depending on pre-flight finding on test dir existence
- [ ] block-editor.tsx LOC deviation 31 → 33 (within 40 cap; Ruling HH budgeted)
- [ ] PARITY.md §Dirty-state contract identical content both files (verified via `diff`)

---

## MANDATORY: Verification

```bash
echo "=== Phase 5 Verification ==="

# 1. Baseline
npm run arch-test
echo "(expect: 499 / 0 — Δ0)"

# 2. Typecheck
npx tsc --noEmit
cd tools/block-forge && npm run typecheck && cd ../..
echo "(expect: clean)"

# 3. Studio tests
npm -w @cmsmasters/studio test 2>&1 | tail -5
echo "(expect: ≥ 104 passing)"

# 4. block-forge tests
cd tools/block-forge && npm test 2>&1 | tail -5 && cd ../..
echo "(expect: ≥ 132 passing)"

# 5. Validator accepts null (NOTE: @cmsmasters/validators has no build step — main points to src/index.ts.
# Use tsx inline instead of node require. C1 concern from Hands pre-flight audit.)
npx tsx -e "
import { updateBlockSchema } from './packages/validators/src/block';
const r1 = updateBlockSchema.safeParse({ variants: null });
const r2 = updateBlockSchema.safeParse({ variants: { sm: { html:'<p/>', css:'' } } });
const r3 = updateBlockSchema.safeParse({});  // variants missing (still optional)
console.log('null:', r1.success, 'obj:', r2.success, 'missing:', r3.success);
"
echo "(expect: true true true — all three shapes accepted)"

# 6. OQ2 end-to-end smoke (manual or Playwright):
#   a) Studio: open block with variants → delete all → Save
#   b) Network trace: PUT body.variants === null
#   c) SELECT variants FROM blocks WHERE id = {id} → NULL
#   d) Portal verification: revalidate → GET block → variants null → Portal renders base

# 7. Regression pins fire on carve-out revert
# Temporarily revert Phase 4 StatusBar.hasChanges back to `pendingCount > 0`:
#   git stash  # save Phase 5 work
#   git show 8d73b334 -- tools/block-forge/src/components/StatusBar.tsx | git apply  # manual
# Run block-forge tests:
#   cd tools/block-forge && npm test
# Expect: tweak-only / variant-only / mixed save tests fail (pins fire)
# Restore: git stash pop

# 8. PARITY.md byte-identical §Dirty-state contract section
diff <(sed -n '/## Dirty-state contract/,/^## /p' tools/block-forge/PARITY.md) \
     <(sed -n '/## Dirty-state contract/,/^## /p' apps/studio/src/pages/block-editor/responsive/PARITY.md)
echo "(expect: empty — byte-identical section content)"

# 9. parked-oqs.md OQ2 status flipped
grep -A 2 "OQ2" logs/wp-028/parked-oqs.md | head -4
echo "(expect: ✅ RESOLVED + Phase 5 commit SHA)"

# 10. Manifest + Phase 3.5 / Phase 4 territory zero-touch
git diff --stat \
  src/__arch__/domain-manifest.ts \
  tools/block-forge/src/lib/preview-assets.ts \
  tools/block-forge/src/components/PreviewTriptych.tsx \
  tools/block-forge/src/components/VariantsDrawer.tsx \
  apps/studio/src/pages/block-editor/responsive/VariantsDrawer.tsx \
  apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx
echo "(expect: empty — these files are Phase 3/3.5/4 scope)"

# 11. parked-oqs.md OQ1 / OQ3 / OQ4 rows UNCHANGED (Phase 5 only touches OQ2)
grep -E "OQ1|OQ3|OQ4" logs/wp-028/parked-oqs.md | head -10
echo "(expect: status columns unchanged — OQ1 OUT-OF-SCOPE, OQ3 PARKED, OQ4 DEFERRED)"

echo "=== Phase 5 verification complete ==="
```

---

## MANDATORY: Write Execution Log

Create `logs/wp-028/phase-5-result.md` with:
- Pre-flight 10-step audit findings
- Brain Rulings Applied (HH, JJ, KK, LL)
- Files Modified table
- Test Counts (Studio 102→~104; block-forge 128→~132)
- OQ2 end-to-end smoke evidence — DB SELECT returning NULL after clear-save
- Regression pin evidence — test names + Phase 4 commit revert proof-of-failure
- PARITY.md Dirty-state contract §diff showing byte-identical section
- parked-oqs.md amendment (OQ2 status flip + amendment history entry)
- Phase 6 Close handoff: OQ1 / OQ3 / OQ4 stay open per registry; Phase 6 verification checklist unchanged

---

## Git

```bash
git add \
  packages/validators/src/block.ts \
  packages/validators/src/__tests__/block.test.ts \
  apps/studio/src/pages/block-editor.tsx \
  apps/studio/src/pages/block-editor/responsive/__tests__/integration.test.tsx \
  apps/studio/src/pages/block-editor/responsive/PARITY.md \
  tools/block-forge/src/App.tsx \
  tools/block-forge/src/types.ts \
  tools/block-forge/src/__tests__/integration.test.tsx \
  tools/block-forge/PARITY.md \
  docs/CONVENTIONS.md \
  logs/wp-028/parked-oqs.md

git commit -m "feat(validators+studio+tools): WP-028 Phase 5 — OQ2 clear-signal + carve-out pins + dirty-state doc [WP-028 phase 5]"
```

---

## IMPORTANT Notes for CC

- **parked-oqs.md is the OQ source of truth** — read at pre-flight step 10; update OQ2 row at Phase 5 landing; leave OQ1/OQ3/OQ4 untouched.
- **OQ1 / OQ3 / OQ4 are EXPLICITLY OUT-OF-SCOPE** — per registry. Do not start them; do not touch them; do not investigate them. Phase 6 Close verifies they're still properly tracked.
- **RHF `setValue('variants', null, ...)` may need Controller wiring** — pre-flight test, not assumption. If RHF rejects null, fall back to `{}` sentinel + payload transform at serialization time.
- **Case A vs Case B Hono handler** — pre-flight step 4 decides; document finding in result log. Do NOT touch Hono if Case A (spread pattern).
- **Null vs undefined: disk parity matters** — block-forge fs must emit null for `JSON.stringify` key preservation.
- **Carve-out regression pins** are Ruling KK mandatory — these bugs shipped silently since Phase 2/3; without pins they re-regress.
- **No Phase 6 work** in Phase 5 — SKILL updates, workplan body edits, final `.context/BRIEF.md` updates all stay for Phase 6 Close.

---
---

# BRAIN → OPERATOR HANDOFF SUMMARY

Phase 5 промпт готовий: `logs/wp-028/phase-5-task.md`. OQ tracking registry у `logs/wp-028/parked-oqs.md` (commit `148976a2`).

## Структура

**5 tasks, ~2.5h budget (realistic ~3h з 1.3× multiplier; workplan est 1-2h + carve-out/OQ2 expansion):**

| # | Task | Scope |
|---|------|-------|
| 5.1 | Dirty-state contract table | Authoritative enumeration both PARITY.md files; same-commit discipline |
| 5.2 | OQ2 fix end-to-end | Validator nullable + Studio payload null + Hono forward + tools/block-forge fs parity + tests |
| 5.3 | Carve-out regression pins | 3 block-forge integration tests (tweak-only / variant-only / mixed saves) + StatusBar hasChanges |
| 5.4 | CONVENTIONS.md cross-tab note | Brief link to PARITY.md §Dirty-state contract |
| 5.5 | parked-oqs.md OQ2 status flip | ✅ RESOLVED + commit SHA + amendment history |

## 4 Brain rulings locked

1. **HH — OQ2 fix via `.nullable().optional()`** — validator + payload + handler + fs parity in one atomic commit
2. **JJ — Documented not refactored** — dirty-signal logic stays; Phase 5 produces contract table + fixes specific bugs only
3. **KK — Regression pins mandatory** — Phase 4 carve-outs were silent-broken since shipped; pins prevent re-regression
4. **LL — Block-forge fs parity uses null** — JSON.stringify preserves the key; disk/DB round-trip symmetric with Studio API

## Hard gates

- Zero touch: engine, manifest, SKILL files, workplan body, pkg-ui, portal, Phase 3/3.5/4 territory files
- **OQ1 / OQ3 / OQ4 strictly OUT-OF-SCOPE** per parked-oqs.md; Phase 6 Close revisits
- block-editor.tsx deviation 31 → 33 (within 40 cap; Ruling HH budgeted)
- No new files; tests inline in existing files (arch-test Δ0)
- PARITY.md §Dirty-state contract same commit as code (§5 discipline)

## Escalation triggers

- **RHF rejects `setValue('variants', null, ...)`** — pre-flight test; fallback to `{}` sentinel + payload transform
- **Hono Case B (cherry-pick)** — document finding; +1 line change; still within scope
- **validator tests dir absent** — skip validator pins; log in result log as Phase 6 cleanup candidate
- **Phase 4 carve-out tests don't fail on revert-proof** — pins not actually pinning; surface to Brain
- **OQ1/3/4 accidentally touched** — STOP; they're OUT-OF-SCOPE per registry

## Arch-test target

**499 / 0** — unchanged. No new files; helpers + tests inline.

## OQ status after Phase 5 landing

| OQ | Pre-P5 | Post-P5 |
|----|--------|---------|
| OQ1 | 📦 OUT-OF-SCOPE | 📦 OUT-OF-SCOPE (unchanged — ops) |
| OQ2 | 🔨 Phase 5 | ✅ RESOLVED |
| OQ3 | ⏳ PARKED (P6 Close) | ⏳ PARKED (P6 Close — unchanged) |
| OQ4 | 🚫 DEFERRED (WP-029) | 🚫 DEFERRED (WP-029 — unchanged) |

**Phase 6 Close still audits all 4 boxes** — OQ1 conversion to ops ticket, OQ2 final sign-off, OQ3 docs/fix, OQ4 WP-029 logging.

## Git state

- `148976a2` — parked-oqs.md registry committed
- `logs/wp-028/phase-5-task.md` — new untracked (this file)
- Workplan body unchanged (Close-phase territory)
- Nothing else staged

## Next

1. Review → commit task prompt → handoff Hands
2. АБО правки (найімовірніший fork — Ruling HH scope якщо хочеш split OQ2 у окремий mini-phase; або carve-out regression pins scope)
3. Brain паркується до наступного сигналу

Чекаю.
