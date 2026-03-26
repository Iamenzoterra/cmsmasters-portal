# Token Sync: Figma → tokens.css

> **This file is kept as a human-readable reference.**
> The automated workflow lives in `.claude/skills/sync-tokens/SKILL.md`.
> Trigger it with `/sync-tokens` or by saying "sync tokens".

## Quick reference

| Source | Key | What |
|--------|-----|------|
| CMS DS Portal — Obra | `PodaGqhhlgh6TLkcyAC5Oi` | shadcn colors, typography, spacing, radii |
| Portal DS — CMSMasters | `CLtdO56o9fJCx19EnhH1nI` | brand colors, semantic colors, component tokens |

## Output
`packages/ui/src/theme/tokens.css` — consumed by all apps **except** Command Center.

## Naming rules summary
- `general/*` → strip prefix
- `unofficial/*` → strip prefix
- `card/card X` → collapse to `--card-X`
- Portal DS `Color/*` → `--brand-*`
- Spacing → `--spacing-*`
- All lowercase, spaces to hyphens
- Skip: `hacks*`, `raw colors`, `obra-shadcn-docs/*`
- HSL without wrapper: `228 54% 20%`
