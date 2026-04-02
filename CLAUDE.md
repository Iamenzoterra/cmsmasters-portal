# Claude Code Instructions

## START HERE → Project Context

**Read `.context/BRIEF.md` first.** It explains the full project, architecture, current state, and what to build next.

The `.context/` folder contains everything an agent needs to orient itself:
- `BRIEF.md` — project overview (read FIRST, always)
- `ADR_DIGEST.md` — architecture decisions condensed for implementation
- `LAYER_0_SPEC.md` — current task spec (Supabase + Auth + Hono + packages)
- `CONVENTIONS.md` — code style, naming, token usage patterns
- `ROADMAP.md` — what comes after the current layer
- `SKILL.md` — this flow explained (how context folder works, reading order)

**Reading order:** BRIEF.md → current layer spec → CONVENTIONS.md before writing code.

---

## Design System Architecture

### Token scope
Portal DS tokens live in `packages/ui/src/theme/tokens.css`.
They are consumed by **all apps EXCEPT Command Center**:
- portal, dashboard, support, studio, admin — use tokens.css
- **command-center** — has its OWN theme (dark zinc, hardcoded hex in `tailwind.config.ts`). DO NOT overwrite or merge CC tokens with Portal DS.

Command Center **imports** tokens.css only to render `@cmsmasters/ui` components in preview pages. Its own UI (cards, badges, nav) uses CC-local classes (`bg-surface-card`, `text-text-muted`, etc.).

### Figma source files
| File | Key | What lives there |
|------|-----|------------------|
| CMS DS Portal — Obra | `PodaGqhhlgh6TLkcyAC5Oi` | shadcn semantic colors (light+dark), typography, spacing, radii |
| Portal DS — CMSMasters | `CLtdO56o9fJCx19EnhH1nI` | brand primitives (Color/*), brand semantics (Bg/*, Text/*, Border/*, Status/*, Button/*, Tag/*, etc.) |

### Component package
`packages/ui/` — shared UI components consumed by all portal apps.
- `src/primitives/` — design-system atoms (Button, Input, Badge...)
- `src/domain/` — business-specific composites
- `src/layouts/` — page shells, navigation
- `src/theme/tokens.css` — auto-generated, do not edit manually
- `src/lib/utils.ts` — `cn()` utility (clsx + tailwind-merge)
- Uses `cva` (class-variance-authority) for variant management
- All component sizing/spacing via CSS custom properties from tokens.css
- NO build step — consumers import TypeScript directly

### Conventions & gotchas
- **HSL without wrapper**: `228 54% 20%` not `hsl(228, 54%, 20%)` — shadcn convention
- **Sizing tokens in px**: `--button-height-sm: 32px` not just `32`
- **Tailwind v4 font-size hint**: `text-[length:var(--x)]` not `text-[var(--x)]` (otherwise Tailwind interprets as color)
- **Color in Tailwind**: `bg-[hsl(var(--button-primary-bg))]` — need `hsl()` wrapper in class because token stores raw HSL triplet
- **STRING variables in Figma**: need `resolveForConsumer` or separate fetch — Plugin API returns empty for font-family otherwise
- **Aliases matter**: component vars (Button/radius) should alias general tokens (rounded-lg), not duplicate values
- **Tailwind v4 bare var syntax**: `h-[--button-height-sm]` NOT `h-[var(--button-height-sm)]` — var() wrapper causes TW to skip class generation

## STRICT: No Hardcoded Styles

Every app (except Command Center) MUST use design tokens from `packages/ui/src/theme/tokens.css`. **Zero tolerance for hardcoded values.**

### Forbidden — never write these
| Pattern | Use instead |
|---------|-------------|
| `fontFamily: "'Manrope', sans-serif"` | Inherited from `body` via `globals.css`. Delete it. If needed: `var(--font-family-body)` |
| `fontFamily: "'JetBrains Mono', ..."` | `var(--font-family-monospace)` |
| `fontWeight: 500` / `600` / `700` | `var(--font-weight-medium)` / `var(--font-weight-semibold)` / `700` token TBD |
| `fontSize: '13px'` or any px font size | `var(--text-xs-font-size)`, `var(--text-sm-font-size)`, etc. |
| `lineHeight: '1.6'` or any raw value | `var(--text-sm-line-height)`, `var(--h3-line-height)`, etc. |
| `#218721` or any hex color | Use `--status-success-fg` or appropriate semantic token |
| `rgba(0,0,0,0.4)` for overlays | `hsl(var(--black-alpha-40))` or `hsl(var(--black-alpha-60))` |
| `boxShadow: '0px 2px 8px ...'` | `var(--shadow-sm)`, `var(--shadow-md)`, `var(--shadow-lg)`, etc. |
| `bg-gray-100`, `text-red-500`, etc. | Semantic classes: `bg-muted`, `text-destructive`, etc. |
| `w-[300px]`, `p-[20px]` arbitrary px | Use spacing tokens: `var(--spacing-xl)`, or Tailwind scale (`p-5`, `w-80`) |

### Required pattern — Tailwind classes over inline styles
```tsx
// WRONG — inline style with token
<div style={{ color: 'hsl(var(--text-muted))', fontSize: 'var(--text-sm-font-size)' }}>

// RIGHT — Tailwind class with token
<div className="text-[hsl(var(--text-muted))] text-[length:var(--text-sm-font-size)]">
```

Inline `style={{}}` is allowed ONLY for truly dynamic values (e.g., `style={{ height: \`\${computedHeight}px\` }}`). All static styling must use Tailwind classes.

### Use `@cmsmasters/ui` components when they exist
Before hand-building a Button, Input, Dialog, Card, Badge, or any primitive — check `packages/ui/src/primitives/`. If it exists there, import it. If it doesn't exist yet and you need it, flag it — don't hand-build a one-off.

---

## Figma Token Sync
Use the `/sync-tokens` skill. It automates the full pipeline:
Figma Plugin API → resolve aliases → convert types → apply naming rules → write tokens.css

For manual reference, see `docs/FIGMA_SYNC_INSTRUCTIONS.md`.
