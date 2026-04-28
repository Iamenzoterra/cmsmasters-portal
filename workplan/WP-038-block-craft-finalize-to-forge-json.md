# WP-038: Block Craft → Forge sandbox finalize step — close the seeding gap

> Rewrite the `/block-craft` skill so the iteration loop stays at `tools/studio-mockups/<name>.html` (fast HTML preview at :7777), and on a user signal ("забираю", "готово", "ок", whatever natural-language phrasing) the skill ASSEMBLES an 11-key BlockJson and writes it to `tools/block-forge/blocks/<slug>.json` (the WP-035 sandbox). Closes the post-WP-035 architectural gap: blocks created from external sources (Figma → block-craft → ???) had no clean path INTO the Forge sandbox; only first-run seed (one-shot copy from `content/db/blocks/`) and Clone (sandbox-internal duplication) seeded Forge. After WP-038, `/block-craft` becomes the third seed source — a deliberate, user-confirmed FINALIZE step that splits HTML preview into BlockJson and lands it in Forge ready for responsive polish + Export → Studio Import → DB.

**Status:** ✅ DONE — closed 2026-04-28; FINALIZE protocol shipped; cross-doc batch + saved memory + Forge PARITY entry + figma-use plugin-namespaced ratification documented
**Priority:** P1 — closes the architectural seam left by WP-035; without it `/block-craft` outputs HTML that user must hand-convert to BlockJson before Forge can see it
**Prerequisites:** WP-035 ✅ (sandbox dir exists, Vite middleware reads sandbox on every GET, Studio Import endpoint live)
**Milestone/Wave:** ADR-025 Layer 2 polish — close the authoring loop end-to-end
**Estimated effort:** 1–2h across 1 phase + close (single deliverable: rewrite of one SKILL.md file; zero new code)
**Reference precedent:** WP-035 PARITY trio (`tools/block-forge/PARITY.md`, `apps/studio/src/pages/block-editor/responsive/PARITY.md`) — `/block-craft` becomes a third actor in the same authoring loop, distinct from production roundtrip but feeding into it.

---

## Outcome Ladder

| Tier | Outcome | Evidence |
|---|---|---|
| Bronze | SKILL.md rewritten with FINALIZE protocol; no other changes | Phase 1 commit; pre-existing tests + arch-test stay green (no source code touched) |
| Silver | Live smoke: real Figma node → `/block-craft` → iterate at :7777 → user says "забираю" → BlockJson written to `tools/block-forge/blocks/<slug>.json` → Forge picker shows new block → Inspector + responsive UI usable | Phase 1 result.md with screenshots: HTML preview + Forge picker + opened block |
| Gold | Re-finalize cycle: tweak HTML again → re-finalize → BlockJson overwrites with new content → Forge picks up changes; old `studio-mockups/<name>.html` stays on disk for further iteration | Phase 1 result.md confirms cycle; manual `git status` shows sandbox JSON updated, source HTML untouched-or-edited per user, `content/db/blocks/` zero diff |
| Platinum | `.context/SKILL.md` + CONVENTIONS reference the new flow; saved memory `feedback_block_craft_finalize_protocol` (or fold into existing `feedback_forge_sandbox_isolation`) captures rationale; PARITY trio updated to name `/block-craft` as a sandbox seed source alongside first-run + Clone | Close phase commit |

---

## Commit Ladder

| Phase | Task prompt | Implementation | Result.md |
|---|---|---|---|
| 0 | logs/wp-038/phase-0-task.md | (RECON-only) | `b57b69ad` |
| 1 | logs/wp-038/phase-1-task.md (committed in `b57b69ad`) | `13c029b5` | (incl. in `13c029b5`) |
| 2 (Close) | logs/wp-038/phase-2-task.md | `d90306b4` | (incl. in `d90306b4`) |

Three-phase ladder (RECON → rewrite → close). May collapse Phase 2 into Phase 1 if Phase 0 RECON shows zero downstream doc impact (i.e. existing CONVENTIONS + SKILL.md require no edits beyond the skill file itself). Decision deferred to Phase 0 §0.5.

---

## Problem Statement

### What's broken right now

After WP-035 closed (2026-04-28), Forge sandbox seeding has three documented sources:

