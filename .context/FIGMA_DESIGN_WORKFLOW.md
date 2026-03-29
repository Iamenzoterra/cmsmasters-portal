# Figma Design Workflow: HTML Capture + Token Binding

> Proven pipeline for creating production-quality Figma designs with full design system token binding.
> Developed through trial-and-error on the Studio MVP project, March 2026.

---

## Why This Workflow Exists

**Problem:** Three approaches exist for creating Figma designs programmatically, each with fatal flaws alone:

| Approach | Visual Quality | Token Binding | Reliability |
|----------|---------------|---------------|-------------|
| Plugin API only (`use_figma`) | Poor (no SVG icons, broken circles, ugly) | Excellent (direct variable binding) | Good |
| HTML Capture only (`generate_figma_design`) | Excellent (pixel-perfect from browser) | None (flat frames, no variables) | Moderate (nodes invisible to Plugin API) |
| **Combined: HTML blueprint + Plugin API rebuild** | **Excellent** | **Excellent** | **Excellent** |

**Solution:** Use HTML capture as a **blueprint** (exact specs: sizes, positions, spacing, hierarchy), then **rebuild natively** in Figma via Plugin API with full token binding.

---

## Pipeline Overview

```
Step 1: Study Tokens          → Read real Figma variables from both DS files
Step 2: Get Variable Keys     → Extract Portal DS variable keys for cross-file import
Step 3: Design HTML           → UI Designer agent creates pixel-perfect HTML mockup
Step 4: Serve + Preview       → Local HTTP server, verify in browser
Step 5: Capture to Figma      → generate_figma_design captures HTML → Figma (reference only)
Step 6: Read Blueprint        → get_metadata extracts exact structure from captured frame
Step 7: Rebuild with Tokens   → use_figma + importVariableByKeyAsync builds native frames
Step 8: Screenshot + Verify   → get_screenshot confirms visual match
```

---

## Step 1: Study Tokens

Read all available variables from both Figma source files.

### Obra file (CMS DS Portal — `PodaGqhhlgh6TLkcyAC5Oi`)

