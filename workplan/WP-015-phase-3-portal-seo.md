# WP-015 Phase 3: Portal Rendering + SEO

> Workplan: WP-015 Use Cases Taxonomy
> Phase: 3 of 4
> Priority: P1
> Estimated: 1-1.5 hours
> Type: Full-stack
> Previous: Phase 2 ✅ (Studio UI — TagInput + Sidebar)
> Next: Phase 4 (Close — docs update)
> Affected domains: app-portal

---

## Context

```
CURRENT:  use_cases + theme_use_cases in Supabase with RLS                      ✅
CURRENT:  @cmsmasters/db exports getThemeUseCases, searchUseCases, etc.          ✅
CURRENT:  Studio tag-input creates/manages use cases per theme                   ✅
CURRENT:  Portal theme page resolves {{price}}, {{meta:*}}, {{link:*}} hooks     ✅
CURRENT:  Portal theme page has JSON-LD Product schema                           ✅
CURRENT:  Price enrichment pattern: fetch junction → inject into meta → hooks    ✅
MISSING:  {{perfect_for}} hook resolution                                        ❌
MISSING:  JSON-LD suitableFor array                                              ❌
```

This phase adds the portal-side rendering: fetch use cases at build time, resolve
the `{{perfect_for}}` hook as an HTML list, and add `suitableFor` to JSON-LD.

---

## Domain Context

**app-portal:**
- Key invariants: Hook resolution is build-time string replacement in RSC. Zero client JS.
- Known traps: new hooks must not break existing resolution; blocks are HTML strings
- Public API: none — leaf consumer
- Blast radius: changing hooks.ts affects all theme pages; changing theme page affects all themes

**Pattern to follow** (from `apps/portal/app/themes/[slug]/page.tsx` lines 67-76):
```typescript
// Enrich meta with prices from junction table
try {
  const prices = await getThemePrices(supabase, theme.id)
  // ... inject into meta
} catch {
  // Fall through
}
```

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 0. Baseline
npm run arch-test

# 1. Read domain skill
cat .claude/skills/domains/app-portal/SKILL.md

# 2. Check current hook resolution
cat apps/portal/lib/hooks.ts

# 3. Check theme page — imports, enrichment, JSON-LD
cat apps/portal/app/themes/\\[slug\\]/page.tsx

# 4. Baseline test
npm run arch-test
```

---

## Task 3.1: Add `{{perfect_for}}` Hook Resolution

### What to Build

Add a new regex case in `resolveBlockHooks()` in `apps/portal/lib/hooks.ts`.

The function signature stays the same, but now also accepts `useCases` via the `meta` object
(injected in the theme page before hooks are resolved — same as prices).

```typescript
// Add after the {{link:*}} block, before the return:

// {{perfect_for}} → HTML list of use cases
result = result.replace(/\{\{perfect_for\}\}/g, () => {
  const useCases = meta._use_cases as string[] | undefined
  if (!useCases || useCases.length === 0) return ''
  const items = useCases.map((name) => `<li>${name}</li>`).join('\n')
  return `<ul class="perfect-for-list">\n${items}\n</ul>`
})
```

**Why `meta._use_cases`:** Following the price enrichment pattern — data is fetched in the theme
page, injected into the `meta` object under a prefixed key, then resolved by hooks. The underscore
prefix signals it's injected (not from theme.meta jsonb).

### Integration

In `apps/portal/lib/hooks.ts`, inside `resolveBlockHooks()`, add the new regex block after the
`{{link:*}}` replacement (line ~99) and before `return result` (line ~101).

### Domain Rules
- Do NOT change the function signature — `meta` is already `Record<string, unknown>`
- Do NOT modify existing hook patterns — add only
- Return empty string when no use cases (block should handle display:none in CSS if needed)

---

## Task 3.2: Fetch Use Cases in Theme Page

### What to Build

In `apps/portal/app/themes/[slug]/page.tsx`, add use case fetching and injection into meta.

**Add import:**

```typescript
import { getThemePrices, getThemeUseCases } from '@cmsmasters/db'
```

**Add fetching block** — right after the existing prices enrichment block (after line ~76):

```typescript
// Enrich meta with use cases from junction table
try {
  const useCases = await getThemeUseCases(supabase, theme.id)
  if (useCases.length > 0) {
    meta._use_cases = useCases.map((uc: any) => uc.name)
  }
} catch {
  // Fall through — {{perfect_for}} resolves to empty
}
```

### Domain Rules
- Follow exact same try/catch pattern as prices enrichment
- Inject as `meta._use_cases` (string array of names, not IDs)
- Must happen BEFORE hook resolution (line ~112 `resolveBlockHooks`)

---

## Task 3.3: Add `suitableFor` to JSON-LD

### What to Build

In the JSON-LD section of `apps/portal/app/themes/[slug]/page.tsx` (lines ~154-168), add:

```typescript
// After the aggregateRating block, before return:
const useCaseNames = (meta._use_cases as string[] | undefined)
if (useCaseNames && useCaseNames.length > 0) {
  jsonLd.audience = useCaseNames.map((name) => ({
    '@type': 'Audience',
    audienceType: name,
  }))
}
```

**Why `audience` instead of `suitableFor`:** `suitableFor` is not a standard schema.org property
on Product. The correct schema.org property is `audience` with `Audience` type and `audienceType`
string. This is recognized by Google and AI crawlers.

### Domain Rules
- Only add when use cases exist (don't add empty array)
- Use schema.org Audience type for proper structured data

---

## Files to Modify

- `apps/portal/lib/hooks.ts` — add `{{perfect_for}}` regex in `resolveBlockHooks()`
- `apps/portal/app/themes/[slug]/page.tsx` — fetch use cases, inject into meta, add JSON-LD audience

---

## Acceptance Criteria

- [ ] `{{perfect_for}}` in block HTML resolves to `<ul class="perfect-for-list">` with `<li>` items
- [ ] `{{perfect_for}}` resolves to empty string when theme has no use cases
- [ ] Use cases fetched from junction table at build time (RSC, zero client JS)
- [ ] JSON-LD includes `audience` array with Audience type when use cases exist
- [ ] JSON-LD has no `audience` field when no use cases
- [ ] Existing hooks ({{price}}, {{meta:*}}, {{link:*}}) still work
- [ ] `npm run arch-test` passes (all tests green, no regressions)
- [ ] No new files (only modifications)

---

## MANDATORY: Verification (do NOT skip)

```bash
echo "=== Phase 3 Verification ==="

