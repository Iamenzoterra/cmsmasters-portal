# WP-038 Phase 2: Close — cross-doc batch + saved memory + status flip + figma-use ratification

> Workplan: WP-038 Block Craft → Forge sandbox finalize step — close the seeding gap
> Phase: 2 of 2 (Close — final phase)
> Priority: P1 — closes WP-038 by codifying the new flow in BRIEF + SKILL + CONVENTIONS + PARITY + saved memory; flips status 🟡 → ✅ DONE
> Estimated: 30–60 minutes
> Type: Docs + memory (skill body untouched; zero source code)
> Previous: Phase 1 ✅ — `13c029b5` SKILL.md FINALIZE protocol (+218/-4); `19718980` SHA backfill
> Next: — (WP closes)
> Affected domains: NONE — all edits are in `.context/`, PARITY trio, saved memory, workplan doc; skill files + source code untouched

---

## Context

Phase 1 shipped the FINALIZE protocol rewrite to `.claude/skills/block-craft/SKILL.md`. WP closure now needs the cross-doc batch surfaced in Phase 0 §0.5 (4 load-bearing files) + saved memory + WP doc status flip. Plus one ratification decision left dangling from Phase 1: the `figma:figma-use` plugin-namespaced skill discovered DURING Phase 1 execution (Phase 0 RECON missed the plugin namespace because it grep'd only `.claude/skills/`). Phase 1 followed Ruling C verbatim (drop the reference); Phase 2 ratifies — either re-add a forward pointer to `figma:figma-use` (explicit MANDATORY guard) OR confirm the drop (auto-skill-load makes the explicit pointer redundant).

Per saved memory `feedback_close_phase_approval_gate`, this Close phase touches ≥3 doc files (4 + memory + WP doc = 6) → **Brain approval gate ENGAGED**. Phase 2 task prompt is written; Hands stops AFTER drafting all the edits and BEFORE committing — Brain reviews the doc-batch diff, approves, then Hands commits.

```
CURRENT  ✅  Phase 1 closed — SKILL.md FINALIZE protocol shipped (commit 13c029b5)
CURRENT  ✅  arch-test 595 / 595 (post-Phase 1 baseline)
CURRENT  ✅  WP-038 doc status: 🟡 IN PROGRESS (Commit Ladder backfilled with Phase 0 + Phase 1 SHAs)
CURRENT  ✅  saved memory feedback_forge_sandbox_isolation captures WP-035 architecture — still accurate, but does not name /block-craft as a third seed source
CURRENT  ✅  .context/SKILL.md §"Block authoring loop" lists 2 seed sources (first-run + Clone) at lines 124-158
CURRENT  ✅  .context/CONVENTIONS.md §"Block authoring (WP-035 — 2026-04-28)" action table at lines 1131-1156 — no /block-craft row
CURRENT  ✅  .context/CONVENTIONS.md §"Block creation workflow (WP-006...)" pipeline at lines 434-462 — step 3 says "Studio → Import HTML → Process panel" (legacy)
CURRENT  ✅  .context/BRIEF.md line 175 — "Created via Figma → /block-craft skill → Studio import → Process panel" (legacy chain, drift)
CURRENT  ✅  tools/block-forge/PARITY.md §"WP-035 — Sandbox + Export" at lines 563-582 — does NOT mention /block-craft as third seed source
CURRENT  ✅  apps/studio/.../responsive/PARITY.md — no /block-craft mention (Studio's role unchanged; per Phase 0 §0.5 verdict NO edit)

MISSING  ❌  saved memory entry capturing /block-craft as third seed source + studio-mockups iterate-vs-Forge polish split
MISSING  ❌  .context/SKILL.md §"Block authoring loop" updated for third seed source
MISSING  ❌  .context/CONVENTIONS.md §"Block authoring" action table row for "Create new block from Figma"
MISSING  ❌  .context/CONVENTIONS.md §"Block creation workflow" pipeline updated to reflect Forge sandbox handoff (not direct Studio Import)
MISSING  ❌  .context/BRIEF.md line 175 chain corrected
MISSING  ❌  tools/block-forge/PARITY.md /block-craft seed-source note
MISSING  ❌  WP-038 doc status flip 🟡 → ✅ DONE
MISSING  ❌  Ratification of figma-use re-add OR confirm-drop (Phase 1 carry-over)
```

Phase 2 is **docs + memory + status flip only**. Zero source code touched, zero skill body change (Phase 1 already shipped it), zero domain manifest edit. arch-test stays 595/595.

---

## Domain Context

**No domains affected.** All edits land in `.context/` files, PARITY.md, saved memory directory, and the WP doc. None of those are tracked by `domain-manifest.ts`.

Invariants to preserve through doc edits:

- **`feedback_forge_sandbox_isolation` saved memory** — WP-035 production-roundtrip asymmetry (ExportDialog in Forge with NO Studio mirror; ImportDialog in Studio with NO Forge mirror) is unchanged. WP-038 does NOT contradict this; it adds a third seed source for sandbox INPUT, distinct from production roundtrip OUTPUT.
- **Studio remains the production gate.** Phase 2 doc edits MUST NOT imply that `/block-craft` writes to DB or bypasses Studio Import. The chain is `/block-craft → Forge sandbox → Forge polish → Export → Studio Import → DB`. Three steps from `/block-craft` to DB; Studio is irreplaceable.
- **Studio-mockups HTML stays on disk post-finalize.** Phase 2 doc updates MUST reflect Brain ruling 2 (LEAVE-AS-IS) — the iterate HTML is sticky; user can return for desktop tweaks.
- **Re-finalize preserves 8 metadata fields** (slug, name, block_type, is_default, sort_order, hooks, metadata, variants) per Phase 1 Task 1.4 broadened rule. Phase 2 docs MUST NOT narrow this back to "preserve variants".

---

## Phase 2 Audit (do FIRST — re-baseline)

```bash
# 0. Baseline
npm run arch-test                                                    # expect: 595 / 595 (Phase 1 close)

# 1. Confirm Phase 1 commit landed + SKILL.md has the FINALIZE protocol
git log --oneline -5                                                 # expect: 19718980, 13c029b5 in the top 5
grep -c "## SPLIT Contract\|### Step 6: Finalize to Forge sandbox" .claude/skills/block-craft/SKILL.md
# expect: 2 — both headers present

# 2. Confirm cross-doc lines surfaced in Phase 0 §0.5 are still at expected anchors (line numbers may have drifted)
grep -n "block-craft\|studio-mockups" .context/BRIEF.md .context/CONVENTIONS.md
# expect: BRIEF lines 86, 90, 132, 175 (drift OK — anchor by content)
# expect: CONVENTIONS lines 437, 630 (drift OK — anchor by content)

# 3. Confirm SKILL.md §"Block authoring loop" anchor still present
grep -n "## Block authoring loop" .context/SKILL.md
# expect: line 124 (drift OK — anchor by content)

# 4. Confirm CONVENTIONS §"Block authoring (WP-035..." action table anchor
grep -n "^## Block authoring (WP-035" .context/CONVENTIONS.md
# expect: line 1131 (drift OK — anchor by content)

# 5. Confirm Block creation workflow pipeline anchor
grep -n "^## Block creation workflow (WP-006" .context/CONVENTIONS.md
# expect: line 434 (drift OK — anchor by content)

# 6. Confirm PARITY.md §"WP-035 — Sandbox + Export" anchor + identify last H2 (append target)
grep -nE "^## WP-0(3[3-9]|4[0-9])" tools/block-forge/PARITY.md
# expect: WP-035 at line 563 (drift OK — anchor by content); the LAST H2 in the file is the
# append-after target for the new WP-038 H2 entry
tail -20 tools/block-forge/PARITY.md
# expect: end of WP-035 §"Tests:" bullets (or whichever WP currently sits at file tail)
# WP-038 entry is appended AFTER the last H2's last line

# 7. Confirm saved memory dir + existing files
ls "C:/Users/dmitr/.claude/projects/C--work-cmsmasters-portal-app-cmsmasters-portal/memory/" | grep -E "feedback_forge_sandbox_isolation|MEMORY"
# expect: feedback_forge_sandbox_isolation.md + MEMORY.md present

# 8. Confirm figma-use plugin-namespaced skill still in skill listing
# (referenced in slash-skill listing as figma:figma-use)
# This audit is a Brain rationale check — plugin namespace lives outside .claude/skills/

# 9. Confirm WP-038 doc status flag location
grep -n "^\*\*Status:\*\*" workplan/WP-038-block-craft-finalize-to-forge-json.md
# expect: line 5 — "🟡 IN PROGRESS — drafted 2026-04-28..."
```

**Document re-baseline findings in result.md.** If any anchor has drifted significantly (e.g. headers renamed, sections reorganized by another WP since Phase 1), STOP and surface — Phase 2 task prompt's edit instructions need updating.

---

## Task 2.1: Saved memory — `feedback_block_craft_finalize_protocol`

### What to Build

Create new memory file at `C:\Users\dmitr\.claude\projects\C--work-cmsmasters-portal-app-cmsmasters-portal\memory\feedback_block_craft_finalize_protocol.md` with frontmatter + body:

```markdown
---
name: Block-craft FINALIZE protocol — third sandbox seed
description: /block-craft skill iterates HTML at studio-mockups/<name>.html (preview :7777); on user signal it FINALIZES to tools/block-forge/blocks/<slug>.json (third Forge sandbox seed source alongside first-run + Clone). Re-finalize preserves 8 metadata fields. studio-mockups HTML stays on disk post-finalize.
type: feedback
---

The `/block-craft` skill is a third Forge sandbox seed source (alongside first-run and Clone). Iterate loop stays at `tools/studio-mockups/<name>.html` (preview at `:7777`); FINALIZE step writes an 11-key BlockJson to `tools/block-forge/blocks/<slug>.json`. The user-driven chain is:

```
/block-craft → studio-mockups HTML iterate → user signal → Forge sandbox JSON → Forge responsive polish → Export → Studio Import → DB
```

**Why:** Pre-WP-038, `/block-craft` ended at "import HTML into Studio → Process panel" — bypassed Forge entirely, forced manual HTML→BlockJson hand-assembly (split style/section/script, generate slug, build 11-key shape). WP-035 closed production-roundtrip asymmetry but left sandbox seeding from external sources unaddressed. WP-038 adds the third seed without contradicting `feedback_forge_sandbox_isolation`: that asymmetry is for production-roundtrip OUTPUT (ExportDialog in Forge, ImportDialog in Studio); sandbox seeding INPUT is a separate concern with three legitimate sources (first-run, Clone, `/block-craft`).

**How to apply:**

1. **Trigger interpretation (PROCEED / DECLINE / CLARIFY)** — natural-language only, no allow-list. Precedence: explicit decline > iterate verb (`change`, `поправ`, `додай`) > save signal (`забираю`, `ship`, `finalize`) > pure affirmative (`ок`, `норм`) > default DECLINE. Iterate verb wins over save signal (e.g. "save але heading 2px more" → continue iterate, do not finalize).

2. **CONFIRM step is ALWAYS required after PROCEED** — even when phrasing is unambiguous. Skill proposes slug + name (filename-first humanized; `<h1>`/`<h2>` fallback when filename is generic). On collision (`<slug>.json` already in sandbox), warn with mtime + size; offer overwrite / abort / rename.

3. **SPLIT Contract is deterministic** — same input HTML → same output JSON. Strip `<!DOCTYPE>` / `<head>` / `<body>` / `<style data-preview-only>` wrappers; preserve outer `<section class="block-{slug}" data-block>...</section>` verbatim; strip global resets (`*, *::before, *::after { ... }`) and `body`/`html` rules from CSS; strip `<script>` tags from JS body. `id` field OMITTED (Studio Import server-resolves via `importBlockSchema.id` optional). Idempotent — works on full preview pages AND pre-stripped fragments.

4. **Re-finalize preserves 8 metadata fields** from existing sandbox JSON: `slug`, `name`, `block_type`, `is_default`, `sort_order`, `hooks`, `metadata`, `variants`. Only `html`, `css`, `js` are recomputed from current studio-mockups HTML. Mental model: studio-mockups HTML owns *content*; Forge sandbox JSON owns everything *about* the block. Narrow `variants`-only preservation would silently overwrite block_type / is_default mutations from Forge UI — real data-loss bug.

5. **studio-mockups HTML is sticky post-finalize** — never delete, rename, or archive. User often returns for desktop tweaks; re-finalize cycle is allowed and idempotent.

6. **Forge picker auto-discovery is single-refresh** — Vite middleware `GET /api/blocks` does fresh `readdir(SOURCE_DIR)` on every request; user refreshes Forge :7702 after FINALIZE → block appears in picker. No auto-poll needed.

When asked to:
- Auto-finalize without user signal → DECLINE; FINALIZE is opt-in.
- Silent-overwrite an existing sandbox JSON → DECLINE; collision warning + user confirmation always.
- Delete studio-mockups HTML after finalize → DECLINE; LEAVE-AS-IS.
- Narrow re-finalize preservation to just `variants` → DECLINE; preserve all 8 metadata fields.
- Embed a hardcoded trigger-word allow-list → DECLINE; natural-language interpretation in conversational context only.

References:
- `.claude/skills/block-craft/SKILL.md` (Step 6 FINALIZE Protocol + SPLIT Contract — Phase 1 commit `13c029b5`)
- `workplan/WP-038-block-craft-finalize-to-forge-json.md`
- `logs/wp-038/phase-{0,1,2}-result.md`
- `feedback_forge_sandbox_isolation.md` (sister memory — production roundtrip; this memory is the sandbox seed counterpart)
```

### Why

Captures the architectural reasoning so future agents don't propose re-merging the surfaces or narrowing re-finalize preservation. Five "When asked to ... DECLINE" lines guard against the failure modes Phase 1 surfaced (silent-finalize, silent-overwrite, narrow preservation, allow-list).

### Integration

New file. After write, also update `MEMORY.md` index:

```markdown
- [Block-craft FINALIZE protocol](feedback_block_craft_finalize_protocol.md) — /block-craft is third Forge sandbox seed; FINALIZE writes BlockJson; re-finalize preserves 8 metadata fields; studio-mockups HTML stays sticky
```

Append at the end of MEMORY.md (after `[LM auto-publish backlog (parked)]` line) per Memory protocol — index is one-line-per-entry, ≤150 chars.

---

## Task 2.2: `.context/SKILL.md` — Block authoring loop section update

### What to Build

Update the diagram + invariant list at lines 124-158 to add `/block-craft` as a third seed source. Current diagram has 2 boxes (Forge sandbox + Studio production gate). New shape:

Replace the existing section (lines 124-158) with:

```markdown
## Block authoring loop (post-WP-035 + WP-038, 2026-04-28)

Forge is the **sandbox**; Studio is the **production gate**. Three seed sources feed Forge sandbox; one one-way path (Forge → Studio) ships to production. The two surfaces never cross-write.

```
┌─────────────────────────────────────────┐
│ Sandbox seed sources (3 — input only)   │
│   1. First-run seed (one-shot per       │
│      Forge dev process; copies          │
│      content/db/blocks/*.json if empty) │
│   2. [+ Clone] in Forge (sandbox-       │
│      internal duplication)              │
│   3. /block-craft FINALIZE (writes      │
│      tools/block-forge/blocks/<slug>    │
│      .json from studio-mockups HTML)    │
└──────────────┬──────────────────────────┘
               │ (sandbox writes)
               ▼
┌────────────────────────────────────┐
│ Block Forge (tools/block-forge/)   │
│ Sandbox: tools/block-forge/blocks/ │
│   [Save]    → sandbox file         │
│   [+ Clone] → <slug>-copy-N.json   │
│   [Export]  → ExportDialog →       │
│               Download JSON OR     │
│               Copy payload         │
└──────────────┬─────────────────────┘
               │ (manual paste / file)
               ▼
┌────────────────────────────────────┐
│ Studio (apps/studio/)              │
│ block-editor: [Import JSON] →      │
│   ImportDialog →                   │
│   POST /api/blocks/import →        │
│   Hono upserts by slug →           │
│   server-side fire-and-forget      │
│   revalidate → portal sees edit    │
└────────────────────────────────────┘
```

**Key invariants:**
- Forge NEVER writes to `content/db/blocks/` (production seed); that path is read-only from Forge's POV. `/content-push` skill remains the legacy push primitive but is no longer the Forge-edit pathway.
- Studio Import is the ONLY DB write path triggered by manual block authoring. `POST /api/blocks/import` resolves create-vs-update via `getBlockBySlug`; `id` field in payload is ignored.
- Server-side revalidate uses canonical `'{}'` body (cache-wide invalidation per saved memory `feedback_revalidate_default`).
- First-run seed (one-shot per Forge dev process) copies `content/db/blocks/*.json` into sandbox if empty; never overwrites populated sandbox.
- Cloned blocks strip the `id` field; sandbox doesn't enforce id uniqueness (DB resolves at next import).
- `/block-craft` FINALIZE writes `tools/block-forge/blocks/<slug>.json` from current `tools/studio-mockups/<name>.html` per SPLIT contract (id-omitted; variants:null on first finalize). Re-finalize preserves 8 metadata fields from existing sandbox JSON; only html/css/js are recomputed. `studio-mockups/<name>.html` stays on disk post-finalize for further iterate cycles.

**See:** `workplan/WP-035-block-forge-sandbox-export-import.md`, `workplan/WP-038-block-craft-finalize-to-forge-json.md`, saved memory `feedback_forge_sandbox_isolation`, saved memory `feedback_block_craft_finalize_protocol`.
```

### Why

The diagram now reflects all 3 seed sources. The new invariant (last bullet) captures the key contract differences for `/block-craft` finalize: SPLIT, id-omission, variants null on first finalize, 8-field preservation on re-finalize, sticky studio-mockups HTML. References list updated with WP-038 doc + sister memory.

### Integration

Single Edit on the existing section; replace the entire block from `## Block authoring loop (post-WP-035, 2026-04-28)` heading through the `**See:**` line. Use the heading line + first paragraph as anchor for uniqueness.

---

## Task 2.3: `.context/CONVENTIONS.md` — Block creation workflow pipeline update (lines ~434-462)

### What to Build

The current pipeline (lines 434-462) describes the legacy direct-Studio-import path. Update to reflect Forge sandbox handoff. Replace lines 434-462 with:

```markdown
## Block creation workflow (WP-006, ADR-023, ADR-024, WP-035, WP-038)

### Pipeline (post-WP-038 — 2026-04-28)
1. Figma design → `/block-craft` skill → Claude Code generates HTML+CSS+JS → preview at `localhost:7777`
2. Iterate animations, interactions, layout in `tools/studio-mockups/<name>.html` until approved (many cycles)
3. User signals FINALIZE in natural language ("забираю", "готово", "ship", etc. — see `feedback_block_craft_finalize_protocol`); skill confirms slug + name (filename-first proposal); SPLIT contract assembles 11-key BlockJson and writes to `tools/block-forge/blocks/<slug>.json`. `id` field omitted (Studio Import server-resolves). `studio-mockups/<name>.html` stays on disk for further iterate cycles.
4. User refreshes Forge `:7702` → block appears in picker → polish responsive variants, fluid mode, Inspector tweaks (WP-019/028/033 surfaces)
5. Forge `[Export]` → Download JSON or Copy payload → Studio `[Import JSON]` → `POST /api/blocks/import` (Hono upserts by slug) → server-side fire-and-forget revalidate
6. Process panel runs on Studio side post-Import only when needed for image upload (R2) — token scanning is no longer required for block-craft output (skill emits scoped tokens already). Component detection (`.cms-btn` classes) is still a Studio Process step for legacy HTML imports.
7. Portal (Next.js, post-WP-007) renders blocks at request time via `BlockRenderer`; revalidate from step 5 flushes cache so the next request picks up the new HTML/CSS/JS.

### Re-finalize loop (post-Phase 1 broadening)

After step 5 lands the block in DB, the user may return to step 2 for desktop tweaks in `studio-mockups/<name>.html`. Re-finalize is idempotent: skill re-extracts html/css/js from updated mockup; preserves all other 8 fields (`slug`, `name`, `block_type`, `is_default`, `sort_order`, `hooks`, `metadata`, `variants`) from existing `tools/block-forge/blocks/<slug>.json`. Forge UI mutations (e.g. responsive variants, Inspector edits, slot-category overrides) are durable across re-finalize cycles. Mental model: studio-mockups HTML owns *content*; Forge sandbox JSON owns *about* the block.

### Block structure rules
- HTML wrapped in `<section class="block-{slug}" data-block>`
- ALL CSS selectors scoped under `.block-{slug}` — no global leaking
- Semantic HTML: `<button>` for actions, `<a>` for links, `<details>` for accordions — never `<div>` for interactive elements
- Button states via `portal-blocks.css` classes: `.cms-btn`, `.cms-btn--primary`, `.cms-btn--secondary`, `.cms-btn--outline`, `.cms-btn--cta`
- Animations: CSS scroll-driven `animation-timeline: view()` for entrance + `animate-utils.js` imports for behavioral (hover parallax, magnetic buttons)
- JS stored in `blocks.js` column, rendered as `<script type="module">` by Portal
- Only animate `transform` and `opacity` — compositor-safe, no layout thrashing
- `@media (prefers-reduced-motion: reduce)` respected

### Shared portal assets
- `packages/ui/src/portal/portal-blocks.css` — `.cms-btn` (4 variants, 3 sizes, all states), `.cms-card`, `[data-tooltip]`
- `packages/ui/src/portal/animate-utils.js` — `trackMouse`, `magnetic`, `stagger`, `spring`, `onVisible`
- `packages/ui/src/theme/tokens.css` — design tokens (Figma source of truth, synced via `/sync-tokens`)
```

### Why

The legacy 5-step pipeline (Figma → block-craft → preview → Studio Import → save) collapsed FINALIZE + Forge polish steps into a single "Studio → Import HTML → Process panel" line. Post-WP-038, the chain has 7 distinct steps with the FINALIZE handoff in step 3 (sandbox write) and Forge polish in step 4. Step 6 explicitly notes the Process-panel concern is image-upload-only for block-craft output (skill emits scoped tokens — no token-scan needed). Re-finalize loop documented as a separate sub-section (preserves 8 metadata fields; durability of Forge UI mutations).

### Integration

Single Edit replacing lines 434-462. Use `## Block creation workflow (WP-006, ADR-023, ADR-024)` heading line + the next paragraph for anchor uniqueness. New heading is `## Block creation workflow (WP-006, ADR-023, ADR-024, WP-035, WP-038)`.

---

## Task 2.4: `.context/CONVENTIONS.md` — Block authoring action table row (lines ~1131-1156)

### What to Build

Append a new row to the action table at line 1137 area. Existing table:

```markdown
| Action | Path | Notes |
|---|---|---|
| Edit a block visually | Forge `[Save]` writes to `tools/block-forge/blocks/<slug>.json` (sandbox) | Production seed at `content/db/blocks/` is read-only from Forge |
| Duplicate for experiment | Forge `[+ Clone]` creates `<slug>-copy-N.json` (auto-suffix 1–99) | `id` stripped; same sandbox; race-safe `wx`-flag write |
| Ship to production | Forge `[Export]` → Copy payload OR Download JSON → Studio `[Import JSON]` → DB via `POST /api/blocks/import` | Server-side auto-revalidate (body `'{}'`); failures non-fatal |
| Legacy direct-edit | `BLOCK_FORGE_SOURCE_DIR=<abs>` env override | Escape hatch only; undocumented in UI |
| Bulk seed → DB (legacy) | `/content-push` skill | Reads `content/db/blocks/`; not affected by Forge |
```

After (insert NEW row 1 — "Create new block from Figma" — at the top, BEFORE "Edit a block visually"):

```markdown
| Action | Path | Notes |
|---|---|---|
| Create new block from Figma | `/block-craft` skill iterates `tools/studio-mockups/<name>.html` at `:7777`; on user signal, FINALIZE writes 11-key BlockJson to `tools/block-forge/blocks/<slug>.json` (sandbox) | Third sandbox seed source (alongside first-run + Clone); see saved memory `feedback_block_craft_finalize_protocol`; `id` field omitted; re-finalize preserves 8 metadata fields |
| Edit a block visually | Forge `[Save]` writes to `tools/block-forge/blocks/<slug>.json` (sandbox) | Production seed at `content/db/blocks/` is read-only from Forge |
| Duplicate for experiment | Forge `[+ Clone]` creates `<slug>-copy-N.json` (auto-suffix 1–99) | `id` stripped; same sandbox; race-safe `wx`-flag write |
| Ship to production | Forge `[Export]` → Copy payload OR Download JSON → Studio `[Import JSON]` → DB via `POST /api/blocks/import` | Server-side auto-revalidate (body `'{}'`); failures non-fatal |
| Legacy direct-edit | `BLOCK_FORGE_SOURCE_DIR=<abs>` env override | Escape hatch only; undocumented in UI |
| Bulk seed → DB (legacy) | `/content-push` skill | Reads `content/db/blocks/`; not affected by Forge |
```

Also update the "**Don't:**" list at line 1144 area — append two new entries:

```markdown
**Don't:**
- Add a "publish from Forge" button that bypasses Studio (defeats the gate; saved memory `feedback_forge_sandbox_isolation`)
- Modify `content/db/blocks/` from Forge code paths (production seed is read-only from Forge)
- Hardcode `id` in cloned payloads (sandbox doesn't enforce; DB resolves on next import)
- Use path-scoped revalidate body (always `'{}'` per saved memory `feedback_revalidate_default`)
- Auto-finalize from `/block-craft` without an explicit user signal (FINALIZE is opt-in; saved memory `feedback_block_craft_finalize_protocol`)
- Narrow re-finalize preservation to just `variants` (preserve all 8 metadata fields: slug, name, block_type, is_default, sort_order, hooks, metadata, variants)
```

Also update References list (lines ~1151-1156) — append:

```markdown
References:
- `tools/block-forge/PARITY.md` §WP-035 — Sandbox + Export
- `apps/studio/src/pages/block-editor/responsive/PARITY.md` §WP-035 — Studio Import
- `.context/SKILL.md` §Block authoring loop
- `workplan/WP-035-block-forge-sandbox-export-import.md`
- `logs/wp-035/phase-{0,1,2,3,5}-result.md`
- `workplan/WP-038-block-craft-finalize-to-forge-json.md`
- `logs/wp-038/phase-{0,1,2}-result.md`
```

Update section heading too: `## Block authoring (WP-035 — 2026-04-28)` → `## Block authoring (WP-035 + WP-038 — 2026-04-28)`.

### Why

Action table now includes `/block-craft` finalize as the FIRST row (creation precedes editing — natural reading order). "Don't" list grows by 2 entries (auto-finalize guard + re-finalize preservation guard) — both anchor to the new saved memory. Reference list grows by 2 (WP-038 doc + result logs). Heading update reflects WP-038's contribution.

### Integration

Three Edit operations on the same section:
1. Section heading (line 1131): add `+ WP-038` to title
2. Action table (line 1137): insert new row at top
3. "Don't" list (line 1144): append 2 entries
4. References (line 1151): append 2 entries

Use precise multi-line anchors to avoid collision.

---

## Task 2.5: `.context/BRIEF.md` — line 175 chain correction

### What to Build

Current line 175:

```markdown
- **Block** = HTML + scoped CSS + JS in `blocks` table. Has hooks for dynamic data. Created via Figma → `/block-craft` skill → Studio import → Process panel. Animations: CSS scroll-driven (entrance) + animate-utils.js (behavioral). Components: `.cms-btn` classes from portal-blocks.css. ADR-023, ADR-024.
```

Replace with:

```markdown
- **Block** = HTML + scoped CSS + JS in `blocks` table. Has hooks for dynamic data. Created via Figma → `/block-craft` skill iterate at `:7777` → FINALIZE → Forge sandbox (`tools/block-forge/blocks/`) → responsive polish → Export → Studio Import → DB. Animations: CSS scroll-driven (entrance) + animate-utils.js (behavioral). Components: `.cms-btn` classes from portal-blocks.css. ADR-023, ADR-024, WP-035, WP-038.
```

### Why

Replaces the legacy 4-step chain (`Figma → /block-craft → Studio import → Process panel`) with the WP-038 7-step chain. `WP-035, WP-038` references appended to the trailing ADR list so the chain is auditable from BRIEF alone.

### Integration

Single Edit. Anchor by exact text match of the entire bullet (it's unique in BRIEF.md).

---

## Task 2.6: `tools/block-forge/PARITY.md` — `/block-craft` seed source as new H2 entry

### What to Build

Append a NEW H2 entry AFTER the existing WP-035 entry's last bullet, mirroring the convention that every WP gets its own top-level `## WP-NNN — Title` section (WP-033 / WP-034 / WP-035 / WP-036 / WP-037 are all H2). Embedding under WP-035 as H3 would break the H2-per-WP scanning convention.

Append (after the WP-035 §"Tests:" bullet list ends):

```markdown
## WP-038 — `/block-craft` FINALIZE to Forge sandbox (Forge-only; asymmetric by design)

**Surface:** `.claude/skills/block-craft/SKILL.md` Step 6 (FINALIZE Protocol) + SPLIT Contract section. The skill writes directly to `tools/block-forge/blocks/<slug>.json` via the Write tool — NOT through Forge's `POST /api/blocks/:slug` middleware route (that endpoint is overwrite-only with 404-if-absent semantics; the skill creates new files OR overwrites existing sandbox JSONs).

**Studio mirror:** **NONE.** `/block-craft` is upstream of Forge. Studio's role (`POST /api/blocks/import` upsert-by-slug) is unchanged by WP-038 — the third seed source is sandbox-INPUT only, not production-roundtrip output. The WP-035 production-roundtrip asymmetry (ExportDialog in Forge with NO Studio mirror; ImportDialog in Studio with NO Forge mirror) is orthogonal and remains intact.

**Contract:**
- **Trigger interpretation** — natural-language only with PROCEED/DECLINE/CLARIFY precedence. Iterate verb (`change`, `поправ`, `додай`) wins over save signal (`забираю`, `ship`, `finalize`); explicit decline (`ні`, `wait`) wins over both. Pure affirmative (`ок`, `норм`) → CLARIFY (ask once); default → DECLINE (finalize is opt-in).
- **CONFIRM step always runs** — slug + name with filename-first proposal (`<h1>`/`<h2>` fallback when filename is generic); collision warning shows mtime + size; user confirms / overrides / aborts. Maximum 2 confirm rounds.
- **SPLIT contract is deterministic + idempotent** — strip `<!DOCTYPE>` / `<head>` / `<body>` / `<style data-preview-only>` wrappers; preserve outer `<section class="block-{slug}" data-block>...</section>` verbatim; strip global resets (`*, *::before, *::after { ... }`) and `body`/`html` rules from CSS; strip `<script>` tag wrappers from JS body; skip preview-only scripts. Works on full preview pages AND pre-stripped fragments.
- **`id` field OMITTED** — Studio Import server-resolves on insert via `importBlockSchema.id` optional (`packages/validators/src/block.ts:89`); empirical safety: `performCloneInSandbox` strips id and Forge handles id-less files identically; no consumer in `tools/block-forge/src` reads `block.id`.
- **Re-finalize preserves 8 metadata fields** from existing sandbox JSON: `slug`, `name`, `block_type`, `is_default`, `sort_order`, `hooks`, `metadata`, `variants`. Only `html`, `css`, `js` are recomputed from current studio-mockups HTML. Mental model: studio-mockups HTML owns *content*; Forge sandbox JSON owns everything *about* the block. Narrow `variants`-only preservation would silently overwrite block_type / is_default mutations from Forge UI — real data-loss bug.
- **WRITE format** — `JSON.stringify(payload, null, 2) + '\n'`; byte-parity with Forge's `POST /api/blocks/:slug` writeFile convention (`tools/block-forge/vite.config.ts:333`); same shape as ExportDialog payload + Clone output.
- **LEAVE-AS-IS** — `tools/studio-mockups/<name>.html` stays on disk post-finalize (sticky iterate target); user may return for desktop tweaks; re-finalize is allowed and idempotent.

**Inverted-mirror contract:** none on Studio side — `/block-craft` is upstream of both surfaces. Cross-reference: see `## WP-035 — Sandbox + Export` (above) for the shared sandbox-isolation contract; WP-038 adds a third seed source (alongside first-run + Clone) without modifying the production roundtrip.

**Tests:**
- Skill behavior validated via live smoke (deferred from Phase 1 §1.7 — first user-driven `/block-craft` post-Phase-1-commit is the natural smoke point).
- Cross-doc parity captured in: `.context/SKILL.md` §Block authoring loop (3 seed sources diagram); `.context/CONVENTIONS.md` §Block creation workflow (7-step pipeline) + §Block authoring action table (Create new block from Figma row).

**Skill commit reference:** `13c029b5` — `feat(skill): WP-038 Phase 1 — /block-craft FINALIZE protocol + SPLIT contract + Ruling fixes`.

**See:** `workplan/WP-038-block-craft-finalize-to-forge-json.md`, saved memory `feedback_block_craft_finalize_protocol`, sister memory `feedback_forge_sandbox_isolation` (WP-035 production roundtrip asymmetry — third sandbox seed source orthogonal).
```

### Why

PARITY.md follows "one H2 per WP" convention (WP-033 / WP-034 / WP-035 / WP-036 / WP-037 are all top-level `## WP-NNN — Title`). Embedding WP-038 as `### WP-038 follow-up` under `## WP-035 — Sandbox + Export` would make WP-038 visually subordinate and break scanning. Cross-references via `**See:** ## WP-035 — Sandbox + Export` achieve "contiguous related contracts" without convention violation. Section structure (Surface / Studio mirror / Contract / Inverted-mirror / Tests / Skill commit / See) mirrors WP-035 entry shape.

### Integration

Single Edit. Append the new H2 entry AFTER the WP-035 §"Tests:" bullet list (which currently ends `tools/block-forge/src/__tests__/sandbox-seed.test.ts — 7 cases (...)` per audit step 6). Anchor by exact match of the last bullet line + a blank line, then write the new section. If §"WP-035 — Sandbox + Export" is the last section in PARITY.md (verify in audit step 6), use end-of-file append.

---

## Task 2.7: WP-038 doc status flip + Phase 2 SHA backfill

### What to Build

Update `workplan/WP-038-block-craft-finalize-to-forge-json.md`:

**Status line (line 5):**

Current:
```markdown
**Status:** 🟡 IN PROGRESS — drafted 2026-04-28 after user surfaced the gap during WP-035 close
```

New:
```markdown
**Status:** ✅ DONE — closed 2026-04-28; FINALIZE protocol shipped; cross-doc batch + saved memory + Forge PARITY entry + figma-use plugin-namespaced ratification documented
```

**Commit Ladder (line 28-32 area):**

Current Phase 2 row reads `TBD | TBD`. Replace with the Phase 2 commit SHA (Hands fills in post-commit OR Brain backfills in a follow-up commit per WP-035 precedent):

```markdown
| 2 (Close) | logs/wp-038/phase-2-task.md | <PHASE_2_COMMIT_SHA> | (incl. in <PHASE_2_COMMIT_SHA>) |
```

### Why

Status flip is the canonical close marker. SHA backfill mirrors WP-035 Phase 5 close precedent — task prompt commit reference for the WP doc itself; result.md included in the Phase 2 commit.

### Integration

Two Edits in the WP doc; use exact-line anchors for both.

If Brain prefers a separate follow-up commit for the SHA backfill (WP-035 precedent), Hands writes Phase 2 result.md WITHOUT the SHA filled in, commits the doc batch (status flip + Phase 2 row TBD), captures the new commit SHA, runs a small follow-up commit `docs(wp-038): backfill phase 2 SHA in commit ladder + result.md [WP-038 phase 2 followup]`. Same pattern as Phase 0 + Phase 1 follow-ups (`19718980`, `3c43bbc8`).

---

## Task 2.8: `figma-use` reference ratification (Phase 1 carry-over)

### What to Build

Phase 1 dropped the `figma-use` reference from SKILL.md Step 1 per Phase 0 Ruling C (skill marked stale because `.claude/skills/figma-use/` does NOT exist). Phase 1 execution surfaced that `figma:figma-use` IS available as a plugin-namespaced skill marked **MANDATORY prerequisite** before every `use_figma` call.

**Decision required:** ratify the drop OR re-add a forward pointer.

**Recommendation:** RATIFY THE DROP, but document the rationale in the Phase 2 result.md and the saved memory.

Rationale for ratification:
1. **Auto-skill-load is the CC harness contract** — when `use_figma` is called, the harness auto-loads `figma:figma-use` (as documented in the system-reminder slash-skill listing). The explicit "MANDATORY prerequisite" guard in the skill body is for human readers; the harness enforces it independently of any forward pointer.
2. **Plugin namespace ≠ project skill** — the project's `.claude/skills/` are project-owned (versioned in repo); plugin-namespaced skills are third-party (loaded from plugin directory). Pointing the project's `/block-craft` skill at a plugin-namespaced skill couples the project to a third-party plugin's exact name + lifecycle. If the plugin renames, the project skill breaks.
3. **No empirical failure** — Phase 1 verification did not produce a "missing prerequisite" error; live smoke is deferred but the protocol's Step 1 prose still describes the user's intent ("call `use_figma` (MCP tool, when available)") which the harness will honor.

**Optional alternative (NOT recommended unless Brain disagrees with ratification):** re-add a forward pointer with the project-relative form. Edit `.claude/skills/block-craft/SKILL.md` Step 1, replacing `call use_figma (MCP tool, when available)` with:

```markdown
1. When the user shares a Figma URL/node, call `use_figma` (MCP tool, when available) — the harness auto-loads its prerequisite skill (`figma:figma-use`) on first invocation. If MCP is unavailable, ask the user to paste a screenshot of the design.
```

### Integration

If RATIFY (recommended), Phase 2 makes NO further edit to SKILL.md — the Phase 1 line stays as committed in `13c029b5`. Phase 2 result.md documents the ratification reasoning (3 points above) and links to the saved memory's "How to apply" section.

If RE-ADD POINTER (alternative), Phase 2 includes a 4th edit to SKILL.md (the line above). Brain decides — recommended ratification minimizes scope drift.

### Phase 2 task default behavior

Hands defaults to **RATIFY** (the recommendation). Brain may override pre-commit by replying "re-add the figma-use pointer" — Hands then includes the SKILL.md edit before result.md is written.

---

## Files to Modify

- **NEW:** `C:\Users\dmitr\.claude\projects\C--work-cmsmasters-portal-app-cmsmasters-portal\memory\feedback_block_craft_finalize_protocol.md` — saved memory file (Task 2.1)
- **MODIFIED:** `C:\Users\dmitr\.claude\projects\C--work-cmsmasters-portal-app-cmsmasters-portal\memory\MEMORY.md` — index entry append (Task 2.1)
- **MODIFIED:** `.context/SKILL.md` — Block authoring loop section update (Task 2.2)
- **MODIFIED:** `.context/CONVENTIONS.md` — Block creation workflow pipeline rewrite + Block authoring action table row + "Don't" list + References (Tasks 2.3 + 2.4)
- **MODIFIED:** `.context/BRIEF.md` — Block bullet chain correction (Task 2.5)
- **MODIFIED:** `tools/block-forge/PARITY.md` — `/block-craft` follow-up sub-section appended to WP-035 entry (Task 2.6)
- **MODIFIED:** `workplan/WP-038-block-craft-finalize-to-forge-json.md` — status flip + Phase 2 row SHA (Task 2.7)
- **NEW:** `logs/wp-038/phase-2-result.md` — execution log for Phase 2

**Conditional:** `.claude/skills/block-craft/SKILL.md` — only IF Brain reverses Task 2.8 default (re-add figma-use pointer).

**No source code touched.** No `domain-manifest.ts` edit. No tests added/changed.

---

## Acceptance Criteria

- [ ] `feedback_block_craft_finalize_protocol.md` saved memory file exists with frontmatter (`name`, `description`, `type: feedback`) + body covering 6 "How to apply" rules + 5 "When asked to ... DECLINE" guards + References
- [ ] `MEMORY.md` index has new entry pointing at `feedback_block_craft_finalize_protocol.md`, ≤150 chars
- [ ] `.context/SKILL.md` §"Block authoring loop" diagram shows 3 seed sources box + Forge box + Studio box; invariants list has the new `/block-craft` bullet; References list includes WP-038 + sister memory
- [ ] `.context/CONVENTIONS.md` §"Block creation workflow" pipeline has 7 steps reflecting Forge sandbox handoff (was 5); §"Re-finalize loop" sub-section added
- [ ] `.context/CONVENTIONS.md` §"Block authoring (WP-035 + WP-038 — 2026-04-28)" action table has 6 rows (was 5); first row is "Create new block from Figma"
- [ ] `.context/CONVENTIONS.md` §"Block authoring" "Don't" list has 6 entries (was 4); "References" list has 7 items (was 5)
- [ ] `.context/BRIEF.md` Block bullet chain reads `Figma → /block-craft → :7777 iterate → FINALIZE → Forge sandbox → polish → Export → Studio Import → DB`; trailing references include `WP-035, WP-038`
- [ ] `tools/block-forge/PARITY.md` has new H2 entry `## WP-038 — /block-craft FINALIZE to Forge sandbox (Forge-only; asymmetric by design)` appended after §"WP-035 — Sandbox + Export"; mirrors WP-035 entry shape (Surface / Studio mirror / Contract / Inverted-mirror / Tests / See)
- [ ] `workplan/WP-038-...md` status line shows `✅ DONE — closed 2026-04-28...`
- [ ] `workplan/WP-038-...md` Commit Ladder Phase 2 row has SHA (or follow-up commit SHA per WP-035 precedent)
- [ ] `logs/wp-038/phase-2-result.md` exists with mandatory sections + figma-use ratification documented
- [ ] `npm run arch-test` passes 595 / 595 (no regression)
- [ ] `git status` shows only doc edits + new memory file + new Phase 2 result.md (no source code, no domain manifest, no tests)
- [ ] Brain approval gate engaged BEFORE commit (per `feedback_close_phase_approval_gate`)

---

## MANDATORY: Verification (do NOT skip — Brain approval gate goes here)

```bash
echo "=== WP-038 Phase 2 Verification ==="

# 1. Arch tests — MUST be unchanged from Phase 1
npm run arch-test
echo "(expect: 595 / 595)"

# 2. Saved memory file written + index entry added
test -f "C:/Users/dmitr/.claude/projects/C--work-cmsmasters-portal-app-cmsmasters-portal/memory/feedback_block_craft_finalize_protocol.md"
echo "(expect: file exists)"
grep -c "feedback_block_craft_finalize_protocol" "C:/Users/dmitr/.claude/projects/C--work-cmsmasters-portal-app-cmsmasters-portal/memory/MEMORY.md"
echo "(expect: ≥1)"

# 3. .context/SKILL.md updated
grep -c "Block authoring loop (post-WP-035 + WP-038" .context/SKILL.md
echo "(expect: 1)"
grep -c "/block-craft FINALIZE" .context/SKILL.md
echo "(expect: ≥1 — at least one mention in invariants)"

# 4. .context/CONVENTIONS.md updated
grep -c "Block creation workflow (WP-006, ADR-023, ADR-024, WP-035, WP-038)" .context/CONVENTIONS.md
echo "(expect: 1)"
grep -c "Block authoring (WP-035 + WP-038 — 2026-04-28)" .context/CONVENTIONS.md
echo "(expect: 1)"
grep -c "Create new block from Figma" .context/CONVENTIONS.md
echo "(expect: 1 — action table first row)"
grep -c "feedback_block_craft_finalize_protocol" .context/CONVENTIONS.md
echo "(expect: ≥2 — Don't list + References)"
grep -c "Re-finalize loop" .context/CONVENTIONS.md
echo "(expect: 1 — new sub-section)"

# 5. .context/BRIEF.md updated
grep -c "Figma → \`/block-craft\` skill iterate" .context/BRIEF.md
echo "(expect: 1 — new chain)"
grep -c "Created via Figma → \`/block-craft\` skill → Studio import → Process panel" .context/BRIEF.md
echo "(expect: 0 — old chain replaced)"

# 6. tools/block-forge/PARITY.md updated
grep -c "^## WP-038 — \`/block-craft\` FINALIZE to Forge sandbox" tools/block-forge/PARITY.md
echo "(expect: 1 — new H2 entry appended after WP-035)"

# 7. WP-038 status flip
grep -c "Status:\*\* ✅ DONE" workplan/WP-038-block-craft-finalize-to-forge-json.md
echo "(expect: 1)"
grep -c "🟡 IN PROGRESS" workplan/WP-038-block-craft-finalize-to-forge-json.md
echo "(expect: 0 — status was flipped)"

# 8. Phase 2 isolation — no source code mutation
git status --short | grep -vE "^\?\? logs/wp-038/" | grep -vE "\.context/|tools/block-forge/PARITY\.md|workplan/WP-038-|MEMORY|feedback_block_craft" | grep -E "^.M|^M.|^A|^D"
echo "(expect: empty — no other files modified)"

# 9. studio-mockups + Forge sandbox + production seed all untouched
git status --short tools/studio-mockups/ tools/block-forge/blocks/ content/db/blocks/
echo "(expect: empty — Phase 2 is documentation-only)"

# 10. Approval gate — STOP HERE, surface diff to Brain
git diff --stat
echo "(expect: ~6-8 files in diff; show to Brain for approval BEFORE commit)"

echo "=== Verification complete — AWAIT BRAIN APPROVAL ==="
```

If any check fails, STOP and surface — Phase 2 doc edits need correction.

**Brain approval gate:** Hands MUST stop after verification step 10 and surface the `git diff --stat` output to Brain. Brain reviews; if approved, Hands proceeds to result.md write + commit. If rejected, Brain provides edits; Hands applies + re-verifies + re-surfaces.

---

## MANDATORY: Write Execution Log (do NOT skip)

After Brain approval, before commit, create `logs/wp-038/phase-2-result.md`:

```markdown
# Execution Log: WP-038 Phase 2 — Close (cross-doc batch + saved memory + status flip)

> Epic: WP-038 Block Craft → Forge sandbox finalize step
> Executed: <ISO timestamp>
> Duration: <minutes>
> Status: ✅ COMPLETE
> Domains affected: NONE (docs + memory + WP doc only)

## What Was Implemented

(2-5 sentences summarizing all 8 sub-tasks: saved memory + 4 cross-doc edits + PARITY follow-up + status flip + figma-use ratification.)

## Key Decisions

| Decision | Chosen | Why |
|---|---|---|
| Saved memory: separate file vs extend `feedback_forge_sandbox_isolation` | separate | sandbox seed source is distinct from production roundtrip; sister-memory pattern (cross-references both ways) |
| `/block-craft` as third seed source — shape in PARITY | new H2 entry (mirrors WP-033/34/35/36/37 convention) | "one H2 per WP" parity beats "contiguous related contracts"; cross-references achieve same readability |
| figma-use ratification | RATIFIED (kept Phase 1 drop) | auto-skill-load via harness; project skill shouldn't depend on plugin namespace |
| Phase 2 commit shape | single doc batch + optional follow-up SHA backfill | mirrors WP-035 Phase 5 + Phase 1 close pattern |
| BRIEF.md chain length | inline (one bullet line) | preserve BRIEF brevity; full pipeline in CONVENTIONS |

## Files Changed

| File | Change | Description |
|---|---|---|
| `feedback_block_craft_finalize_protocol.md` | created | saved memory; sister to forge_sandbox_isolation |
| `MEMORY.md` | modified | index entry append |
| `.context/SKILL.md` | modified | Block authoring loop diagram + invariants for 3 seed sources |
| `.context/CONVENTIONS.md` | modified | Block creation workflow pipeline rewrite + Block authoring table row + Don't list + References |
| `.context/BRIEF.md` | modified | Block bullet chain correction |
| `tools/block-forge/PARITY.md` | modified | new H2 entry §WP-038 — /block-craft FINALIZE to Forge sandbox (mirrors WP-035 entry shape) |
| `workplan/WP-038-...md` | modified | status flip 🟡 → ✅ DONE; Commit Ladder Phase 2 row |
| `logs/wp-038/phase-2-result.md` | created | This file |

## Issues & Workarounds

(Edge cases during edits: anchor collisions, line-number drift, multi-match edit failures, etc. "None — clean execution" if so.)

## figma-use ratification (Phase 1 carry-over)

(Document the 3-point rationale verbatim from Task 2.8: auto-skill-load + plugin namespace independence + no empirical failure. Confirm decision = RATIFY DROP. If Brain reversed, document re-add edit instead.)

## Open Questions

(Anything not load-bearing for WP-038 close. e.g. "Future WP could re-add explicit forward pointer if plugin namespace becomes a stable cross-project dependency". "None" if no carry-overs.)

## Verification Results

| Check | Result |
|---|---|
| arch-test | ✅ 595 / 595 |
| Saved memory file + index | ✅ |
| .context/SKILL.md update | ✅ |
| .context/CONVENTIONS.md updates (×4: pipeline, table, Don't, References) | ✅ |
| .context/BRIEF.md chain correction | ✅ |
| PARITY.md follow-up | ✅ |
| WP-038 status flip ✅ DONE | ✅ |
| Phase 2 isolation (no source code) | ✅ |
| studio-mockups + sandbox + prod seed untouched | ✅ |
| Brain approval gate | ✅ approved (see "Brain handoff" below) |
| AC met | ✅ |

## Brain handoff

(Brief note: which version of the diff was approved, any pre-commit corrections applied. "Approved at <timestamp>; no corrections" if clean.)

## Git

- Phase 2 commit: `<sha>` — `docs(wp-038): WP-038 Close — cross-doc batch + saved memory + status flip [WP-038 phase 2]`
- Phase 2 SHA backfill (optional follow-up): `<sha>` — `docs(wp-038): backfill phase 2 SHA in commit ladder + result.md [WP-038 phase 2 followup]`
```

---

## Git

```bash
# After Brain approval:

git add \
  "C:/Users/dmitr/.claude/projects/C--work-cmsmasters-portal-app-cmsmasters-portal/memory/feedback_block_craft_finalize_protocol.md" \
  "C:/Users/dmitr/.claude/projects/C--work-cmsmasters-portal-app-cmsmasters-portal/memory/MEMORY.md" \
  .context/SKILL.md \
  .context/CONVENTIONS.md \
  .context/BRIEF.md \
  tools/block-forge/PARITY.md \
  workplan/WP-038-block-craft-finalize-to-forge-json.md \
  logs/wp-038/phase-2-task.md \
  logs/wp-038/phase-2-result.md

git commit -m "docs(wp-038): WP-038 Close — cross-doc batch + saved memory + status flip [WP-038 phase 2]

Cross-doc batch landing the FINALIZE protocol architecture in shared docs:
- saved memory feedback_block_craft_finalize_protocol — sister to forge_sandbox_isolation; documents trigger heuristic, SPLIT contract, 8-field re-finalize preservation, 5 'When asked ... DECLINE' guards
- .context/SKILL.md Block authoring loop — 3 seed sources diagram (first-run + Clone + /block-craft); invariant for /block-craft FINALIZE
- .context/CONVENTIONS.md Block creation workflow — 7-step pipeline post-WP-038 (vs legacy 5-step); new Re-finalize loop sub-section
- .context/CONVENTIONS.md Block authoring table — 'Create new block from Figma' first row; 2 new Don't entries (auto-finalize guard + 8-field preservation guard); 2 new References
- .context/BRIEF.md Block bullet — chain corrected (Figma → /block-craft → :7777 → FINALIZE → Forge → polish → Export → Studio → DB)
- tools/block-forge/PARITY.md — new H2 entry §WP-038 — /block-craft FINALIZE to Forge sandbox (mirrors WP-035 §Sandbox + Export shape); documents third-seed asymmetry (sandbox-input only)

WP-038 status flip 🟡 → ✅ DONE.

figma-use ratification: Phase 0 RECON missed plugin-namespaced figma:figma-use. Phase 1 followed Ruling C verbatim (drop reference). Phase 2 ratifies the drop — auto-skill-load via harness; project skill shouldn't depend on plugin namespace. Documented in result.md.

arch-test 595 / 595 unchanged. Source code untouched. studio-mockups + Forge sandbox + production seed untouched.

Brain approval: confirmed pre-commit per feedback_close_phase_approval_gate.

Phase 1 result: logs/wp-038/phase-1-result.md (commit 13c029b5)
Phase 2 result: logs/wp-038/phase-2-result.md (this commit)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"

# Optional follow-up commit for SHA backfill (mirrors WP-035 + Phase 1 pattern):
# Capture the SHA above, then:
git add workplan/WP-038-block-craft-finalize-to-forge-json.md logs/wp-038/phase-2-result.md
git commit -m "docs(wp-038): backfill phase 2 SHA in commit ladder + result.md [WP-038 phase 2 followup]"
```

---

## IMPORTANT Notes for CC

- **Brain approval gate ENGAGED.** This is a Close phase touching ≥3 doc files (6 total: 1 memory + 4 .context/ files + 1 PARITY.md + WP doc). Per saved memory `feedback_close_phase_approval_gate`, Hands MUST stop after verification step 10 and surface the `git diff --stat` to Brain. Do NOT commit autonomously.
- **Doc-only phase.** No source code touched, no `domain-manifest.ts` edit, no tests added. arch-test 595/595 must hold.
- **Saved memory path.** The memory dir is `C:\Users\dmitr\.claude\projects\C--work-cmsmasters-portal-app-cmsmasters-portal\memory\` — write `feedback_block_craft_finalize_protocol.md` there, NOT in the project repo.
- **Sister-memory pattern.** `feedback_forge_sandbox_isolation` is the production-roundtrip memory; `feedback_block_craft_finalize_protocol` is the sandbox-seed memory. They cross-reference each other at the bottom of both files.
- **Edit anchors.** Several files have moved since Phase 0 (BRIEF.md line 174 → 175 due to upstream edits). Use exact-text anchors, NOT line numbers, for all Edit operations. Run grep audits in Phase 2 Audit step BEFORE any edit lands.
- **Section heading updates.** Two heading rewrites: `Block creation workflow (WP-006, ADR-023, ADR-024)` → adds `, WP-035, WP-038`; `Block authoring (WP-035 — 2026-04-28)` → `Block authoring (WP-035 + WP-038 — 2026-04-28)`. Use the EXACT current heading line as anchor.
- **figma-use ratification default = RATIFY.** Hands defaults to keeping the Phase 1 drop. Brain may override pre-commit. Do NOT add a 4th SKILL.md edit unless Brain explicitly says "re-add the figma-use pointer".
- **Re-finalize 8-field preservation is non-negotiable.** It appears in saved memory + SKILL.md (Phase 1) + CONVENTIONS.md (Phase 2 Task 2.3) + PARITY.md (Phase 2 Task 2.6). Three places must agree on the field count + names. Cross-check before result.md write.

---
---

# BRAIN → OPERATOR HANDOFF SUMMARY

```markdown
Phase 2 Close промпт готовий: `logs/wp-038/phase-2-task.md`.

## Структура

**8 tasks (7 docs/memory edits + 1 ratification), ~30–60 min budget:**

| # | Task | Scope |
|---|------|-------|
| 2.1 | Saved memory `feedback_block_craft_finalize_protocol` | New file in user memory dir + MEMORY.md index entry; sister to `feedback_forge_sandbox_isolation` |
| 2.2 | `.context/SKILL.md` Block authoring loop | Diagram → 3 seed sources box; invariants list +1 bullet for /block-craft FINALIZE |
| 2.3 | `.context/CONVENTIONS.md` Block creation workflow | Pipeline 5 steps → 7-step post-WP-038; new Re-finalize loop sub-section |
| 2.4 | `.context/CONVENTIONS.md` Block authoring table | +1 first row "Create new block from Figma"; +2 Don't entries; +2 References |
| 2.5 | `.context/BRIEF.md` Block bullet | Chain correction: legacy 4-step → WP-038 7-step |
| 2.6 | `tools/block-forge/PARITY.md` | New sub-section under WP-035 entry; documents 3-seed-source asymmetry |
| 2.7 | WP-038 doc status flip | 🟡 IN PROGRESS → ✅ DONE; Commit Ladder Phase 2 row |
| 2.8 | figma-use ratification | DEFAULT: ratify Phase 1 drop. Document 3-point rationale in result.md. Brain may override. |

## Key rulings (locked at Phase 0 + Phase 1; Phase 2 codifies)

- Re-finalize preserves **8** metadata fields (slug, name, block_type, is_default, sort_order, hooks, metadata, variants) — NOT just variants
- Trigger heuristic: PROCEED/DECLINE/CLARIFY with iterate-verb wins over save signal
- Filename-first name proposal (fallback: <h1>/<h2> when filename is generic)
- studio-mockups HTML stays sticky post-finalize (LEAVE-AS-IS)
- /block-craft is third sandbox seed source (asymmetric input-only; doesn't contradict WP-035 production-roundtrip asymmetry)

## Hard gates (Phase 2)

- Zero source code touch — all edits in .context/, PARITY, memory, workplan
- Zero domain-manifest.ts edit — no tracked files
- Zero touch on tools/studio-mockups/, tools/block-forge/blocks/, content/db/blocks/
- arch-test 595/595 — must hold
- **Brain approval gate ENGAGED** — Hands stops after verification step 10 with git diff --stat surfaced
- Saved memory written to user memory dir (C:/Users/dmitr/.claude/projects/.../memory/), NOT project repo
- Sister-memory cross-reference: both feedback_forge_sandbox_isolation + feedback_block_craft_finalize_protocol link to each other

## Escalation triggers

- Phase 2 audit finds line numbers drifted significantly (e.g. SKILL.md §Block authoring loop renamed by another WP) → STOP, surface; task prompt anchors need updating
- Edit produces non-unique anchor on multi-line context → expand anchor to 5-line window; surface if still fails
- arch-test count drifts from 595 → STOP — Phase 2 mustn't touch source
- Brain reverses figma-use ratification → add 4th SKILL.md edit BEFORE result.md write
- Saved memory dir doesn't exist (new system / fresh CC install) → create dir; document in result.md Issues
- WP-035 PARITY entry has been moved/renamed since Phase 1 → use end-of-file append for WP-038 H2; document in result.md
- A WP-039+ entry has been appended to PARITY.md after WP-035 since Phase 1 → append WP-038 entry AFTER the latest H2 (chronological order); cross-reference to WP-035 still valid via §See

## Arch-test target

**595 / 0** — unchanged. Phase 2 is docs + memory + WP doc only; nothing tracked by `domain-manifest.ts`.

## Git state

- `logs/wp-038/phase-2-task.md` — new untracked
- Nothing staged

## Next

1. Review → commit → handoff Hands (Phase 2 task prompt commit)
2. АБО правки (особливо Task 2.4 action table row content, Task 2.6 PARITY follow-up text, Task 2.8 ratification default)
3. АБО self-commit if workflow permits

After Hands ships Phase 2:
- Brain approval gate engages mid-flight
- Hands surfaces git diff --stat
- Brain approves OR provides edits
- Hands commits doc batch
- Optional follow-up commit for Commit Ladder SHA backfill (mirrors WP-035 + Phase 1 pattern)
- WP-038 closes ✅ DONE

Чекаю.
```
