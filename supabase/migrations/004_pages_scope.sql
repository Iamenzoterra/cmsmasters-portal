-- WP-007 Phase 1: Add scope, html, css columns to pages table
-- Layout pages store their wrapper HTML+CSS and scope (which entity type they wrap)

ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT '';
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS html text NOT NULL DEFAULT '';
ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS css text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.pages.scope IS 'Layout scope: theme, theme-category, blog, help-article. Empty for composed pages.';
COMMENT ON COLUMN public.pages.html IS 'Layout HTML with {{slot:*}} placeholders. Empty for composed pages.';
COMMENT ON COLUMN public.pages.css IS 'Layout scoped CSS. Empty for composed pages.';
