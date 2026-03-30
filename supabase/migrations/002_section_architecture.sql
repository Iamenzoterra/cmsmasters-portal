-- ============================================================================
-- WP-004: Section-Driven Architecture — Drop flat content columns, add jsonb
-- Depends on: 001_initial_schema.sql + add_theme_full_fields migration
-- Pre-condition: themes table has 0 rows (verified 2026-03-30)
-- ============================================================================

-- Step 1: Drop all 21 flat content columns
ALTER TABLE public.themes
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS tagline,
  DROP COLUMN IF EXISTS description,
  DROP COLUMN IF EXISTS category,
  DROP COLUMN IF EXISTS price,
  DROP COLUMN IF EXISTS demo_url,
  DROP COLUMN IF EXISTS themeforest_url,
  DROP COLUMN IF EXISTS themeforest_id,
  DROP COLUMN IF EXISTS thumbnail_url,
  DROP COLUMN IF EXISTS preview_images,
  DROP COLUMN IF EXISTS features,
  DROP COLUMN IF EXISTS included_plugins,
  DROP COLUMN IF EXISTS seo_title,
  DROP COLUMN IF EXISTS seo_description,
  DROP COLUMN IF EXISTS hero,
  DROP COLUMN IF EXISTS compatible_plugins,
  DROP COLUMN IF EXISTS trust_badges,
  DROP COLUMN IF EXISTS rating,
  DROP COLUMN IF EXISTS sales,
  DROP COLUMN IF EXISTS resources,
  DROP COLUMN IF EXISTS custom_sections;

-- Step 2: Add 3 jsonb columns
ALTER TABLE public.themes
  ADD COLUMN meta JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN sections JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN seo JSONB DEFAULT '{}';
