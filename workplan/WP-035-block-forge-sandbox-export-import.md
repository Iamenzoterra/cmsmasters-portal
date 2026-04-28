# WP-035: Block Forge Sandbox + Export/Import — decouple authoring from production SOT

> Replace direct-overwrite of `content/db/blocks/*.json` from Block Forge with a sandbox-then-export model mirroring Layout Maker. Authoring lives in a Forge-local sandbox dir; ExportDialog produces shareable JSON (download / clipboard); Studio gains an Import UI (paste JSON / upload .json) that validates → saves to Supabase → revalidates. Result: experimentation in Forge can never break production blocks; promotion to production is an explicit two-step act, not a save side-effect.

**Status:** ✅ DONE — closed 2026-04-28; sandbox decoupled, manual roundtrip pinned, asymmetric PARITY trio updated, saved memory `feedback_forge_sandbox_isolation` locked
**Priority:** P1 — fixes the architectural smell user surfaced 2026-04-28: authoring tool should not share its working files with the production SOT
**Prerequisites:** WP-033 ✅ (Inspector ships in both surfaces — Forge as sandbox is the natural home for Inspector experimentation)
**Milestone/Wave:** ADR-025 Layer 2 polish — Forge becomes the sandbox we always wanted; Studio becomes the production gate
**Estimated effort:** 3–4 days across 5 phases (~16-22 hours estimated)
**Created:** 2026-04-28
**Reference model:** [`tools/layout-maker/src/components/ExportDialog.tsx`](../tools/layout-maker/src/components/ExportDialog.tsx) — copy / download payload pattern proven on layouts wave; ported here verbatim where applicable.

---

## Outcome Ladder

| Tier | Outcome | Evidence |
|---|---|---|
| Bronze | ExportDialog ships in Forge; arch-test + typecheck + vitest GREEN | Phase 1 commit; arch-test +N owned_files; new ExportDialog test suite |
| Silver | Studio Import UI lands; round-trip Forge export → Studio import → Supabase save → revalidate works end-to-end at live smoke | Phase 2 result.md with screenshot of round-trip + DB query confirming insert |
| Gold | Forge save destination decoupled from `content/db/blocks/`; sandbox dir established at `tools/block-forge/blocks/` (or equivalent); production SOT can never be mutated by Forge | Phase 3 result.md confirming `content/db/blocks/` zero diff during a full Forge edit cycle |
| Platinum | Old direct-edit path removed; CONVENTIONS + PARITY entries codify the new flow; Brain memory captures the architectural reasoning so it doesn't drift back | Phase 5 Close — SKILL flips + saved memory + workflow docs updated |

---

## Commit Ladder

| Phase | Task prompt | Implementation | Result.md |
|---|---|---|---|
| 0 | logs/wp-035/phase-0-task.md | (RECON-only) | `13165160` |
| 1 | logs/wp-035/phase-1-task.md | `0b52f1f5` + `3b8a9721` | `6d5a2337` |
| 2 | logs/wp-035/phase-2-task.md | `5b29f9a7` | (incl. in `5b29f9a7`) |
| 3 | logs/wp-035/phase-3-task.md | `6a08d1f1` | `5967a090` |
| 5 | logs/wp-035/phase-5-task.md | (this commit; SHA backfilled post-commit) | (this commit) |

### Phase 4 — collapsed into Phase 3 (2026-04-28)

Per Phase 0 Ruling F: empirical grep confirmed `BLOCK_FORGE_ALLOW_DIRECT_EDIT` had zero callers across active source / docs. Existing `BLOCK_FORGE_SOURCE_DIR` env override is the escape hatch — no new flag needed. Phase 3 absorbed the work; ladder is 0 → 1 → 2 → 3 → 5.

---

## Problem Statement

### What's broken right now

User feedback (2026-04-28): the current Block Forge architecture conflates "draft / experiment" with "production source of truth":

1. **Same files for both audiences.** `content/db/blocks/*.json` is read by Forge, edited by Forge, AND is the canonical seed for Supabase production data via the `content-push` skill. Any save in Forge mutates production-bound bytes.
2. **No safe-experimentation surface.** User cannot "fork a copy and play" without manually duplicating the .json file in the OS file explorer. There's no Clone button.
3. **Risk of corruption is permanent.** A bad save needs `git checkout content/db/blocks/{slug}.json` to recover. New users won't know that recipe.
4. **Production roundtrip is opaque.** To see edits live on the production portal: edit in Forge → save (overwrites SOT) → run `/content-push` skill → run `/revalidate` skill. Two extra steps that aren't part of the Forge UI.
5. **Layout Maker already solved this** — its layouts live in `tools/layout-maker/layouts/*.yaml` (Forge-local sandbox) and ship to production via an explicit `ExportDialog`-driven workflow. WP-033 user feedback echoes the same expectation: `"простіше експорт з форджа, імпорт в студіо і потім ревалідейт"`.

