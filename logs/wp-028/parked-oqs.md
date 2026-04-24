# WP-028 Parked Open Questions — Tracking Registry

> **Purpose:** Single source of truth for Open Questions surfaced during WP-028 phases
> that are NOT resolved in their originating phase. Survives context compaction.
> Updated by each phase's result log + Phase 6 Close audits this file before marking WP done.

## Status key

- ⏳ **PARKED** — no action yet; awaiting trigger
- 🔨 **IN-PROGRESS** — currently being worked on (specify phase)
- ✅ **RESOLVED** — shipped; commit SHA embedded
- 🚫 **DEFERRED** — moved to future WP explicitly (e.g. WP-029, WP-030)
- 📦 **OUT-OF-SCOPE** — operational task; separate ticket required

---

## Current state (as of Phase 4 close, 2026-04-24)

| ID | Surfaced | Status | Owner | Resolution path |
|----|----------|--------|-------|-----------------|
| OQ1 | P4 | 📦 OUT-OF-SCOPE | Ops (separate ticket) | Production Hono Worker redeploy to Cloudflare; WP-028 code scope complete |
| OQ2 | P4 | 🔨 Phase 5 | Brain Ruling HH | `updateBlockSchema.nullable()` + Studio payload `null` on empty + Hono handler forward |
| OQ3 | P4 | ⏳ PARKED | Phase 6 Close | Document in `docs/CONVENTIONS.md` OR investigate Vite env loading edge case |
| OQ4 | P4 | 🚫 DEFERRED → WP-029 | WP-029 heuristic polish | Studio-side variant CSS scoping validator; UX improvement not MVP |

---

## Full OQ texts + context

### OQ1 — Production Hono deployment lag

**Source:** `logs/wp-028/phase-4-result.md` §Open questions for Phase 5 #1

**Description:**
Current production Hono Worker (deployed to Cloudflare pre-Phase-4) does NOT persist `variants` on PUT because the Worker bundle was built before WP-028 validator changes landed. Studio dev session accidentally hit prod API instead of local (env-resolution quirk per OQ3), so the PUT silently succeeded but DB `variants` stayed null. Verification of first real DB write was completed via direct-local-PUT against the same Supabase (local Worker with latest validator code).

**Why OUT-OF-SCOPE for WP-028:**
- Deployment action, not code change
- Local Worker + validator code is correct; only the production bundle lags
- Redeployment is a routine ops task (`wrangler deploy` or equivalent)
- Does not block Phase 5/6 code work
- Variants actively write correctly once Worker updated — no code path needs hardening

**Resolution path:**
Separate ops ticket to redeploy Cloudflare Worker with current Hono bundle. Coordinate with Phase 6 Close OR before next user-facing release.

**Exit criteria:**
- Production Hono endpoint accepts + persists variants on PUT
- Phase 4 direct-local-PUT smoke rerun against PROD endpoint — variants persist

**Blocking:** None for WP-028 phases; blocks **real user variant save via production Studio** (authors using deployed Studio against deployed Hono get silent null writes).

---

### OQ2 — `updateBlockSchema.nullable()` for variants clear-signal

**Source:** `logs/wp-028/phase-4-result.md` §Open questions for Phase 5 #2

**Description:**
`updateBlockSchema` accepts `variants: variantsSchema.optional()` but not `.nullable()`. Studio's `formDataToPayload` emits `variants: undefined` when `Object.keys(data.variants).length === 0` (per block-editor.tsx L167-179). When author deletes all variants via drawer:
1. `form.variants = {}` (empty record)
2. Payload `variants: undefined` (hasVariants check false)
3. Hono handler sees missing `variants` field → Supabase update skips it → **DB keeps old variants**
4. Author sees "0 variants" in UI; Portal still renders old variants from DB

**Silent data inconsistency** — UI diverges from DB + Portal on variant-delete-all flow.

**Status:** 🔨 IN-PROGRESS as **Phase 5 Ruling HH** — fix path end-to-end:
1. `packages/validators/src/block.ts` — change `variants: variantsSchema.optional()` → `variants: variantsSchema.nullable().optional()` (so `null` is valid)
2. `apps/studio/src/pages/block-editor.tsx` — `formDataToPayload` emits `variants: null` (not `undefined`) when empty
3. `apps/api/src/routes/blocks.ts` — Hono forwards `null` to Supabase update (already handled if schema accepts)
4. `tools/block-forge/src/App.tsx` — parallel fix for fs round-trip (save clears disk field)
5. Integration test pinning clear-variants flow both surfaces

