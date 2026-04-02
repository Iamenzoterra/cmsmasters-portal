# WP-004 Phase 5: Documentation Update

> Workplan: WP-004 Section-Driven Architecture Recovery
> Phase: 5 of 5 (FINAL)
> Priority: P0
> Estimated: 0.5–1 hour
> Type: Documentation
> Previous: Phase 4 ✅ (Section page builder — 8 components, 874 lines, useFieldArray, 5 core editors + stub)
> Next: WP-003 Phase 5-7 (Studio polish) OR Layer 2 (Portal)

---

## Context

WP-004 Phases 0–4 are complete. The flat 27-column model is fully replaced with `meta` + `sections[]` + `seo`. All context files (.context/, workplan files) still describe the OLD flat model. This phase brings documentation in sync with reality — based on actual phase logs, not plans.

```
CURRENT:  BRIEF.md says "27 columns on themes", "27-col themes"            ❌ stale
CURRENT:  BRIEF.md says Studio is "stub — needs full form"                  ❌ stale
CURRENT:  CONVENTIONS.md has no section registry or boundary mapper patterns ❌ missing
CURRENT:  ROADMAP.md describes flat theme JSON shape with 27 top-level keys  ❌ stale
CURRENT:  SPRINT_MVP_SLICE.md shows WP-004 as "CURRENT"                     ❌ stale
CURRENT:  ADR-009 already V3 section-driven                                  ✅ done (CC updated in Phase 1-2)
CURRENT:  WP-004-section-architecture.md status is "IN PROGRESS"             ❌ stale
```

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Read all 4 phase logs to understand what was actually done
cat logs/wp-004/phase-0-result.md
cat logs/wp-004/phase-1-result.md
cat logs/wp-004/phase-2-result.md
cat logs/wp-004/phase-3-result.md
cat logs/wp-004/phase-4-result.md

# 2. Verify current DB shape (ground truth from Phase 1)
grep -n "themes:" packages/db/src/types.ts | head -3

# 3. Check which context files mention flat model
grep -n "27 columns\|27-col\|flat\|seo_title\|seo_description\|custom_sections\|preview_images\|included_plugins" .context/BRIEF.md
grep -n "27 columns\|flat\|themeToFormData\|formDataToUpsert" .context/CONVENTIONS.md
grep -n "27 columns\|flat\|seo_title\|seo_description\|custom_sections\|included_plugins" .context/ROADMAP.md

# 4. Check sprint status
grep -n "WP-004\|CURRENT\|section" workplan/SPRINT_MVP_SLICE.md | head -10

# 5. Check WP status
grep -n "Status:" workplan/WP-004-section-architecture.md | head -1
```

**Document findings before making any changes.**

---

## Task 5.1: Update .context/BRIEF.md

### Changes:

**"What's built" → Supabase DB row:**
```
BEFORE: **4 tables** (profiles, themes, licenses, audit_log), **27 columns on themes** (full ADR-009 fields), **15 RLS policies**, 3 functions, 3 triggers, 1 user
AFTER:  **4 tables** (profiles, themes, licenses, audit_log), **themes: 9 columns** (id, slug, status, meta jsonb, sections jsonb, seo jsonb, created_by, timestamps), **15 RLS policies**, 3 functions, 3 triggers
```

**"What's built" → @cmsmasters/db package:**
```
BEFORE: client.ts, types.ts (27-col themes incl hero/resources/badges/rating/sales), queries for themes/profiles/audit
AFTER:  client.ts, types.ts (ThemeMeta, ThemeSection, ThemeSEO, SectionType), mappers.ts (themeRowToFormData/formDataToThemeInsert), queries for themes/profiles/audit
```

**"What's built" → @cmsmasters/validators package:**
```
BEFORE: theme.ts Zod schema (full ADR-009 fields incl hero/resources/badges/rating/sales)
AFTER:  Nested themeSchema ({ slug, meta, sections[], seo, status }), section registry (12 types: 5 core + 7 stubs), per-type Zod schemas, validateSectionData(), getDefaultSections()
```

**"What's built" → Studio app status:**
```
BEFORE: Studio | 🟡 IN PROGRESS | Login, themes list (table+toolbar+cards), sidebar, theme-editor (stub), media (stub)
AFTER:  Studio | 🟡 IN PROGRESS | Login, themes list (table+toolbar+cards), sidebar, section-based page builder (5 core editors + stub), media (stub). Remaining: error boundaries, integration verify, polish.
```

**"Current sprint" → Layer 1 description:**
```
BEFORE: Layer 1: Studio    🟡 IN PROGRESS (shell exists, theme editor needs full form)
AFTER:  Layer 1: Studio    🟡 IN PROGRESS (section page builder done, polish + integration verify remaining)
```

**"What's left for Layer 1" section:**
```
BEFORE:
- Theme editor: full form with ALL ADR-009 fields (hero, features, plugins, badges, resources, custom_sections, rating, sales)
- Media upload wired to Hono API → R2
- Publish flow: save → Supabase → trigger revalidation
- At least 1 test theme created end-to-end