### What good looks like

```
                ┌───────────────────────────────────────┐
                │           Block Forge                 │
                │   tools/block-forge/blocks/*.json    │  ← SANDBOX
                │   (Forge-local; freely cloneable)    │
                │                                       │
                │   [Save] → writes to sandbox          │
                │   [Clone] → duplicates with new slug  │
                │   [Export] → opens ExportDialog       │
                └────────────────┬──────────────────────┘
                                 │ Download JSON / Copy payload
                                 ▼
                ┌───────────────────────────────────────┐
                │              Studio                   │
                │   apps/studio/.../block-editor       │
                │                                       │
                │   [Import block] → modal              │
                │     ├─ paste JSON                     │
                │     ├─ upload .json file              │
                │     ├─ validate schema                │
                │     ├─ save to Supabase blocks table  │
                │     └─ POST /api/content/revalidate   │
                └───────────────────────────────────────┘
                                 │
                                 ▼
                       Production portal sees edit
```

Forge becomes the experimentation surface (cloning, scaling, Inspector tweaks, fluid-token chip apply — all rich authoring on a low-stakes sandbox). Studio becomes the production gate (paste/upload validated payload, write to DB, revalidate). The two are independent — fixing a bug in Forge cannot regress production; deploying a block to production cannot break Forge's working state.

### What WP-035 delivers

- **ExportDialog in Forge** mirroring Layout Maker's: 2-button layout (Download JSON / Copy payload) over a JSON-pretty preview; close on backdrop click; toast confirmation.
- **Studio Import UI** on the block-editor page: modal with paste-textarea + file-upload, schema validation against the `blocks` table shape, save through existing Supabase pipeline, automatic revalidation.
- **Forge sandbox dir** at `tools/block-forge/blocks/` (path TBD by Phase 0 RECON, may live elsewhere). Vite middleware reads/writes there exclusively; `content/db/blocks/` becomes read-only seed for first-run population.
- **Clone affordance** in Forge — `[+ Clone]` button next to Save creates `<slug>-copy-{n}.json` in sandbox; user iterates safely.
- **Workflow doc updates** — `.context/SKILL.md` (or whichever lives), CONVENTIONS, plus `tools/block-forge/CLAUDE.md` (if exists) capture the new flow so agents and humans don't accidentally regress.

### Why this is the right move now

WP-033 just shipped Inspector to both surfaces — it surfaced the exact pain users feel (`"я зараз правлю файл з ризиком зіпсувати"`). With Inspector live, authoring activity in Forge is about to grow significantly. Without sandbox isolation, every Inspector tweak risks mutating production. The cost of postponing this is that bad authoring sessions corrupt seed JSON, requiring git intervention. The cost of doing it now is one focused 3–4 day WP that future-proofs the entire authoring loop.

---

## Solution Overview

### Architecture

```
  ┌──────────────────────────────────────────────────────────────────────┐
  │  BLOCK FORGE  (tools/block-forge — sandbox surface)                  │
  │                                                                      │
  │   listBlocks/getBlock/saveBlock                                      │
  │   - source dir = tools/block-forge/blocks/  (NEW)                    │
  │   - first-run seed: copy from content/db/blocks/ if sandbox empty    │
  │   - thereafter, sandbox is the only writeable target                 │
  │                                                                      │
  │   New UI:                                                            │
  │     [Save]    → writes to sandbox (existing flow, retargeted)        │
  │     [Clone]   → POST /api/blocks/clone → duplicates current to       │
  │                  <slug>-copy-N.json + reloads picker                 │
  │     [Export]  → opens ExportDialog (Phase 1)                         │
  │                                                                      │
  └────────────────┬─────────────────────────────────────────────────────┘
                   │ ExportDialog
                   │   ├─ Download JSON  → Blob → <a download>           │
                   │   └─ Copy payload   → navigator.clipboard.writeText │
                   ▼
                 (User pastes / uploads in Studio)
                   │
                   ▼
  ┌──────────────────────────────────────────────────────────────────────┐
  │  STUDIO  (apps/studio — production gate)                             │
  │                                                                      │
  │   New UI on block-editor page:                                       │
  │     [Import block]  → ImportDialog                                   │
  │       ├─ <textarea> paste                                            │
  │       ├─ <input type="file" accept=".json"> upload                   │
  │       ├─ schema validation (zod or hand-rolled)                      │
  │       ├─ POST to existing Supabase upsert endpoint                   │
  │       └─ POST /api/content/revalidate (default body `{}`)            │
  │                                                                      │
  └──────────────────────────────────────────────────────────────────────┘
```

### Why ExportDialog instead of two-stage push pipeline (decision)

