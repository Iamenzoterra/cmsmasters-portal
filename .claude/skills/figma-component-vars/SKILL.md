---
name: figma-component-vars
description: Create and bind component-level Figma variables (sizing, spacing, radius, typography) for a specific component. Use when asked to "create vars for Button", "bind component variables", "створи змінні для компонента", or "прив'яжи варіабли".
---

# Figma Component Variables

Reads a component's actual properties from Figma, compares with existing variables, creates missing ones, and binds them to component instances. This ensures every visual property is token-driven so Figma changes propagate to code via `/sync-tokens`.

## When to use

- A new component is being added to the design system
- A component has hardcoded values that should be tokenized
- You need to check what properties a component uses vs what variables exist

## Workflow

### Step 1: Identify the component

Ask the user for the component name (e.g. "Button", "Input", "Badge"). Determine which Figma file it lives in:

| Component type | File | Key |
|---------------|------|-----|
| shadcn primitives (Button, Input, Badge, etc.) | CMS DS Portal — Obra | `PodaGqhhlgh6TLkcyAC5Oi` |
| Brand-specific components | Portal DS — CMSMasters | `CLtdO56o9fJCx19EnhH1nI` |

### Step 2: Read component properties

Use `use_figma` to find the component set and extract actual property values from each variant:

```javascript
// Find all component sets matching the name
const componentSets = figma.root.findAll(n =>
  n.type === 'COMPONENT_SET' && n.name.toLowerCase().includes('button')
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
      itemSpacing: variant.itemSpacing, // gap
      cornerRadius: variant.cornerRadius,
      // Check for bound variables
      boundVars: {},
    };

    // Check which properties are already bound to variables
    const bindings = variant.boundVariables;
    for (const [prop, binding] of Object.entries(bindings || {})) {
      if (binding && binding.id) {
        const v = figma.variables.getVariableById(binding.id);
        props.boundVars[prop] = v ? v.name : binding.id;
      }
    }

    // Read text node properties
    const textNodes = variant.findAll(n => n.type === 'TEXT');
    if (textNodes.length > 0) {
      const t = textNodes[0];
      props.fontSize = t.fontSize;
      props.lineHeight = typeof t.lineHeight === 'object' ? t.lineHeight.value : t.lineHeight;
      props.fontWeight = t.fontWeight;
      props.fontName = t.fontName;

      // Check text node bindings
      const textBindings = t.boundVariables;
      for (const [prop, binding] of Object.entries(textBindings || {})) {
        if (binding && binding.id) {
          const v = figma.variables.getVariableById(binding.id);
          props.boundVars['text_' + prop] = v ? v.name : binding.id;
        }
      }
    }

    results.push(props);
  }
}

return JSON.stringify(results, null, 2);
```

### Step 3: Analyze gaps

Compare extracted properties against existing variables. Build a gap table:

| Property | Current value | Bound to variable? | Needs variable? |
|----------|--------------|--------------------|-----------------|
| height | 36px | ❌ | `{Component}/height-default` |
| paddingLeft | 16px | ✅ `Button/padding-x-default` | — |
| cornerRadius | 8px | ❌ | `{Component}/radius` |
| fontSize | 15px | ❌ | `{Component}/font-size` |

**Rules for what needs a variable:**
- If a property varies across SIZE variants → one variable per size (e.g. `height-sm`, `height-default`, `height-lg`)
- If a property is the same across all sizes → one variable (e.g. `radius`, `font-weight`)
- If a property is already bound → skip
- Colors should already be in Portal DS Semantic collection — don't create new color vars here

### Step 4: Determine variable homes

Component variables should **alias** general tokens when possible:

| Variable | Should alias | Why |
|----------|-------------|-----|
| `Button/radius` | `{rounded-lg}` | Reuses system token, can be changed independently later |
| `Button/font-size` | `{paragraph/small/font-size}` | Typography consistency |
| `Button/height-default` | *direct value: 36* | No general token for component heights |
| `Button/padding-x-default` | `{spacing-md}` or *direct value* | Alias if exact match exists in spacing |

**Where to create variables:**
- Sizing (heights, padding, gap) → in the **same collection as spacing** (Obra file, spacing collection)
- Typography (font-size, line-height, font-weight) → in the **typography collection** (Obra file)
- Radii → in the **border radii collection** (Obra file)