AFTER:
- ~~Theme editor~~ ✅ Section page builder: meta sidebar + 5 core section editors + stub editor
- ~~Publish flow~~ ✅ Save/publish with toast + audit + revalidation call
- Error boundaries, 404 page
- Media upload wired to Hono API → R2
- Integration verify: end-to-end CRUD with section model
- At least 1 test theme created end-to-end
```

**"Theme page architecture" section → update JSON shape:**

Replace the flat "Theme data shape (27 columns in Supabase)" block with:

```
**Theme data shape (section-driven, WP-004):**

DB columns: id, slug, status, meta (jsonb), sections (jsonb), seo (jsonb), created_by, created_at, updated_at

meta: { name, tagline, description, category, price, demo_url, themeforest_url, themeforest_id, thumbnail_url, preview_images, rating, sales, compatible_plugins, trust_badges, resources: { public, licensed, premium } }

sections: [{ type: SectionType, data: {...} }, ...] — ordered array, section type determines rendering
  Core 5: theme-hero, feature-grid, plugin-comparison, trust-strip, related-themes
  Stubs (7): before-after, video-demo, testimonials, faq, cta-banner, stats-counter, resource-sidebar

seo: { title, description }
```

**Also update:** "Last updated" date to today.

**Add Source Logs section at bottom:**
```
---
## Source Logs
- WP-004 Phase 0: `logs/wp-004/phase-0-result.md` — flat-field inventory
- WP-004 Phase 1: `logs/wp-004/phase-1-result.md` — DB migration + types + validators + mappers
- WP-004 Phase 2: `logs/wp-004/phase-2-result.md` — section registry
- WP-004 Phase 3: `logs/wp-004/phase-3-result.md` — query recovery + path migration
- WP-004 Phase 4: `logs/wp-004/phase-4-result.md` — section page builder
```

---

## Task 5.2: Update .context/CONVENTIONS.md

### Add new section: "Section registry pattern"

Insert after "Zod patterns" section:

```markdown
### Section registry pattern (WP-004)

Single source of truth: `packages/validators/src/sections/index.ts`

- `SECTION_REGISTRY` — Record<SectionType, { schema, label, defaultData }>
- `SECTION_TYPES` — derived from registry keys (never hardcoded separately)
- `SECTION_LABELS` — derived from registry entries
- `CORE_SECTION_TYPES` — 5 types shown in add-section picker
- `getDefaultSections()` — factory, returns fresh array each call (mutation-safe)
- `validateSectionData(section)` — per-type validation at save boundary
- `validateSections(sections[])` — array validation

Adding a new section type: create file in `packages/validators/src/sections/{type}.ts`, add to `SECTION_REGISTRY`. Types auto-propagate. No mapper changes needed.

### Boundary mapper pattern (WP-004)

`packages/db/src/mappers.ts` — the ONLY boundary between DB and form:
- `themeRowToFormData()` — DB row → form state (null → default)
- `formDataToThemeInsert()` — form → DB insert (empty → undefined)
- Thin: form shape mirrors DB shape. No field-by-field translation.

### Nested form convention (WP-004)