Contains: shadcn semantic colors (light+dark), spacing, border radii, typography, Button/* sizing.

```javascript
// use_figma on Obra file
const collections = figma.variables.getLocalVariableCollections();
// Returns: semantic colors, spacing (3xs..10xl), border radii (rounded-none..rounded-full),
// typography (heading/paragraph sizes), Button/* sizing vars
```

### Portal DS file (CMSMasters — `CLtdO56o9fJCx19EnhH1nI`)

Contains: brand primitives (Color/*), semantic tokens (Bg/*, Text/*, Border/*, Status/*, Button/*, Tag/*, Card/*, Shadow/*).

```javascript
// use_figma on Portal DS file
// Returns: Bg/page, Bg/surface, Text/primary, Text/secondary, Text/muted, Text/link,
// Border/default, Border/light, Border/focus, Button/primary-bg, Button/primary-fg,
// Status/success-bg, Status/error-fg, Tag/*, Card/*, Shadow/*, etc.
```

### Resolved Color Reference (Portal DS → RGB)

| Token | RGB | Usage |
|-------|-----|-------|
| `Bg/page` | rgb(250,248,247) | Page background (warm beige) |
| `Bg/surface` | rgb(255,255,255) | Cards, panels, sidebar |
| `Bg/surface-alt` | rgb(241,241,241) | Hover states, alt backgrounds |
| `Bg/elevated` | rgb(255,255,255) | Modals, dropdowns (+ shadow) |
| `Text/primary` | rgb(24,24,24) | Headings, primary content |
| `Text/secondary` | rgb(84,84,84) | Body text, descriptions |
| `Text/muted` | rgb(170,161,146) | Placeholders, hints, timestamps |
| `Text/link` | rgb(41,81,220) | Links, interactive text |
| `Border/default` | rgb(234,229,224) | Card borders, dividers |
| `Border/light` | rgb(221,221,221) | Subtle separators |
| `Border/focus` | rgb(41,81,220) | Focus rings |
| `Button/primary-bg` | rgb(21,31,79) | Primary buttons, navy accents |
| `Button/primary-fg` | rgb(255,255,255) | Text on primary buttons |
| `Status/success-bg` | rgb(224,245,222) | Success badge bg |
| `Status/success-fg` | rgb(216,240,215) | Success indicator |
| `Status/warn-bg` | rgb(255,251,235) | Warning/draft badge bg |
| `Status/warn-fg` | rgb(217,119,6) | Warning text |
| `Status/error-fg` | rgb(220,38,38) | Error text, destructive |

---

## Step 2: Get Variable Keys

Portal DS variables live in a separate file. To bind them in Obra, we need their **keys** for `importVariableByKeyAsync()`.

```javascript
// Run once on Portal DS file (CLtdO56o9fJCx19EnhH1nI)
const collections = figma.variables.getLocalVariableCollections();
const vars = {};
for (const col of collections) {
  for (const vid of col.variableIds) {
    const v = figma.variables.getVariableById(vid);
    if (v && (v.name.startsWith('Bg/') || v.name.startsWith('Text/') ||
              v.name.startsWith('Border/') || v.name.startsWith('Button/') ||
              v.name.startsWith('Card/') || v.name.startsWith('Status/') ||
              v.name.startsWith('Tag/') || v.name.startsWith('Shadow/'))) {
      vars[v.name] = v.key;
    }
  }
}
return JSON.stringify(vars);
```

### Current Key Registry (as of 2026-03-29)

```javascript
const PORTAL_DS_KEYS = {
  'Bg/page':            '6572b51d58f64f944a59c66757e926243917da14',
  'Bg/surface':         '488fa4bd5b6b05e3be42b1fd4022aeb757a49705',
  'Bg/surface-alt':     'f49eef5a1d48b8f9427ff6ae051896ed4241198d',
  'Bg/elevated':        '091ed3182f6fb9adc811f4cedcebc250b8c0a5de',
  'Bg/inverse':         '60f7f798565d2f5a6d1a51e891087c49ac29ea6b',
  'Bg/brand-blue':      'b0a6b28e9c9a1e6f32f6d3d1af974ca892125b56',
  'Bg/brand-navy':      '6f30b506fa446c7c1a82d3db16a5e6a9b3d7ab86',
  'Text/primary':       'a9bab3880fd3dec1f8d6c7a0637224a77c3cdf45',
  'Text/secondary':     '7441cea622545cf74a9b0c09a7c3b2e4257faf54',
  'Text/muted':         '52308940eb4a421038e928b76377b4626be2fdc8',
  'Text/inverse':       '94f059be2d6cabc3a302342acd6dd63deeda1bf5',
  'Text/brand':         '9469c658c82b7d53d21d451839234b40cff7ef3a',
  'Text/link':          '96c59a698b0bde55b7917dfe147a950b61b49882',
  'Text/category':      'bb71eab6ddc40b07395aa80e46b3981a78668644',
  'Border/default':     '9c0df0ee00474ce0df0ea9bd3ee763393bf0d7aa',
  'Border/light':       '5d2a4f7bf8839d6929a279b48f807f962a6947b7',
  'Border/strong':      'a09c38aee43964bee85c35c624ecad7b44486fa2',
  'Border/focus':       '6f364ed8aae13d8449c112259399a633df40100b',
  'Status/success-bg':  'd68656393917e1e49b8112093581b398d6fe2d72',
  'Status/success-fg':  '9cfe8662e79ffca057c65c64ddb19e4ea4008d8e',
  'Status/error-bg':    '45d762a1df924822137ea65ff0d24a935f724eef',
  'Status/error-fg':    '6512a2b2f0a784e102689b04dea2b27946515fad',
  'Status/warn-bg':     'b08757104a281c5d4db5308b7658f841a39960e8',
  'Status/warn-fg':     '1237350493726e12e13be8028bfc3d71ac89fa2d',
  'Status/info-bg':     'd77c3426faca144f3679e511c4b5b389db07d735',
  'Status/info-fg':     'd1590e78c4ca312d9b41bad21c92068b097e2a89',
  'Button/primary-bg':  '7d133021be86f564a6a5f2aa3f5589b37410f30e',
  'Button/primary-fg':  '95b00c1d9f17815b5429f0402edf0be200268060',
  'Button/primary-hover':'49003c719f09989a71763e1427f393ab1c1b8960',
  'Button/secondary-bg':'3370453c0c50311cf2c163662a2c1f226d635bb6',
  'Button/secondary-fg':'211e8189ea1dc7c60854f120dd51145df9b874f2',
  'Button/outline-border':'263a1bce08e777dc3e5787058d7876f07122d9bf',
  'Button/outline-fg':  'be648a37a612608b56cf75082aac98da48e24901',
  'Button/cta-bg':      '7e5b469ad6f139268429ca4c1ffd7111dbbc6226',
  'Button/cta-fg':      '39f3507e4c7e152169bab02175280a67b072045f',
  'Tag/active-bg':      '1eb816102b071ed0a4d2029ffa227de8b2b56620',
  'Tag/active-fg':      'ad1c17196824a9646b4fd727218b51f1b4f01f23',
  'Tag/inactive-bg':    'af8aa33f6ab505e0126a8840487815cef9d2eda2',
  'Tag/inactive-fg':    'de87480a6b404e1e8ce4c536a3588ad1a413c85d',
  'Tag/inactive-border':'246dd144ddccf86fdffdca5a0d1e09c528168c06',
  'Tag/price-bg':       '1a31c7299bf3cd6be398cde49a30112aee2b7260',
  'Tag/price-fg':       '238d40e8974e637a1a87f911c2ac57a6cd8acecb',
  'Tag/category-fg':    'ab805ced0cc7d0fe7c85886846db6c02a1963cb0',
  'Card/bg':            'c64cf2d09471630ebf357a10abcfe08f94d72ba2',
  'Card/border':        '6b9c92fc61bdd9446276b65f7e9b093d717cd8aa',
  'Shadow/default':     'f134351ba84ce360b6de74ce34113ddc0b0ade1d',
  'Shadow/brand':       'ad8f5833617a23cef40f1de0d6f43313246b9abd',
};
```

---

## Step 3: Design HTML

Use the **UI Designer agent** to create a pixel-perfect HTML mockup.

### Agent prompt template

```
You are the UI Designer agent. Create a beautiful, pixel-perfect HTML file for [SCREEN NAME].

**Context:** [what this screen does, who uses it]

**Design System Colors (Portal DS — source of truth):**
[paste resolved color table from Step 1]

**Font:** Manrope (Google Fonts), weights: 400, 500, 600, 700
**Icons:** Lucide CDN

**Layout spec:**
[paste wireframe from design spec]

**Technical requirements:**
- Single HTML file
- Tailwind CDN v3 with custom config extending Portal DS colors
- Lucide icons CDN
- Google Fonts Manrope
- Frame exactly 1440x900 (or specified size)
- Include Figma capture script:
  <script src="https://mcp.figma.com/mcp/html-to-design/capture.js" async></script>

Write to: tools/studio-mockups/[screen-name].html
```

### Key conventions for the HTML

- Use Tailwind with **custom color config** matching Portal DS names
- One HTML file per screen state (not side-by-side)
- Fixed viewport size matching the Figma frame dimensions
- `overflow: hidden` on the container
- Load Lucide icons and call `lucide.createIcons()` at the end

---

## Step 4: Serve + Preview

```bash
# Start local server
cd tools/studio-mockups
python -m http.server 7777

# Verify
curl -s http://localhost:7777/[screen].html | head -3
```

Open in browser to verify visual quality before capturing.

---

## Step 5: Capture to Figma

```javascript
// 1. Generate capture ID (target existing file)
generate_figma_design({
  outputMode: 'existingFile',
  fileKey: 'PodaGqhhlgh6TLkcyAC5Oi'
})

// 2. Open URL with capture hash
// Windows:
start "" "http://localhost:7777/[screen].html#figmacapture=[ID]&figmaendpoint=https%3A%2F%2Fmcp.figma.com%2Fmcp%2Fcapture%2F[ID]%2Fsubmit&figmadelay=3000"

// 3. Poll until completed (5-second intervals, up to 10 attempts)
generate_figma_design({ captureId: '[ID]' })
```

**Important:** The captured frame is a **reference only**. It will NOT be bound to tokens. It serves as the visual blueprint for Step 7.

---

## Step 6: Read Blueprint

Use `get_metadata` (REST API) to extract the captured frame's exact structure.

```javascript
get_metadata({
  fileKey: 'PodaGqhhlgh6TLkcyAC5Oi',
  nodeId: '[captured-node-id]'  // from Step 5 response
})
```

This returns XML with exact:
- Frame hierarchy (parent → child nesting)
- Node names
- Positions (x, y)
- Sizes (width, height)
- Text content and font sizes

Use these dimensions as the **source of truth** for the Plugin API rebuild.

---

## Step 7: Rebuild with Tokens

This is the core step. Build native Figma frames using Plugin API with full token binding.

### Boilerplate

```javascript
// use_figma on Obra file (PodaGqhhlgh6TLkcyAC5Oi)

// 1. Setup
const page = figma.root.children.find(p => p.name === '0001');
await figma.setCurrentPageAsync(page);
await figma.loadFontAsync({ family: 'Manrope', style: 'Bold' });
await figma.loadFontAsync({ family: 'Manrope', style: 'SemiBold' });
await figma.loadFontAsync({ family: 'Manrope', style: 'Medium' });
await figma.loadFontAsync({ family: 'Manrope', style: 'Regular' });

// 2. Import Portal DS variables (cross-file)
const KEYS = { /* paste from Step 2 registry */ };
const V = {};
for (const [name, key] of Object.entries(KEYS)) {
  V[name] = await figma.variables.importVariableByKeyAsync(key);
}

