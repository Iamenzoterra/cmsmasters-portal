# WP-006 Phase 8: Integration Testing + Docs Close

> Workplan: WP-006 Block Import Pipeline
> Phase: 8 of 8 (FINAL)
> Priority: P0
> Estimated: 1.5 hours
> Type: Config + Docs
> Previous: Phase 7 ✅ (Component detection + animation protection in block processor)
> Next: WP-005D or first /block-craft production block

---

## Context

WP-006 Phases 0-7 built the full block import pipeline:
- Token scanner (51 suggestions from test block)
- R2 image upload (batch endpoint + Studio UI)
- Studio Process panel (split preview, toggles, zoom, scroll, replay)
- DB `js` column + Studio JS field
- `portal-blocks.css` (shared .cms-btn + .cms-card + tooltips)
- `animate-utils.js` (5 behavioral utilities)
- Component detection + animation protection

This final phase closes the WP: updates context docs to reflect the new state, marks WP-006 done, and ensures everything is coherent.

```
CURRENT:  All implementation phases done                              ✅
MISSING:  .context/BRIEF.md still says "Layer 1 IN PROGRESS"         ❌ stale
MISSING:  .context/CONVENTIONS.md has no block creation workflow      ❌
MISSING:  WP-006 workplan not marked complete                         ❌
MISSING:  PORTAL-BLOCK-ARCHITECTURE.md pipeline steps not updated     ❌
```

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Current BRIEF.md — last updated date and current sprint section
grep -n "Last updated\|last updated\|Current sprint\|Layer 0\|Layer 1\|Layer 2\|WP-006" .context/BRIEF.md | head -15

# 2. Current CONVENTIONS.md — check if block workflow exists
grep -n "block\|Block\|block-craft\|portal-blocks" .context/CONVENTIONS.md | head -10

# 3. PORTAL-BLOCK-ARCHITECTURE pipeline section
grep -n "pipeline\|Pipeline\|step 3\|step 4\|Studio.*import" workplan/PORTAL-BLOCK-ARCHITECTURE.md | head -10

# 4. WP-006 workplan status
head -10 workplan/WP-006-block-import-pipeline.md

# 5. ADR_DIGEST — already has 023/024?
grep "ADR-023\|ADR-024\|animation\|component" .context/ADR_DIGEST.md | head -5

# 6. All phase logs exist?
ls -la logs/wp-006/
```

**Document findings before making changes.**

---

## Task 8.1: Update `.context/BRIEF.md`

### What to Change

**File:** `.context/BRIEF.md`

1. Update "Last updated" date to `2 April 2026`
2. Update architecture diagram: Portal = `Astro SSG` (not Next.js)
3. Update "Current sprint" section:
   - Layer 1 (Studio): mark as ✅ DONE
   - Add: `Block Import Pipeline: ✅ DONE (WP-006)` between Layer 1 and Layer 2
   - Layer 2 (Portal): still ⬜ but reference updated architecture
4. Update "Also done" section — add:
   - `24 ADR files` (was 22)
   - WP-006 block import pipeline
   - R2 bucket configured
   - `portal-blocks.css`, `animate-utils.js`
5. Update "What's left for Layer 1" — mark items done or remove completed ones
6. Update "What's left for Layer 2" — correct: Portal = Astro SSG (not Next.js), reference block model

**Keep it concise** — BRIEF.md is a 5-minute read, not a changelog. State current truth, not history.

---

## Task 8.2: Update `.context/CONVENTIONS.md`

### What to Change

**File:** `.context/CONVENTIONS.md`

Add a new section **"Block Creation Workflow"** after the existing sections:

```markdown
## Block creation workflow

### Pipeline
1. Figma design → `/block-craft` skill → Claude Code generates HTML+CSS+JS
2. Preview on `localhost:7777` → iterate until approved
3. Studio → Import HTML → Process panel:
   - Token scanner maps hardcoded CSS → design tokens (auto-enabled suggestions)
   - R2 image upload replaces Figma MCP URLs with permanent CDN URLs
   - Component detection suggests `.cms-btn` classes for button elements
   - Animation classes preserved (not tokenized)
4. Save → block stored in Supabase (html, css, js columns)
5. Portal renders via Astro SSG at build time

### Block structure rules
- HTML wrapped in `<section class="block-{slug}" data-block>`
- ALL CSS selectors scoped under `.block-{slug}`
- Semantic HTML: `<button>` for actions, `<a>` for links, `<details>` for accordions
- Button states via `portal-blocks.css` classes (`.cms-btn`, `.cms-btn--primary`, etc.)
- Animations: CSS scroll-driven (entrance) + `animate-utils.js` imports (behavioral)
- JS as `<script type="module">` — stored in `blocks.js` column
- Only animate `transform` and `opacity` (compositor-safe)

