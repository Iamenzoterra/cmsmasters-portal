---
name: lint-ds
description: Scan files for design system violations — hardcoded colors, fonts, shadows, overlays, and Tailwind palette classes. Use when asked to "lint tokens", "check DS", "audit styles", "lint design system", or before creating a PR.
---

# Design System Lint

Run `scripts/lint-ds.sh` to detect hardcoded styles that should use tokens from `packages/ui/src/theme/tokens.css`.

## How to run

Choose the right scope:

```bash
# Single file
bash scripts/lint-ds.sh <file-path>

# Full app
bash scripts/lint-ds.sh --app studio
bash scripts/lint-ds.sh --app admin
bash scripts/lint-ds.sh --app dashboard

# Only git-staged files (pre-commit style)
bash scripts/lint-ds.sh --staged

# All changed files (staged + unstaged)
bash scripts/lint-ds.sh --changed
```

## What it checks

| Pattern | What it catches |
|---------|----------------|
| `fontFamily:` | Hardcoded font-family in inline styles |
| `fontWeight: <number>` | Hardcoded font-weight instead of token |
| `#hex` colors | Hex color literals |
| `rgb()`/`rgba()` | Raw color functions |
| `boxShadow: '0...` | Hardcoded box-shadow strings |
| `bg-gray-*`, `text-red-*`, etc. | Tailwind default palette classes |

## After running

1. Run the script with the appropriate scope
2. For each violation, report:
   - File path and line number
   - The offending code
   - The suggested fix (the script prints these)
3. If the user asks you to fix them, apply the replacements following the token mapping in CLAUDE.md "STRICT: No Hardcoded Styles"

## Token quick reference

| Instead of | Use |
|-----------|-----|
| `fontFamily: "'Manrope'..."` | Remove it (inherited from body) |
| `fontWeight: 500` | `var(--font-weight-medium)` |
| `fontWeight: 600` | `var(--font-weight-semibold)` |
| `#218721` | `hsl(var(--status-success-fg))` |
| `rgba(0,0,0,0.4-0.6)` | `hsl(var(--black-alpha-40))` / `hsl(var(--black-alpha-60))` |
| `boxShadow: '0px 2px 8px...'` | `var(--shadow-sm)` |
| `boxShadow: '0 25px 50px...'` | `var(--shadow-2xl)` |
| `bg-gray-100` | `bg-muted` or `bg-[hsl(var(--bg-surface-alt))]` |
| `text-gray-500` | `text-muted-foreground` or `text-[hsl(var(--text-muted))]` |

## Exclusions

- `apps/command-center/` — has its own theme, skip always
- `tools/` — standalone dev tools with own themes, skip always
- `tokens.css` — auto-generated, skip
- `*.test.*`, `*.spec.*`, `*.stories.*` — skip
- `node_modules`, `dist`, `build` — skip