# 1. Arch tests
npm run arch-test
echo "(expect: all tests green, no regressions)"

# 2. Verify hook resolution code
grep "perfect_for" apps/portal/lib/hooks.ts
echo "(expect: regex match found)"

# 3. Verify use case fetch in theme page
grep "_use_cases" apps/portal/app/themes/\\[slug\\]/page.tsx
echo "(expect: enrichment + JSON-LD references)"

# 4. Verify existing hooks still present
grep "{{price}}" apps/portal/lib/hooks.ts
grep "{{link:" apps/portal/lib/hooks.ts
echo "(expect: both still present)"

echo "=== Verification complete ==="

# 5. Manual testing (after deploy/dev server):
# - Open a theme page with use cases assigned
# - Check sidebar: "Perfect for" list renders
# - View source: JSON-LD contains audience array
# - Open a theme with NO use cases: no "Perfect for" section, no audience in JSON-LD
```

---

## MANDATORY: Write Execution Log (do NOT skip)

After verification (before committing), create the file:
`logs/wp-015/phase-3-result.md`

Structure (fill all sections — write N/A if not applicable, do NOT omit sections):

```markdown
# Execution Log: WP-015 Phase 3 — Portal Rendering + SEO
> Epic: Use Cases Taxonomy
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED
> Domains affected: app-portal

## What Was Implemented
{2-5 sentences describing what was actually built}

## Key Decisions
| Decision | Chosen | Why |
|----------|--------|-----|
| ... | ... | ... |

## Files Changed
| File | Change | Description |
|------|--------|-------------|
| `path` | created/modified/deleted | brief description |

## Issues & Workarounds
{Problems encountered and resolutions. "None" if clean.}

## Open Questions
{Non-blocking questions. "None" if none.}

## Verification Results
| Check | Result |
|-------|--------|
| arch-test | ✅/❌ ({N} tests) |
| Existing hooks | ✅/❌ |
| AC met | ✅/❌ |

## Git
- Commit: `{sha}` — `{message}`
```

---

## Git

```bash
git add apps/portal/lib/hooks.ts apps/portal/app/themes/\\[slug\\]/page.tsx logs/wp-015/phase-3-result.md
git commit -m "feat(portal): resolve {{perfect_for}} hook + JSON-LD audience [WP-015 phase 3]"
```

---

## IMPORTANT Notes for CC

- **Read domain skill FIRST** — `.claude/skills/domains/app-portal/SKILL.md`
- **Follow prices enrichment pattern EXACTLY** — fetch junction, inject into meta, then hooks resolve it
- **meta._use_cases underscore prefix** — signals injected data, not from theme.meta jsonb
- **schema.org Audience type** — correct way to express "suitable for" on Product; `suitableFor` is not a real schema.org property
- **No new files** — only modify hooks.ts and theme page
- **Do NOT change domain-manifest.ts** — no new files, no new tables for this domain
- **Run `npm run arch-test` before committing**
- **Do NOT touch Studio code** — that's Phase 2 (done)
