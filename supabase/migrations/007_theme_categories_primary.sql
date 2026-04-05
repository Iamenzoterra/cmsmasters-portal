-- WP-010 Phase 4: Add is_primary flag to theme_categories junction
ALTER TABLE public.theme_categories ADD COLUMN is_primary BOOLEAN NOT NULL DEFAULT false;
