# Responsive Tokens Editor

Vite app for authoring CMSMasters Portal's fluid design tokens — Layer 1 of ADR-025.

**Port:** 7703 (strictPort). Sibling of layout-maker (7700/7701), block-forge (7702), studio-mockups (7777).

## How to run

From repo root:

```bash
npm run responsive-tokens-editor
```

Opens `http://localhost:7703`. **Note:** `tools/*` is NOT an npm workspace (CONVENTIONS §0); the script uses the `cd tools/X && npm run dev` pattern.

## What it generates

- **`packages/ui/src/theme/responsive-config.json`** — git-tracked source of truth for the fluid scale (viewport range, type ratios, spacing multipliers, per-token overrides). Edited via the editor UI; never hand-edit.
- **`packages/ui/src/theme/tokens.responsive.css`** — auto-generated CSS file with `clamp()`-based fluid token values. Cascade-overrides static tokens defined in `tokens.css`. **DO NOT EDIT MANUALLY** after Phase 6 lands.

After saving in the editor, run `git status` to see the regenerated files; commit + push deploys via Vercel/CF Pages.

## Install dance (Phase 4+ heads-up)

When this package adopts `@cmsmasters/*` workspace deps (e.g., shared types from `@cmsmasters/ui`), `npm install` will fail with a 404 because `tools/*` is not in the npm workspaces array. Workaround:

1. Comment out the `@cmsmasters/*` lines in `package.json` `dependencies`
2. Run `npm install`
3. Restore the lines

Same pattern as `tools/block-forge/`; documented in `.claude/skills/domains/infra-tooling/SKILL.md` L70.

## Status

- [x] Phase 0 RECON complete
- [x] Phase 1 Vite scaffold (this commit)
- [ ] Phase 2 config schema + math engine
- [ ] Phase 3 Global Scale UI
- [ ] Phase 4 Token Preview Grid + Per-token Overrides
- [ ] Phase 5 Container widths + Live Preview Row
- [ ] Phase 6 Save flow + cross-surface PARITY
- [ ] Phase 7 Close
