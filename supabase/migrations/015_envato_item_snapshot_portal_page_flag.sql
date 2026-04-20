-- Migration 015: Envato snapshot on licenses + has_portal_page flag on themes
-- Enables license verification to auto-seed a themes row for any ThemeForest item,
-- while keeping the raw Envato response as an immutable receipt on the license.

-- Raw Envato /v3/market/author/sale#item object, stored verbatim at verify time.
-- Never read by UI directly; used for audit / re-verify / re-seeding themes.meta.
ALTER TABLE licenses ADD COLUMN envato_item jsonb;

-- Orthogonal to status (draft/published/archived).
--   false → "legacy" theme (no portal page, link out to ThemeForest)
--   true  → has a portal page (ThemeCard links to portal.cmsmasters.studio/themes/<slug>)
-- Flipped manually by admin when promoting a theme into the portal catalog.
ALTER TABLE themes ADD COLUMN has_portal_page boolean NOT NULL DEFAULT false;

-- Verify route looks up existing themes by meta->>themeforest_id to decide
-- whether to reuse or seed a new row. Index makes that lookup O(log n).
CREATE INDEX IF NOT EXISTS themes_themeforest_id_idx
  ON themes ((meta->>'themeforest_id'))
  WHERE meta->>'themeforest_id' IS NOT NULL;
