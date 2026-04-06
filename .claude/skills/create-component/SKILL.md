# Create Component

Build a production-ready UI component from Figma, register it in the barrel export, add a Command Center preview, and run the scanner. Use when asked to "create component", "build primitive", "build badge", "зроби компонент", "створи примітив", "new component", or when a new component needs to be added to `packages/ui/src/primitives/` or `packages/ui/src/domain/`.

## Prerequisites

- Figma MCP connected (run `/figma-use` first)
- Component exists in Figma (Obra or Portal DS file)
- `tokens.css` is up to date (run `/sync-tokens` if needed)

## Inputs

Ask the user for:
1. **Component name** (e.g. "Badge", "Input", "Card")
2. **Layer**: `primitives` or `domain`
3. **Figma file**: Obra (`PodaGqhhlgh6TLkcyAC5Oi`) or Portal DS (`CLtdO56o9fJCx19EnhH1nI`)

## Workflow

### Step 1: Read Figma component

Use `use_figma` to extract ALL variant properties from the component set:

```javascript
// Find the component set
const componentSets = figma.root.findAll(n =>
  n.type === 'COMPONENT_SET' && n.name.toLowerCase().includes('COMPONENT_NAME')
);

const results = [];
for (const set of componentSets) {
  for (const variant of set.children) {
    if (variant.type !== 'COMPONENT') continue;

    const props = {
      name: variant.name,
      width: variant.width,
      height: variant.height,
      paddingLeft: variant.paddingLeft,
      paddingRight: variant.paddingRight,
      paddingTop: variant.paddingTop,
      paddingBottom: variant.paddingBottom,
      itemSpacing: variant.itemSpacing,
      cornerRadius: variant.cornerRadius,
      layoutMode: variant.layoutMode,
      primaryAxisSizingMode: variant.primaryAxisSizingMode,
      counterAxisSizingMode: variant.counterAxisSizingMode,
      opacity: variant.opacity,
      boundVars: {},
    };

    // Frame-level bindings
    const bindings = variant.boundVariables;
    for (const [prop, binding] of Object.entries(bindings || {})) {
      const b = Array.isArray(binding) ? binding[0] : binding;
      if (b && b.id) {
        const v = await figma.variables.getVariableByIdAsync(b.id);
        props.boundVars[prop] = v ? v.name : b.id;
      }
    }

    // Read fills opacity
    if (variant.fills && variant.fills.length > 0) {
      props.fillOpacity = variant.fills[0].opacity;
    }

    // Stroke weight
    if (variant.strokes && variant.strokes.length > 0) {
      props.strokeWeight = variant.strokeTopWeight || variant.strokeWeight;
    }

    // Text node properties
    const textNodes = variant.findAll(n => n.type === 'TEXT');
    if (textNodes.length > 0) {
      const t = textNodes[0];
      await figma.loadFontAsync(t.fontName);
      props.fontSize = t.fontSize;
      props.lineHeight = t.lineHeight;
      props.fontWeight = t.fontName.style;
      props.fontFamily = t.fontName.family;
      props.letterSpacing = t.letterSpacing;

      const textBindings = t.boundVariables;
      for (const [prop, binding] of Object.entries(textBindings || {})) {
        const b = Array.isArray(binding) ? binding[0] : binding;
        if (b && b.id) {
          const v = await figma.variables.getVariableByIdAsync(b.id);
          props.boundVars['text_' + prop] = v ? v.name : b.id;
        }
      }
    }

    results.push(props);
  }
}

return JSON.stringify(results, null, 2);
```

### Step 2: Analyze variant structure

From the Figma data, derive:
- **Variant axes** — e.g. `Roundness`, `Variant`, `State`, `Size`
- **cva variant keys** — map Figma variant values to code variant names
- **Sizing strategy** — does the component use fixed height or HUG content?
- **Color mappings** — which `boundVariables.fills` / `text_fills` / `strokes` are used per variant
- **Spacing values** — what tokens are bound to padding, gap, radius

### Step 3: Map Figma variables to CSS custom properties

Convert Figma variable names to CSS var names using these rules:

| Figma variable | CSS custom property | Notes |
|---------------|-------------------|-------|
| `general/primary` | `--primary` | Drop `general/` prefix |
| `general/primary foreground` | `--primary-foreground` | Spaces → hyphens |
| `general/secondary` | `--secondary` | |
| `general/foreground` | `--foreground` | |
| `general/destructive` | `--destructive` | |
| `general/destructive foreground` | `--destructive-foreground` | |
| `general/border` | `--border` | |
| `unofficial/outline` | `--outline` | Drop `unofficial/` |
| `unofficial/outline hover` | `--outline-hover` | |
| `unofficial/ghost` | `--ghost` | |
| `unofficial/ghost foreground` | `--ghost-foreground` | |
| `unofficial/ghost hover` | `--ghost-hover` | |
| `unofficial/border 3` | `--border-3` | |
| `unofficial/border 4` | `--border-4` | |
| `focus/ring` | `--ring` | Drop `focus/` |
| `focus/ring error` | `--ring-error` | |
| `Button/height-default` | `--button-height-default` | Component vars: slash → hyphen, lowercase |
| `paragraph/mini/font-size` | mapped via typography | Use in text style, not directly |

**CRITICAL**: After mapping, verify EVERY CSS var exists in `packages/ui/src/theme/tokens.css`. If missing, flag it — don't invent values.

### Step 4: Build the component file

Write to `packages/ui/src/{layer}/{component-name}.tsx`.

**Pattern to follow** (based on Button):

```tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/utils';

const {name}Variants = cva(
  [
    // Base styles — shared across all variants
    // Use Tailwind classes for colors (hsl(var(--token)))
    // Use inline styles for sizing (TW v4 bare var syntax broken)
  ],
  {
    variants: {
      variant: {
        // One entry per Figma Variant axis value
        // Each maps fills/text_fills/strokes → Tailwind color classes
        // Include hover and focus-visible states
      },
      // Other axes (roundness, size, etc.) if they affect classes
    },
    defaultVariants: {
      variant: 'primary', // or whatever Figma shows first
    },
  },
);

// SIZE_STYLES for sizing tokens (inline styles)
// Only needed if component has size variants or fixed dimensions
const SIZE_STYLES: Record<string, React.CSSProperties> = { ... };

// ROUNDNESS_STYLES if component has roundness axis
const ROUNDNESS_STYLES: Record<string, React.CSSProperties> = { ... };

type {Name}Props = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof {name}Variants> & {
    asChild?: boolean;
    // additional props
  };

const {Name} = React.forwardRef<HTMLDivElement, {Name}Props>(
  ({ className, variant, style, ...props }, ref) => {
    // Merge token styles with user styles
    return (
      <div
        className={cn({name}Variants({ variant, className }))}
        ref={ref}
        style={{ ...tokenStyle, ...style }}
        {...props}
      />
    );
  },
);
{Name}.displayName = '{Name}';

export { {Name}, {name}Variants, type {Name}Props };
```

**Key rules:**
- Colors → Tailwind classes: `bg-[hsl(var(--primary))]`
- Sizing (height, padding, gap, font-size, line-height) → inline `style={{}}` with `var(--token)`
- Radius → inline `style={{ borderRadius: 'var(--token)' }}`
- Font weight → Tailwind class or inline style
- Opacity from Figma fills → include in hsl(): `bg-[hsl(var(--ghost)/0.0001)]`
- Comments above each variant block citing Figma variable names

### Step 5: Register in barrel export

Add the export to `packages/ui/index.ts`:

```typescript
export { {Name}, {name}Variants, type {Name}Props } from './src/{layer}/{kebab-name}';
```

### Step 6: Add CC preview

Edit `apps/command-center/app/components/[id]/component-preview.tsx`:

1. Import the component from `@cmsmasters/ui`
2. Create a `{Name}Preview` function showing variant × size matrix
3. Add entry to `PREVIEW_REGISTRY`: `'ui-{layer}-{kebab-name}': {Name}Preview`

**Preview pattern:**

```tsx
function {Name}Preview(): React.ReactElement {
  return (
    <div className="flex flex-col gap-6">
      {/* Variant showcase */}
      <div className="flex flex-col gap-3">
        {VARIANTS.map((v) => (
          <div key={v} className="flex items-center gap-2 flex-wrap">
            <span className="w-20 text-xs font-mono text-zinc-400 shrink-0">{v}</span>
            <{Name} variant={v}>Label</{Name}>
          </div>
        ))}
      </div>
      {/* Additional axes (roundness, sizes, states) */}
    </div>
  );
}
```

**IMPORTANT**: If new CSS variables are used in the component that aren't in `LIGHT_MODE_OVERRIDES`, add them there too. Otherwise the preview will render with CC dark theme colors instead of portal light theme.

### Step 7: Run scanner

```bash
cd <monorepo-root> && npx tsx apps/command-center/cli/scan.ts
```

This updates `workplan/components.json` with the new filesystem entry (id: `ui-{layer}-{kebab-name}`, source: `filesystem`, status: `done`).

### Step 8: Verify

1. Check the CC page loads: `http://localhost:4000/components/ui-{layer}-{kebab-name}`
2. Verify preview renders correctly (light mode, all variants visible)
3. Verify props table shows structured props
4. Verify CSS variables panel lists all tokens used

## Output

After completion, report:

```
Component: {Name}
File: packages/ui/src/{layer}/{kebab-name}.tsx
CC page: http://localhost:4000/components/ui-{layer}-{kebab-name}

Variants: {list}
Tokens used: {count} CSS vars
Props: {count} props
Preview: registered in component-preview.tsx
Scanner: components.json updated

Next steps:
- Run /figma-component-vars if component needs Figma variable bindings
- Run /lint-ds to verify no hardcoded styles
```

## Critical rules

1. **NEVER guess Figma values** — always read via `use_figma` Plugin API
2. **NEVER hardcode colors/fonts/shadows** — use tokens from `tokens.css`
3. **Verify every CSS var exists** in `tokens.css` before using it
4. **Sizing via inline styles** — TW v4 bare `h-[--var]` is broken
5. **Colors via Tailwind classes** — `bg-[hsl(var(--token))]` works fine
6. **Opacity matters** — Ghost/Outline variants have near-zero opacity fills from Figma
7. **Update LIGHT_MODE_OVERRIDES** if new CSS vars are needed for CC preview
8. **Follow Button pattern** — `packages/ui/src/primitives/button.tsx` is the reference implementation
9. **One component per file** — named `{kebab-name}.tsx`
10. **Export from barrel** — `packages/ui/index.ts` must export the component

## Lessons learned

| Bug | Root cause | Fix |
|-----|-----------|-----|
| Component invisible in CC preview | Missing from `LIGHT_MODE_OVERRIDES` | Add all new CSS vars to overrides |
| TW v4 sizing not applied | Used `h-[--var]` bare syntax | Use inline `style={{ height: 'var(--x)' }}` |
| Wrong colors in dark mode | CC `.dark` class overrides `:root` vars | `LightModeWrapper` re-applies `:root` values |
| Scanner doesn't find component | File not in `primitives/` or `domain/` dir | Must be in a recognized layer directory |
| CC page shows "not found" | Preview not in `PREVIEW_REGISTRY` | Add `'ui-{layer}-{name}': Preview` entry |
| Empty props table | No `type XProps = ...` in file | Must export typed props for scanner extraction |
