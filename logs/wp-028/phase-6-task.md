# WP-028 Phase 6: Close — OQ5/OQ3 resolution + doc propagation + mark DONE

> Workplan: WP-028 Tweaks + Variants UI — cross-surface lockstep
> Phase: 6 of 7 — **Close** (final phase before WP-028 mark DONE)
> Priority: P0 — OQ5 data-loss bug; Phase 6 gate for WP-028 completion
> Estimated: 3.5h (OQ5 fix 30min + OQ3 investigation+docs 45min + OQ1 ticket 15min + OQ6/OQ4→WP-029 stub 30min + doc propagation 60min + approval gate + final green 30min + result log 30min)
> Type: Close / bugfix / docs
> Previous: Phase 5 ✅ (OQ2 RESOLVED at `9042490a` + `48da60c4` smoke addendum)
> Next: WP-028 ✅ DONE (WP-029 starts separately informed by OQ4 + OQ6)
> Affected domains: infra-tooling (OQ5 fix + SKILL update), studio-blocks (SKILL update + dispatch-layer parked note), pkg-block-forge-core (consume-only), docs

---

## Inputs

- **`logs/wp-028/parked-oqs.md`** — authoritative OQ registry. Phase 6 Close audits all 6 rows; ALL boxes MUST tick or be explicitly re-deferred before WP-028 marks DONE.
- `logs/wp-028/phase-5-result.md` — baseline; 3 commits chain (`9042490a` + `9eac5df8` + `48da60c4`).
- Workplan WP-028 §Phase 6 — doc propagation under approval gate pattern (6+ doc files — gate fires at ≥3 per memory `feedback_close_phase_approval_gate.md`).
- `.claude/skills/domains/infra-tooling/SKILL.md` + `.claude/skills/domains/studio-blocks/SKILL.md` — need WP-028 section additions.

---

## Context

Phase 5 closed with OQ2 resolved + 6 integration pins + dirty-state contract documented. Phase 5 result log surfaced two new OQs:
- **OQ5** (data-loss bug) — `composeTweakedCss` runs at render-time only; `handleSave` uses `block.css` bypassing tweaks; tweak-only save drops tweaks on block-forge.
- **OQ6** (test coverage gap) — Phase 5 regression pins exercise `assembleSavePayload` test helper, not production `<App />` render path.

```
ENTERING Phase 6 (Phase 5 close baseline):
  WP-028 test counts: Studio 104 / block-forge 132 / arch-test 499-0       ✅
  Git chain last 3: 9042490a (feat) → 9eac5df8 (log+OQ2 flip) → 48da60c4 (smoke addendum)
  parked-oqs.md: OQ2 ✅ | OQ1 📦 | OQ3 ⏳ | OQ4 🚫 | OQ5 ⏳ | OQ6 ⏳
  Studio tweak save path: symmetric ✅ (emitTweak lands in form.code via dispatchTweakToForm)
  block-forge tweak save path: asymmetric ❌ (composeTweakedCss render-only, handleSave uses block.css)
  Phase 5 carve-out pins exist but test harness, not <App /> render

EXITING Phase 6 (WP-028 ✅ DONE):
  OQ5 resolved — block-forge handleSave composes tweaks into persisted CSS                ✅
  OQ3 resolved — .env resolution documented in .context/CONVENTIONS.md (or real fix)       ✅
  OQ1 converted to explicit ops ticket link OR resolved via redeploy                       ✅
  OQ4 + OQ6 scope-docs embedded in WP-029 workplan stub                                    ✅
  Doc propagation: BRIEF.md + CONVENTIONS.md + SKILL × 2 + PARITY × 2 + BLOCK-ARCH + workplan  ✅
  workplan/WP-028-*.md status flipped to ✅ DONE with Completed date                       ✅
  parked-oqs.md all 6 OQ boxes ticked                                                      ✅
  Brain approval gate pattern 5/5 (per feedback_close_phase_approval_gate.md memory)       ✅
  All final green gates — arch-test / typecheck / tests / lint-ds                          ✅
```

---

## Domain Context

**infra-tooling (`tools/block-forge/`):**
- OQ5 fix site: `tools/block-forge/src/App.tsx` `handleSave` L256-311 — 3-line change composing tweaks into applied CSS before save payload assembly
- Known trap: `composeTweakedCss` is idempotent (PostCSS) — safe to call even if session.tweaks is empty; pick "if present" pattern for readability
- Public API: no surface change; existing `saveBlock` contract preserved
- Blast radius: tweak-only save path, integration test pin, SKILL update

