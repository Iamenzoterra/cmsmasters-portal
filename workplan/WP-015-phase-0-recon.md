# WP-015 Phase 0: RECON — Use Cases Taxonomy

> Workplan: WP-015 Use Cases Taxonomy
> Phase: 0 of 4
> Priority: P1
> Estimated: 0.5 hours
> Type: Research
> Previous: —
> Next: Phase 1 (Database + Package Layer)
> Affected domains: pkg-db, pkg-validators, studio-core, app-portal

---

## Context

```
CURRENT:  tags + theme_tags taxonomy works end-to-end (DB → queries → Studio sidebar → Portal)   ✅
CURRENT:  categories + theme_categories same pattern                                               ✅
CURRENT:  prices + theme_prices same pattern                                                       ✅
CURRENT:  EditorSidebar has collapsible sections for categories, tags, prices                       ✅
CURRENT:  Portal resolves hooks ({{price}}, {{demo_url}}) at build time in RSC                     ✅
MISSING:  use_cases table + theme_use_cases junction                                               ❌
MISSING:  Tag-input component with autocomplete + delete popover                                   ❌
MISSING:  "Perfect For" section in EditorSidebar                                                   ❌
MISSING:  {{perfect_for}} hook resolution on Portal                                                ❌
MISSING:  JSON-LD suitableFor in theme page structured data                                        ❌
```

WP-015 adds a new taxonomy following the exact pattern of tags/categories. This RECON phase audits
the existing pattern to confirm the plan is viable and identify any gotchas before writing code.

---

## Domain Context

**pkg-db:**
- Key invariants: all queries use typed SupabaseClient; new tables need types in types.ts + re-export from index.ts
- Known traps: junction queries use delete-all + re-insert pattern (not upsert)
- Public API: `packages/db/src/index.ts` — must re-export everything
- Blast radius: all apps import from @cmsmasters/db — adding exports is safe, changing signatures is not

**studio-core:**
- Key invariants: EditorSidebar props are fully typed; all editors share inputStyle/labelStyle inline objects
- Known traps: theme-editor.tsx has many useState hooks — follow existing fetch/save pattern exactly
- Public API: internal — components imported within studio only
- Blast radius: editor-sidebar.tsx is used only by theme-editor.tsx

**app-portal:**
- Key invariants: hook resolution is build-time string replacement in RSC; blocks are HTML strings
- Known traps: new hooks must not break existing resolution; {{perfect_for}} needs to produce valid HTML
- Public API: pages are Next.js routes, not importable
- Blast radius: hook resolver change affects all theme pages

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 0. Baseline (ALWAYS — do not skip)
npm run arch-test

# 1. Read domain skills for affected areas
cat .claude/skills/domains/pkg-db/SKILL.md
cat .claude/skills/domains/studio-core/SKILL.md
cat .claude/skills/domains/app-portal/SKILL.md

# 2. Check domain ownership and boundaries
grep -A 30 "'pkg-db'" src/__arch__/domain-manifest.ts | head -35
grep -A 30 "'studio-core'" src/__arch__/domain-manifest.ts | head -35

# 3. Audit existing taxonomy pattern (tags as reference implementation)
cat packages/db/src/queries/tags.ts
cat packages/db/src/types.ts | grep -A 20 "tags:"
cat packages/db/src/index.ts | grep -i "tag\|category\|price"

# 4. Audit Studio integration
cat apps/studio/src/components/editor-sidebar.tsx
cat apps/studio/src/pages/theme-editor.tsx | grep -i "tag\|category\|useCase\|use_case" 

# 5. Audit Portal hook resolution
grep -r "perfect_for\|{{.*}}\|resolveHooks\|replaceHooks" apps/portal/
grep -r "suitableFor\|json-ld\|jsonLd\|structured" apps/portal/

# 6. Check what TaxonomyPickerModal does (we're NOT using it — but need to understand current pattern)
cat apps/studio/src/components/taxonomy-picker-modal.tsx

