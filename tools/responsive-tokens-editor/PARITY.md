# tools/responsive-tokens-editor — PARITY contract

> Cross-surface PARITY discipline mirrors WP-026/027/028 wave: any change to the tokens consumed via `tokens.responsive.css` MUST propagate same-commit across consuming surfaces.

## Cross-references

- `tools/block-forge/PARITY.md` — preview iframe injection contract for the block-authoring surface (port 7702). Phase 6 of WP-030 will add cross-reference to this file.
- `apps/studio/src/pages/block-editor/responsive/PARITY.md` — Studio Responsive tab preview iframe contract. **Note:** Studio's `preview-assets.ts:19` already imports `tokensResponsiveCSS` (since WP-027); Studio activates automatically when Phase 6 generator populates real values. Cross-reference entry in Phase 6 is docs-only.

## Forward-looking notes (carried from Phase 0 Brain rulings)

- **Real-block preview workaround (Caveat #3 from Ruling #2):** V1 Live Preview Row uses generic samples (H1/H2/body/section/button). For real-block validation, open `tools/block-forge/` (port 7702) in a second tab post-Save; refresh after `tokens.responsive.css` regenerates. To be documented in detail at Phase 6 alongside the real cross-surface PARITY hookup.

## Status

Phase 1 stub — full contract authored at Phase 6 alongside the cross-surface PARITY chain hookup.