**studio-blocks (`apps/studio/src/pages/block-editor/**`):**
- OQ5 Studio audit: **SYMMETRIC/correct** — `dispatchTweakToForm` calls `emitTweak` and writes result to `form.code` via `setValue('code', ..., { shouldDirty: true })`. Save serializes form.code verbatim. No Studio fix needed.
- Document this asymmetry in OQ5 description as Phase 6 finding.
- block-editor.tsx deviation 33/40 (Phase 5 exit) — Phase 6 budget +0 (Studio OQ5 zero-touch)

**docs + SKILL:**
- `.context/BRIEF.md` — mark WP-028 complete; ADR-025 Layer 2+4 authoring shipped
- `.context/CONVENTIONS.md` — OQ3 finding entry; extract-vs-reimplement rule from WP-028 Phase 0 empirical metric; byte-identical cross-surface body discipline validated
- `.claude/skills/domains/infra-tooling/SKILL.md` — tweaks + variants + editor + save-path invariants; OQ5-fixed contract
- `.claude/skills/domains/studio-blocks/SKILL.md` — RHF form fields (code + variants) + dispatch helpers + OQ4 carry-forward hint
- `tools/block-forge/PARITY.md` + Studio mirror — final cross-reference audit; all phases traceable
- `workplan/BLOCK-ARCHITECTURE-V2.md` — WP-028 completion status
- `workplan/WP-028-tweaks-variants-ui.md` — **Status: ✅ DONE** + **Completed: 2026-04-24**

---

## PHASE 0: Audit (do FIRST — small)

```bash
# 0. Baseline
npm run arch-test
# (expect: 499 / 0 — Phase 5 exit)

# 1. OQ5 exact fix site
grep -n "handleSave\|composeTweakedCss\|applied.css" tools/block-forge/src/App.tsx | head -10
# (expect: handleSave at L256; composeTweakedCss used at L149 render memo; applied.css at L273+277)

# 2. OQ5 Studio audit — confirm asymmetry (no fix needed Studio)
grep -n "setValue.*code\|emitTweak\|nextCss" apps/studio/src/pages/block-editor/responsive/ResponsiveTab.tsx
# (expect: dispatchTweakToForm calls emitTweak + setValue('code', nextCss, { shouldDirty })
#  → tweaks land in form.code immediately; Save serializes verbatim → symmetric/correct)

# 3. OQ3 reproduction attempt (best-effort)
cat apps/studio/.env 2>&1 | grep VITE_API_URL
cat apps/studio/.env.local 2>&1 | grep VITE_API_URL
# (expect: .env has prod URL; .env.local overrides to http://localhost:8787 per Phase 4 smoke)

# 4. OQ3 Vite env-loading docs lookup
grep -rn "envDir\|envPrefix\|loadEnv" apps/studio/vite.config.ts 2>&1 | head -5
# (expect: default Vite env loading; no custom envDir; standard .env.local > .env precedence should apply)

# 5. Doc file pre-flight — confirm approval-gate paths exist
ls .context/BRIEF.md .context/CONVENTIONS.md 2>&1
ls .claude/skills/domains/infra-tooling/SKILL.md .claude/skills/domains/studio-blocks/SKILL.md 2>&1
ls tools/block-forge/PARITY.md apps/studio/src/pages/block-editor/responsive/PARITY.md 2>&1
ls workplan/BLOCK-ARCHITECTURE-V2.md workplan/WP-028-tweaks-variants-ui.md 2>&1
# (expect: all 8 files exist; approval gate fires at ≥3 files — 8+ here is 5/5 pattern)

# 6. WP-029 workplan file — may or may not exist; if absent Phase 6 creates stub
ls workplan/WP-029*.md 2>&1

# 7. OQ6 coverage baseline — Phase 5 pin shape
grep -n "assembleSavePayload\|describe.*carve-out" tools/block-forge/src/__tests__/integration.test.tsx | head -5

# 8. Phase 6 approval gate memory confirm
grep -A 2 "close_phase_approval_gate" ~/.claude/projects/*/memory/MEMORY.md 2>&1 | head -5
# (expect: rule about ≥3 doc files triggering explicit Brain approval)

# 9. block-forge composeTweakedCss import path (already imported per L21)
grep -n "composeTweakedCss" tools/block-forge/src/App.tsx
# (expect: L21 import + L149 usage in composedBlock memo)

# 10. Final count — cross-check all parked-oqs.md state before flipping
cat logs/wp-028/parked-oqs.md | grep -E "^\| OQ[0-9]" | head -10
```