Two-stage push (Forge → DB → revalidate) loses the user's ability to **review what they're about to deploy**. ExportDialog shows the pretty-printed JSON; user can read it before clicking Copy/Download. This is the same intuition Layout Maker uses — the dialog is a checkpoint. The two-stage push could be added later (Phase 6+ stub) once Studio Import UI is proven; for now, manual paste keeps trust high.

### Why sandbox at `tools/block-forge/blocks/` and not somewhere else (TENTATIVE — Phase 0 RECON ratifies)

- **Locality.** Tool-local drafts live next to the tool — same as `tools/layout-maker/layouts/`, `tools/responsive-tokens-editor/...` (TBD).
- **No git pollution.** `tools/block-forge/blocks/` can be `.gitignore`'d (sandbox is per-developer scratch). Or kept committed if user prefers shared drafts. Phase 0 decides.
- **Easy seeding.** First-run logic checks empty sandbox → copies from `content/db/blocks/` → user starts from current production state. Subsequent edits stay sandbox-local.

Phase 0 RECON validates the path choice + git policy (gitignore vs commit) before code lands.

---

## Phases

### Phase 0 — RECON pre-flight (1–2h, mandatory per saved memory `feedback_preflight_recon_load_bearing`)

**Goals:**
1. Map current Block Forge save / list flow end-to-end (vite middleware + api-client + App.tsx)
2. Map Layout Maker's ExportDialog + api-client.exportLayout flow (the model we copy from)
3. Map Studio block-editor entry points where Import button can mount without disrupting WP-033 Inspector wiring
4. Identify Supabase upsert endpoint or Hono API route that Studio Import will call
5. Decide sandbox path + git policy (ignored vs committed)
6. Decide Phase 0 RECON output: domain impact list (which manifests change), arch-test baseline, PARITY trio impact

**Output:** `logs/wp-035/phase-0-result.md` with §0.1–§0.7 sections + 5–7 Brain rulings (sandbox path; git policy; Studio Import endpoint; ExportDialog reuse vs port; revalidate trigger; etc.)

**No code lands in Phase 0.** RECON-only audit pass.

### Phase 1 — Forge ExportDialog + Clone affordance (~4–6h)

**Goals:**
- Port `ExportDialog.tsx` from layout-maker, adapt for blocks (slug + name + html + css + js + variants payload)
- Add `[Export]` button in Forge App.tsx header (next to Save)
- Add `[+ Clone]` button — generates `<slug>-copy-N.json` with unique numeric suffix; reloads block picker
- Add new `POST /api/blocks/clone` endpoint in Vite middleware (server-side file copy with new slug)
- Tests: ExportDialog render + button interactions; Clone endpoint round-trip; arch-test +N

**Out of scope:** Sandbox dir migration (Phase 3); Studio Import (Phase 2).

### Phase 2 — Studio Import UI (~5–7h)

**Goals:**
- Mount `[Import block]` button on Studio block-editor page (location TBD by §0.3 RECON)
- ImportDialog component: paste textarea + file upload + JSON preview + validation feedback
- Schema validation: minimum required fields (slug, name, html, css) + soft warnings (variants, metadata)
- Submit handler: call existing Supabase upsert path OR new Hono API endpoint (TBD by §0.4 RECON)
- Auto-revalidate: POST `/api/content/revalidate` with `{}` body (per saved memory `feedback_revalidate_default`)
- Toast / confirmation UI on success
- Tests: ImportDialog flows, schema validation edge cases, save + revalidate round-trip

**Out of scope:** Forge sandbox migration (Phase 3); CLI / scripted import (future).

### Phase 3 — Forge sandbox decouple (~4–6h)

**Goals:**
- Create sandbox dir at chosen path (Phase 0 §0.5 ruling)
- Vite middleware retargets reads + writes to sandbox dir (default; old `content/db/blocks/` no longer touched by Forge)
- First-run seed logic: empty sandbox → copy current `content/db/blocks/*.json` into sandbox so existing blocks remain accessible
- Add `BLOCK_FORGE_SOURCE_DIR` env override doc updates (env switch lets advanced users opt back into direct-edit if needed)
- Optional: read-only mirror of `content/db/blocks/` exposed in BlockPicker as "Production seed (read-only)" if §0.5 RECON recommends, else fully disconnect
- Update `.gitignore` per §0.5 ruling (sandbox dir ignored OR committed by intent)
- Tests: middleware reads from sandbox; saves never touch production seed; first-run seed copies correctly

**Out of scope:** Sunset confirmation in CLAUDE.md docs (Phase 5).

### Phase 4 — (Optional) Direct-edit sunset / safety nets (~2–3h)

