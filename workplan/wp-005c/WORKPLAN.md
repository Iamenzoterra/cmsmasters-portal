# WP-005C: Studio — Blocks CRUD, Templates CRUD, Theme Editor Pivot

> Three new Studio pages: Blocks library management, Templates position grid editor, Theme Editor with template picker + per-theme "+" block fills.

**Status:** PLANNING
**Priority:** P0 — Critical path (CM can't manage blocks or assemble theme pages without this)
**Prerequisites:** WP-005B ✅ (blocks + templates tables in Supabase, 10 Hono API endpoints, Zod validators, DB query layer)
**Milestone:** WP-005 Part 3 of 4
**Estimated effort:** 12–16 hours across 6 phases
**Created:** 2026-03-30
**Rewritten:** 2026-03-31 — architecture pivot to DB-driven blocks
**Completed:** —

---

## Problem Statement

WP-005B delivered the backend: `blocks` and `templates` tables, CRUD API, validators. But Studio has no UI for any of it. Currently:

1. **No way to add blocks.** Blocks (HTML+CSS assets from Figma → Claude Code) have nowhere to go in Studio. The Blocks page doesn't exist.

2. **No way to manage templates.** Templates (ordered position grids) have no Studio UI. The Templates page doesn't exist.

3. **Theme editor is gutted.** WP-005B Phase 1 removed the old sections builder and left a placeholder: "Template and block management coming in next update."

4. **CM workflow is broken.** Without these pages, the entire flow described in BLOCK-ARCHITECTURE-V2.md is impossible: create block → create template → assign template to theme → fill empty positions.

---

## Solution Overview

### Architecture

```
Supabase                              Hono API (WP-005B)              Studio (THIS WP)
┌──────────────┐                      ┌──────────────────┐            ┌─────────────────────────┐
│ blocks       │ ←── CRUD ──────────  │ /api/blocks      │ ←──────── │ Blocks Page             │
│ templates    │ ←── CRUD ──────────  │ /api/templates   │ ←──────── │ Templates Page          │
│ themes       │ ←── existing ──────  │ /api/themes      │ ←──────── │ Theme Editor (pivoted)  │
└──────────────┘                      └──────────────────┘            └─────────────────────────┘
```

### Studio Pages

**Blocks** (`/blocks`) — NEW page:
- Grid of blocks from DB (name + rendered HTML preview)
- Add: paste HTML + CSS, set name/slug, configure hooks (price selector, links, alt)
- Edit: update HTML/CSS/hooks/metadata
- Delete: with dependency warning (used in template?)

**Templates** (`/templates`) — NEW page:
- List of templates
- Create/Edit: visual position grid (1–N), pick block from library per position or leave empty
- Shows theme count using this template
- Delete: with dependency warning (used by theme?)

**Theme Editor** (`/themes/:slug` and `/themes/new`) — MODIFIED:
- Template picker: select which template to apply
- Position grid: shows template positions with blocks (read-only from template) + empty slots ("+")
- "+" opens block picker → CM selects block → fills that position per-theme
- Per-theme `block_fills` saved to DB
- Meta editor, SEO editor, sidebar — unchanged from WP-004

### Key Decisions

| Decision | Chosen | Why | Alternatives |
|----------|--------|-----|-------------|
| Blocks page = HTML+CSS textarea | Paste raw HTML/CSS from Claude Code output | Simplest for MVP. Дмитро generates blocks outside Studio. | Visual HTML editor (over-engineering for V1) |
| Block preview = rendered iframe | `<iframe srcdoc={html+css}>` sandboxed | Live preview of actual block. No screenshot generation needed. | Static screenshot (stale when HTML updates) |
| Template editor = position grid | Vertical list of numbered slots, each with block picker or empty | Matches the mental model: positions 1-20, some filled, some empty | Drag-and-drop canvas (complex, not needed yet) |
| Theme editor = template-driven | Pick template → positions auto-fill → CM fills gaps with "+" | Matches BLOCK-ARCHITECTURE-V2.md flow exactly | Free-form section builder (old model, discarded) |
| API calls via fetch | Direct fetch to Hono API with JWT | Studio already uses this pattern for themes. `api-client` package exists. | Supabase client direct (bypasses API layer, no validation) |
| No SchemaForm | Blocks have no editable fields — they're HTML assets | Free-form HTML, hooks configured via JSON inputs | Zod→form auto-gen (old model, discarded — blocks have no schemas) |

---

## What This Changes

### New Files

```
apps/studio/src/pages/
├── blocks-list.tsx              — Blocks library page (grid + CRUD)
├── block-editor.tsx             — Add/Edit single block (HTML+CSS+hooks form)
├── templates-list.tsx           — Templates list page
├── template-editor.tsx          — Create/Edit template (position grid)

apps/studio/src/components/
├── block-preview.tsx            — iframe srcdoc preview of block HTML+CSS
├── block-picker-modal.tsx       — Modal for selecting block from library (used in template editor + theme editor)
├── position-grid.tsx            — Shared component: vertical position list with block picker or empty "+"

apps/studio/src/lib/
├── api.ts                       — API fetch helpers for blocks + templates (or extend existing api-client)
```

### Modified Files

```
apps/studio/src/pages/theme-editor.tsx    — Replace placeholder with template picker + position grid with "+"
apps/studio/src/lib/form-defaults.ts      — Adapt defaults for template_id + block_fills
apps/studio/src/app.tsx                   — Add routes: /blocks, /blocks/new, /blocks/:id, /templates, /templates/new, /templates/:id
apps/studio/src/components/sidebar.tsx    — Add Blocks + Templates nav items
```

---

## Implementation Phases

### Phase 0: RECON — Current Studio State (0.5h)

**Goal:** Exact state of Studio after WP-005B: routes, pages, sidebar, theme-editor.tsx current content, existing API fetch patterns, @cmsmasters/api-client usage.

**Tasks:**

0.1. Map current Studio routes (app.tsx)
0.2. Map current sidebar nav items (sidebar.tsx)
0.3. Read current theme-editor.tsx (after WP-005B placeholder)
0.4. Check existing API fetch patterns (lib/queries.ts, lib/supabase.ts)
0.5. Check @cmsmasters/api-client package — can we extend it for blocks/templates?
0.6. Check what UI components exist in @cmsmasters/ui (Button, etc.)
0.7. Confirm Hono API endpoints are reachable from Studio dev server (CORS)

**Verification:** Findings at `logs/wp-005c/phase-0-result.md`

---

### Phase 1: Blocks Page — Library CRUD (3–4h)

**Goal:** CM can browse, add, edit, delete blocks in Studio.

**Tasks:**

1.1. **API fetch helpers** — create `apps/studio/src/lib/blocks-api.ts`:
- `fetchBlocks()` → GET /api/blocks
- `fetchBlock(id)` → GET /api/blocks/:id
- `createBlock(payload)` → POST /api/blocks
- `updateBlock(id, payload)` → PUT /api/blocks/:id
- `deleteBlock(id)` → DELETE /api/blocks/:id
- All use JWT from Supabase session (same pattern as existing theme queries)

1.2. **Blocks list page** (`/blocks`):
- Grid layout: cards with block name + rendered preview (iframe srcdoc)
- Each card: name, slug, preview, edit button, delete button
- Delete: confirm dialog + show dependency warning if used in templates
- "Add Block" button → navigates to /blocks/new

1.3. **Block editor page** (`/blocks/new` and `/blocks/:id`):
- Form fields: name, slug (auto-generated from name, editable on create, readonly on edit)
- HTML textarea (large, monospace font)
- CSS textarea (large, monospace font)
- Hooks config:
  - Price: toggle + CSS selector input
  - Links: repeater (selector + field name + optional label)
- Metadata: alt text input, figma_node input
- Live preview panel: iframe with srcdoc = block HTML wrapped in `<style>` + block CSS
- Save → POST /api/blocks (create) or PUT /api/blocks/:id (update)

1.4. **Block preview component** (`block-preview.tsx`):
- `<iframe srcdoc={...} sandbox="allow-same-origin" />` with scoped CSS wrapper
- Fixed height (300px), width 100%, border

1.5. **Register routes in app.tsx** + **Add sidebar nav items**

**Verification:**
```
- /blocks page shows empty grid (0 blocks in DB)
- /blocks/new → fill HTML+CSS → Save → block appears in grid
- Click block card → /blocks/:id → edit form pre-filled
- Delete block → confirmation → block removed
- tsc compiles
```

---

### Phase 2: Templates Page — Position Grid CRUD (3–4h)

**Goal:** CM can create and edit templates with position grids.

**Tasks:**

2.1. **API fetch helpers** — create `apps/studio/src/lib/templates-api.ts`:
- `fetchTemplates()` → GET /api/templates
- `fetchTemplate(id)` → GET /api/templates/:id
- `createTemplate(payload)` → POST /api/templates
- `updateTemplate(id, payload)` → PUT /api/templates/:id
- `deleteTemplate(id)` → DELETE /api/templates/:id

2.2. **Block picker modal** (`block-picker-modal.tsx`):
- Modal overlay with grid of blocks from DB
- Each block: name + iframe preview (small thumbnail size)
- Click → returns selected block_id
- Search/filter by name (simple text filter)
- Used by: template editor (fill position) + theme editor (fill empty slot)

2.3. **Position grid component** (`position-grid.tsx`):
- Vertical list of positions (1 to max_positions)
- Each position: either shows assigned block (name + mini preview) or shows "+" button
- Click "+" → opens block picker modal → assigns block_id to position
- Click assigned block → option to remove (set to null)
- Reorderable? For MVP: static order by position number. Drag = future.

2.4. **Templates list page** (`/templates`):
- List/grid of templates: name, description, block count (filled / total positions)
- Theme usage count (how many themes use this template)
- Edit/delete buttons
- "Create Template" button → /templates/new

2.5. **Template editor page** (`/templates/new` and `/templates/:id`):
- Form: name, slug, description, max_positions (number input)
- Position grid component with block picker
- Save → POST /api/templates or PUT /api/templates/:id

2.6. **Register routes + sidebar nav**

**Verification:**
```
- /templates page shows empty list
- /templates/new → set name, add blocks to positions → Save
- Template appears in list with block count
- Edit template → change positions → Save
- Delete template → dependency check
- tsc compiles
```

---

### Phase 3: Theme Editor Pivot — Template Picker + Block Fills (2–3h)

**Goal:** Theme editor uses template-driven model. CM picks template, sees positions, fills empty slots with "+".

**Tasks:**

3.1. **Rewrite theme-editor.tsx content area** (replace placeholder):
- If theme has no template_id: show template picker (list of templates with previews)
- If theme has template_id: show position grid (read-only template blocks + editable "+" fills)
- Template picker: dropdown or card grid of available templates
- "Change template" button (warning: resets block_fills)

3.2. **Position grid in theme context**:
- Load template positions (GET /api/templates/:id)
- Merge with theme's block_fills
- For each position:
  - If template has block at this position → show block preview (read-only, from template)
  - If template has null AND theme has block_fill → show block preview (per-theme, editable)
  - If template has null AND no fill → show "+" button
- "+" → block picker modal → save block_fill for this position

3.3. **Save flow**:
- Theme form submits template_id + block_fills[] alongside meta/seo/status
- Use existing upsertTheme → formDataToThemeInsert mapper

3.4. **Update form-defaults.ts**:
```typescript
export function getDefaults(): ThemeFormData {
  return {
    slug: '',
    meta: { name: '', tagline: '', ... },
    template_id: '',
    block_fills: [],
    seo: { title: '', description: '' },
    status: 'draft',
  }
}
```
(Already done in WP-005B Phase 1 — verify it's still correct)

**Verification:**
```
- Create new theme → template picker appears
- Select template → positions show with blocks + empty slots
- Click "+" on empty slot → block picker → block assigned
- Save theme → reload → template + fills preserved
- Change template → block_fills reset (with warning)
- tsc compiles
```

---

### Phase 4: UX Polish (1–2h)

**Goal:** Studio pages are usable: proper layout, feedback, loading states, empty states.

**Tasks:**

4.1. **Loading states** — skeleton placeholders while fetching blocks/templates/theme
4.2. **Empty states** — friendly messages when 0 blocks, 0 templates, no template selected
4.3. **Toast feedback** — success/error toasts on save/delete (existing toast component)
4.4. **Responsive** — sidebar collapses, forms stack on narrow screens
4.5. **Block preview sizing** — consistent aspect ratios in grid vs editor vs position grid
4.6. **Dependency warnings** — clear messaging when trying to delete block used in template, or template used in theme

**Verification:**
```
- Loading states visible during data fetch
- Empty states render correctly
- Toasts show on save/delete
- Responsive behavior on narrow viewport
```

---

### Phase 5: Documentation Update (0.5h)

**Goal:** All docs reflect Studio block management.

**Tasks:**

5.1. CC reads all phase logs
5.2. CC proposes doc updates
5.3. Brain approves
5.4. CC executes doc updates
5.5. Update WP status → ✅ DONE

**Files to update:**
- `.context/BRIEF.md` — Studio has Blocks/Templates/Theme pages
- `.context/CONVENTIONS.md` — Studio API fetch pattern, block preview pattern, position grid pattern
- `.context/ROADMAP.md` — WP-005C done
- `workplan/WP-005-full-section-architecture.md` — 005C status

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| iframe srcdoc security (XSS from pasted HTML) | Malicious content in block HTML | `sandbox="allow-same-origin"` prevents scripts. Only admin/CM can add blocks. |
| Large HTML in textarea — bad UX | Hard to edit big blocks | Monaco editor / CodeMirror in future. For MVP: large textarea with monospace font. |
| Block picker slow with many blocks | Modal takes long to render | MVP: <50 blocks, no issue. Future: virtualized grid, search. |
| Template position grid confusing | CM doesn't understand empty slots | Clear numbered positions with visual states: filled (block preview), empty (dashed border + "+") |
| CORS issues Studio ↔ API | API calls fail | WP-005B already configured CORS for localhost:5173. Verify in Phase 0. |
| Theme editor complexity | Hard to merge template + block_fills visually | Position grid component handles merge logic. Single source of truth: template positions + theme fills. |

---

## Acceptance Criteria (Definition of Done)

### Blocks Page
- [ ] `/blocks` shows grid of blocks from DB with name + live preview
- [ ] `/blocks/new` creates block with HTML+CSS+hooks+metadata
- [ ] `/blocks/:id` edits existing block
- [ ] Delete with dependency check (used in template? → warning)
- [ ] Live preview via iframe srcdoc

### Templates Page
- [ ] `/templates` shows list of templates with block count + theme usage count
- [ ] `/templates/new` creates template with position grid
- [ ] `/templates/:id` edits existing template
- [ ] Position grid: assign blocks from library, leave positions empty
- [ ] Delete with dependency check (used by theme? → warning)

### Theme Editor
- [ ] Template picker shown when no template selected
- [ ] Position grid shows template blocks (read-only) + empty slots ("+")
- [ ] "+" opens block picker → assigns block to position → saved as block_fill
- [ ] template_id + block_fills saved correctly via API
- [ ] Save → reload → state preserved

### General
- [ ] All new pages registered in app.tsx router
- [ ] Sidebar has Blocks + Templates nav items
- [ ] `npx tsc --noEmit` — 0 new errors
- [ ] All phases logged in `logs/wp-005c/`
- [ ] `.context/` docs updated (Phase 5)

---

## Dependencies

| Depends on | Status | Blocks |
|------------|--------|--------|
| WP-005B (blocks + templates DB + API) | ✅ DONE | All phases — API endpoints |
| WP-005A (type→block rename) | ✅ DONE | Clean codebase |
| WP-004 (Studio base: auth, sidebar, topbar, theme editor shell) | ✅ DONE | Foundation |

---

## Notes

- **No SchemaForm.** Old model had Zod→form auto-generation. New model: blocks are HTML assets with no per-field editing. Hooks are configured via simple inputs (CSS selector + field name), not auto-generated forms.
- **No packages/blocks/ imports.** Old model imported from `@cmsmasters/blocks`. New model: all block data comes from Supabase via API. Studio fetches blocks at runtime, not build time.
- **Block HTML safety.** Only content_manager and admin can create/edit blocks. Previews are sandboxed iframes. For MVP this is sufficient. CSP headers = future hardening.
- **Template position numbering.** Positions are 1-indexed integers. Template stores which positions have blocks. Theme stores which empty positions the CM filled. Merge: template positions + theme fills = complete page.
- **Existing theme meta/SEO editor stays.** This WP only changes the content area (sections → template + positions). Sidebar meta editor, SEO form, save/publish/delete — all unchanged.
