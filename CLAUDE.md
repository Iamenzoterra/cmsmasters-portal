# Claude Code Instructions

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

## Figma Token Sync
Use the `/sync-tokens` skill. It automates the full pipeline:
Figma Plugin API → resolve aliases → convert types → apply naming rules → write tokens.css

For manual reference, see `docs/FIGMA_SYNC_INSTRUCTIONS.md`.