**Goals (if Phase 0 RECON marks this needed):**
- Add `BLOCK_FORGE_ALLOW_DIRECT_EDIT=1` flag to opt back into mutating `content/db/blocks/` (escape hatch for legacy workflows)
- UI banner if running in direct-edit mode warning user "edits go to production seed"
- Or: full removal of direct-edit path if RECON confirms no callers depend on it

**Decision deferred to Phase 0** — may collapse into Phase 3 if scope minimal.

### Phase 5 — Close (~2–3h)

**Goals:**
- SKILL.md updates (`.context/SKILL.md` + tool-local CLAUDE.md if exists) describing new flow
- CONVENTIONS entry codifying "Forge writes to sandbox; Studio writes to DB" rule
- Save Brain memory: `feedback_forge_sandbox_isolation` capturing the architectural reasoning so future agents don't suggest re-merging the surfaces
- Update `.context/BRIEF.md` if relevant
- PARITY trio update if any cross-surface contract emerged
- WP doc status flip 🟡 → ✅ DONE
- arch-test final + Approval gate (per saved memory `feedback_close_phase_approval_gate` if ≥3 doc files)

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Sandbox first-run seed clobbers user's in-progress work | Low | High | First-run logic checks sandbox empty BEFORE seeding; never overwrites existing files |
| Studio Import endpoint doesn't exist; needs new Hono API route | Medium | Medium | Phase 0 §0.4 RECON identifies; if absent, Phase 2 includes API route addition (small, additive) |
| ExportDialog port from layout-maker has subtle layout-vs-block payload diffs | Medium | Low | Layout payload differs (yaml + slot_config), block payload simpler (json + html/css/js). Adapt fields, don't copy verbatim |
| Sandbox dir gitignored locally — devs lose drafts on machine switch | Low | Low | Phase 0 §0.5 ruling decides. If drafts matter cross-machine, commit them; if scratch, ignore. User preference signal |
| `content/db/blocks/` deletion breaks `/content-push` skill | Medium | High | Phase 3 keeps `content/db/blocks/` intact (just stops Forge from writing to it). `/content-push` continues reading the existing seed |
| Studio Import bypasses validation that existing save flow already does | Medium | Medium | Phase 2 calls THE SAME upsert endpoint as existing edits (not a new path); validation reused |
| Inspector wiring on Forge breaks if BlockPicker source dir changes mid-session | Low | Medium | Phase 3 invalidates Inspector pin on slug change (existing Phase 1 mechanism). Verify at live smoke |
| User confused by two surfaces (Forge sandbox vs Studio import) initially | Low | Low | UI copy + brief workflow doc in CLAUDE.md. ExportDialog itself names the next step ("Open Studio → Import block") |

---

## Domain Impact (preliminary — Phase 0 RECON ratifies)

| Domain | Files affected (estimated) | SKILL flip? |
|---|---|---|
| `infra-tooling` (block-forge) | +ExportDialog, +CloneButton, vite middleware additions, sandbox path | Possibly — if a NEW `tools/block-forge/blocks/` directory introduces ownership questions |
| `studio-blocks` | +ImportDialog component, +Import button on block-editor, possibly +Hono API route | Likely additive — existing block-editor surface gains feature |
| `pkg-block-forge-core` | LOCKED (engine untouched) | No |
| `pkg-ui` | LOCKED (no DS changes) | No |
| Hono API (`apps/api`) | If §0.4 RECON adds new route for import | Possibly — new endpoint registration |

arch-test target (estimated): current 580 + ~12-18 new owned_files = **~592-598**. Phase 0 firms this up.

---

## Approval gate (Phase 5 Close)

Per saved memory `feedback_close_phase_approval_gate`, if Phase 5 touches ≥3 doc files (CONVENTIONS + 2 SKILLs + WP doc + brief + PARITY trio = likely 5+), Brain approval is required before doc-batch commit. Default approval scope: BRIEF + CONVENTIONS + SKILL.md + WP doc status flip + saved memory.

---

## Out-of-scope (explicit non-goals)

- ❌ Cross-block search / batch import (Phase 6+ if needed)
- ❌ CLI tool for headless export/import (out — UI-driven workflow MVP)
- ❌ Production block delete UI (Studio surface decision, separate WP)
- ❌ Block versioning / history beyond `.bak` (Studio responsibility)
- ❌ Engine extensions to `@cmsmasters/block-forge-core` (LOCKED 6-fn API)
- ❌ Direct Forge → Supabase write (defeats the gate; explicit Studio import is the contract)

---

## Brain → Operator handoff

Workplan drafted. 5 phases, ~16-22h budget, RECON pre-flight enforced (saved memory). Reference model: layout-maker ExportDialog. Three open architectural questions for Phase 0 RECON to ratify (sandbox path, git policy, Studio Import endpoint shape).

Awaiting Operator approval to commit WP-035 + flip status to 🟡 IN PROGRESS, then Phase 0 task prompt drafting.