### Step 5: Create missing variables

Use `use_figma` to create variables:

```javascript
// Find the target collection
const collections = figma.variables.getLocalVariableCollections();
const spacingCol = collections.find(c => c.name.toLowerCase().includes('spacing'));
const mode = spacingCol.modes[0];

// Create variable
const newVar = figma.variables.createVariable(
  'Button/height-default',      // name with / for grouping
  spacingCol.id,                 // collection
  'FLOAT'                        // type
);
newVar.setValueForMode(mode.modeId, 36); // direct value

// Or alias to existing variable
const radiusCol = collections.find(c => c.name.toLowerCase().includes('radi'));
const roundedLg = figma.variables.getLocalVariables().find(v => v.name === 'rounded-lg');
const radiusVar = figma.variables.createVariable('Button/radius', radiusCol.id, 'FLOAT');
radiusVar.setValueForMode(
  radiusCol.modes[0].modeId,
  { type: 'VARIABLE_ALIAS', id: roundedLg.id }  // alias!
);
```

### Step 6: Bind variables to component

```javascript
const componentSets = figma.root.findAll(n =>
  n.type === 'COMPONENT_SET' && n.name.toLowerCase().includes('button')
);

const heightVar = figma.variables.getLocalVariables().find(v => v.name === 'Button/height-default');
const radiusVar = figma.variables.getLocalVariables().find(v => v.name === 'Button/radius');

for (const set of componentSets) {
  for (const variant of set.children) {
    if (variant.type !== 'COMPONENT') continue;

    // Parse variant props to determine size
    const variantProps = variant.name; // e.g. "Size=Default, Variant=Primary, ..."

    // Bind height
    if (variantProps.includes('Size=Default')) {
      variant.setBoundVariable('height', heightVar.id);
    }

    // Bind radius (same for all variants)
    variant.setBoundVariable('cornerRadius', radiusVar.id);

    // Bind text properties
    const textNodes = variant.findAll(n => n.type === 'TEXT');
    for (const t of textNodes) {
      const fontSizeVar = figma.variables.getLocalVariables().find(v => v.name === 'Button/font-size');
      if (fontSizeVar) t.setBoundVariable('fontSize', fontSizeVar.id);
    }
  }
}
```

### Step 7: Report & sync

After binding, output a summary:

```
Component: Button (200 variants in Obra)

Created variables:
  ✅ Button/height-mini = 24
  ✅ Button/height-sm = 32
  ✅ Button/radius → aliases {rounded-lg}
  ⏭️ Button/padding-x-default — already existed

Bound to variants:
  ✅ 40 × Mini → height-mini, padding-x-mini, font-size-mini
  ✅ 40 × Small → height-sm, padding-x-sm, font-size
  ✅ 40 × Default → height-default, padding-x-default, font-size
  ✅ 40 × Large → height-lg, padding-x-lg, font-size
  ✅ 40 × Extra Large → height-xl, padding-x-xl, font-size-xl
  ✅ All → radius, radius-pill (by roundness)

Run /sync-tokens to pull these new variables into tokens.css.
```

## Naming convention for component variables

```
{Component}/{property}-{size}

Examples:
  Button/height-mini         → --button-height-mini: 24px
  Button/height-sm           → --button-height-sm: 32px
  Button/padding-x-default   → --button-padding-x-default: 16px
  Button/font-size           → --button-font-size: 15px  (no size suffix = shared across sm/default/lg)
  Button/font-size-xl        → --button-font-size-xl: 18px  (only xl is different)
  Button/radius              → --button-radius: 8px
  Button/radius-pill         → --button-radius-pill: 9999px
  Button/gap                 → --button-gap: 8px
  Input/height-default       → --input-height-default: 40px
  Badge/padding-x            → --badge-padding-x: 8px
```

## Critical rules

1. **Always read actual values first** — never guess component dimensions
2. **Alias general tokens** when an exact match exists (spacing, radii, typography)
3. **Direct values** only when no general token matches
4. **One variable per unique value** — if sm/default/lg share the same font-size, use one variable without size suffix
5. **Colors are separate** — managed in Portal DS Semantic collection, not here
6. **After creating vars → run `/sync-tokens`** to get them into tokens.css
7. **Skip properties already bound** — don't overwrite existing bindings
8. **Report before binding** — show the gap table to the user, get confirmation before creating/binding
