# WP-038 Phase 1: SKILL.md rewrite — FINALIZE protocol + SPLIT contract + Ruling fixes

> Workplan: WP-038 Block Craft → Forge sandbox finalize step — close the seeding gap
> Phase: 1 of 2 (Phase 2 ALIVE per Ruling E — cross-doc batch + saved memory + status flip)
> Priority: P1 — closes post-WP-035 architectural seam
> Estimated: 45–75 minutes
> Type: Skill rewrite (single file: `.claude/skills/block-craft/SKILL.md`); zero source code; zero test changes
> Previous: Phase 0 ✅ RECON pre-flight + 6 rulings A–F + GREEN product-RECON verdict (`logs/wp-038/phase-0-result.md`)
> Next: Phase 2 (Close — `.context/BRIEF.md` + `.context/SKILL.md` + `.context/CONVENTIONS.md` + `tools/block-forge/PARITY.md` + saved memory + WP doc status flip)
> Affected domains: NONE — `.claude/skills/*` outside `domain-manifest.ts`. Verification reads Forge sandbox + Forge UI; no source files mutated.

---

## Context

Phase 0 RECON closed with 6 locked rulings + GREEN product-RECON. Phase 1 executes those rulings against `.claude/skills/block-craft/SKILL.md` (471 lines). The skill currently writes a single HTML preview file at `tools/studio-mockups/<name>.html` and tells the user to "import the HTML file into Studio → Process panel → Save" (Step 6, lines ~85–88). Phase 1 replaces Step 6 with a **FINALIZE protocol** that:

1. Detects natural-language finalize triggers ("забираю", "готово", etc.) per Ruling D / §0.7 heuristic
2. ALWAYS asks user to confirm slug + name with auto-derived proposal (Ruling 4 from prior chat)
3. SPLITS the studio-mockups HTML into an 11-key BlockJson per Ruling A (id-omitted per Ruling B; legacy global resets stripped; outer `<section>` preserved; `<script>` tags stripped from js)
4. Writes to `tools/block-forge/blocks/<slug>.json` (the WP-035 sandbox)
5. Tells user to refresh Forge :7702 and continue with responsive polish → Export → Studio Import → DB

Phase 1 does NOT touch Steps 1–5 (Figma read, tokens, generate HTML, serve :7777, iterate) except for one surgical line in Step 1 — drop the stale `figma-use` reference per Ruling C. Steps 1–5 are the ITERATE loop and must remain identical to preserve fast feedback (edit HTML → save → browser reload).

Phase 1 also makes two surgical surgical tweaks beyond Step 6:

- Front-matter `description` updated to mention "writes BlockJson to Forge sandbox on finalize" (so the skill is discoverable when user describes the full workflow, not just the "create block from Figma" entry point)
- Hook Shortcuts table (lines ~365–376) gets +2 rows for `{{primary_categories}}` and `{{perfect_for}}` per Ruling F (parity drift surfaced in §0.6 vs `packages/db/src/slot-registry.ts:52-77`)
- "What NOT to Do" list gets +3 rows: don't auto-finalize without user signal; don't silent-overwrite Forge sandbox; don't delete/rename studio-mockups HTML after finalize

```
CURRENT  ✅  Step 1 references missing `figma-use` skill (line 35 — STALE per §0.4)
CURRENT  ✅  Step 6 says "Ready for Studio import" + "User imports the HTML file into Studio → Process panel"
CURRENT  ✅  Hook Shortcuts table missing {{primary_categories}} + {{perfect_for}} (drift per §0.6)
CURRENT  ✅  Studio-mockups HTML preview at :7777 (kept verbatim — iterate loop)
CURRENT  ✅  Forge sandbox at tools/block-forge/blocks/ (WP-035 Phase 3, vite.config.ts:18)
CURRENT  ✅  importBlockSchema accepts id-optional payload (block.ts:89)
CURRENT  ✅  arch-test 595 / 595 (post-WP-035 baseline)

MISSING  ❌  FINALIZE protocol section in SKILL.md
MISSING  ❌  SPLIT contract documentation (HTML preview → 11-key BlockJson rules)
MISSING  ❌  Trigger interpretation heuristic (PROCEED / DECLINE / CLARIFY 3-class)
MISSING  ❌  Slug+name confirm-with-proposal protocol
MISSING  ❌  Slug collision warning (mtime + size readout, overwrite/abort/rename)
```

Phase 1 is **skill-only**. Zero source code touched, zero domain manifest edits, zero test changes. arch-test stays 595/595.

---

## Domain Context

**No domains affected** — `.claude/skills/*` is outside `domain-manifest.ts`. Phase 1 reads:

- `.claude/skills/block-craft/SKILL.md` — the file under rewrite (471 lines)
- `tools/block-forge/vite.config.ts:18-23` — sandbox path target (`SANDBOX_DIR_DEFAULT`)
- `tools/block-forge/blocks/` — sandbox state (live)
- `content/db/blocks/*.json` — 4 representative block JSONs (split-rule ground truth — already audited in Phase 0 §0.1)
- `packages/validators/src/block.ts:86-107` — `importBlockSchema` shape (id-optional confirmed Phase 0 §0.3)
- `packages/db/src/slot-registry.ts:52-77` — `HOOK_SHORTCUTS` source of truth (parity check Phase 0 §0.6)

Phase 1 invariants to preserve (skill is documentation, not code, but downstream contracts must hold):

- **Forge sandbox is the WP-035 destination.** Skill writes to `tools/block-forge/blocks/<slug>.json` directly via Write tool — NOT via Forge's `POST /api/blocks/:slug` (that endpoint is overwrite-only with 404-if-absent semantics; skill creates new files OR overwrites existing).
- **Sandbox isolation per saved memory `feedback_forge_sandbox_isolation`.** Skill MUST NOT write to `content/db/blocks/`. Production seed is read-only; only Studio Import via WP-035 Phase 2 endpoint mutates DB.
- **Pretty-printed JSON + trailing newline** matching Forge's own writeBlock convention (`JSON.stringify(payload, null, 2) + '\n'` per vite.config.ts:333). Round-trip parity with Forge's own saves.
- **Studio-mockups HTML stays on disk** post-finalize per Brain ruling 2 (LEAVE-AS-IS).