**Resolution path:** Phase 5 Task 5.2 implements; commit SHA embedded here on landing.

**Exit criteria:**
- Delete all variants → Save → Supabase row `variants IS NULL` (not just equal to old payload)
- Test pins the flow in both surfaces
- Portal render verifies no variants after clear-save

---

### OQ3 — Studio `VITE_API_URL` .env vs .env.local resolution

**Source:** `logs/wp-028/phase-4-result.md` §Open questions for Phase 5 #3

**Description:**
During Phase 4 Playwright smoke, Studio dev session hit production API (`cmsmasters-api.office-4fa.workers.dev`) instead of local (`http://localhost:8787`), even though `.env.local` contained `VITE_API_URL=http://localhost:8787`. Vite env-loading precedence expected `.env.local` to override `.env`, but actual behavior chose `.env`. Unclear if this was a caching artifact, a missing Vite restart, or a real edge case.

**Status:** ⏳ PARKED for Phase 6 Close

**Why PARKED (not Phase 5):**
- Ops/dev-environment issue, not dirty-state scope
- Unblocked in Phase 4 by direct-local-PUT workaround
- Does not affect code semantics or user-facing behavior
- Investigation time ~30 min — easier to batch with Phase 6 docs pass

**Resolution path:**
Phase 6 Close:
1. Reproduce locally (fresh Vite restart + env inspect)
2. Document finding in `docs/CONVENTIONS.md` (e.g. "restart Vite after .env.local edits" OR fix if real bug)
3. If code-level bug → small follow-up fix; else doc-only

**Exit criteria:**
- Clear documented guidance in CONVENTIONS.md OR a docs/ADR entry
- Phase 6 result log confirms investigation outcome

---

### OQ4 — Studio-side variant CSS scoping validator warning

**Source:** `logs/wp-028/phase-4-result.md` §Open questions for Phase 5 #4

**Description:**
Portal's `renderBlock` (apps/portal/lib/hooks.ts L222-224) inlines variant CSS verbatim without auto-scoping to `[data-variant="NAME"]` — per ADR-025 convention, authors write reveal rules themselves. Phase 4 smoke caught this the hard way: first test variant CSS (`.block-fast-loading-speed { background: red }` un-scoped, no reveal rule) leaked to base variant. Real-world authors will make the same mistake.

**Proposal:** Studio-side validator warns at edit time when variant CSS lacks either:
- `[data-variant="NAME"]` prefix scoping, OR
- `@container slot (max-width: Npx) { ... }` reveal rule

**Status:** 🚫 DEFERRED → WP-029

**Why DEFERRED (not Phase 5):**
- UX improvement, not MVP functional bug
- Requires CSS parser + heuristic rule — non-trivial scope (~3-5h own)
- Natural fit for WP-029 heuristic polish (which is already planned per WP-028 workplan §Dependencies as follow-up WP informed by real tweak/variant authoring usage)
- No data-loss risk — only UX frustration

**Resolution path:**
Logged in WP-029 scope document. WP-029 task-prompt writing (future) references this OQ.

**Exit criteria:**
- WP-029 workplan includes a task titled "Variant CSS scoping validator warning"
- WP-029 Phase 0 RECON cites this OQ as source

---

## Phase 6 Close verification checklist

Before WP-028 can be marked ✅ DONE in Phase 6:

- [ ] **OQ1** — Resolved (Worker redeployed + live PROD PUT persists variants) OR converted to explicit separate ticket with link (e.g. `OPS-XXX`)
- [ ] **OQ2** — Resolved with Phase 5 commit SHA embedded above AND Phase 5 result log cross-references this file
- [ ] **OQ3** — Resolved (docs update committed) OR small follow-up fix shipped with SHA embedded above
- [ ] **OQ4** — WP-029 workplan file exists with task named "Variant CSS scoping validator warning" referencing this entry

Failure mode: any unchecked box at Phase 6 = WP-028 CANNOT mark DONE until resolved or explicitly re-deferred in this file with new target (e.g. "OQ3 moved to WP-030" with rationale).

---

## Amendment history

| Date | Phase | Change |
|------|-------|--------|
| 2026-04-24 | P4 close | Initial registry created — OQ1–OQ4 enumerated with status + resolution paths |
| _(next)_ | P5 landing | OQ2 status flip to ✅ RESOLVED with Phase 5 commit SHA |
| _(future)_ | P6 Close | Final audit of all 4 OQs; WP-028 can mark DONE only with all boxes ticked |