Form shape mirrors DB shape: `{ slug, meta: {...}, sections: [...], seo: {...}, status }`.
react-hook-form paths: `register('meta.name')`, `useFieldArray({ name: 'sections' })`, `register('sections.${i}.data.headline')`.
`as any` casts needed for dynamic section data paths — expected, safe.
```

---

## Task 5.3: Update .context/ROADMAP.md

### Layer 1 status update:

```
BEFORE: Layer 1: Studio — Complete Theme Editor (3–4 days)
AFTER:  Layer 1: Studio — Complete Theme Editor (3–4 days) — SECTION BUILDER DONE
```

### "What exists" section — add:

```
- Section-based page builder (WP-004): useFieldArray sections, 5 core editors, stub editor, add/remove/reorder
- Save/publish: meta + sections[] + seo persisted, revalidation triggered
- Section registry: 12 types in @cmsmasters/validators
```

### "What needs building" section — update theme editor rows:

Mark section builder as done, keep remaining items.

### Theme JSON shape reference — replace flat JSON with section model:

```json
{
  "slug": "growth-hive",
  "status": "published",
  "meta": {
    "name": "Growth Hive",
    "tagline": "Consulting & Digital Marketing Theme",
    "category": "business",
    "price": 69,
    "themeforest_url": "https://themeforest.net/item/...",
    "demo_url": "https://growth-hive.cmsmasters.studio",
    "thumbnail_url": "...",
    "preview_images": ["..."],
    "rating": 4.58,
    "sales": 2366,
    "compatible_plugins": ["elementor", "woocommerce", "wpml"],
    "trust_badges": ["power-elite", "elementor", "gdpr"],
    "resources": {
      "public": ["docs", "changelog", "faq", "demos"],
      "licensed": ["download", "child-theme", "psd", "support"],
      "premium": ["priority-support", "megakit-access"]
    }
  },
  "sections": [
    { "type": "theme-hero", "data": { "headline": "Build with Growth Hive", "screenshots": ["hero-1.webp"] } },
    { "type": "feature-grid", "data": { "features": [{ "icon": "palette", "title": "12 Demos", "description": "..." }] } },
    { "type": "plugin-comparison", "data": { "included_plugins": [{ "name": "ACF PRO", "slug": "acf-pro", "value": 59 }] } },
    { "type": "trust-strip", "data": {} },
    { "type": "related-themes", "data": { "limit": 4 } }
  ],
  "seo": {
    "title": "Growth Hive — Consulting WordPress Theme",
    "description": "..."
  }
}
```

### Layer 2 Portal rendering model — update:

```
BEFORE: ThemePage template renders it. 85% fixed sections, 15% customSections.
AFTER:  ThemePage renders ordered sections[] array. No hardcoded template. Section order = JSON order.
```

```tsx
// Portal rendering (section-driven)
export function ThemePage({ theme }) {
  return (
    <main>
      {theme.sections.map((section, i) => {
        const Component = SECTION_COMPONENTS[section.type]
        return Component ? <Component key={i} {...section.data} meta={theme.meta} /> : null
      })}
    </main>
  )
}
```

---

## Task 5.4: Update workplan/SPRINT_MVP_SLICE.md

### WP-004 status:

```
BEFORE: WP-004: Section Architecture Recovery   ← CURRENT (~8-11h)
AFTER:  WP-004: Section Architecture Recovery   ✅ DONE (~2h actual)
```

### Layer 1 status (if applicable — check what's accurate after Phase 4):

Studio section builder is done. What remains: error boundaries, 404 page, media stub, integration verify, docs update.

---

## Task 5.5: Update workplan/WP-004-section-architecture.md

```
BEFORE: **Status:** IN PROGRESS (Phase 0 ✅)
AFTER:  **Status:** ✅ DONE
         **Completed:** 2026-03-30
```

---

## Task 5.6: Verify no stale references remain

```bash
# Flat model references that should be gone
grep -rn "27 columns\|27-col\|flat.*theme\|seo_title\|seo_description\|custom_sections\b" .context/ workplan/SPRINT_MVP_SLICE.md
# Expected: 0 matches (or only in historical/log context)