### Shared assets
- `packages/ui/src/portal/portal-blocks.css` — .cms-btn, .cms-card, [data-tooltip]
- `packages/ui/src/portal/animate-utils.js` — trackMouse, magnetic, stagger, spring, onVisible
- `packages/ui/src/theme/tokens.css` — design tokens (source of truth)
```

---

## Task 8.3: Update `PORTAL-BLOCK-ARCHITECTURE.md`

### What to Change

**File:** `workplan/PORTAL-BLOCK-ARCHITECTURE.md`

Find the "Block creation pipeline" section (step 10) and update steps 3-4 to reflect implementation:

```markdown
### 10. Block creation pipeline
1. Figma → дизайн блоку
2. Claude Code → HTML+CSS+JS з токенами (/block-craft skill, preview :7777)
3. Studio → Import → Process panel:
   - Token scanner: hardcoded CSS → var(--token) suggestions (51 from test block)
   - R2 image upload: Figma MCP URLs → permanent CDN URLs (POST /api/upload/batch)
   - Component detection: suggests .cms-btn classes for button elements
   - Animation protection: reveal/animate selectors preserved
   - JS extraction: <script> → separate js field
4. Save → block in DB (html + css + js columns)
5. Inspector → хуки (ціна, alt, responsive breakpoints)
6. Save → block в бібліотеці
7. Сторінка → "+" → обрати block → готово
```

---

## Task 8.4: Mark WP-006 as COMPLETE

### What to Change

**File:** `workplan/WP-006-block-import-pipeline.md`

Update header:
```
**Status:** ✅ COMPLETE
**Completed:** 2026-04-02
```

Check all acceptance criteria boxes in the document.

---

## Files to Modify

- `.context/BRIEF.md` — update sprint status, architecture, completed items
- `.context/CONVENTIONS.md` — add block creation workflow section
- `workplan/PORTAL-BLOCK-ARCHITECTURE.md` — update pipeline steps 3-4
- `workplan/WP-006-block-import-pipeline.md` — mark complete + check all boxes

---

## Acceptance Criteria

- [ ] `.context/BRIEF.md` reflects current state (Layer 1 done, WP-006 done, Astro not Next.js)
- [ ] `.context/CONVENTIONS.md` has "Block creation workflow" section
- [ ] `PORTAL-BLOCK-ARCHITECTURE.md` pipeline steps updated
- [ ] `WP-006` marked as ✅ COMPLETE with date
- [ ] All WP-006 acceptance criteria boxes checked
- [ ] All 8 phase logs exist in `logs/wp-006/`
- [ ] No stale/contradictory info across context files

---

## ⚠️ MANDATORY: Verification (do NOT skip)

```bash
echo "=== WP-006 Phase 8 Verification ==="

# 1. BRIEF.md updated
grep "2 April 2026\|April 2026\|2026-04-02" .context/BRIEF.md | head -3
grep "WP-006\|block import\|Block Import" .context/BRIEF.md | head -3
echo "(expect: date + WP-006 reference)"

# 2. CONVENTIONS.md has block workflow
grep -c "block-craft\|Block creation" .context/CONVENTIONS.md
echo "(expect: 1+)"

# 3. PORTAL-BLOCK-ARCHITECTURE.md pipeline updated
grep -c "Process panel\|token scanner\|R2 image" workplan/PORTAL-BLOCK-ARCHITECTURE.md
echo "(expect: 1+)"

# 4. WP-006 marked complete
grep "COMPLETE\|Completed" workplan/WP-006-block-import-pipeline.md | head -3
echo "(expect: status complete + date)"

# 5. All phase logs
ls logs/wp-006/
echo "(expect: 8 files, phase-0 through phase-8)"

echo "=== Verification complete ==="
```

---

## ⚠️ MANDATORY: Write Execution Log (do NOT skip)

Create: `logs/wp-006/phase-8-result.md`

---

## Git

```bash
git add .context/BRIEF.md .context/CONVENTIONS.md workplan/PORTAL-BLOCK-ARCHITECTURE.md workplan/WP-006-block-import-pipeline.md logs/wp-006/phase-8-result.md
git commit -m "docs: close WP-006 — update context docs, mark pipeline complete [WP-006 phase 8]"
```

---

## ⚠️ IMPORTANT Notes for CC

- **This is a docs-only phase** — no code changes. Only .md files.
- **Keep BRIEF.md concise** — it's a 5-minute read. State current truth, not history.
- **Don't duplicate ADR content** — CONVENTIONS.md references patterns, ADR_DIGEST.md has decisions.
- **Portal is Astro SSG** — BRIEF.md still says "Next.js SSG" in some places. Fix all occurrences.
- **Check for stale references** — "22 ADRs" → "24 ADRs", "6 tables" → "9 tables", "13 routes" → "18+ routes" anywhere in context files.
