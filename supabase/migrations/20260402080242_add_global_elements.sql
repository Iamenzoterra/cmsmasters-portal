-- Global elements: blocks bound to layout slots with scope rules
CREATE TABLE global_elements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Which slot this element fills
  slot text NOT NULL,
  -- 'header' | 'footer' | 'sidebar-left' | 'sidebar-right'

  -- Which block renders in this slot
  block_id uuid NOT NULL REFERENCES blocks(id),

  -- Where this element appears
  scope text NOT NULL DEFAULT 'sitewide',
  -- 'sitewide'           — every page
  -- 'composed:*'         — all composed pages
  -- 'composed:homepage'  — only homepage (slug match)
  -- 'layout:*'           — all layout pages
  -- 'layout:themes'      — only theme layout pages (slug match)

  -- Priority: higher wins when multiple match (sitewide=0, specific=10)
  priority integer NOT NULL DEFAULT 0,

  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT global_elements_slot_check CHECK (slot IN ('header', 'footer', 'sidebar-left', 'sidebar-right')),
  -- Unique: one block per slot per scope
  CONSTRAINT global_elements_unique_slot_scope UNIQUE (slot, scope)
);

COMMENT ON TABLE global_elements IS 'Global layout elements (header, footer, sidebars) with scope binding. Higher priority wins when scopes overlap.';
COMMENT ON COLUMN global_elements.scope IS 'Where element appears: sitewide, composed:*, composed:{slug}, layout:*, layout:{slug}';
COMMENT ON COLUMN global_elements.priority IS 'Resolution order: 0=sitewide default, 10=type-specific, 20=page-specific';

-- RLS
ALTER TABLE global_elements ENABLE ROW LEVEL SECURITY;

CREATE POLICY global_elements_select_public ON global_elements FOR SELECT USING (true);
CREATE POLICY global_elements_insert_staff ON global_elements FOR INSERT WITH CHECK (public.get_user_role() IN ('content_manager', 'admin'));
CREATE POLICY global_elements_update_staff ON global_elements FOR UPDATE USING (public.get_user_role() IN ('content_manager', 'admin'));
CREATE POLICY global_elements_delete_staff ON global_elements FOR DELETE USING (public.get_user_role() IN ('content_manager', 'admin'));

-- Trigger
CREATE TRIGGER global_elements_updated BEFORE UPDATE ON global_elements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