**Document findings especially:**
- (a) OQ5 exact lines for 3-line change
- (b) Studio OQ5 asymmetry confirmation (no Studio code change)
- (c) OQ3 reproduction outcome — caching artifact vs real bug vs Vite config edge case
- (d) WP-029 workplan file existence/absence (decides stub creation scope)
- (e) Approval-gate memory confirmed loaded

---

## Task 6.1: OQ5 fix — block-forge handleSave tweak compose

### What to Build

Extend `tools/block-forge/src/App.tsx` handleSave (L256-311) to compose tweaks into the CSS before save payload assembly. 3-line net change + comment update.

```typescript
// tools/block-forge/src/App.tsx handleSave (~L271-277):
// BEFORE:
const applied =
  accepted.length > 0
    ? applySuggestions(
        { slug: block.slug, html: block.html, css: block.css },
        accepted,
      )
    : { html: block.html, css: block.css }

// AFTER (Ruling MM — OQ5 fix):
// Compose tweaks first so they persist through save (Phase 2 composeTweakedCss
// runs at render-time only; without this, tweak-only saves drop tweaks).
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
```

**Studio: ZERO-TOUCH confirmed** — `dispatchTweakToForm` already lands `emitTweak` output in `form.code` at dispatch time; save serializes form.code verbatim. Pre-flight step 2 verifies; Ruling NN documents asymmetry in result log.

### Integration test pin (Ruling KK — regression pin mandatory)

Extend `tools/block-forge/src/__tests__/integration.test.tsx` carve-out section:
```typescript
it('tweak-only save persists composed CSS to disk [OQ5 regression pin]', async () => {
  // Setup: block with known css, session with 1 tweak (padding override at bp 480)
  // Build payload via assembleSavePayload (or mock App render)
  // Assert: payload.block.css contains `@container slot (max-width: 480px)` chunk
  //         with the tweak's selector+property+value
})
```

### Domain Rules

- `composeTweakedCss` is idempotent + PostCSS-based — safe + deterministic
- Order of ops: compose tweaks first, then applySuggestions — suggestions may modify same rules, tweaks become baseline
- Keep `.bak` semantics unchanged (backedUp flag flip on first save still correct)

---

## Task 6.2: OQ3 resolution — Vite env resolution

### What to Build

Pre-flight step 3-4 reveals one of three outcomes:

**Path A — reproduction confirms standard Vite behavior:** `.env.local` properly overrides `.env` on fresh `vite dev` restart. Phase 4 symptom was a caching artifact (possibly Playwright-specific or stale browser state).
→ Action: `.context/CONVENTIONS.md` note: "Restart `vite dev` after editing `.env.local`; browsers may cache VITE_* vars in service workers."

**Path B — real bug:** `.env.local` does NOT override `.env` under some config.
→ Action: fix root cause (vite.config.ts envDir or similar); 1-line patch + test note.

