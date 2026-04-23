-- Pages: both layout wrappers and composed pages
CREATE TABLE pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  type text NOT NULL DEFAULT 'composed',

  -- Layout elements (global blocks)
  header_block_id uuid REFERENCES blocks(id),
  footer_block_id uuid REFERENCES blocks(id),

  -- For type='layout': where theme content goes (sidebar block with entitlement hooks)
  sidebar_block_id uuid REFERENCES blocks(id),

  -- SEO (for composed pages; layout pages inherit from theme)
  seo jsonb DEFAULT '{}',

  status text NOT NULL DEFAULT 'draft',

  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT pages_type_check CHECK (type IN ('layout', 'composed')),
  CONSTRAINT pages_status_check CHECK (status IN ('draft', 'published', 'archived'))
);

-- Page blocks: ordered blocks on a composed page
CREATE TABLE page_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  block_id uuid NOT NULL REFERENCES blocks(id),
  position integer NOT NULL,

  -- Per-instance config: slot fills, hook overrides
  config jsonb DEFAULT '{}',

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT page_blocks_unique_position UNIQUE (page_id, position)
);

-- Add page reference to themes (which layout page wraps this theme)
ALTER TABLE themes ADD COLUMN page_id uuid REFERENCES pages(id);

COMMENT ON TABLE pages IS 'Pages: layout (wrapper for themes) or composed (assembled from blocks)';
COMMENT ON TABLE page_blocks IS 'Ordered blocks on a composed page with per-instance config';
COMMENT ON COLUMN pages.type IS 'layout = wrapper for theme pages (header+sidebar+footer around theme content), composed = full page built from blocks';
COMMENT ON COLUMN pages.sidebar_block_id IS 'For layout pages: sidebar block with entitlement hooks';
COMMENT ON COLUMN themes.page_id IS 'Layout page that wraps this theme (header, footer, sidebar)';

-- RLS
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_blocks ENABLE ROW LEVEL SECURITY;

-- Pages: public can read published, staff can CRUD
CREATE POLICY pages_select_published ON pages FOR SELECT USING (status = 'published');
CREATE POLICY pages_select_staff ON pages FOR SELECT USING (public.get_user_role() IN ('content_manager', 'admin'));
CREATE POLICY pages_insert_staff ON pages FOR INSERT WITH CHECK (public.get_user_role() IN ('content_manager', 'admin'));
CREATE POLICY pages_update_staff ON pages FOR UPDATE USING (public.get_user_role() IN ('content_manager', 'admin'));
CREATE POLICY pages_delete_staff ON pages FOR DELETE USING (public.get_user_role() IN ('content_manager', 'admin'));

-- Page blocks: follow parent page access
CREATE POLICY page_blocks_select ON page_blocks FOR SELECT USING (
  EXISTS (SELECT 1 FROM pages WHERE pages.id = page_blocks.page_id AND (pages.status = 'published' OR public.get_user_role() IN ('content_manager', 'admin')))
);
CREATE POLICY page_blocks_insert_staff ON page_blocks FOR INSERT WITH CHECK (public.get_user_role() IN ('content_manager', 'admin'));
CREATE POLICY page_blocks_update_staff ON page_blocks FOR UPDATE USING (public.get_user_role() IN ('content_manager', 'admin'));
CREATE POLICY page_blocks_delete_staff ON page_blocks FOR DELETE USING (public.get_user_role() IN ('content_manager', 'admin'));

-- Trigger for updated_at on pages
CREATE TRIGGER pages_updated BEFORE UPDATE ON pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
