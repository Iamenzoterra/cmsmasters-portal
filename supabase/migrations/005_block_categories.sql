-- WP-008 Phase 1: Block categories, defaults, layout slot overrides

ALTER TABLE public.blocks ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT '';
ALTER TABLE public.blocks ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.blocks.category IS 'Block category: header, footer, sidebar, or empty for content blocks';
COMMENT ON COLUMN public.blocks.is_default IS 'Default block for its category — fills all matching slots unless overridden';

CREATE UNIQUE INDEX IF NOT EXISTS blocks_one_default_per_category
  ON public.blocks (category) WHERE is_default = true AND category != '';

ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS layout_slots jsonb NOT NULL DEFAULT '{}';
COMMENT ON COLUMN public.pages.layout_slots IS 'Layout slot overrides: { "header": "block-uuid" }. Only for layout pages.';