---

## Phase 1 Audit (do FIRST — quick re-baseline)

```bash
# 0. Baseline
npm run arch-test                                                    # expect: 595 / 595 (Phase 0 close)

# 1. Confirm SKILL.md still at known shape (line counts inform Edit anchors)
wc -l .claude/skills/block-craft/SKILL.md                            # expect: ~470-475 lines
grep -nE "^(##|###) " .claude/skills/block-craft/SKILL.md            # expect: 14-16 section headers — sanity check

# 2. Confirm Step 1 figma-use reference still on line 35 (Ruling C target)
sed -n '30,40p' .claude/skills/block-craft/SKILL.md                  # expect: "Use the `figma-use` skill first..."

# 3. Confirm Step 6 still says "Ready for Studio import" (Ruling D replacement target)
grep -nE "Step 6|Ready for Studio import" .claude/skills/block-craft/SKILL.md
# expect: line 85 "### Step 6: Ready for Studio import" + line 87 "User imports the HTML file..."

# 4. Confirm Hook Shortcuts table at lines ~365-376 (Ruling F target)
sed -n '365,380p' .claude/skills/block-craft/SKILL.md                # expect: 6-row table

# 5. Confirm sandbox path is live (Ruling A write target)
ls tools/block-forge/blocks/ | wc -l                                 # expect: ≥10 (9 .json + .gitkeep)

# 6. Confirm slot-registry HOOK_SHORTCUTS still has the 2 new rows (Ruling F append)
grep -nE "primary_categories|perfect_for" packages/db/src/slot-registry.ts
# expect: lines 56-57 — { pattern: '{{primary_categories}}', ... } + { pattern: '{{perfect_for}}', ... }

# 7. Confirm pre-existing dirty diff doesn't include SKILL.md (Phase 0 §0 finding)
git status --short .claude/skills/block-craft/                       # expect: empty (no pre-existing edits)
```

**Document re-baseline findings in result.md.** If any audit step fails, STOP and surface — Phase 0 invariant violated.

---

## Task 1.1: Front-matter `description` update

### What to Build

Update the front-matter `description` field (line 3) to mention the finalize step. Current:

```yaml
description: Create production-ready portal blocks from Figma designs. Use when user shares a Figma link/node, says create block, зроби блок, зверстай секцію, or wants to build an HTML+CSS+JS block for the CMSMasters portal. Serves live preview on port 7777.
```

New:

```yaml
description: Create production-ready portal blocks from Figma designs. Use when user shares a Figma link/node, says create block, зроби блок, зверстай секцію, забираю в forge, or wants to build an HTML+CSS+JS block for the CMSMasters portal. Iterates HTML preview on port 7777; on user signal, finalizes to Forge sandbox JSON (tools/block-forge/blocks/<slug>.json) ready for responsive polish + Studio Import.
```

### Why

Skill must be discoverable by both ENTRY-POINT phrases ("create block", "зроби блок") AND FINALIZE phrases ("забираю в forge"). Current description only matches entry-point — natural-language trigger discovery (Ruling D) requires "забираю" + "forge" tokens visible to skill router.

### Integration

Single Edit on line 3. No structural changes elsewhere.

---

## Task 1.2: Step 1 figma-use reference correction (Ruling C)

### What to Build

Remove the stale `figma-use` skill reference. Current (line 35):

```markdown
1. Use the `figma-use` skill first (MANDATORY before any `use_figma` call)
2. Read the node — get layout, styles, text content, images, spacing
3. Understand the visual hierarchy, sections, interactive elements
```

Replace with:

```markdown
1. When the user shares a Figma URL/node, call `use_figma` (MCP tool, when available) to read the node directly. If MCP is unavailable, ask the user to paste a screenshot of the design.
2. Read the node — get layout, styles, text content, images, spacing
3. Understand the visual hierarchy, sections, interactive elements
```

### Why

Phase 0 §0.4 confirmed `.claude/skills/figma-use/` does NOT exist. Current line 35 is a load-bearing "MANDATORY" instruction pointing at nothing — bound to fail on first reference. Drop the gate; describe the actual entry point (`use_figma` MCP tool when available, screenshot paste when not).

### Integration

Single Edit, replace one numbered line. Numbered list 1–3 stays; only item 1 prose changes.

---

## Task 1.3: Hook Shortcuts table +2 rows (Ruling F)

### What to Build

Append two rows to the Hook Shortcuts table (current rows: 6; new rows: 8). The table is at lines ~369-376. Current:

```markdown
| Pattern | Resolves to | Description |
|---------|-------------|-------------|
| `{{price}}` | `theme.meta.price` | Price with $ prefix |
| `{{discount_price}}` | `theme.meta.discount_price` | Discount price with $ prefix |
| `{{link:field}}` | `theme.meta[field]` | URL from meta field (e.g. `{{link:demo_url}}`) |
| `{{tags}}` | `theme_tags join tags` | Comma-separated tag names |
| `{{theme_details}}` | `theme.meta.theme_details` | Icon + label + value list (Theme Details sidebar) |
| `{{help_and_support}}` | `theme.meta.help_and_support` | Icon + label + value list (Help & Support sidebar) |
```

After (insert two rows BEFORE `{{tags}}` to mirror the registry order at `packages/db/src/slot-registry.ts:52-77`):

```markdown
| Pattern | Resolves to | Description |
|---------|-------------|-------------|
| `{{price}}` | `theme.meta.price` | Price with $ prefix |
| `{{discount_price}}` | `theme.meta.discount_price` | Discount price with $ prefix |
| `{{link:field}}` | `theme.meta[field]` | URL from meta field (e.g. `{{link:demo_url}}`) |
| `{{primary_categories}}` | `theme_categories (is_primary=true) join categories` | Badge pills for primary categories |
| `{{perfect_for}}` | `theme_use_cases join use_cases` | HTML list of use cases ("Perfect for" sidebar) |
| `{{tags}}` | `theme_tags join tags` | Comma-separated tag names |
| `{{theme_details}}` | `theme.meta.theme_details` | Icon + label + value list (Theme Details sidebar) |
| `{{help_and_support}}` | `theme.meta.help_and_support` | Icon + label + value list (Help & Support sidebar) |
```