# Section model references that should exist
grep -rn "sections\[\]\|section.registry\|meta.*jsonb\|section-driven" .context/
# Expected: multiple matches in BRIEF, CONVENTIONS, ROADMAP
```

---

## Files to Modify

- `.context/BRIEF.md` — update DB shape, packages, Studio status, theme data shape, add Source Logs
- `.context/CONVENTIONS.md` — add section registry, boundary mapper, nested form patterns
- `.context/ROADMAP.md` — update Layer 1 status, theme JSON shape, Portal rendering model
- `workplan/SPRINT_MVP_SLICE.md` — mark WP-004 as ✅ DONE
- `workplan/WP-004-section-architecture.md` — mark as ✅ DONE, add completed date

**NOT modified:**
- `.context/ADR_DIGEST.md` — ADR-009 V3 already done
- `.context/LAYER_0_SPEC.md` — Layer 0 reference only, no themes schema detail
- `workplan/adr/009-component-theme-pages.md` — already V3

---

## Acceptance Criteria

- [ ] BRIEF.md: no mention of "27 columns" or flat theme shape
- [ ] BRIEF.md: themes table described as 9 columns (meta/sections/seo jsonb)
- [ ] BRIEF.md: Studio status reflects section page builder
- [ ] BRIEF.md: Source Logs section links all 5 phase logs
- [ ] CONVENTIONS.md: section registry pattern documented
- [ ] CONVENTIONS.md: boundary mapper pattern documented
- [ ] CONVENTIONS.md: nested form convention documented
- [ ] ROADMAP.md: theme JSON shape is section-driven (meta + sections[] + seo)
- [ ] ROADMAP.md: Portal rendering model is `sections.map()`, not hardcoded template
- [ ] SPRINT_MVP_SLICE.md: WP-004 marked ✅ DONE
- [ ] WP-004 workplan: Status = ✅ DONE, Completed date set
- [ ] Stale reference check: 0 flat model references in .context/ files

---

## ⚠️ MANDATORY: Verification (do NOT skip)

```bash
echo "=== Phase 5 Verification ==="

# 1. No flat model references in context files
grep -rn "27 columns\|27-col\|seo_title\|seo_description\b" .context/
echo "(Expected: 0 matches)"

# 2. Section model present
grep -c "sections\[\]\|section.registry\|meta.*jsonb\|section-driven\|SECTION_REGISTRY" .context/BRIEF.md .context/CONVENTIONS.md .context/ROADMAP.md
echo "(Expected: multiple matches per file)"

# 3. Source Logs in BRIEF
grep -c "Source Logs" .context/BRIEF.md
echo "(Expected: 1)"

# 4. WP-004 marked done
grep "Status.*DONE" workplan/WP-004-section-architecture.md
echo "(Expected: 1 match)"

# 5. Sprint updated
grep "WP-004.*DONE\|WP-004.*✅" workplan/SPRINT_MVP_SLICE.md
echo "(Expected: 1 match)"

echo "=== Phase 5 Verification Complete ==="
```

---

## ⚠️ MANDATORY: Write Execution Log (do NOT skip)

After verification (before committing), create the file:
`logs/wp-004/phase-5-result.md`

```markdown
# Execution Log: WP-004 Phase 5 — Documentation Update
> Epic: WP-004 Section-Driven Architecture Recovery
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED

## What Was Implemented
{2-5 sentences}

## Key Decisions
| Decision | Chosen | Why |
|----------|--------|-----|
| ... | ... | ... |

## Files Changed
| File | Change | Description |
|------|--------|-------------|
| `path` | modified | brief description |

## Issues & Workarounds
{None if clean.}

## Open Questions
{None if none.}

## Verification Results
| Check | Result |
|-------|--------|
| No flat refs in .context/ | ✅/❌ |
| Section model in docs | ✅/❌ |
| Source Logs in BRIEF | ✅/❌ |
| WP-004 marked DONE | ✅/❌ |
| Sprint updated | ✅/❌ |

## Git
- Commit: `{sha}` — `docs: update context files for section architecture [WP-004 phase 5]`
```

---

## Git

```bash
git add .context/ workplan/ logs/wp-004/
git commit -m "docs: update context files for section architecture [WP-004 phase 5]"
```

---

## ⚠️ IMPORTANT Notes for CC

- **This is the FINAL phase of WP-004.** After this, WP-004 is DONE.
- **Base all updates on phase logs, not on plans.** Read the 5 log files first. If reality differed from the plan, document reality.
- **Don't rewrite entire files.** Make targeted edits — the files have content about other layers/features that should stay.
- **ROADMAP.md Layer 2 description still mentions hardcoded template.** Update the rendering model to `sections.map()` but keep the section descriptions (Hero, Feature Grid, etc.) — those are still what Portal will render, just from sections[] now.
- **The "custom_sections" field no longer exists.** All section types are now in `sections[]` uniformly. Remove any reference to a separate "custom_sections" concept.
- **ADR-009 is already V3** (updated during earlier phases). Don't re-update it.
- **THEME-EDITOR-V2-DESIGN-SPEC.md** — check if it references flat model. If yes, add a note at top: "Superseded by WP-004 section architecture. See .context/BRIEF.md for current model."