// 3. Fallback colors (used for initial fill before binding resolves)
const C = {
  pageBg:  { r: 0.980, g: 0.973, b: 0.969 },
  white:   { r: 1, g: 1, b: 1 },
  tp:      { r: 0.094, g: 0.094, b: 0.094 },
  // ... etc from resolved color table
};

// 4. Helper functions — CORRECT API for variable binding
//
// CRITICAL: fills/strokes use paint-level binding, NOT node-level!
//   WRONG:  node.setBoundVariable('fills', 0, 'color', varObj.id)
//   RIGHT:  node.fills = [figma.variables.setBoundVariableForPaint(node.fills[0], 'color', varObj)]
//
// fontSize/lineHeight use node-level setBoundVariable but return arrays in boundVariables
// spacing/radii use node-level setBoundVariable and return objects

function bindFill(node, varObj) {
  try {
    const newPaint = figma.variables.setBoundVariableForPaint(node.fills[0], 'color', varObj);
    node.fills = [newPaint];
  } catch(e) {}
}

function bindStroke(node, varObj) {
  try {
    const newPaint = figma.variables.setBoundVariableForPaint(node.strokes[0], 'color', varObj);
    node.strokes = [newPaint];
  } catch(e) {}
}

function bindNum(node, prop, varObj) {
  try { node.setBoundVariable(prop, varObj); } catch(e) {}
}