**Path C — inconclusive (can't reproduce):** document as known symptom in CONVENTIONS.md with workaround.
→ Action: note in CONVENTIONS.md with Playwright env injection recommendation.

### Update `.context/CONVENTIONS.md`

Add subsection (placement per existing structure — likely under "Env & tooling" OR "Studio conventions"):
```markdown
### Vite env file resolution (WP-028 Phase 6)

Standard Vite precedence: `.env.local` overrides `.env` on `vite dev` startup.

**Known symptom (Phase 4 smoke):** dev session picked up `.env` prod URL instead of `.env.local` localhost. Root cause: {Path A | Path B | Path C finding from pre-flight step 3-4}.

**Workaround:** after any `.env.local` edit, fully restart `vite dev` (Ctrl+C + re-run); browser refresh alone does not reload imported `import.meta.env.VITE_*` values once they're baked into the bundled dev module.

See `logs/wp-028/parked-oqs.md` §OQ3 for Phase 4 symptom context.
```

---

## Task 6.3: OQ1 resolution — ops ticket OR redeploy

### What to Build

Two paths; pick the one feasible this phase:

**Path A — production Worker redeploy (preferred):** run deploy to Cloudflare:
```bash
# From apps/api/:
npm run build
npx wrangler deploy  # or project-specific command
# Verify: Phase 4 direct-local-PUT smoke rerun against PROD endpoint:
curl -X PUT https://cmsmasters-api.office-4fa.workers.dev/api/blocks/{id} \
  -H "Authorization: Bearer ..." \
  -d '{"variants": {"sm": {"html": "<p>test</p>", "css": ""}}}'
# Expected: 200 OK + Supabase row variants.sm populated
```

**Path B — if deploy access unavailable:** create explicit ops ticket link.

### Update `logs/wp-028/parked-oqs.md` OQ1 row

Path A exit:
```markdown
| OQ1 | P4 | ✅ RESOLVED — `{Phase 6 commit SHA}` + wrangler deploy `{cloudflare deployment ID}` | Phase 6 | Production Worker redeployed with latest Hono bundle; PUT persists variants via validator nullable path |
```

Path B exit:
```markdown
| OQ1 | P4 | 📦 CONVERTED — `OPS-{ticket-id}` / `{internal-tracker-link}` | Ops team | Routine redeploy ticket; no code blockage |
```

---

## Task 6.4: OQ4 + OQ6 → WP-029 scope docs

### What to Build

Create (or append to existing) `workplan/WP-029-heuristic-polish.md` with scoped entries for OQ4 (variant CSS scoping validator) + OQ6 (App render-level carve-out pin).

If WP-029 file doesn't exist (pre-flight step 6), create minimal skeleton:

```markdown
# WP-029: Heuristic polish — informed by real tweak/variant authoring

**Status:** PLANNING
**Prerequisites:** WP-028 ✅
**Created:** 2026-04-24
**Source:** WP-028 closed with follow-up enhancements surfaced in parked-oqs.md

## Scope (seeded from WP-028 OQs)

### Task A — Variant CSS scoping validator warning (OQ4 from WP-028)
- Studio-side CSS parser detects when variant CSS lacks `[data-variant="NAME"]` scoping OR `@container` reveal rule
- Warn at edit time (non-blocking); link to ADR-025 convention docs
- ~3-5h own scope

### Task B — App render-level regression pins (OQ6 from WP-028)
- Replace Phase 5 contract-mirror pins with `<App />` render tests in block-forge
- Mock api-client + fs middleware; exercise real handleSave via Save button click
- Tweak-only / variant-only / mixed scenarios
- ~1-2h own scope

### Task C — Heuristic polish (original WP-029 scope — informed by WP-028 usage)
- Based on real tweak/variant patterns observed during WP-028 authoring
- Scope TBD after field data collection

## Source context

- `logs/wp-028/parked-oqs.md` OQ4, OQ6
- `workplan/WP-028-tweaks-variants-ui.md` Dependencies section
```

### Update parked-oqs.md OQ4 + OQ6 rows

```markdown
| OQ4 | P4 | ✅ DEFERRED → `workplan/WP-029-heuristic-polish.md` Task A | WP-029 | Scope doc reference added at Phase 6 Close |
| OQ6 | P5 | ✅ DEFERRED → `workplan/WP-029-heuristic-polish.md` Task B | WP-029 | Scope doc reference added at Phase 6 Close |
```

---

## Task 6.5: Doc propagation — approval gate fires

**Brain approval gate (≥3 doc files → explicit pre-execution approval per memory `feedback_close_phase_approval_gate.md`).** Phase 6 touches 8+ doc files; gate MANDATORY.

### Doc propagation list (all must update; approval pre-execution)

1. **`.context/BRIEF.md`** — add WP-028 completion entry:
   - Tweaks + Variants UI shipped both surfaces (block-forge + Studio Responsive tab)
   - ADR-025 Layer 2 (visual tweaks) + Layer 4 (named variants) authoring complete
   - First real DB variants write shipped; Portal render verified at variant BP
   - Cross-surface parity discipline validated at 10× complexity vs WP-026/027

2. **`.context/CONVENTIONS.md`** — add subsections:
   - Extract-vs-reimplement rule (WP-028 Phase 0 empirical metric — 15 non-cosmetic diffs threshold; WP-028 stayed REIMPLEMENT at ~4 diffs post-close)
   - Byte-identical cross-surface component body discipline (3-line header + surface-specific imports only)
   - Vite env resolution note (OQ3 finding)
   - Cross-tab concurrency — last-write-wins reference to PARITY.md contracts

3. **`.claude/skills/domains/infra-tooling/SKILL.md`** — add Tweaks + Variants section:
   - Session reducer shape (`tweaks: Tweak[]`, `variants: BlockVariants`, full history)
   - `composeTweakedCss` at render time; `handleSave` composes before persist (OQ5 fix)
   - VariantsDrawer integration points + mini-preview iframe reserved slug convention
   - Path B re-converge status (Phase 3.5); single-wrap composeSrcDoc

4. **`.claude/skills/domains/studio-blocks/SKILL.md`** — add Tweaks + Variants section:
   - RHF form fields: `code` (html+css merged) + `variants: BlockVariants | null`
   - `dispatchTweakToForm` (emitTweak + setValue code) + `dispatchVariantToForm` (setValue variants)
   - OQ4 carry-forward hint — variant CSS scoping validator deferred to WP-029
   - block-editor.tsx deviation counter 33/40 (Phase 5 exit); document for future refactor candidate

5. **`tools/block-forge/PARITY.md`** — final audit + cross-reference to Studio PARITY §7 RE-CONVERGED; add OQ5 fix note under §Discipline Confirmation

6. **`apps/studio/src/pages/block-editor/responsive/PARITY.md`** — final audit; confirm §Dirty-state contract table still accurate post-Phase-6; no changes expected

7. **`workplan/BLOCK-ARCHITECTURE-V2.md`** — update:
   - WP-028 status → ✅ DONE
   - ADR-025 Layer 2 + Layer 4 authoring complete
   - Cross-surface parity contract validated at complex UI (tweak panel + variants drawer)

8. **`workplan/WP-028-tweaks-variants-ui.md`** — final update:
   - **Status:** PLANNING → ✅ **DONE**
   - **Completed:** 2026-04-24
   - Estimated effort section: 18-24h target → actual ~{sum phase durations}h (reference phase result logs)
   - Notes: OQ1-6 registry → parked-oqs.md final state

9. **`logs/wp-028/parked-oqs.md`** — final state:
   - All 6 rows ticked per Phase 6 checklist
   - Amendment history entry for Phase 6 Close

### Gate process

- Brain **writes the full doc-update proposal inline** in this prompt section (done)
- Brain **approves explicitly** before Hands executes (wait for `APPROVED` signal)
- Hands executes all 9 doc updates in ONE commit (§5 same-commit discipline for PARITY files extended to approval-gate discipline for all Close docs)

---

## Task 6.6: Final green gates + WP-028 mark DONE

### Gates

```bash
# All must pass before WP-028 flips to ✅ DONE:
npm run arch-test               # 499 / 0 preserved
npx tsc --noEmit                 # clean Studio + root
cd tools/block-forge && npm run typecheck && cd ../..  # clean block-forge
npm -w @cmsmasters/studio test   # ≥ 104 passing
cd tools/block-forge && npm test && cd ../..           # ≥ 133 passing (+1 OQ5 pin)
npm run lint-ds 2>&1 || echo "lint-ds run"             # optional DS lint
# parked-oqs.md all 6 OQ boxes ticked
grep -c "✅\|📦" logs/wp-028/parked-oqs.md | head -1    # expect ≥ 6
```

### WP-028 completion criteria (from workplan §Acceptance Criteria)

Cross-reference with workplan AC list — verify each by Phase result log:
- Phase 0 carry-over (c) divergence audit ✅ (Phase 0 result log)
- TweakPanel + VariantsDrawer + VariantEditor shipped ✅ (Phases 2+3+4)
- Engine consumer boundary respected (zero engine changes) ✅
- `emitTweak` + `composeVariants` + `renderForPreview` consumed correctly ✅
- Save paths shipped for both surfaces ✅ (Phases 2+3+4+5+6)
- Revalidate fires ✅ (WP-027 Phase 4 mechanism unchanged)
- Portal render verified at BPs ✅ (Phase 4 smoke-10, smoke-11)
- Cross-surface parity verified ✅ (body byte-identical + snap byte-identical)
- arch-test green at target 499/0 ✅
- typecheck + tests green both surfaces ✅
- All 7 phase result logs exist ✅ (phase-0 through phase-6; plus 3.5 mini-phase)
- Phase 6 Close under approval gate pattern ✅ (5/5 after this WP)
- Zero engine / zero portal changes ✅

---

## Files to Modify

**Code (OQ5 fix — minimal):**
- `tools/block-forge/src/App.tsx` — handleSave +3 lines (compose tweaks before applySuggestions)
- `tools/block-forge/src/__tests__/integration.test.tsx` — +1 OQ5 regression pin

**Docs (approval gate):**
- `.context/BRIEF.md`
- `.context/CONVENTIONS.md`
- `.claude/skills/domains/infra-tooling/SKILL.md`
- `.claude/skills/domains/studio-blocks/SKILL.md`
- `tools/block-forge/PARITY.md`
- `apps/studio/src/pages/block-editor/responsive/PARITY.md`
- `workplan/BLOCK-ARCHITECTURE-V2.md`
- `workplan/WP-028-tweaks-variants-ui.md` — mark ✅ DONE
- `workplan/WP-029-heuristic-polish.md` — CREATE if absent (OQ4 + OQ6 scope docs)
- `logs/wp-028/parked-oqs.md` — final state all 6 OQs ticked

**Zero touch:**
- `packages/block-forge-core/**` — engine frozen
- `src/__arch__/domain-manifest.ts` — no new files (WP-029 file is workplan, not src)
- Phase 3/3.5/4/5 territory code files — all completed scope
- `apps/studio/src/pages/block-editor/responsive/**` — Studio code zero-touch (OQ5 Studio asymmetric/correct per pre-flight step 2)
- `apps/studio/src/pages/block-editor.tsx` — ZERO LOC Phase 6 (deviation stays 33/40)
- Validator, Hono, portal — all zero-touch (WP-028 is complete; follow-up in WP-029)

---

## Acceptance Criteria

### OQ resolution gates
- [ ] **OQ1** — Resolved via prod Worker redeploy OR converted to explicit ops ticket link in parked-oqs.md
- [x] **OQ2** — Already RESOLVED at Phase 5 commit `9042490a` (registry confirms)
- [ ] **OQ3** — Resolved: .env resolution finding documented in `.context/CONVENTIONS.md` OR real fix shipped
- [ ] **OQ4** — Scope doc entry exists in `workplan/WP-029-*.md` Task A
- [ ] **OQ5** — block-forge handleSave composes tweaks; integration pin green; Studio OQ5 audit documented asymmetric/correct (no Studio code change)
- [ ] **OQ6** — Scope doc entry exists in `workplan/WP-029-*.md` Task B

### Doc propagation (approval gate)
- [ ] `.context/BRIEF.md` — WP-028 completion added
- [ ] `.context/CONVENTIONS.md` — extract-vs-reimplement + cross-surface parity + OQ3 + cross-tab concurrency subsections
- [ ] `.claude/skills/domains/infra-tooling/SKILL.md` — Tweaks + Variants section with post-OQ5 contracts
- [ ] `.claude/skills/domains/studio-blocks/SKILL.md` — Tweaks + Variants section with dispatch helpers + OQ4 carry-forward
- [ ] Both PARITY.md files final audit — structure intact, cross-references up-to-date
- [ ] `workplan/BLOCK-ARCHITECTURE-V2.md` — WP-028 status ✅ DONE
- [ ] `workplan/WP-028-tweaks-variants-ui.md` — Status ✅ DONE + Completed 2026-04-24
- [ ] `workplan/WP-029-heuristic-polish.md` — created/appended with Task A (OQ4) + Task B (OQ6)
- [ ] `logs/wp-028/parked-oqs.md` — all 6 OQ boxes ticked + Phase 6 amendment entry

### Final green
- [ ] arch-test 499 / 0 (Δ0 preserved)
- [ ] typecheck clean both surfaces
- [ ] Studio tests ≥ 104 passing (baseline; Phase 6 Studio zero-touch)
- [ ] block-forge tests ≥ 133 passing (+1 OQ5 pin vs Phase 5 baseline 132)
- [ ] `grep -c "✅\|📦" logs/wp-028/parked-oqs.md` ≥ 6 (all OQ boxes resolved/converted)
- [ ] Brain approval gate explicit signal logged in result log before final commit
- [ ] WP-028 workplan flipped to ✅ DONE

---

## MANDATORY: Verification

```bash
echo "=== Phase 6 Verification ==="

# 1. Baseline
npm run arch-test
echo "(expect: 499 / 0)"

# 2. Typecheck
npx tsc --noEmit
cd tools/block-forge && npm run typecheck && cd ../..
echo "(expect: clean)"

# 3. Tests
npm -w @cmsmasters/studio test 2>&1 | tail -5
cd tools/block-forge && npm test 2>&1 | tail -5 && cd ../..
echo "(expect: Studio ≥ 104, block-forge ≥ 133)"

# 4. OQ5 pin fires — content assertion
grep -A 10 "OQ5 regression pin\|tweak-only save persists composed" tools/block-forge/src/__tests__/integration.test.tsx
echo "(expect: pin test body with @container chunk assertion)"

# 5. OQ5 production path compose call present
grep -A 3 "composedCss" tools/block-forge/src/App.tsx
echo "(expect: composeTweakedCss call in handleSave path)"

# 6. parked-oqs.md final state — all 6 OQs ticked
grep -E "^\| OQ[0-9]" logs/wp-028/parked-oqs.md
echo "(expect: OQ1 ✅|📦, OQ2 ✅, OQ3 ✅|docs, OQ4 ✅ DEFERRED, OQ5 ✅, OQ6 ✅ DEFERRED)"

# 7. WP-028 workplan status flip
grep -E "Status|Completed" workplan/WP-028-tweaks-variants-ui.md | head -4
echo "(expect: Status: ✅ DONE; Completed: 2026-04-24)"

# 8. WP-029 workplan stub with OQ references
grep -E "OQ4|OQ6" workplan/WP-029*.md
echo "(expect: both OQ references present)"

# 9. Approval gate evidence — result log contains explicit approval marker
grep -E "approved|APPROVED|Brain approval" logs/wp-028/phase-6-result.md
echo "(expect: explicit approval signal documented)"

# 10. Studio + block-forge + core typecheck + lint final
# (optional final lint-ds pass)

echo "=== Phase 6 complete — WP-028 ✅ DONE ==="
```

---

## MANDATORY: Result log

`logs/wp-028/phase-6-result.md` — structure:
- Pre-flight findings (10-step audit)
- Brain Rulings Applied (MM, NN, OO, PP, QQ, RR)
- OQ final state table (all 6 rows — status + commit SHA / ops ticket / WP-029 link)
- Files changed table with LOC delta
- Test delta (block-forge +1 OQ5 pin)
- Doc propagation diff summary
- Approval gate transcript — "Brain approved at {timestamp} with: {doc updates per AC list}"
- WP-028 completion summary cross-referenced with workplan AC
- Final Git chain (Phase 6 commits)

---

## Git (approval-gated flow)

### Step 1 — OQ5 fix + OQ3 docs + OQ1 resolution + WP-029 stub (atomic)

Hands executes AFTER Brain approval signal:
```bash
git add \
  tools/block-forge/src/App.tsx \
  tools/block-forge/src/__tests__/integration.test.tsx \
  .context/CONVENTIONS.md \
  workplan/WP-029-heuristic-polish.md \
  logs/wp-028/parked-oqs.md

# (Plus OQ1 path — either wrangler deploy log OR parked-oqs.md row update)

git commit -m "fix(tools)+docs: WP-028 Phase 6 — OQ5 tweak-compose-on-save + OQ1/3/4/6 resolution [WP-028 phase 6]"
```

### Step 2 — Doc propagation (approval gate)

After Step 1 SHA captured:
```bash
git add \
  .context/BRIEF.md \
  .context/CONVENTIONS.md \
  .claude/skills/domains/infra-tooling/SKILL.md \
  .claude/skills/domains/studio-blocks/SKILL.md \
  tools/block-forge/PARITY.md \
  apps/studio/src/pages/block-editor/responsive/PARITY.md \
  workplan/BLOCK-ARCHITECTURE-V2.md \
  workplan/WP-028-tweaks-variants-ui.md

git commit -m "docs: WP-028 Phase 6 Close — doc propagation + workplan DONE [WP-028 phase 6]"
```

### Step 3 — Result log + final OQ registry flip

```bash
git add \
  logs/wp-028/phase-6-result.md \
  logs/wp-028/parked-oqs.md  # OQ flip with final SHAs

git commit -m "docs(logs): WP-028 Phase 6 result log + parked-oqs.md final state [WP-028 phase 6]"
```

---

## IMPORTANT Notes for CC

- **Approval gate is LOAD-BEARING** — memory `feedback_close_phase_approval_gate.md`; do NOT skip. Post doc-update proposal inline; wait for Brain `APPROVED` signal; execute all 9 doc updates in Step 2 commit.
- **OQ5 fix is a real data-loss bug** — similar severity to OQ2. Test pin must assert persisted CSS contains tweak chunks, not just that handleSave is called.
- **Studio OQ5 is SYMMETRIC/correct** — pre-flight step 2 confirms. No Studio code change; document asymmetry in result log + SKILL.
- **OQ1 Path A requires Cloudflare deploy access** — if unavailable, Path B (ops ticket link) is fully acceptable; do NOT block Phase 6 on ops access.
- **OQ3 reproduction attempt is best-effort** — if can't reproduce, Path C (documented known symptom) is fine; don't rabbit-hole Vite internals.
- **WP-029 workplan file may be minimal stub** — OQ4 + OQ6 just need scope references, not full WP plan.
- **parked-oqs.md is authoritative** — every OQ row update goes through this file; amendment history tracks the flip.
- **Final green gates are non-negotiable** — arch-test / typecheck / tests + all 6 OQ boxes ticked before WP-028 DONE flip.

---
---

# BRAIN → OPERATOR HANDOFF SUMMARY

Phase 6 (Close) промпт готовий: `logs/wp-028/phase-6-task.md`. Final phase before WP-028 mark DONE.

## Структура

**6 tasks, ~3.5h budget (1.3× multiplier → realistic ~4.5h; hard cap TBD):**

| # | Task | Scope |
|---|------|-------|
| 6.1 | **OQ5 fix** — block-forge handleSave | 3-line composeTweakedCss call before applySuggestions; integration pin (data-loss regression guard); Studio zero-touch (symmetric) |
| 6.2 | **OQ3 resolution** — Vite .env docs | Pre-flight determines Path A/B/C; CONVENTIONS.md note OR real fix |
| 6.3 | **OQ1 resolution** — ops ticket or redeploy | Either wrangler deploy (Path A) OR explicit ticket link (Path B) |
| 6.4 | **OQ4 + OQ6 → WP-029 stub** | Create `workplan/WP-029-heuristic-polish.md` with Task A (OQ4 variant CSS validator) + Task B (OQ6 App render pin) |
| 6.5 | **Doc propagation (approval gate)** | 8 files: BRIEF + CONVENTIONS + 2 SKILL + 2 PARITY + BLOCK-ARCH + WP-028 workplan ✅ DONE |
| 6.6 | Final green gates + WP-028 mark DONE | arch-test + typecheck + tests + parked-oqs.md all boxes ticked |

## 6 Brain rulings locked

1. **MM — OQ5 absorbed into Phase 6** — data-loss severity parallels OQ2; composeTweakedCss call before applySuggestions; 3-line fix + integration pin; Studio zero-touch (symmetric via dispatchTweakToForm)
2. **NN — OQ3 investigation-first** — pre-flight reproduction determines docs (Path A/C) vs fix (Path B); don't rabbit-hole Vite internals
3. **OO — OQ1 flexibility** — prod redeploy OR ops ticket both acceptable; do NOT block Phase 6 on ops access
4. **PP — OQ4/OQ6 → WP-029** — scope doc references (not full WP plans); WP-029 stub acceptable
5. **QQ — Approval gate mandatory** — memory feedback_close_phase_approval_gate.md; 8+ doc files; explicit Brain `APPROVED` signal before Hands executes doc commit
6. **RR — WP-028 DONE requires all 6 OQ boxes ticked** — no partial close; if any OQ remains unticked, Phase 6 does NOT mark DONE until re-deferred in parked-oqs.md with rationale

## Hard gates

- Zero touch: engine, manifest, Studio code (OQ5 symmetric), validator/Hono/portal (WP-028 scope complete)
- block-editor.tsx +0 LOC (deviation stays 33/40)
- OQ1 / OQ3 resolution paths accept docs-only outcomes (not all OQs need code)
- Approval gate CANNOT be skipped
- No new files in src/ tree (WP-029 workplan is doc, not src)

## Escalation triggers

- **OQ5 Studio symmetric assumption wrong** — if pre-flight step 2 reveals asymmetry, Studio also needs fix; surface before writing
- **OQ3 real Vite bug (Path B)** — scope expansion from docs to code fix; surface
- **OQ1 prod redeploy fails** — Path B fallback acceptable; surface deploy error if blocking
- **Approval gate doesn't respond** — park, do not proceed with doc commit; wait
- **Final green gate fails** — identify failure mode; do NOT mark WP-028 DONE until green
- **parked-oqs.md amendment history conflict** — Phase 5 left history entry; Phase 6 appends, does not overwrite

## Arch-test target

**499 / 0** — unchanged. WP-029 workplan is `.md` doc not src; no owned_files delta.

## OQ status transitions (Phase 6 landing target)

| OQ | Pre-P6 | Post-P6 |
|----|--------|---------|
| OQ1 | 📦 | ✅ RESOLVED or 📦 CONVERTED with ticket link |
| OQ2 | ✅ | ✅ (unchanged — Phase 5) |
| OQ3 | ⏳ | ✅ docs OR real fix |
| OQ4 | 🚫 | ✅ DEFERRED with WP-029 task A reference |
| OQ5 | ⏳ | ✅ RESOLVED with fix + pin commit SHA |
| OQ6 | ⏳ | ✅ DEFERRED with WP-029 task B reference |

## Git state

- `logs/wp-028/phase-6-task.md` — new untracked (this file)
- Phase 5 chain `48da60c4` latest
- Workplan body unchanged until Phase 6 landing (Ruling QQ approval gate)
- Nothing else staged

## Next

1. Review → commit this prompt → handoff Hands
2. АБО правки (найімовірніший fork — Ruling QQ approval gate format; Ruling OO OQ1 deploy vs ticket preference)
3. Brain паркується до Hands pre-flight report + approval request

Чекаю.
