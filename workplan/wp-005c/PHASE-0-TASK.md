# WP-005C Phase 0: RECON — Current Studio State

> Workplan: WP-005C Studio — Blocks CRUD, Templates CRUD, Theme Editor Pivot
> Phase: 0 of 5
> Priority: P0
> Estimated: 0.5 hours
> Type: Config
> Previous: WP-005B ✅ (blocks + templates tables, API endpoints, validators, DB query layer)
> Next: Phase 1 (Blocks Page — Library CRUD)

---

## Context

WP-005B delivered the full backend: `blocks` and `templates` tables in Supabase, 10 Hono CRUD endpoints, Zod validators, and a DB query layer. Studio currently has a gutted theme editor (placeholder text from WP-005B Phase 1) and no Blocks or Templates pages.

```
CURRENT:  Backend — blocks/templates tables, API, validators, queries   ✅
CURRENT:  Studio — auth, sidebar, topbar, theme list, theme editor shell   ✅
CURRENT:  Theme editor — placeholder "coming in next update"   ✅
MISSING:  Blocks page (browse, add, edit, delete)   ❌
MISSING:  Templates page (position grid CRUD)   ❌
MISSING:  Theme editor pivot (template picker + block fills)   ❌
```

Before writing any UI code, we need an exact picture of Studio's current state: routes, sidebar, theme-editor content, API fetch patterns, available UI components, and CORS readiness.

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Map current Studio routes
cat apps/studio/src/app.tsx

# 2. Map current sidebar nav items
cat apps/studio/src/components/sidebar.tsx

# 3. Read current theme-editor.tsx (after WP-005B placeholder)
cat apps/studio/src/pages/theme-editor.tsx

# 4. Check existing API fetch patterns
ls apps/studio/src/lib/
cat apps/studio/src/lib/queries.ts 2>/dev/null || echo "No queries.ts"
cat apps/studio/src/lib/supabase.ts 2>/dev/null || echo "No supabase.ts"

# 5. Check @cmsmasters/api-client package — can we extend it?
ls packages/api-client/src/ 2>/dev/null || echo "No api-client package"
cat packages/api-client/src/index.ts 2>/dev/null || echo "No api-client index"

# 6. Check available UI components in @cmsmasters/ui
ls packages/ui/src/primitives/
ls packages/ui/src/domain/ 2>/dev/null || echo "No domain components"
ls packages/ui/src/layouts/ 2>/dev/null || echo "No layouts"

