# WP-001 Phase 4: Component Detail Page + Live Render

> Workplan: WP-001 CC Components Page — Real Data Upgrade
> Phase: 4 of 5
> Priority: P1
> Estimated: 3-4 hours
> Type: Frontend
> Previous: Phase 3 ✅ (Coverage & List View Polish — source/status filters, scoped CoverageView, LayerCoverageTable)
> Next: Phase 5 (Documentation Update)

---

## Context

Phases 1-3 upgraded the scanner, wired real data into cards/coverage, and added filtering. But the Components page is still flat — there's no way to drill into a component. Clicking a card does nothing. There's no detail page showing the component rendered live, its props table, code example, or story link.

```
DONE:     Scanner with hasStory/hasTests/usedBy/loc/propsInterface          ✅
DONE:     Cards show StatusDots, usedBy count, loc                          ✅
DONE:     CoverageView scoped to UI components with per-layer table         ✅
DONE:     Source + status filters                                           ✅
MISSING:  /components/[id] detail route                                     ❌
MISSING:  Live component render in brand-themed container                   ❌
MISSING:  Props table parsed from propsInterface                            ❌
MISSING:  Code example panel                                                ❌
MISSING:  ComponentCard links to detail page                                ❌
```

Phase 4 creates the `[id]` detail route with: header + back link, live render panel (with CSS isolation), props table, code example, and Storybook link. It also makes ComponentCard clickable.