function txt(chars, size, style, fallbackColor, lineHeight, colorVar, fsVar, lhVar) {
  const t = figma.createText();
  t.fontName = { family: 'Manrope', style };
  t.characters = chars;
  t.fontSize = size;
  if (lineHeight) t.lineHeight = { value: lineHeight, unit: 'PIXELS' };
  t.fills = [{ type: 'SOLID', color: fallbackColor }];
  if (colorVar) bindFill(t, colorVar);
  if (fsVar) bindNum(t, 'fontSize', fsVar);
  if (lhVar) bindNum(t, 'lineHeight', lhVar);
  return t;
}

// 5. Build frame hierarchy following blueprint dimensions
const frame = figma.createFrame();
frame.name = 'Studio / [Screen Name]';
frame.resize(1440, 900);
frame.fills = [{ type: 'SOLID', color: C.pageBg }];
bindFill(frame, V['Bg/page']);
// Bind spacing
frame.paddingLeft = 48;
bindNum(frame, 'paddingLeft', V['4xl']);
bindNum(frame, 'paddingRight', V['4xl']);
// Bind radii
frame.cornerRadius = 16;
bindNum(frame, 'topLeftRadius', V['rounded-2xl']);
bindNum(frame, 'topRightRadius', V['rounded-2xl']);
bindNum(frame, 'bottomLeftRadius', V['rounded-2xl']);
bindNum(frame, 'bottomRightRadius', V['rounded-2xl']);
// ... continue building with exact sizes from blueprint
```

### Critical rules

1. **Fills/strokes: use `setBoundVariableForPaint()`** — NOT `setBoundVariable('fills', ...)`. The latter silently fails.
2. **fontSize/lineHeight: use `setBoundVariable(prop, varObj)`** — works on text nodes, returns array in `boundVariables`.
3. **spacing/radii: use `setBoundVariable(prop, varObj)`** — works for paddingLeft/Right/Top/Bottom, itemSpacing, topLeftRadius etc.
4. **Always set fallback value BEFORE binding** — `fills = [{...}]` then `bindFill()`.
5. **Set `layoutSizingHorizontal = 'FILL'` AFTER appending** to auto-layout parent.
6. **Use `cornerRadius`** for rounded elements (not ellipse for circles in layouts).
7. **Import only needed keys** — don't import all 50+ variables if you only need 10.
8. **Use Obra component instances** via `importComponentByKeyAsync(key)` + `.createInstance()` for Button, Input, Label etc.

### Common patterns

**Centered card on page:**
```javascript
frame.layoutMode = 'VERTICAL';
frame.primaryAxisAlignItems = 'CENTER';
frame.counterAxisAlignItems = 'CENTER';
```

**Sidebar + Content split:**
```javascript
const body = figma.createFrame();
body.layoutMode = 'HORIZONTAL';
parent.appendChild(body);
body.layoutSizingHorizontal = 'FILL';
body.layoutSizingVertical = 'FILL';