# 7. Verify current test state
npm run arch-test
```

**Document your findings before writing any code.**

**IMPORTANT:** The tag-input component is a NEW pattern (inline autocomplete) vs the existing TaxonomyPickerModal (checkbox list modal). Confirm that EditorSidebar layout can accommodate an inline input without breaking the collapsible section pattern.

**IMPORTANT:** Check how portal hook resolution works — is it a switch/case, regex replace, or something else? The {{perfect_for}} hook needs to produce a multi-line HTML list, not a simple string substitution like {{price}}.

---

## Task 0.1: Read Domain Skills

### What to Do

Read the SKILL.md for each affected domain. Extract:
- Invariants that must hold
- Traps that apply to this WP
- Public API boundaries

### Domain Rules
- Do NOT write any code in this phase
- Do NOT modify any files except the execution log

---

## Task 0.2: Audit Tags Pattern (Reference Implementation)

### What to Check

The `tags` taxonomy is the reference implementation for `use_cases`. Verify:

1. **DB queries** (`packages/db/src/queries/tags.ts`):
   - CRUD: getTags, getTagById, createTag, updateTag, deleteTag
   - Junction: getThemeTags, setThemeTags (delete-all + re-insert)
   - Confirm: no search/ILIKE query exists (we need to ADD this for autocomplete)

2. **Types** (`packages/db/src/types.ts`):
   - Table definition in Database type (Row, Insert, Update)
   - Convenience aliases (Tag, TagInsert, TagUpdate, ThemeTag, ThemeTagInsert)

3. **Exports** (`packages/db/src/index.ts`):
   - All queries re-exported
   - All types re-exported

4. **Studio integration** (`theme-editor.tsx` + `editor-sidebar.tsx`):
   - State: allTags, selectedTags
   - Fetch on mount: getTags(supabase)
   - Fetch on theme load: getThemeTags(supabase, theme.id)
   - Save in submit: setThemeTags(supabase, theme.id, ids)
   - Sidebar: TaxonomyPickerModal for tags (we replace with TagInput for use cases)

---

## Task 0.3: Audit Portal Hook Resolution

### What to Check

Find the exact code that resolves `{{price}}`, `{{demo_url}}` etc. in portal theme pages:

1. Where does hook resolution happen? (which file, which function)
2. What format does it expect? (regex? switch? map?)
3. Can it return multi-line HTML? ({{perfect_for}} needs to render a list)
4. Does JSON-LD already exist on theme pages? Where?

---

## Task 0.4: Audit EditorSidebar Layout

### What to Check

1. How are collapsible sections structured? (component? manual state?)
2. Where do tags/categories/prices sections sit in the layout?
3. Is there room for an inline input component (not modal)?
4. What styling tokens are used?

---

## Files to Modify

- None — RECON phase, no code changes
- `logs/wp-015/phase-0-result.md` — execution log (created after audit)

---

## Acceptance Criteria

- [ ] All four domain skills read and relevant invariants/traps documented
- [ ] Tags pattern fully understood (DB → queries → types → exports → Studio → Portal)
- [ ] Portal hook resolution mechanism identified and documented
- [ ] EditorSidebar layout confirmed compatible with inline tag-input
- [ ] No code written, no files modified
- [ ] `npm run arch-test` passes (baseline confirmed)

---

## MANDATORY: Verification (do NOT skip)

```bash
echo "=== Phase 0 Verification ==="

# 1. Arch tests (baseline — must already pass)
npm run arch-test
echo "(expect: all tests green, no regressions)"

echo "=== Verification complete ==="
```

---

## MANDATORY: Write Execution Log (do NOT skip)

After verification (before committing), create the file:
`logs/wp-015/phase-0-result.md`

Structure (fill all sections — write N/A if not applicable, do NOT omit sections):

```markdown
# Execution Log: WP-015 Phase 0 — RECON
> Epic: Use Cases Taxonomy
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED
> Domains affected: pkg-db, studio-core, app-portal

## What Was Investigated
{2-5 sentences describing what was audited}

## Key Findings
| Area | Finding | Impact on Plan |
|------|---------|---------------|
| tags pattern | ... | ... |
| hook resolution | ... | ... |
| sidebar layout | ... | ... |
| JSON-LD | ... | ... |

## Confirmed Invariants
- {list of invariants verified}

## Risks Identified
- {list of risks found during RECON, if any}

## Plan Adjustments
{Any changes to the WP plan based on RECON findings. "None — plan confirmed" if clean.}

## Verification Results
| Check | Result |
|-------|--------|
| arch-test | ✅/❌ ({N} tests) |
| Domain skills read | ✅/❌ |
| Pattern audit | ✅/❌ |
```

Then include `logs/` in your `git add` before committing.

---

## Git

```bash
git add logs/wp-015/phase-0-result.md
git commit -m "docs: WP-015 phase 0 RECON — use cases taxonomy audit [WP-015 phase 0]"
```

---

## IMPORTANT Notes for CC

- **This is RECON — do NOT write any code**
- **Read domain skill FIRST** — `.claude/skills/domains/{slug}/SKILL.md` before touching any code
- **Pay special attention to portal hook resolution** — {{perfect_for}} is more complex than {{price}} (multi-line HTML vs simple value)
- **Document EVERYTHING** — the findings from this phase drive all subsequent phases
- **If the plan needs adjustments** — document what and why in the execution log, Brain will review