# 7. Confirm Hono API endpoints exist and check CORS config
grep -r "cors\|CORS" apps/api/src/ --include="*.ts" -l
cat apps/api/src/index.ts | head -60
```

**Document your findings before writing any code.**

**IMPORTANT:** If `@cmsmasters/api-client` doesn't exist, Phase 1 will create fetch helpers directly in `apps/studio/src/lib/`. If it does exist, we extend it.

**IMPORTANT:** If CORS is not configured for Studio's dev port (5173), flag this — API calls will fail silently in the browser.

---

## Task 0.1: Map Studio Routes and Navigation

### What to Build

Nothing — this is read-only audit. Document:

1. **All routes** in `app.tsx` — path, component, any guards
2. **Sidebar nav items** — label, icon, path, active state logic
3. **Any route patterns** — nested routes, layout wrappers, lazy loading

### Expected Findings

Based on WP-004 (Studio base):
- Routes: `/`, `/themes`, `/themes/new`, `/themes/:slug`, `/media`, possibly `/settings`
- Sidebar: Home, Themes, Media, possibly Settings
- Layout: sidebar + topbar shell wrapping page content

---

## Task 0.2: Audit Theme Editor Current State

### What to Build

Nothing — read and document:

1. **theme-editor.tsx** — what's in the content area after WP-005B removed sections
2. **form-defaults.ts** — does it already have `template_id` and `block_fills`?
3. **Data flow** — how does theme editor fetch/save data? Direct Supabase? API? React Query?

### Expected Findings

- Content area: placeholder text ("Template and block management coming in next update")
- form-defaults.ts: should already have `template_id: ''` and `block_fills: []` (from WP-005B Phase 1)
- Data flow: likely direct Supabase client or fetch to Hono API with JWT

---

## Task 0.3: Audit API Fetch Patterns

### What to Build

Nothing — read and document:

1. **How Studio calls the API** — direct fetch? axios? api-client package?
2. **Auth token handling** — how is JWT passed to API calls?
3. **Error handling pattern** — try/catch? React Query? SWR?
4. **Base URL config** — env variable? hardcoded?

This determines how we build blocks/templates API helpers in Phase 1.

---

## Task 0.4: Audit Available UI Components

### What to Build

Nothing — inventory what `@cmsmasters/ui` provides:

1. **Primitives** — Button, Input, Textarea, Dialog/Modal, Card, Badge, Select, etc.
2. **Domain components** — any business-specific composites
3. **Layouts** — page shells, sidebar, topbar
4. **Utilities** — `cn()`, toast, form components

This determines what we can reuse vs what we must build for blocks/templates pages.

---

## Task 0.5: Verify API CORS and Connectivity

### What to Build

Nothing — verify:

1. **CORS config in Hono API** — is `localhost:5173` (Studio) allowed?
2. **API base URL** — what port does the API run on?
3. **Can Studio reach the API?** — any proxy config in vite?

---

## Files to Modify

None. This phase is read-only audit.

---

## Acceptance Criteria

- [ ] All Studio routes documented
- [ ] Sidebar nav items documented
- [ ] Theme editor current state documented (placeholder confirmed)
- [ ] API fetch pattern documented (how Studio calls backend)
- [ ] @cmsmasters/api-client existence confirmed or denied
- [ ] Available UI components inventoried
- [ ] CORS config verified for Studio ↔ API
- [ ] Findings written to `logs/wp-005c/phase-0-result.md`

---

## MANDATORY: Verification (do NOT skip)

```bash
echo "=== Phase 0 Verification ==="

# 1. Confirm log file was created
test -f logs/wp-005c/phase-0-result.md && echo "Phase 0 log exists ✅" || echo "Phase 0 log MISSING ❌"

# 2. TypeScript still compiles (no accidental changes)
npx tsc --noEmit 2>&1 | tail -5
echo "(expect 0 errors — no code changes in Phase 0)"

echo "=== Verification complete ==="
```

---

## MANDATORY: Write Execution Log (do NOT skip)

After audit, create the file:
`logs/wp-005c/phase-0-result.md`

Structure (fill all sections — write N/A if not applicable, do NOT omit sections):

```markdown
# Execution Log: WP-005C Phase 0 — RECON: Current Studio State
> Epic: WP-005C Studio — Blocks CRUD, Templates CRUD, Theme Editor Pivot
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED

## What Was Found

### Studio Routes
{list all routes from app.tsx}

### Sidebar Navigation
{list all nav items}

### Theme Editor State
{describe current content of theme-editor.tsx}

### API Fetch Pattern
{how Studio calls the API — direct fetch / api-client / Supabase client}
{JWT handling}
{error handling pattern}

### @cmsmasters/api-client
{exists or not, what it contains}

### Available UI Components
{list primitives, domain, layouts}

### CORS / Connectivity
{CORS config status, API base URL, any proxy}

## Key Decisions
| Decision | Chosen | Why |
|----------|--------|-----|
| API fetch approach | {direct fetch / extend api-client} | {reason} |
| ... | ... | ... |

## Issues & Workarounds
{Problems encountered and resolutions. "None" if clean.}

## Open Questions
{Non-blocking questions for Brain. "None" if none.}

## Blockers for Phase 1
{Anything that must be resolved before Phase 1 can start. "None" if clear.}
```

---

## Git

No commit for Phase 0 — it's read-only audit. The log file will be committed with Phase 1.

---

## IMPORTANT Notes for CC

- **Do NOT write any code in this phase.** Read only.
- **Do NOT modify any files.** Only create the log.
- **If CORS is missing**, flag it as a blocker — don't try to fix it here, it goes in Phase 1.
- **If @cmsmasters/api-client doesn't exist**, note it — Phase 1 will create fetch helpers in `apps/studio/src/lib/`.
- **If theme-editor.tsx doesn't have the placeholder**, something changed — stop and ask.
- **Read every file mentioned in the audit commands.** Don't guess based on names.