const sidebar = figma.createFrame();
sidebar.resize(220, 10);
body.appendChild(sidebar);
sidebar.layoutSizingVertical = 'FILL';

const content = figma.createFrame();
body.appendChild(content);
content.layoutSizingHorizontal = 'FILL';
content.layoutSizingVertical = 'FILL';
```

**Full-width child in auto-layout:**
```javascript
parent.appendChild(child);           // append FIRST
child.layoutSizingHorizontal = 'FILL'; // set FILL after
```

---

## Step 8: Screenshot + Verify

```javascript
get_screenshot({
  fileKey: 'PodaGqhhlgh6TLkcyAC5Oi',
  nodeId: '[frame-id]'
})
```

Compare with the HTML capture visually. The native rebuild should match the capture but now have all colors bound to Portal DS tokens.

**Verify token binding:** In Figma, select any colored element → right panel → the color chip should show a variable name (e.g., `Bg/page`) instead of a hex value.

---

## Gotchas & Lessons Learned

### CRITICAL: Paint-level vs Node-level binding
- **Fills/strokes** MUST use `figma.variables.setBoundVariableForPaint(paint, 'color', varObj)`
- `node.setBoundVariable('fills', 0, 'color', varObj.id)` **SILENTLY FAILS** — no error thrown but binding doesn't stick
- The correct pattern: `node.fills = [figma.variables.setBoundVariableForPaint(node.fills[0], 'color', varObj)]`
- This was the #1 bug — all color bindings appeared to succeed but none actually bound

### fontSize/lineHeight binding format
- Use `node.setBoundVariable('fontSize', varObj)` — this DOES work for text nodes
- But `boundVariables.fontSize` returns an **array** `[{type, id}]`, not an object `{type, id}`
- Audit code must check `bv.fontSize?.[0]?.id`, NOT `bv.fontSize?.id`
- Same for `lineHeight` — array format

### Plugin API vs REST API session isolation
- `use_figma` (Plugin API) cannot see nodes created by `generate_figma_design` (REST API)
- They operate on different document snapshots that NEVER sync within a session
- Solution: use captures as REFERENCE only, rebuild via Plugin API

### Cross-file variable binding
- Portal DS variables are in file `CLtdO56o9fJCx19EnhH1nI`
- Obra file is `PodaGqhhlgh6TLkcyAC5Oi`
- **`importVariableByKeyAsync(key)`** bridges the gap — imports library variables by key
- Keys are stable and don't change unless the variable is deleted and recreated
- Works for COLOR, FLOAT, and STRING variable types

### Font loading
- Must call `figma.loadFontAsync()` for EVERY weight used BEFORE creating text nodes
- Manrope weights: Regular (400), Medium (500), SemiBold (600), Bold (700)
- When modifying text inside component instances, load the INSTANCE's font: `await figma.loadFontAsync(textNode.fontName)`

### Auto-layout sizing
- `layoutSizingHorizontal = 'FILL'` throws error if node isn't inside an auto-layout parent
- Always: create frame → append to parent → THEN set layoutSizing

### Circles
- `figma.createEllipse()` creates a proper circle but can't have auto-layout children
- For circles with content inside: use `figma.createFrame()` with `cornerRadius = width/2`

### Shadows
- Figma effects array supports multiple shadows (stack for depth)
- Pattern: light outer shadow + darker close shadow = natural elevation
- Shadow colors cannot be bound to variables (Figma limitation)

### Spacing binding requires all 4 sides
- `setBoundVariable('paddingLeft', v)` only binds left — must call for all 4 sides separately
- Same for cornerRadius: must bind `topLeftRadius`, `topRightRadius`, `bottomLeftRadius`, `bottomRightRadius` individually

---

## File Locations

| File | Purpose |
|------|---------|
| `tools/studio-mockups/*.html` | HTML mockups (Step 3) |
| `.context/FIGMA_DESIGN_WORKFLOW.md` | This document |
| `workplan/STUDIO-MVP-DESIGN-SPEC.md` | Studio design specification |

---

## Quick Reference: Full Token Binding Example

```javascript
// Minimal complete example: button with ALL properties token-bound
const V_bg = await figma.variables.importVariableByKeyAsync('7d133021be86f564a6a5f2aa3f5589b37410f30e');
const V_fg = await figma.variables.importVariableByKeyAsync('95b00c1d9f17815b5429f0402edf0be200268060');
const V_radius = await figma.variables.importVariableByKeyAsync('ab5c8a47ca1f79726fa52fb94457143782a22915'); // rounded-xl = 12
const V_px = await figma.variables.importVariableByKeyAsync('ecf95051918d00b89c090457b1527d5f62fc50fa'); // md = 16
const V_fs = await figma.variables.importVariableByKeyAsync('990d55e5ee0d8296b55523033a7d0f49c77fc2ff'); // p-small/fs = 15
const V_lh = await figma.variables.importVariableByKeyAsync('13d7cdb6e3ddaa6f1afd4628120a590034e08d0d'); // p-small/lh = 20

const btn = figma.createFrame();
btn.resize(200, 48);
btn.layoutMode = 'HORIZONTAL';
btn.primaryAxisAlignItems = 'CENTER';
btn.counterAxisAlignItems = 'CENTER';

// Color binding — MUST use setBoundVariableForPaint
btn.cornerRadius = 12;
btn.fills = [{ type: 'SOLID', color: { r: 0.082, g: 0.122, b: 0.310 } }];
btn.fills = [figma.variables.setBoundVariableForPaint(btn.fills[0], 'color', V_bg)];

// Spacing binding — setBoundVariable on node
btn.paddingLeft = 16; btn.paddingRight = 16;
btn.setBoundVariable('paddingLeft', V_px);
btn.setBoundVariable('paddingRight', V_px);

// Radius binding — each corner separately
btn.setBoundVariable('topLeftRadius', V_radius);
btn.setBoundVariable('topRightRadius', V_radius);
btn.setBoundVariable('bottomLeftRadius', V_radius);
btn.setBoundVariable('bottomRightRadius', V_radius);

// Text with color + fontSize + lineHeight bindings
await figma.loadFontAsync({ family: 'Manrope', style: 'SemiBold' });
const label = figma.createText();
label.fontName = { family: 'Manrope', style: 'SemiBold' };
label.characters = 'Button Label';
label.fontSize = 15;
label.lineHeight = { value: 20, unit: 'PIXELS' };
label.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
label.fills = [figma.variables.setBoundVariableForPaint(label.fills[0], 'color', V_fg)];
label.setBoundVariable('fontSize', V_fs);
label.setBoundVariable('lineHeight', V_lh);

btn.appendChild(label);
```

## Post-Build Audit

After building, run an audit to verify 100% coverage. Key gotchas:
- `boundVariables.fills` uses `fills[0].id` (paint is object inside array)
- `boundVariables.fontSize` returns **array**: check `fontSize[0]?.id`, NOT `fontSize?.id`
- `boundVariables.lineHeight` same — array format
- `boundVariables.paddingLeft` returns **object**: check `paddingLeft?.id`
- `boundVariables.topLeftRadius` same — object format

Acceptable unbound: structural values without DS tokens (e.g. circle `cornerRadius = width/2`, emoji fontSize).