1. **First-run seed** — one-shot copy from `content/db/blocks/*.json` at Vite `configureServer` boot iff sandbox is empty (`seedSandboxIfEmpty` in `tools/block-forge/vite.config.ts`)
2. **Clone** — sandbox-internal duplication via `[+ Clone]` button → `POST /api/blocks/clone` → `<slug>-copy-N.json`
3. **Manual file create** — user opens OS file explorer, hand-writes `tools/block-forge/blocks/<slug>.json`

User raised the gap during WP-035 close: there's no path for **NEW blocks from external sources** (Figma via `/block-craft`, block-craft output from another developer, hand-crafted HTML files) to enter the Forge sandbox. Today's `/block-craft` workflow ends at:

> "User imports the HTML file into Studio → Process panel → Upload images → Save."

This bypasses Forge entirely — Studio is the production gate, but the user wants to **iterate responsive variants in Forge before promoting to production**. So the user's natural workflow is:

```
/block-craft → iterate desktop → (gap) → Forge responsive polish → Export → Studio → DB
                                  ↑
                           THIS GAP
```

The gap forces user to hand-assemble BlockJson (split `<style>` → css, `<section>` → html, `<script>` → js, generate slug, build 11-key shape) every time. WP-038 closes it.

### What good looks like

```
                     ╔═══════════════ ITERATE LOOP ═══════════════╗
                     ║                                            ║
   /block-craft  ─→  ║  tools/studio-mockups/<name>.html         ║
   (Figma node →     ║  served at :7777 (npx serve)              ║
    initial HTML)    ║                                            ║
                     ║  edit → save → browser reload → review    ║
                     ║  (many cycles)                            ║
                     ║                                            ║
                     ╚════════════════════╤═══════════════════════╝
                                          │
                                  user signal:
                                  "забираю" / "готово" /
                                  "ок поїхали" / etc.
                                  (natural language)
                                          │
                                          ▼
                     ╔═══════════════ FINALIZE ═══════════════════╗
                     ║                                            ║
                     ║  Skill asks slug + name (with proposal):   ║
                     ║   "Як назовемо блок?                       ║
                     ║    Пропоную: name='Always Online Block',   ║
                     ║              slug='always-online-block'   ║
                     ║    {if collision: ⚠ slug already in        ║
                     ║     sandbox (X KB, modified Y ago)}        ║
                     ║    Ок, або інше?"                          ║
                     ║                                            ║
                     ║  User confirms or overrides.               ║
                     ║                                            ║
                     ║  Skill splits HTML → 11-key BlockJson,     ║
                     ║  writes tools/block-forge/blocks/          ║
                     ║         <slug>.json                        ║
                     ║                                            ║
                     ║  studio-mockups/<name>.html STAYS.         ║
                     ║                                            ║
                     ╚════════════════════╤═══════════════════════╝
                                          │
                                          ▼
                     ╔═══════════════ POLISH (Forge) ═════════════╗
                     ║                                            ║
                     ║  User refreshes Forge :7702               ║
                     ║  → block in picker                         ║
                     ║  → tweak responsive variants (WP-019/028)  ║
                     ║  → fluid mode (WP-028)                     ║
                     ║  → Inspector tweaks (WP-033)               ║
                     ║                                            ║
                     ║  Export → Studio Import → DB (WP-035)      ║
                     ║                                            ║
                     ╚════════════════════════════════════════════╝

                     re-iterate cycle: user can return to ITERATE,
                     edit studio-mockups HTML, then re-FINALIZE
                     → Forge JSON overwrites with backup-on-write
                     (mirrors existing Forge `requestBackup` contract)
```

The skill stops being a one-way HTML emitter and becomes a stateful iteration tool with a deliberate handoff to Forge.

### What WP-038 delivers

- **Single SKILL.md rewrite** at `.claude/skills/block-craft/SKILL.md`. Steps 1–5 (read Figma → read tokens → generate HTML → serve :7777 → iterate) **unchanged**.
- **New Step 6 — FINALIZE protocol**: trigger detection (natural language); slug+name confirm with proposal (always); collision warning if `<slug>.json` exists; HTML → BlockJson split rules; write to `tools/block-forge/blocks/<slug>.json`; post-finalize message naming Forge URL + next steps.
- **Updated "What NOT to Do" list**: `Don't auto-finalize without user signal`, `Don't silent-overwrite Forge sandbox`, `Don't strip studio-mockups HTML after finalize`.
- **Cross-references** in `.context/SKILL.md` (block authoring loop section) and CONVENTIONS table — minor edits, only if Phase 0 RECON identifies them as load-bearing.

### Why this is the right move now