### Why

Phase 0 §0.6 surfaced 2 hooks present in `HOOK_SHORTCUTS` (slot-registry.ts:56-57) but missing from skill table. Skill claims slot-registry is source of truth (line 322); drift breaks that invariant. +2 rows close it.

### Integration

Single Edit, replace the entire 6-row table with 8-row version. Order matches registry definition order.

---

## Task 1.4: Add SPLIT Contract section (Ruling A + B)

### What to Build

Add a new section `## SPLIT Contract — Studio-Mockups HTML → BlockJson` immediately BEFORE the existing `## Checklist` section (current line ~398). This section documents the deterministic rules for converting an iterated `tools/studio-mockups/<name>.html` file into the 11-key BlockJson Forge expects.

Section content (verbatim — Hands writes this into SKILL.md):

```markdown
## SPLIT Contract — Studio-Mockups HTML → BlockJson

When the user signals FINALIZE (see "FINALIZE Protocol" below), the skill assembles an 11-key BlockJson from the current `tools/studio-mockups/<name>.html` and writes it to `tools/block-forge/blocks/<slug>.json`.

The split is deterministic — same input HTML → same output JSON every time. No LLM judgment in field extraction; only in slug/name confirm proposal.

### 11-key shape + ordering

The keys MUST be emitted in this exact order to match the convention observed across `content/db/blocks/*.json`:

```
slug, name, block_type, is_default, sort_order, hooks, metadata, html, css, js, variants
```

`id` is **OMITTED** — not emitted on FINALIZE. Reason: `importBlockSchema.id` is optional (`packages/validators/src/block.ts:89`); Studio Import server-resolves on insert; `performCloneInSandbox` (`tools/block-forge/vite.config.ts:67`) strips `id` and Forge handles id-less files identically; no consumer in `tools/block-forge/src` reads `block.id`. Mirroring Clone semantics.

### Field extraction rules

**`slug`** (string)
Confirmed in CONFIRM step. Default proposal: `nameToSlug(name)` — kebab-case, ASCII, `[a-z0-9-]` only.

**`name`** (string)
Confirmed in CONFIRM step. Default proposal: lowercase space-separated form (e.g. `"fast loading speed"` not `"Fast Loading Speed"`) — matches convention observed across production seed.

**`block_type`** (string)
Default `""` for "section" blocks (the common case for `/block-craft` output). Override only if user explicitly signals slot-category alignment ("це новий header" → `"header"` + `is_default: true`). Empty string is the safe default; Studio can re-tag later.

**`is_default`** (boolean)
Default `false`. `true` ONLY if user explicitly says it's a slot-category default (rare for `/block-craft` output).

**`sort_order`** (number)
Always `0`. Sorting happens in Studio.

**`hooks`** (object)
Always `{}`. User adds hooks (e.g. `{{meta:price}}`) inside the HTML body; the `hooks` field is not used by current portal renderer (legacy concept — kept for schema parity).

**`metadata`** (object)
Always `{}`. Skill does NOT emit `metadata.thumbnail_url` — that field is owned by Studio Process panel post-Save (R2 upload returns a URL).

**`html`** (string)
ONLY the `<section class="block-{slug}" data-block>...</section>` segment, extracted from the studio-mockups HTML body. Strip:
- `<!DOCTYPE html>`, `<html>`, `<head>`, `<body>` wrapping
- All `<link>`, `<meta>`, `<title>` inside `<head>`
- `<style data-preview-only>` block (preview-only, never part of the block)
- Any wrapping `<script>` tags (their content goes into `js`, see below)
- Any preview-data injection scripts (`<script id="preview-data">` or scripts whose only effect is to inject a `<template>` element for the preview)

Outer `<section>` tag preserved verbatim, including `data-block`, `data-fluid-tablet`, `data-fluid-mobile`, and any other `data-*` attributes set during iterate.

Strip rules are **idempotent** — if the studio-mockups HTML is already minimal (no `<!DOCTYPE>`, no `<head>`, only the `<section>` element + adjacent `<style>` and `<script>` siblings), strip operations are no-ops. SPLIT works on both full preview pages AND pre-stripped fragments (e.g. when a user manually prepares a minimal HTML, or when re-finalizing after an upstream tool already did the trimming).

**`css`** (string)
ONLY the rules from the block's main `<style>` (NOT `<style data-preview-only>`). Strip:
- Global resets like `*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box }`
- `body { ... }` rules (font-family, background, etc. — these belong in `<style data-preview-only>`)
- `html { ... }` rules
- Any selector that doesn't start with `.block-{slug}` (legacy drift in production seed; Phase 1 emits clean)

Preserve:
- All `.block-{slug}`-scoped rules
- Block-specific `@keyframes` (named uniquely per block)
- `@container slot (max-width: ...)` queries inside the block's CSS scope
- `@media (prefers-reduced-motion)` blocks if scoped under `.block-{slug}`
- `@supports` blocks if scoped under `.block-{slug}`

**`js`** (string)
Raw JS body, with `<script>` / `<script type="module">` wrapping tags STRIPPED. If multiple block-relevant `<script>` tags exist in studio-mockups HTML (rare), concatenate bodies in document order with one newline separator.

Skip preview-only scripts:
- `<script id="preview-data">` (preview-time data injection)
- Scripts whose only effect is to inject `<template>` element content for preview
- Scripts wrapped in conditional preview-only branches

Emit only IO observers, behavioral handlers (mousemove parallax, click toggles), and animation triggers.

If the block has no JS (pure CSS animations only), emit `js: ""` (empty string, NOT undefined or omitted).

**`variants`** (null | BlockVariants)
Always emit `null` sentinel on FIRST finalize (no existing sandbox file). WP-028 Ruling HH/LL: `JSON.stringify` preserves `null`, drops `undefined`; emitting `null` ensures disk + DB round-trip parity.

On RE-FINALIZE (sandbox file exists), preserve `variants` from the existing sandbox JSON — see "Re-finalize contract" below for the broader preservation rule (variants is one of 8 preserved fields).

### Re-finalize contract

If `tools/block-forge/blocks/<slug>.json` already exists when FINALIZE runs, the skill writes ONLY freshly-computed `html`/`css`/`js` from studio-mockups HTML. EVERY OTHER FIELD is preserved from the existing sandbox JSON.

1. READ existing file → capture `{ slug, name, block_type, is_default, sort_order, hooks, metadata, variants }` (8 fields)
2. RECOMPUTE `{ html, css, js }` from current studio-mockups HTML per SPLIT rules above (3 fields)
3. ASSEMBLE: `{ ...existingFields, html, css, js }` in canonical 11-key order (slug, name, block_type, is_default, sort_order, hooks, metadata, html, css, js, variants)
4. WRITE merged result

The mental model: studio-mockups HTML owns *content* (markup + styles + behavior); Forge sandbox JSON owns everything *about* the block (slug, name, type, defaults, hooks, metadata, variants). Re-finalize is "I edited content"; metadata edits in Forge are durable.

**Why preserve all 8 metadata fields, not just `variants`:** Forge UI may mutate `block_type`, `is_default`, `name`, `sort_order`, `hooks`, `metadata` post-finalize via Inspector / picker / settings dialogs. If the user signaled `block_type: "header"` + `is_default: true` on first finalize, polished responsive in Forge, then re-iterated desktop in studio-mockups, then re-finalized WITHOUT repeating the header signal — narrow `variants`-only preservation would silently overwrite `block_type: ""` + `is_default: false`, breaking slot-picker visibility. Real data-loss bug. Broad preservation closes it.

**Exception — explicit CONFIRM override:** if the user explicitly overrides `slug` or `name` in the CONFIRM step (e.g. "rename to X"), the explicit override wins over the existing sandbox JSON. CONFIRM is the user-controlled metadata channel; re-finalize WITHOUT rename signals "keep what's there".

User-confirmed-overwrite via the CONFIRM step does NOT bypass content recomputation — overwrite means "I'm replacing the desktop content with the new HTML," not "I'm wiping all block metadata." If user explicitly wants to discard sandbox metadata (e.g. drop responsive variants, reset block_type), they delete the Forge JSON first via OS file manager (out of skill scope).

This is the "iterate desktop in HTML → re-finalize → preserve everything Forge knows about the block" cycle (Brain ruling 3, prior chat — broadened per Phase 1 review).

### On-disk format

Pretty-printed with 2-space indent + trailing newline:

```js
JSON.stringify(payload, null, 2) + '\n'
```

This matches Forge's own `POST /api/blocks/:slug` write convention (`tools/block-forge/vite.config.ts:333`). Same byte-shape across skill-write, Forge-save, Clone — git diffs stay clean.
```

### Why

Phase 0 Ruling A documents these rules in result.md. Phase 1 codifies them in the skill itself so future invocations are deterministic — every `/block-craft` finalize emits byte-identical JSON for byte-identical input HTML. Re-finalize variant preservation is the most subtle invariant and gets explicit documentation.

### Integration

Insert the entire section verbatim BEFORE the existing `## Checklist` section header. Use Edit with `## Checklist` line as the anchor (it appears once in SKILL.md per `grep -n '^## Checklist' .claude/skills/block-craft/SKILL.md`).

---

## Task 1.5: Replace Step 6 with FINALIZE Protocol (Ruling D)

### What to Build

Replace the existing Step 6 (lines ~85-88) with a comprehensive FINALIZE Protocol section. Current Step 6:

```markdown
### Step 6: Ready for Studio import

When approved, user imports the HTML file into Studio → Process panel → Upload images → Save.
```

Replace with the following multi-section block (verbatim):

```markdown
### Step 6: Finalize to Forge sandbox (FINALIZE Protocol)

The iterate loop (Steps 1–5) ends when the user signals satisfaction with the desktop look-and-feel. The skill's job is then to assemble an 11-key BlockJson from the current `tools/studio-mockups/<name>.html` and write it to `tools/block-forge/blocks/<slug>.json` — the WP-035 Forge sandbox.

After that, the user opens Forge at http://localhost:7702, polishes responsive variants (WP-019/028 UI), tweaks via Inspector (WP-033), and runs Export → Studio Import → DB (WP-035 Phase 1+2 round-trip).

#### Trigger interpretation (PROCEED / DECLINE / CLARIFY)

The skill interprets natural language **in conversational context** — last 2–3 messages, current iterate state, presence/absence of "iterate" verbs. NOT an allow-list. The 3-class model below is the OUTPUT classification, not the input phrase set:

| Signal class | Example user phrasing | Skill action |
|---|---|---|
| **PROCEED** | "забираю", "готово", "ship", "ок зберігаємо", "save to forge", "це воно", "збережемо в форджі", "запиши в forge", "зроби джсон" | Run FINALIZE (continues to CONFIRM step) |
| **DECLINE** | "ні", "ще доробимо", "wait", "no", "ще треба X", "поправ Y" + describes change | Continue ITERATE (do not finalize; treat as iterate instruction) |
| **CLARIFY** | "ну добре", "ок", "норм", "ну ок" + no qualifier, short ack after long iterate | Ask once: "Зберегти `<slug>` у Forge sandbox? (це створить `tools/block-forge/blocks/<slug>.json`)" — wait for explicit yes/no |

**Precedence — first match wins (highest first):**

1. **Explicit decline** — phrases like "ні", "no", "wait", "ще не", "skasuj", "не зараз", "не треба" → **DECLINE**, even if a save signal is also present in the same message
2. **Iterate verb** — "change X", "поправ", "додай", "remove", "make Y bigger", "ще треба Z", "fix the heading", "зменши на 2px", "tweak X" → **DECLINE**, even if a save signal is also present in the same message
3. **Explicit save signal AND no iterate verb AND no decline** — "save", "забираю", "ship", "finalize", "коміт", "запиши в forge", "ок зберігаємо", "це воно" → **PROCEED** (goes to CONFIRM step)
4. **Pure affirmative with no qualifier** — "ок", "норм", "так", "yes", "ну ок" alone → **CLARIFY** (ask once)
5. **Default** → **DECLINE** (finalize is opt-in; if rules 1–4 don't match, do not finalize)

**Why iterate-verb-wins-over-save:** This protects against silent-finalize when the user is mid-thought. Example: "save але heading 2px more" — the user's actual intent is "keep tweaking", and the "save" was a forward-looking statement, not a now-signal. Better to stay in iterate (treat the message as an iterate instruction targeting "heading 2px more") than to finalize prematurely. Same for "ок забираю але поправ heading" — iterate verb wins; user gets one more cycle.

**CLARIFY ambiguity exhaust:** if after one clarifying question the user's response is still ambiguous (rules 1–4 don't classify it cleanly), default to DECLINE. Finalize is opt-in; "I'm not sure if you wanted to finalize" is always a safer state than "I finalized but the user didn't confirm".

#### CONFIRM step (always runs after PROCEED)

Even when the trigger phrasing is unambiguous, the skill ALWAYS asks the user to confirm slug + name before writing the BlockJson. This is the only opportunity to override auto-derived defaults; once written, the file is on disk and slug determines its filename.

Auto-derive proposals:
- **`name` proposal**: from the studio-mockups filename humanized (`fast-loading-speed.html` → `"fast loading speed"`). Use lowercase space-separated form to match production seed convention (Phase 0 §0.1 finding). FALLBACK: if the filename is generic (`untitled.html`, `test.html`, `block.html`, `index.html`), derive from `<h1>`/`<h2>` text inside `.block-{slug}` lowercased.
  - **Why filename-first:** filename matches all 9 sandbox blocks + all 4 audited production blocks (Phase 0 §0.1 — `fast-loading-speed`, `header`, `theme-name`, `sidebar-help-support` all derive cleanly from filename). `<h2>`-first would mis-derive when the heading is marketing copy (e.g. `<h2>Get Started Today!</h2>` doesn't yield a usable block name).
- **`slug` proposal**: `nameToSlug(name)` — kebab-case, ASCII, `[a-z0-9-]` only.

Check sandbox collision: read `tools/block-forge/blocks/<slug>.json`. If file exists, capture mtime + size for the warning.

Ask user (single message, both proposals + warning if collision):

```
Готую FINALIZE. Запропонований slug: `<derived-slug>`, name: "<derived-name>".

{if collision: ⚠ `tools/block-forge/blocks/<derived-slug>.json` вже існує (X.Y KB, modified 2 hours ago).}

OK, чи поправ?
```

User responds:
- "ок" / "yes" / "так" / similar affirmative → proceed with proposals; if collision, treat as overwrite-confirmed
- "name = X" / "slug = Y" / "обидва: X / Y" / free-form rename ("давай назвемо 'Hero CTA'") → re-derive `slug` from new `name` if only name given; re-check collision; ask again ONLY if collision changed (new collision OR collision removed)
- "abort" / "ні" / "skasuj" → cancel finalize; user stays in iterate loop
- "rename to X" with collision still present → re-check on new slug; warn again if new slug also collides

Maximum 2 confirm rounds. If user is still ambiguous after round 2, default to abort with a "Try again — say 'забираю в forge' when ready" hint.

#### SPLIT step (deterministic — no LLM judgment)

Apply the rules from "## SPLIT Contract" above:
1. Read `tools/studio-mockups/<file>.html` (the iterate target — current studio-mockups file)
2. Read existing `tools/block-forge/blocks/<slug>.json` (if exists) — extract its `variants` field for preservation
3. Extract `<section class="block-{slug}" data-block>...</section>` → `html` field
4. Extract block's main `<style>` body (NOT `<style data-preview-only>`) → strip global resets, strip `body`/`html` rules → `css` field
5. Extract `<script>` tag bodies (skip preview-only scripts) → `js` field
6. Assemble 11-key BlockJson in canonical order (slug, name, block_type, is_default, sort_order, hooks, metadata, html, css, js, variants)
7. Inject preserved `variants` from existing sandbox file (if any), else default to `null`
8. Stringify with `JSON.stringify(payload, null, 2) + '\n'`

#### WRITE step

Use the Write tool (NOT Edit, NOT Forge's POST /api/blocks/:slug):
- Path: `tools/block-forge/blocks/<slug>.json`
- Content: pretty-printed JSON + trailing newline (per SPLIT Contract)
- Single atomic write

Do NOT touch `content/db/blocks/<slug>.json` — that's the production seed and is owned by Studio Import. Saved memory `feedback_forge_sandbox_isolation` is non-negotiable.

#### POST-FINALIZE message

After WRITE succeeds, tell the user (single message, concise):

```
Done. `<slug>.json` written to `tools/block-forge/blocks/`.

Refresh Forge http://localhost:7702 → "<name>" з'явиться в picker.
Polish responsive → Export → Studio Import → DB.
```

Do not delete or rename `tools/studio-mockups/<file>.html`. The user may return to iterate further; re-finalize is allowed (variants are preserved per SPLIT Contract re-finalize rule).

#### Re-finalize cycle

If user later says "ще зменшимо heading на 2px" → return to ITERATE (Step 5: edit the studio-mockups HTML). On next FINALIZE signal, the cycle repeats:
1. CONFIRM (slug + name) — same as first finalize; collision warning will fire because the sandbox file exists from previous finalize
2. SPLIT — re-extracts current HTML state
3. Variants from existing sandbox JSON are PRESERVED (Brain ruling 3 + SPLIT Contract re-finalize rule)
4. WRITE overwrites the sandbox JSON

Studio-mockups HTML stays on disk through every cycle. Only the Forge sandbox JSON is overwritten.
```

### Why

This is the heart of WP-038. The 5 sub-protocols (Trigger / CONFIRM / SPLIT / WRITE / POST-FINALIZE / Re-finalize) collectively realize the 4 Brain rulings + Phase 0 Rulings A+B+D. The format mirrors the existing skill's structure (numbered Steps, code blocks, per-rule rationale). Length is deliberate — explicit rules > implicit conventions for a deterministic protocol.

### Integration

Replace lines ~85-88 (current Step 6 — 4 lines) with the multi-section block above (~120 lines). Use Edit with the exact current Step 6 text as anchor.

The new Step 6 references the SPLIT Contract section (Task 1.4) which is added BEFORE Checklist. Reading order: Steps 1–5 → Step 6 (FINALIZE Protocol) → SPLIT Contract → Checklist → ... rest. SPLIT Contract appears after Step 6 in line order but before Checklist; readers hit it via cross-reference from Step 6's SPLIT step.

---

## Task 1.6: "What NOT to Do" list +3 entries

### What to Build

Append 3 new entries to the existing "What NOT to Do" numbered list at lines ~458-471. Current list has 12 entries (1–12). Append entries 13, 14, 15:

```markdown
13. **Don't auto-finalize without an explicit user signal** — FINALIZE is opt-in. Even when the desktop preview looks great, do NOT write `tools/block-forge/blocks/<slug>.json` until the user signals PROCEED via natural language. Silent writes corrupt the user's mental model of "iterate is sticky".
14. **Don't silent-overwrite the Forge sandbox** — when CONFIRM step detects an existing `tools/block-forge/blocks/<slug>.json`, ALWAYS show the collision warning (file size + mtime). Never write over an existing sandbox file without the user's explicit yes-or-rename response. Saved memory `feedback_no_blocker_no_ask` (silent data-loss guard) applies.
15. **Don't delete or rename `tools/studio-mockups/<file>.html` after FINALIZE** — the iterate HTML is sticky. The user often returns to it for desktop tweaks (font size, color, spacing) post-finalize. The Forge sandbox JSON is the published artifact; the studio-mockups HTML is the source-of-iteration. Keep both. Re-finalize cycles are explicitly allowed and preserve responsive variants.
```

### Why

The existing 12 entries cover scoping, animations, frameworks, and DS rules — authoring concerns. The 3 new entries cover FINALIZE concerns (consent, data safety, lifecycle). Same numbered-list shape, same imperative voice ("Don't ...").

### Integration

Append after entry 12. Edit anchor: the line `12. **Don't add wrapper \`<div>\`s without a clear purpose** — block HTML root must be ...` (last line of current list). Insert 3 new lines after it; preserve trailing newline + any subsequent file content.

---

## Task 1.7: Live smoke (manual — does not block commit)

### What to Verify

After the SKILL.md edits land, perform a live smoke test (manual — Hands documents in result.md, does NOT block commit if smoke is later):

1. Pick a real Figma node OR a screenshot the user has shared previously
2. Run `/block-craft` (manually invoke the skill)
3. Iterate at :7777 (1-2 cycles to confirm Steps 1-5 still work)
4. Type a PROCEED signal ("забираю в forge" or "ок поїхали")
5. Confirm the skill asks for slug + name with proposal (CONFIRM step)
6. Accept the proposal ("ок")
7. Verify `tools/block-forge/blocks/<slug>.json` materializes
8. Refresh Forge :7702
9. Confirm the new block appears in BlockPicker
10. Open the block — confirm Inspector + responsive UI works
11. Check `git diff content/db/blocks/` — MUST stay empty (sandbox isolation invariant)
12. Check `tools/studio-mockups/<name>.html` — MUST still exist (LEAVE-AS-IS rule)
13. Re-finalize cycle: tweak the studio-mockups HTML → re-finalize → confirm sandbox JSON is overwritten with new content; if responsive variants were added in Forge between cycles, confirm they persist post re-finalize

If live smoke is impossible in the current session (e.g. Forge dev server not running, no Figma access), document this in result.md and defer to ad-hoc verification when the user next runs `/block-craft`.

### Why

The skill is a documentation artifact, not source code — `npm run arch-test` cannot validate its behavior. The only meaningful "test" is end-to-end usage. Phase 1 commit can land without live smoke if circumstances prevent it; Phase 2 (Close) MAY revisit before status flip → ✅ DONE.

---

## Files to Modify

- `.claude/skills/block-craft/SKILL.md` — single file under rewrite. 5 distinct edits per Tasks 1.1–1.6.

**No source code touched.** No `domain-manifest.ts` edit (`.claude/skills/*` outside manifest). No new files created. No tests added/changed.

**Phase 0 result.md is referenced by Phase 1 but not edited.**

---

## Acceptance Criteria

- [ ] `.claude/skills/block-craft/SKILL.md` line 3 (front-matter description) contains "забираю в forge" + "Forge sandbox" tokens
- [ ] Line 35 area: `figma-use` reference removed; replacement text mentions `use_figma` MCP + screenshot fallback
- [ ] Hook Shortcuts table contains 8 rows (current 6 + `{{primary_categories}}` + `{{perfect_for}}`)
- [ ] New section `## SPLIT Contract — Studio-Mockups HTML → BlockJson` exists before `## Checklist`
- [ ] Step 6 replaced with `### Step 6: Finalize to Forge sandbox (FINALIZE Protocol)` containing Trigger / CONFIRM / SPLIT / WRITE / POST-FINALIZE / Re-finalize sub-sections
- [ ] "What NOT to Do" list has 15 entries (3 new appended after entry 12)
- [ ] Steps 1–5 (lines ~30-84) remain functionally unchanged (Step 1 line 35 prose change is the only edit; the rest is verbatim)
- [ ] Slots & Hooks section (lines ~320-388 area) intact except the +2 hook table rows
- [ ] CSS Scoping section, Animations section, Semantic HTML section, Block HTML Template section all unchanged
- [ ] `npm run arch-test` passes 595 / 595 (no regression — skill is outside manifest)
- [ ] `git diff` shows ONLY `.claude/skills/block-craft/SKILL.md` changes (and `logs/wp-038/phase-1-result.md` as new untracked)
- [ ] No new boundary violations
- [ ] `tools/studio-mockups/` and `tools/block-forge/blocks/` and `content/db/blocks/` all untouched (Phase 1 is documentation-only)

---

## MANDATORY: Verification (do NOT skip)

```bash
echo "=== WP-038 Phase 1 Verification ==="

# 1. Arch tests — MUST be unchanged from Phase 0 close
npm run arch-test
echo "(expect: 595 / 595 — same as Phase 0 baseline)"

# 2. SKILL.md structural sanity
grep -nE "^(##|###) " .claude/skills/block-craft/SKILL.md | head -30
echo "(expect: now includes '## SPLIT Contract' AND '### Step 6: Finalize to Forge sandbox' headers)"

# 3. Front-matter description token check
sed -n '3p' .claude/skills/block-craft/SKILL.md
echo "(expect: contains 'забираю в forge' AND 'Forge sandbox')"

# 4. Step 1 figma-use removal check
grep -c "figma-use" .claude/skills/block-craft/SKILL.md
echo "(expect: 0 — figma-use reference fully removed)"

# 5. Hook Shortcuts row count
grep -cE "^\| \`\{\{" .claude/skills/block-craft/SKILL.md
echo "(expect: 8 — added primary_categories + perfect_for to existing 6)"

# 6. "What NOT to Do" entry count
grep -cE "^[0-9]{1,2}\. \*\*Don't" .claude/skills/block-craft/SKILL.md
echo "(expect: 15 — added 3 finalize-related entries)"

# 7. Phase 1 isolation — no source code mutation
git status --short | grep -vE "^\?\? logs/wp-038/" | grep -vE "\.claude/skills/block-craft/SKILL\.md$"
echo "(expect: empty — no other files modified)"

# 8. studio-mockups + Forge sandbox + production seed all untouched
git status --short tools/studio-mockups/ tools/block-forge/blocks/ content/db/blocks/
echo "(expect: empty — Phase 1 is documentation-only)"

echo "=== Verification complete ==="
```

If any line returns unexpected output, STOP — surface to Brain before result.md write or commit.

---

## MANDATORY: Write Execution Log (do NOT skip)

After verification (before committing), create `logs/wp-038/phase-1-result.md`:

```markdown
# Execution Log: WP-038 Phase 1 — SKILL.md FINALIZE protocol rewrite

> Epic: WP-038 Block Craft → Forge sandbox finalize step
> Executed: <ISO timestamp>
> Duration: <minutes>
> Status: ✅ COMPLETE | ⚠️ PARTIAL (live smoke deferred) | ❌ FAILED
> Domains affected: NONE (skill files outside manifest)

## What Was Implemented

(2-5 sentences. Mention all 6 sub-tasks: front-matter description, Step 1 figma-use removal, Hook table +2 rows, new SPLIT Contract section, Step 6 → FINALIZE Protocol, "What NOT to Do" +3 entries.)

## Key Decisions

| Decision | Chosen | Why |
|---|---|---|
| Edit anchor for Step 6 | exact current text match | Edit tool requires unique anchor |
| SPLIT Contract placement | before Checklist section | Logical reading order; Checklist references SPLIT |
| Live smoke timing | (deferred / executed) | (reasoning) |

## Files Changed

| File | Change | Description |
|---|---|---|
| `.claude/skills/block-craft/SKILL.md` | modified | 6 edits per Tasks 1.1-1.6 |
| `logs/wp-038/phase-1-result.md` | created | This file |

## Issues & Workarounds

(Any edge cases, anchor collisions, multi-match Edit failures, etc. "None — clean execution" if so.)

## Open Questions

(Anything Phase 2 should know about but wasn't load-bearing for Phase 1.)

## Verification Results

| Check | Result |
|---|---|
| arch-test | ✅ 595 / 595 |
| SKILL.md structural sanity | ✅ |
| Front-matter token check | ✅ |
| figma-use removal | ✅ (0 occurrences) |
| Hook Shortcuts row count | ✅ (8 rows) |
| "What NOT to Do" entry count | ✅ (15 entries) |
| Phase 1 isolation | ✅ (only SKILL.md modified) |
| Live smoke | ✅ executed / ⏭ deferred (reason) |
| AC met | ✅ |

## Live smoke notes (if executed)

(End-to-end run results: Figma source / iterate cycles / FINALIZE trigger / CONFIRM proposal / sandbox JSON shape / Forge picker visibility / re-finalize variant preservation. Screenshots optional but encouraged.)

## Git

- Commit: `<sha>` — `feat(skill): WP-038 Phase 1 — /block-craft FINALIZE protocol + SPLIT contract [WP-038 phase 1]`
```

---

## Git

```bash
git add .claude/skills/block-craft/SKILL.md logs/wp-038/phase-1-task.md logs/wp-038/phase-1-result.md
git commit -m "feat(skill): WP-038 Phase 1 — /block-craft FINALIZE protocol + SPLIT contract + Ruling fixes [WP-038 phase 1]

- Step 1: drop stale figma-use reference, point at use_figma MCP + screenshot fallback (Ruling C)
- Hook Shortcuts table: +primary_categories +perfect_for (Ruling F, slot-registry parity)
- New SPLIT Contract section: 11-key BlockJson shape + ordering, id omission rationale, css/html/js extraction rules, re-finalize variant preservation (Ruling A + B)
- Step 6 rewrite: PROCEED/DECLINE/CLARIFY trigger heuristic + always-confirm-with-proposal CONFIRM + deterministic SPLIT + atomic WRITE + POST-FINALIZE message + re-finalize cycle (Ruling D)
- 'What NOT to Do' +3 entries: don't auto-finalize, don't silent-overwrite sandbox, don't delete studio-mockups HTML

arch-test 595 / 595 unchanged (.claude/skills/* outside domain-manifest.ts).
Source code untouched. Studio-mockups + Forge sandbox + production seed untouched.

Phase 0 result: logs/wp-038/phase-0-result.md (6 rulings A-F)
Phase 2 (Close) ALIVE: cross-doc batch + saved memory + status flip per Ruling E

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

(Commit SHA backfilled in WP-038 Commit Ladder post-commit. Phase 0 SHA also backfilled if not yet done — see Phase 0 result.md "Git" section.)

---

## IMPORTANT Notes for CC

- **Skill rewrite is documentation-only.** No source code, no test changes. arch-test 595/595 unchanged.
- **Edit anchors must be unique.** The skill is 471 lines; some short phrases ("Step 6", "## Checklist") may appear in multiple contexts. Use 2–3 line context windows on each Edit to guarantee uniqueness. If `replace_all` is correct (e.g. for token replacement), use it; otherwise long anchor.
- **Read SKILL.md cold before editing.** Don't trust line numbers from this task prompt — they're approximate. Use `grep -n` to find exact anchors.
- **Preserve formatting verbatim** in the replacement blocks (Tasks 1.4, 1.5, 1.6). Markdown table pipes, code-fence backticks, blank lines between paragraphs — all material.
- **Don't add or remove markdown sections beyond what Tasks 1.1–1.6 specify.** The skill is balanced; structural changes risk breaking the implicit reading order.
- **Live smoke is NOT a commit blocker** — Phase 1 ships SKILL.md changes; smoke can be deferred to first real `/block-craft` invocation.
- **Phase 2 (Close) is ALIVE** per Phase 0 Ruling E — 4 cross-doc files need editing (BRIEF, CONVENTIONS ×2, SKILL.md, block-forge PARITY) + saved memory + WP doc status flip. Approval gate ENGAGED. Phase 1 commit alone does NOT close the WP.
- **Re-finalize variant preservation is the most subtle invariant** in the SPLIT Contract. Hands MUST include the "READ existing → preserve variants → MERGE → WRITE" rule verbatim in Task 1.4. Skipping it means responsive work in Forge silently disappears on re-finalize — would be a P0 user-experience regression.

---
---

# BRAIN → OPERATOR HANDOFF SUMMARY

```markdown
Phase 1 промпт готовий: `logs/wp-038/phase-1-task.md`.

## Структура

**6 edit tasks + 1 deferred smoke, ~45–75 min budget:**

| # | Task | Scope |
|---|------|-------|
| 1.1 | Front-matter `description` (line 3) | Add "забираю в forge" + "Forge sandbox" tokens for skill discoverability |
| 1.2 | Step 1 figma-use ref removal (line ~35) | Drop stale skill ref (Ruling C) → point at use_figma MCP + screenshot fallback |
| 1.3 | Hook Shortcuts table +2 rows | Append `{{primary_categories}}` + `{{perfect_for}}` (Ruling F, slot-registry parity) |
| 1.4 | New `## SPLIT Contract` section | Before Checklist; 11-key shape + ordering, id-omission rationale, css/html/js rules, re-finalize variant preservation (Ruling A + B) |
| 1.5 | Step 6 → FINALIZE Protocol | Replace 4-line stub with full PROCEED/DECLINE/CLARIFY heuristic + CONFIRM + SPLIT + WRITE + POST-FINALIZE + Re-finalize (~120 lines, Ruling D) |
| 1.6 | "What NOT to Do" +3 entries | Don't auto-finalize / don't silent-overwrite sandbox / don't delete studio-mockups HTML |
| 1.7 | Live smoke (deferred-allowed) | End-to-end Figma → iterate → FINALIZE → Forge picker → re-finalize variant preservation. Doesn't block commit. |

## 6 Brain rulings inherited from Phase 0 (locked)

A. **SPLIT contract** — keys ordered slug→...→variants; html=section-only; css strips global resets; js strips `<script>` tags; preserve `@container slot` queries
B. **id field** — OMITTED (empirical: Clone strips it, no consumer reads block.id, importBlockSchema.id optional)
C. **Step 1 figma-use ref** — stale (skill doesn't exist); rewrite to point at use_figma MCP + screenshot fallback
D. **Trigger heuristic** — PROCEED/DECLINE/CLARIFY 3-class natural-language model embedded in Step 6 verbatim
E. **Phase 2 alive** — 4 cross-doc edits (BRIEF, CONVENTIONS ×2, SKILL.md, block-forge PARITY) + saved memory + WP status flip; approval gate ENGAGED
F. **Hook table +2 rows** — primary_categories + perfect_for (slot-registry.ts:56-57)

Plus 4 prior-chat rulings (natural-language triggers / studio-mockups stays / re-finalize allowed / always-confirm-with-proposal).

## Hard gates (Phase 1)

- Zero source code touch — only `.claude/skills/block-craft/SKILL.md` edited
- Zero domain-manifest.ts edit — skill files outside manifest
- Zero new files except `logs/wp-038/phase-1-result.md`
- Zero touch on tools/studio-mockups/, tools/block-forge/blocks/, content/db/blocks/
- arch-test 595/595 — must hold byte-exact
- Re-finalize variant preservation — non-negotiable; documented verbatim in Task 1.4

## Escalation triggers

- Phase 1 audit step 4 (Hook Shortcuts table location grep) returns empty → SKILL.md drifted; STOP, re-read with fresh anchor scan
- Edit step on Step 6 fails with "non-unique anchor" → expand anchor to 5-line window; if still fails, surface
- arch-test count drifts from 595 (somehow) → STOP — Phase 1 mustn't touch source
- Live smoke executes and discovers SPLIT extracts malformed `<section>` (e.g. encloses preview-data scripts) → fix Task 1.4 SPLIT Contract before final commit; do NOT ship buggy rule

## Arch-test target

**595 / 0** — unchanged. `.claude/skills/*` outside `domain-manifest.ts` ownership; SKILL.md changes don't affect any tracked file.

## Git state

- `logs/wp-038/phase-1-task.md` — new untracked
- `logs/wp-038/phase-0-result.md` — currently untracked (commit with Phase 0 batch if not yet done; otherwise pre-existing)
- `workplan/WP-038-block-craft-finalize-to-forge-json.md` — currently untracked (commit with Phase 0 batch if not yet done)
- Nothing staged

If Phase 0 batch (task + result + WP doc) wasn't committed yet, Phase 1 can fold them into a single commit with both SHAs in the WP doc Commit Ladder.

## Next

1. Review → commit pair (Phase 1 task prompt) → handoff Hands
2. АБО правки (особливо Task 1.4 SPLIT Contract — re-finalize variant preservation rule, Task 1.5 trigger heuristic granularity)
3. АБО self-commit if workflow permits (Phase 0 batch + Phase 1 task prompt in single commit)

Чекаю.
```
