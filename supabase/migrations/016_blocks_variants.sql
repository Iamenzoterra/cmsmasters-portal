-- Migration 016: blocks.variants — optional structural variants per block
-- Part of WP-024 (ADR-025 Responsive Blocks — Foundation).
--
-- Shape: jsonb keyed by variant name (e.g. "mobile", "tablet"), each value
--   { html: string, css: string }. Portal inlines all variants into one
--   render artifact; @container CSS reveals the matching one at the block's
--   container width. NULL means the block has no structural variants.
--
-- Backwards-compatible: column is nullable with no default. Existing rows
-- remain NULL and continue to render via the single html/css/js triple.

ALTER TABLE blocks
  ADD COLUMN variants jsonb;

COMMENT ON COLUMN blocks.variants IS
  'Optional named structural variants. Shape: { [name: string]: { html: string, css: string } }. NULL = block has no variants. See ADR-025 and WP-024.';

-- No index. variants is read as a whole jsonb blob by BlockRenderer, never queried
-- by a subfield. RLS inherits from the blocks table policy — no policy change needed.