WP-035 just shipped the sandbox decouple + Studio Import path. The architectural seam is fresh in users' minds. Adding `/block-craft` as a third seed source NOW (before Forge gets more authoring features in WP-036/WP-037) means agents and users learn the full workflow once. Postponing risks `/block-craft` users developing ad-hoc workarounds (hand-edit JSON, paste HTML into Forge file picker that doesn't exist yet, etc.) that calcify into mental models we'd then have to untangle.

Cost is small (one SKILL.md rewrite, no source code, no new code paths, no schema changes). Benefit is large (closes the authoring loop end-to-end, makes Forge sandbox the unambiguous post-craft destination).

---

## Solution Overview

### Architecture

**Zero new code paths.** The full pipeline already exists post-WP-035:

| Component | Status | Role in WP-038 flow |
|---|---|---|
| `/block-craft` skill | ✅ ships HTML preview | Adds FINALIZE step → writes BlockJson |
| `tools/studio-mockups/` | ✅ existing | Iterate target (unchanged) |
| Manrope-served :7777 | ✅ existing | Iterate preview (unchanged) |
| `tools/block-forge/blocks/` | ✅ WP-035 Phase 3 | Receives BlockJson on finalize |
| Forge `GET /api/blocks` | ✅ WP-035 — fresh disk read every request | Auto-picks up new file on next refresh |
| Forge BlockPicker | ✅ existing | Shows new block in list |
| Forge Inspector + responsive | ✅ WP-019/028/033 | User polishes responsive |
| Forge ExportDialog | ✅ WP-035 Phase 1 | User exports finalized block |
| Studio ImportDialog | ✅ WP-035 Phase 2 | Receives Forge export, writes DB |

WP-038 is purely a SKILL.md rewrite that orchestrates these existing pieces into a single coherent workflow.

### FINALIZE protocol (skill instruction shape)

```
TRIGGER (natural language interpretation):
  - User signals "done" with current iterate state via natural language:
    "забираю", "готово", "ok поїхали", "save to forge", "це воно", "ship",
    or anything reasonably interpretable as "finalize this".
  - If signal is ambiguous, skill asks ONE clarifying question:
    "Finalize в Forge sandbox?" → wait for yes/no.
  - DO NOT use a hardcoded trigger word allow-list. Natural language only.

CONFIRM (always — even without collision):
  - Auto-derive proposals:
    - name from <h2> text inside .block-{slug} OR from current
      studio-mockups/<file>.html stem (humanized: "fast-loading-speed.html"
      → "Fast Loading Speed")
    - slug = nameToSlug(name) (kebab-case, ASCII, [a-z0-9-] only)
  - Check sandbox collision: ls tools/block-forge/blocks/<slug>.json
    - If exists: read its mtime + size; format as "(X KB, modified Y ago)"
  - Ask user (single message, both proposals + warning if any):
    "Як назовемо блок?
     Пропоную:
       name = '<derived name>'
       slug = '<derived slug>'
     {if collision: ⚠ Slug '<slug>' вже в Forge sandbox (X KB, modified Y ago)}
     Ок, або інше?"
  - User responds:
    - "ок" / "yes" / "так" / similar → proceed with proposals
    - "name = X" / "slug = Y" / "обидва: X / Y" → apply override(s)
    - free-form like "давай назвемо 'Hero CTA Block'" → re-derive slug from
      new name, re-check collision, ask again if changed
  - On confirmed-collision (user accepts overwrite or re-uses same slug):
    proceed with overwrite (mirrors Forge's existing save contract — file is
    a sandbox artifact, no .bak created by skill since user explicitly
    acknowledged; Forge's session-level .bak still runs on next save in UI).

SPLIT (HTML → 11-key BlockJson):
  Read tools/studio-mockups/<file>.html
  Extract:
    - section block: <section class="block-{slug}" data-block>...</section>
      → strip outer <section> tag, content becomes html field's children
      OR keep wrapping <section> verbatim — Phase 0 RECON ratifies which
      shape mirrors existing block JSONs in content/db/blocks/
    - css: content INSIDE <style> tag (the one without data-preview-only)
      → preserve verbatim, do NOT touch tokens
    - js: content INSIDE <script> tag (drop the <script type="module"> tags)
      → preserve verbatim
  Discard:
    - <head>, <html>, <body>, <link>, <meta>, <title> tags
    - <style data-preview-only> block
  Assemble:
    {
      // id intentionally omitted — Studio Import endpoint resolves it
      // (importBlockSchema.id is z.union([string, number]).optional(),
      // server generates uuid on insert per packages/validators/src/block.ts:89)
      "slug": "<confirmed slug>",
      "name": "<confirmed name>",
      "html": "<extracted html>",
      "css": "<extracted css>",
      "js": "<extracted js>",
      "block_type": "",
      "is_default": false,
      "sort_order": 0,
      "hooks": {},
      "metadata": {},
      "variants": null
    }
  (Phase 0 RECON ratifies exact key set + ordering vs existing committed
   block JSONs in content/db/blocks/.)

WRITE:
  - Path: tools/block-forge/blocks/<slug>.json
  - Format: JSON.stringify(payload, null, 2) + "\n" (mirrors Forge's
    own writeBlock convention — pretty-printed, trailing newline)
  - Use Write tool (not Edit) — single atomic write
  - Do NOT use Forge's POST /api/blocks/:slug endpoint — that requires
    Forge dev server running; skill writes directly to filesystem since
    file IS the source of truth the server reads from on next GET

POST-FINALIZE MESSAGE (always — single line):
  "Done. <slug>.json written to tools/block-forge/blocks/.
   Refresh Forge http://localhost:7702 → '<name>' in the picker.
   Polish responsive → Export → Studio Import → DB."

LEAVE-AS-IS:
  - tools/studio-mockups/<file>.html — DO NOT delete, rename, archive.
    User may return to iterate further. Skill is idempotent: repeated
    finalize cycles overwrite the BlockJson, source HTML is sticky.
```

