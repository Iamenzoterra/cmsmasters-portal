-- ADR-009: Full theme page fields
-- Missing columns for Hero, trust badges, resources, ratings, compatible plugins

ALTER TABLE themes
  ADD COLUMN IF NOT EXISTS hero JSONB DEFAULT '{"screenshots": [], "headline": null}'::jsonb,
  ADD COLUMN IF NOT EXISTS compatible_plugins JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS trust_badges JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS sales INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS resources JSONB DEFAULT '{"public": [], "licensed": [], "premium": []}'::jsonb;

COMMENT ON COLUMN themes.hero IS 'Hero section: {screenshots: string[], headline?: string}';
COMMENT ON COLUMN themes.compatible_plugins IS 'Array of compatible plugin slugs: ["elementor", "woocommerce", "wpml"]';
COMMENT ON COLUMN themes.trust_badges IS 'Array of badge keys: ["power-elite", "elementor", "gdpr"]';
COMMENT ON COLUMN themes.rating IS 'ThemeForest rating (e.g. 4.58)';
COMMENT ON COLUMN themes.sales IS 'ThemeForest total sales count';
COMMENT ON COLUMN themes.resources IS 'Access-tiered resources: {public: [], licensed: [], premium: []}';
