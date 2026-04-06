-- WP-011: Split blocks.category into block_type + block_categories table
-- Structural role (header/footer/sidebar/element) moves to block_type.
-- User-managed theme-block categories get their own table + FK.

-- 1. Add block_type column and copy data from category
ALTER TABLE public.blocks ADD COLUMN block_type text NOT NULL DEFAULT '';
COMMENT ON COLUMN public.blocks.block_type IS 'Structural role: header, footer, sidebar, element, or empty for theme content blocks';
UPDATE public.blocks SET block_type = category;

-- 2. Create block_categories table (user-managed categories for theme blocks)
CREATE TABLE IF NOT EXISTS public.block_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.block_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "block_categories_read" ON public.block_categories FOR SELECT USING (true);

-- 3. Add FK from blocks to block_categories
ALTER TABLE public.blocks ADD COLUMN block_category_id uuid
  REFERENCES public.block_categories(id) ON DELETE SET NULL;

-- 4. Replace unique index (one default per block_type)
DROP INDEX IF EXISTS blocks_one_default_per_category;
CREATE UNIQUE INDEX blocks_one_default_per_block_type
  ON public.blocks (block_type) WHERE is_default = true AND block_type != '';

-- 5. Drop old column
ALTER TABLE public.blocks DROP COLUMN category;