### What stays in iterate loop (unchanged)

The skill's existing Steps 1–5 and all rules around tokens, scoping, animations, semantic HTML, hooks remain verbatim. The block CSS still must scope under `.block-{slug}`; tokens still come from `packages/ui/src/theme/tokens.css`; `<style data-preview-only>` still belongs in a separate tag; etc. WP-038 adds Step 6 without touching the iteration semantics.

---

## Phases

### Phase 0 — RECON pre-flight (~30–45 min, mandatory per saved memory `feedback_preflight_recon_load_bearing`)

**Goals:**

1. **Validate FINALIZE shape vs existing block JSONs.** Read 3–4 committed block files from `content/db/blocks/` (e.g. `fast-loading-speed.json`, `header.json`, `theme-name.json`) and confirm the exact 11-key shape, key ordering, and how `<section>` is encoded in `html` field (with or without outer `<section>` tag). This locks the SPLIT contract.
2. **Verify Forge sandbox is the right destination.** Confirm `tools/block-forge/blocks/` is the canonical sandbox path (mirror WP-035 Phase 3 ruling), not `BLOCK_FORGE_SOURCE_DIR` override territory. Read `tools/block-forge/vite.config.ts` lines 18–24 to confirm `SANDBOX_DIR_DEFAULT`.
3. **Verify `importBlockSchema` accepts `id`-less payload.** Read `packages/validators/src/block.ts:86-107` confirm `id` is optional. Confirm minimum required fields (slug, name, html). Decision: should skill emit `id: <some uuid>` proactively, or omit (let server generate)? RECON ratifies.
4. **Audit `figma-use` skill availability.** Check `.claude/skills/` for the `figma-use` skill (or whatever is the current name). Confirm it still exposes the API `/block-craft` references in Step 1 ("Use `figma-use` skill first"). If renamed/removed, surface the gap in RECON before the skill rewrite makes a stale reference permanent.
5. **Identify cross-doc impact.** Search `.context/SKILL.md`, CONVENTIONS, BRIEF, and any tool-local CLAUDE.md for references to `/block-craft`, "Studio import", "Process panel", "studio-mockups". Surface what (if anything) needs editing in Phase 2 (Close), or if Phase 2 collapses into Phase 1.
6. **Audit slot/hook table parity.** The existing skill has tables for slot syntax (`{{slot:header}}`, `{{meta:price}}`, etc.) — confirm parity with `packages/db/src/slot-registry.ts` so the skill rewrite doesn't ship stale references. (Source-of-truth ruling already in skill — verify it still holds.)
7. **Check for live `/block-craft` usage in repo.** Grep for `studio-mockups` in `.claude/skills/`, `.context/`, `apps/`, `tools/` to confirm the iterate-at-:7777 model is still the only intended preview path. Surface anywhere that already assumes a different shape.

**Output:** `logs/wp-038/phase-0-result.md` with §0.1–§0.7 sections + 4–6 Brain rulings (key shape; `id` policy on emit; trigger interpretation rules; collision warning format; cross-doc impact; Phase 2 collapse decision).