**IMPORTANT:** `packages/ui/src/primitives/` is currently empty (Phase C hasn't delivered yet). The detail page must work gracefully with 0 real UI components — showing "No preview available" for legacy entries and preparing the live render pipeline for when real components arrive.

---

## PHASE 0: Audit (do FIRST — CRITICAL)

```bash
# 1. Confirm Phase 3 commit is HEAD
cd apps/command-center
git log --oneline -3
# Expected: feat(cc): add source/status filters... [WP-001 phase 3]

# 2. Confirm no [id] route exists yet
ls app/components/
# Expected: only page.tsx, NO [id]/ directory

# 3. Confirm existing [id] pattern to follow
ls app/phases/\[id\]/
# Expected: page.tsx — use this as pattern reference

# 4. Check components.json has entries to link to
node -e "const d = require('../../workplan/components.json'); console.log('total:', d.components.length); console.log('with propsInterface:', d.components.filter(c => c.propsInterface).length);"
# Expected: total ~95, propsInterface 0 (no real UI components yet)

# 5. Verify packages/ui barrel export exists
cat ../../packages/ui/index.ts
# Expected: empty barrel (Phase C not done)

# 6. Confirm build works (baseline)
npx next build 2>&1 | tail -3
# Expected: no errors

# 7. Check page.tsx line count (current state)
wc -l app/components/page.tsx
# Expected: ~645 lines
```

**Document findings before writing any code.**

**IMPORTANT:** The detail page must handle TWO types of entries:
1. **Legacy tasks** (`source === 'phases-json'`): no file, no render, no props — show task metadata only
2. **UI components** (`source === 'filesystem'`): will eventually have live render, props, code example — but for now also empty since Phase C hasn't delivered

---

## Task 4.1: Create Detail Route — `app/components/[id]/page.tsx`

### What to Build

**File:** `apps/command-center/app/components/[id]/page.tsx` — **NEW**

Follow the pattern from `app/phases/[id]/page.tsx`:
- Async server component
- `params: Promise<{ id: string }>` (Next.js 15 convention — params is a Promise)
- Read component data via `getComponents()` + find by id
- 404-style fallback if not found
- Back link to `/components`

```typescript
import type React from 'react';
import Link from 'next/link';
import { getComponents } from '@/lib/data';
import type { ComponentSummary, LayerName } from '@/lib/types';
import { StatusDots } from '@/ui/StatusDots';
import { cn } from '@/theme/utils';

// Re-use layer derivation logic (or import from a shared location)
const INFRA_APPS = new Set(['infra', 'command-center', 'db', 'auth', 'email', 'validators', 'api-client']);
const PRIMITIVE_KEYWORDS = ['primitive', 'token', 'atom', 'color', 'font', 'spacing', 'icon'];
const DOMAIN_KEYWORDS = ['domain', 'button', 'badge', 'input', 'card', 'modal', 'select', 'checkbox', 'progress'];
const LAYER_MAP: Record<string, LayerName> = {
  primitives: 'Primitives', domain: 'Domain', layouts: 'Layouts', infrastructure: 'Infrastructure',
};

function deriveLayer(comp: ComponentSummary): LayerName {
  if (comp.source === 'filesystem' && comp.layer) return LAYER_MAP[comp.layer] ?? 'Layouts';
  if (INFRA_APPS.has(comp.app)) return 'Infrastructure';
  const lower = comp.name.toLowerCase();
  if (PRIMITIVE_KEYWORDS.some((kw) => lower.includes(kw))) return 'Primitives';
  if (DOMAIN_KEYWORDS.some((kw) => lower.includes(kw))) return 'Domain';
  return 'Layouts';
}

const LAYER_BADGE: Record<LayerName, string> = {
  Primitives:     'bg-blue-500/20 text-blue-400',
  Domain:         'bg-purple-500/20 text-purple-400',
  Layouts:        'bg-amber-500/20 text-amber-400',
  Infrastructure: 'bg-zinc-500/20 text-zinc-400',
};

const STATUS_BADGE: Record<string, string> = {
  done:          'bg-status-success/20 text-status-success',
  'in-progress': 'bg-status-active/20 text-status-active',
  planned:       'bg-zinc-700/40 text-text-muted',
  blocked:       'bg-status-danger/20 text-status-danger',
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ComponentDetailPage({ params }: Props): Promise<React.ReactElement> {
  const { id } = await params;
  const components = await getComponents();
  const comp = components?.find((c) => c.id === id);

  if (!comp) {
    return (
      <main className="p-section">
        <Link href="/components" className="text-sm text-blue-400 hover:underline">&larr; Back to components</Link>
        <div className="bg-surface-card rounded-card p-8 mt-4 text-center">
          <h1 className="text-xl font-semibold text-text-primary">Component not found</h1>
          <p className="text-text-muted mt-2">No component with id "{id}"</p>
        </div>
      </main>
    );
  }

  const layer = deriveLayer(comp);
  const isUiComponent = comp.source === 'filesystem';

  return (
    <main className="p-section">
      {/* Back link */}
      <Link href="/components" className="text-sm text-blue-400 hover:underline">&larr; Back to components</Link>

      {/* Header */}
      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-text-primary">{comp.name}</h1>
            <span className={cn('text-xs px-2 py-0.5 rounded-badge', LAYER_BADGE[layer])}>{layer}</span>
            <span className={cn('text-xs px-2 py-0.5 rounded-badge font-mono', STATUS_BADGE[comp.status] ?? 'bg-zinc-700/40 text-text-muted')}>{comp.status}</span>
          </div>
          <p className="text-sm text-text-secondary">{comp.description}</p>
          {comp.filePath && (
            <p className="font-mono text-xs text-text-muted mt-1">{comp.filePath}</p>
          )}
        </div>
        <StatusDots hasCode={isUiComponent} hasStory={comp.hasStory ?? false} hasTests={comp.hasTests ?? false} />
      </div>

      {/* Metadata strip */}
      <MetadataStrip comp={comp} isUiComponent={isUiComponent} />

      {/* Content panels — 2-column on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Left: Live Preview */}
        <PreviewPanel comp={comp} isUiComponent={isUiComponent} />
        {/* Right: Props + Code */}
        <div className="flex flex-col gap-6">
          <PropsTable comp={comp} isUiComponent={isUiComponent} />
          <CodeExample comp={comp} isUiComponent={isUiComponent} />
        </div>
      </div>
    </main>
  );
}
```

### Integration

Create directory: `apps/command-center/app/components/[id]/`
Create file: `apps/command-center/app/components/[id]/page.tsx`

---

## Task 4.2: MetadataStrip — inline component

### What to Build

**File:** `apps/command-center/app/components/[id]/page.tsx` — inline in same file

A horizontal strip showing component metadata: usedBy apps, loc, phase, source type.

```typescript
function MetadataStrip({ comp, isUiComponent }: { comp: ComponentSummary; isUiComponent: boolean }): React.ReactElement {
  return (
    <div className="flex flex-wrap gap-4 mt-4 py-3 border-y border-border text-sm">
      {/* Source */}
      <div className="flex items-center gap-1.5">
        <span className="text-text-muted">Source:</span>
        <span className={cn('font-mono text-xs px-2 py-0.5 rounded-badge', isUiComponent ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-700/40 text-text-muted')}>
          {isUiComponent ? 'UI Component' : 'Legacy Task'}
        </span>
      </div>

      {/* Phase */}
      <div className="flex items-center gap-1.5">
        <span className="text-text-muted">Phase:</span>
        <span className="font-mono text-xs text-text-primary">{comp.phase}</span>
      </div>

      {/* App */}
      <div className="flex items-center gap-1.5">
        <span className="text-text-muted">App:</span>
        <span className="font-mono text-xs text-text-primary">{comp.app}</span>
      </div>

      {/* Used By */}
      {(comp.usedBy?.length ?? 0) > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-text-muted">Used by:</span>
          <div className="flex gap-1">
            {comp.usedBy!.map((app) => (
              <span key={app} className="font-mono text-xs px-2 py-0.5 rounded-badge bg-surface-hover text-text-secondary">{app}</span>
            ))}
          </div>
        </div>
      )}

      {/* LoC */}
      {comp.loc != null && (
        <div className="flex items-center gap-1.5">
          <span className="text-text-muted">Lines:</span>
          <span className="font-mono text-xs text-text-primary">{comp.loc}</span>
        </div>
      )}

      {/* Storybook link */}
      {comp.hasStory && (
        <a
          href={`http://localhost:6006/?path=/story/${comp.layer ?? 'primitives'}-${comp.name.toLowerCase().replace(/\s+/g, '-')}--default`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline text-xs ml-auto"
        >
          Open in Storybook &rarr;
        </a>
      )}
    </div>
  );
}
```

---

## Task 4.3: PreviewPanel — live render container with CSS isolation

### What to Build

**File:** `apps/command-center/app/components/[id]/page.tsx` — inline

The preview panel renders the actual component inside a white-background container isolated from CC's zinc-950 theme. For now (Phase C not done), it shows a placeholder. When real components exist in `packages/ui/src/`, the dynamic import will work.

**CSS isolation strategy:** Use a wrapper div with explicit light background + padding. No `@layer` needed yet since we're showing a placeholder. When Phase C delivers components, we'll add `next/dynamic` with `ssr: false`.

```typescript
function PreviewPanel({ comp, isUiComponent }: { comp: ComponentSummary; isUiComponent: boolean }): React.ReactElement {
  if (!isUiComponent) {
    return (
      <div className="bg-surface-card rounded-card p-6">
        <h2 className="text-text-primary font-semibold text-sm mb-3">Preview</h2>
        <div className="flex items-center justify-center h-40 rounded-lg border border-dashed border-border">
          <p className="text-text-muted text-sm italic">
            Legacy task — no component to preview
          </p>
        </div>
      </div>
    );
  }

  // UI component — show preview container (placeholder until Phase C delivers)
  return (
    <div className="bg-surface-card rounded-card p-6">
      <h2 className="text-text-primary font-semibold text-sm mb-3">Preview</h2>
      <div className="preview-container rounded-lg border border-border overflow-hidden">
        {/* White background container — brand tokens apply here */}
        <div className="bg-white p-8 flex items-center justify-center min-h-[200px]">
          {/* TODO: Phase C — replace with dynamic import */}
          {/* <ComponentPreview componentId={comp.id} /> */}
          <div className="text-center">
            <p className="text-zinc-500 text-sm">
              Component preview will render here
            </p>
            <p className="text-zinc-400 text-xs mt-1">
              Waiting for packages/ui/src/{comp.layer ?? 'primitives'}/{comp.id.toLowerCase()}.tsx
            </p>
          </div>
        </div>
      </div>
      {comp.filePath && (
        <p className="font-mono text-xs text-text-muted mt-2">{comp.filePath}</p>
      )}
    </div>
  );
}
```

**Future enhancement (post-Phase C):**
When real components exist, replace the placeholder with:
```typescript
// lib/component-registry.ts — auto-generated or manual
const registry: Record<string, () => Promise<{ default: React.ComponentType }>> = {
  'button': () => import('@cmsmasters/ui/primitives/button'),
  // ... populated by scanner or manually
};
```
Then use `next/dynamic` with `ssr: false`:
```typescript
const DynamicComponent = dynamic(() => registry[comp.id](), { ssr: false });
```

---

## Task 4.4: PropsTable — parsed from propsInterface

### What to Build

**File:** `apps/command-center/app/components/[id]/page.tsx` — inline

Parse the `propsInterface` string (raw TypeScript interface text) into a table of prop name, type, required flag.

```typescript
interface PropRow {
  name: string;
  type: string;
  required: boolean;
}