**No code lands in Phase 0.** RECON-only audit pass.

### Phase 1 — SKILL.md rewrite (~30–60 min)

**Goals:**

- Rewrite `.claude/skills/block-craft/SKILL.md`:
  - Steps 1–5 unchanged (Figma read, tokens, generate HTML, serve :7777, iterate)
  - **Step 6 replaced**: FINALIZE protocol (TRIGGER + CONFIRM + SPLIT + WRITE + POST-FINALIZE MESSAGE + LEAVE-AS-IS)
  - "What NOT to Do" list updated: add `Don't auto-finalize without user signal`, `Don't silent-overwrite Forge sandbox`, `Don't delete studio-mockups HTML after finalize`
  - Front-matter `description` field updated to mention "writes BlockJson to Forge sandbox on finalize" so the skill is more discoverable when user describes the full workflow
- No source code edits (no .ts, .tsx, .json source touched). No tests.
- arch-test (currently 595) UNCHANGED — skill files are not in domain manifest.

**Verification:**
- Live smoke: pick one Figma node → run `/block-craft` → iterate twice in :7777 → say "забираю" → confirm prompt appears → accept proposed slug → verify `tools/block-forge/blocks/<slug>.json` materializes → refresh Forge :7702 → confirm block appears in picker → open it → confirm Inspector + responsive UI works
- `git diff content/db/blocks/` MUST stay empty (zero production seed mutation; mirrors WP-035 saved memory `feedback_forge_sandbox_isolation`)
- `git status tools/studio-mockups/` shows the iterate HTML still on disk (LEAVE-AS-IS rule)

**Out of scope:**
- Source code changes (this WP is skill-only)
- Tests (no source code → no test surface; skill changes are validated by live smoke)
- Cross-doc edits (Phase 2 if Phase 0 RECON marks them load-bearing)

### Phase 2 — Close (~20–40 min, OR collapsed into Phase 1 per Phase 0 §0.5)

**Goals (if Phase 0 RECON marks them needed):**

- `.context/SKILL.md` — add (or update) "Block authoring loop" section to name `/block-craft` as a sandbox seed source distinct from first-run + Clone
- `.context/CONVENTIONS.md` — extend "Block authoring" table (added in WP-035 Phase 5) with row for `/block-craft → Forge sandbox` flow
- `tools/block-forge/PARITY.md` — extend existing WP-035 entry (or add new) noting `/block-craft` as a third seed source alongside first-run seed and Clone
- Saved memory: extend `feedback_forge_sandbox_isolation` (in `C:\Users\dmitr\.claude\projects\.../memory/`) OR create `feedback_block_craft_finalize_protocol` capturing the rationale: skill operates one-shot at user signal; iterate stays in HTML; Forge sandbox is the destination
- WP doc status flip: 🟡 IN PROGRESS → ✅ DONE, with commit SHA backfill in Commit Ladder
- Approval gate per saved memory `feedback_close_phase_approval_gate` if ≥3 doc files

**If Phase 0 §0.5 RECON shows zero load-bearing cross-doc references**, Phase 2 collapses into Phase 1 — the SKILL.md rewrite + saved memory + WP status flip happen in a single commit.

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Skill misidentifies "finalize" trigger and writes BlockJson prematurely | Medium | Low | Confirm-with-proposal step ALWAYS runs (not skipped); user has chance to abort. Plus skill's natural-language interpretation is cautious — when ambiguous it asks one clarifying question rather than acting |
| HTML split heuristics break on edge cases (multiple `<section>` blocks, nested `<style>`, no `<script>`) | Medium | Medium | Phase 0 RECON validates split rules against 3–4 real existing block JSONs. Skill rewrite documents the expected studio-mockups HTML shape (one `<section class="block-{slug}">`, one block-CSS `<style>` separate from `data-preview-only`, optional `<script>`) |
| Slug collision overwrites a valid sandbox block silently | Low | High | Confirm step ALWAYS shows collision warning with file size + mtime. User must acknowledge before overwrite. Mirrors saved memory `feedback_no_blocker_no_ask` (silent data-loss guard) |
| Forge picker doesn't show new block after finalize | Low | Medium | Vite middleware reads `readdir(SOURCE_DIR)` on EVERY GET (no cache) per WP-035 Phase 3. User-driven page refresh is the trigger; skill instructs user to refresh in post-finalize message |
| `/block-craft` skill loses fast-iterate UX if FINALIZE feels heavy | Low | Low | FINALIZE is opt-in (only on natural-language signal). Steps 1–5 (iterate loop) remain identical. User who never says "забираю" never invokes finalize, never pays the cost |
| `id` field policy ambiguity (emit or omit) — Studio Import behavior depends on schema | Low | Low | Phase 0 RECON §0.3 ratifies. `importBlockSchema` per [block.ts:89](../packages/validators/src/block.ts:89) accepts both shapes (id optional, server-resolves). Default to omit — simpler, Studio handles |
| Re-finalize cycle confuses the user (which file is source of truth?) | Low | Low | studio-mockups HTML is iterate target; Forge JSON is finalize artifact. Skill messaging must name both clearly. Phase 0 §0.5 may surface a CONVENTIONS row codifying this |
| `figma-use` skill renamed or removed — Step 1 reference breaks | Low | Medium | Phase 0 §0.4 audits. If gap, rewrite Step 1 to reference current Figma read tooling |