function parsePropsInterface(raw: string | null | undefined): PropRow[] {
  if (!raw) return [];
  const rows: PropRow[] = [];

  // Match lines like: propName: Type; or propName?: Type;
  const propRegex = /(\w+)(\??):\s*([^;]+);/g;
  let match: RegExpExecArray | null;

  while ((match = propRegex.exec(raw)) !== null) {
    rows.push({
      name: match[1],
      type: match[3].trim(),
      required: match[2] !== '?',
    });
  }

  return rows;
}

function PropsTable({ comp, isUiComponent }: { comp: ComponentSummary; isUiComponent: boolean }): React.ReactElement {
  if (!isUiComponent) {
    return (
      <div className="bg-surface-card rounded-card p-6">
        <h2 className="text-text-primary font-semibold text-sm mb-3">Props</h2>
        <p className="text-text-muted text-sm italic">Legacy task — no props interface</p>
      </div>
    );
  }

  const props = parsePropsInterface(comp.propsInterface);

  if (props.length === 0) {
    return (
      <div className="bg-surface-card rounded-card p-6">
        <h2 className="text-text-primary font-semibold text-sm mb-3">Props</h2>
        <p className="text-text-muted text-sm italic">
          Props not yet documented — will be extracted when component file exists
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-card rounded-card p-6">
      <h2 className="text-text-primary font-semibold text-sm mb-3">Props</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="pb-2 pr-4 font-medium text-text-muted">Name</th>
              <th className="pb-2 pr-4 font-medium text-text-muted">Type</th>
              <th className="pb-2 font-medium text-text-muted">Required</th>
            </tr>
          </thead>
          <tbody>
            {props.map((prop) => (
              <tr key={prop.name} className="border-b border-border/50">
                <td className="py-2 pr-4 font-mono text-xs text-text-primary">{prop.name}</td>
                <td className="py-2 pr-4 font-mono text-xs text-blue-400">{prop.type}</td>
                <td className="py-2 text-xs">
                  {prop.required ? (
                    <span className="text-status-warning">required</span>
                  ) : (
                    <span className="text-text-muted">optional</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {comp.propsInterface && (
        <details className="mt-3">
          <summary className="text-xs text-text-muted cursor-pointer hover:text-text-secondary">
            Raw interface
          </summary>
          <pre className="mt-2 p-3 bg-zinc-900 rounded-lg text-xs text-text-secondary overflow-x-auto font-mono">
            {comp.propsInterface}
          </pre>
        </details>
      )}
    </div>
  );
}
```

---

## Task 4.5: CodeExample — static JSX code block

### What to Build

**File:** `apps/command-center/app/components/[id]/page.tsx` — inline

Generate a minimal code example showing how to import and use the component.

```typescript
function CodeExample({ comp, isUiComponent }: { comp: ComponentSummary; isUiComponent: boolean }): React.ReactElement {
  if (!isUiComponent) {
    return (
      <div className="bg-surface-card rounded-card p-6">
        <h2 className="text-text-primary font-semibold text-sm mb-3">Usage</h2>
        <p className="text-text-muted text-sm italic">Legacy task — no code example</p>
      </div>
    );
  }

  // Generate PascalCase name from component id/name
  const pascalName = comp.name
    .split(/[\s-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');

  const importPath = comp.filePath
    ? `@cmsmasters/ui/${comp.layer ?? 'primitives'}/${comp.id.toLowerCase()}`
    : `@cmsmasters/ui`;

  const example = `import { ${pascalName} } from '${importPath}';

export default function Example() {
  return <${pascalName} />;
}`;

  return (
    <div className="bg-surface-card rounded-card p-6">
      <h2 className="text-text-primary font-semibold text-sm mb-3">Usage</h2>
      <pre className="p-4 bg-zinc-900 rounded-lg text-xs text-text-secondary overflow-x-auto font-mono leading-relaxed">
        {example}
      </pre>
    </div>
  );
}
```

---

## Task 4.6: Make ComponentCard Clickable

### What to Build

**File:** `apps/command-center/app/components/page.tsx` — **modify**

Wrap the ComponentCard content in a `<Link>` to `/components/{id}`.

**Current** (line ~237-272 of page.tsx):
```typescript
function ComponentCard({ comp }: { comp: EnrichedComponent }): React.ReactElement {
  return (
    <div className="bg-surface-card rounded-card p-4 flex flex-col gap-2">
      ...
    </div>
  );
}
```

**Change to:**
```typescript
function ComponentCard({ comp }: { comp: EnrichedComponent }): React.ReactElement {
  return (
    <Link
      href={`/components/${comp.id}`}
      className="bg-surface-card rounded-card p-4 flex flex-col gap-2 hover:bg-surface-hover transition-colors"
    >
      ... (same inner content, no changes)
    </Link>
  );
}
```

**Also update ListView rows** — make the component name clickable (line ~310-350):

Find the `<td>` with `comp.name` and wrap it:
```typescript
<td className="py-3 pr-4">
  <Link href={`/components/${comp.id}`} className="text-text-primary hover:text-blue-400 transition-colors">
    {comp.name}
  </Link>
</td>
```

---

## Files to Modify

- `apps/command-center/app/components/[id]/page.tsx` — **NEW** — component detail page with header, preview, props, code example, metadata strip
- `apps/command-center/app/components/page.tsx` — **modify** — make ComponentCard clickable (`<div>` → `<Link>`), make ListView name clickable

---

## Acceptance Criteria

- [ ] `/components/{id}` route exists and renders for any valid component id from components.json
- [ ] `/components/nonexistent` shows "Component not found" with back link
- [ ] Back link on detail page returns to `/components`
- [ ] Header shows: name, layer badge, status badge, StatusDots, description, filePath (if present)
- [ ] MetadataStrip shows: source type, phase, app, usedBy list, loc count
- [ ] PreviewPanel shows "Legacy task — no component to preview" for `source === 'phases-json'`
- [ ] PreviewPanel shows placeholder "Component preview will render here" for `source === 'filesystem'`
- [ ] PropsTable shows "Props not yet documented" when propsInterface is null
- [ ] PropsTable would parse and render props if propsInterface were populated
- [ ] CodeExample generates valid import + JSX for filesystem components
- [ ] CodeExample shows "Legacy task — no code example" for legacy entries
- [ ] Storybook link only appears when `hasStory === true`
- [ ] ComponentCard on grid view is now a clickable `<Link>`
- [ ] Component name on list view is now a clickable `<Link>`
- [ ] `npx tsc --noEmit` passes with no errors
- [ ] `npx next build` succeeds — new `[id]` route appears in build output
- [ ] No visual regression on main components page

---

## ⚠️ MANDATORY: Verification (do NOT skip)

```bash
echo "=== Phase 4 Verification ==="

cd apps/command-center

# 1. TypeScript compiles
npx tsc --noEmit 2>&1 | tail -5
echo "(expect: no errors)"

# 2. Build succeeds
npx next build 2>&1 | tail -15
echo "(expect: /components/[id] route in output)"

# 3. Verify [id] route directory exists
ls app/components/\[id\]/
echo "(expect: page.tsx)"

# 4. Verify detail page components exist
grep -n "ComponentDetailPage\|MetadataStrip\|PreviewPanel\|PropsTable\|CodeExample\|parsePropsInterface" app/components/\[id\]/page.tsx | head -10
echo "(expect: all 6 names found)"

# 5. Verify ComponentCard is now a Link
grep -n "<Link" app/components/page.tsx | grep "components/" | head -5
echo "(expect: Link to /components/\${comp.id})"

# 6. Verify back link
grep -n "Back to components" app/components/\[id\]/page.tsx
echo "(expect: found)"

# 7. Verify legacy vs UI branching
grep -n "isUiComponent\|Legacy task" app/components/\[id\]/page.tsx | head -5
echo "(expect: both found)"

cd ../..

echo "=== Verification complete ==="
```

---

## ⚠️ MANDATORY: Write Execution Log (do NOT skip)

After verification (before committing), create the file:
`logs/wp-001/phase-4-result.md`

Structure (fill all sections — write N/A if not applicable, do NOT omit sections):

```markdown
# Execution Log: WP-001 Phase 4 — Component Detail Page + Live Render
> Workplan: WP-001 CC Components Page — Real Data Upgrade
> Executed: {ISO timestamp}
> Duration: {minutes}
> Status: ✅ COMPLETE | ⚠️ PARTIAL | ❌ FAILED

## What Was Implemented
{2-5 sentences describing what was actually built}

## Key Decisions
| Decision | Chosen | Why |
|----------|--------|-----|
| ... | ... | ... |

## Files Changed
| File | Change | Description |
|------|--------|-------------|
| `path` | created/modified | brief description |

## Issues & Workarounds
{Problems encountered and resolutions. "None" if clean.}

## Open Questions
{Non-blocking questions. "None" if none.}

## Verification Results
| Check | Result |
|-------|--------|
| TypeScript compiles | ✅/❌ |
| Build succeeds | ✅/❌ |
| [id] route in build | ✅/❌ |
| Detail page components | ✅/❌ |
| ComponentCard is Link | ✅/❌ |
| Legacy/UI branching | ✅/❌ |
| No visual regression | ✅/❌ |

## Git
- Commit: `{sha}` — `{message}`
```

Then include `logs/` in your `git add` before committing.

---

## Git

```bash
git add apps/command-center/app/components/\[id\]/page.tsx apps/command-center/app/components/page.tsx logs/wp-001/phase-4-result.md
git commit -m "feat(cc): add component detail page with preview, props & code panels [WP-001 phase 4]"
```

---

## ⚠️ IMPORTANT Notes for CC

- **The detail page is ONE file** — all inline components (MetadataStrip, PreviewPanel, PropsTable, CodeExample, parsePropsInterface) go inside `[id]/page.tsx`. Do NOT create separate files for each.
- **Follow the `phases/[id]/page.tsx` pattern** — async server component, `params: Promise<{ id: string }>`, same back link style, similar Card-based layout.
- **`comp.id` contains values like `P0-T1`, `P1-T5`** — these become URL segments (`/components/P0-T1`). This is fine for Next.js dynamic routes.
- **Do NOT attempt to actually import components from `@cmsmasters/ui`** — the barrel is empty. The PreviewPanel shows a placeholder div. Live render is deferred to post-Phase C.
- **Do NOT add any new npm dependencies** — no syntax highlighter, no markdown parser. Use plain `<pre>` for code blocks.
- **Do NOT create `lib/component-registry.ts`** — deferred to post-Phase C when real components exist.
- **The `parsePropsInterface()` regex won't match anything yet** (propsInterface is null for all entries). But it must work correctly when the scanner populates it. Test mentally with: `variant?: 'primary' | 'secondary'; size: 'sm' | 'md' | 'lg'; disabled?: boolean;`
- **CSS isolation:** The preview container uses explicit `bg-white` class, NOT tokens.css import. This prevents any zinc-950 bleed. Real isolation with `@layer` is deferred to post-Phase C.
- **deriveLayer() is duplicated** between `page.tsx` and `[id]/page.tsx`. This is acceptable for now — a shared utility extraction is Phase 5 cleanup scope, not Phase 4.