---

## Domain Impact (preliminary — Phase 0 RECON ratifies)

WP-038 is **skill-only**. No source code touched, no domain manifest edits, no arch-test delta.

| Domain | Files affected | SKILL flip? |
|---|---|---|
| All domains | None — skill files (`.claude/skills/*`) are not in manifest | No |

arch-test target: **595 / 595 unchanged** (current count post-WP-035 Phase 5).

If Phase 2 (Close) edits `.context/SKILL.md`, `CONVENTIONS.md`, or PARITY trio, those are doc-only — also outside arch-test scope.

---

## Approval gate (Phase 2 Close)

Per saved memory `feedback_close_phase_approval_gate`, Phase 2 needs Brain approval before doc batch commit if it touches ≥3 doc files. Likely list:

1. `.context/SKILL.md`
2. `.context/CONVENTIONS.md`
3. `tools/block-forge/PARITY.md`
4. `apps/studio/src/pages/block-editor/responsive/PARITY.md` (if mirroring asymmetry needs noting)
5. WP-038 doc itself (status flip + commit SHA backfill)
6. Saved memory file

That's 4–6 docs → approval gate engaged.

If Phase 0 RECON shows zero cross-doc impact, Phase 2 collapses → only 2 doc edits (SKILL.md rewrite + WP doc) → no approval gate needed, Phase 1 commit closes the WP.

---

## Out-of-scope (explicit non-goals)

- ❌ Auto-upload images to R2 during finalize (Studio Process panel handles this)
- ❌ Auto-add @container queries / responsive variants in finalize output (Forge owns responsive per WP-019/028)
- ❌ Auto-generate UUID for `id` field (Studio Import server-resolves)
- ❌ Persist studio-mockups HTML deletion / archival (LEAVE-AS-IS rule)
- ❌ New Forge "Import from external source" UI button (the skill IS the import affordance — no new UI needed)
- ❌ Update `/block-craft` skill to handle `.fig` binary files (out of scope; Figma URL or screenshot remain the inputs)
- ❌ Engine extensions to `@cmsmasters/block-forge-core` (LOCKED 6-fn API)
- ❌ Validation that Figma node CAN be a block (skill assumes user-driven judgment; no auto-detect)
- ❌ Round-trip Forge → studio-mockups (one-way; finalize is unidirectional)
- ❌ Trigger word allow-list / hardcoded magic words (natural-language interpretation only — Ruling 1)

---

## Brain → Operator handoff

Workplan drafted. Single-phase rewrite of one SKILL.md file; zero new code; arch-test unchanged at 595/595. Ruling block from prior chat:

| # | Topic | Ruling |
|---|---|---|
| 1 | Trigger words | Natural language only; no allow-list |
| 2 | studio-mockups post-finalize | LEAVE-AS-IS (no delete/rename/archive) |
| 3 | Re-finalize cycle | Allowed; each finalize overwrites Forge JSON |
| 4 | Slug+name UX | Always confirm with auto-derived proposal |

Three open architectural questions for Phase 0 RECON:
- Exact 11-key shape vs `content/db/blocks/` ground truth (RECON §0.1)
- `id` emit-or-omit policy (RECON §0.3)
- Cross-doc impact → Phase 2 alive or collapsed (RECON §0.5)

Awaiting Operator approval to commit WP-038 + flip status to 🟡 IN PROGRESS, then Phase 0 task prompt drafting.
