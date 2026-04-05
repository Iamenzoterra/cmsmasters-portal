-- WP-010: Theme taxonomy tables (categories, tags) + junction tables

-- ── Entity tables ──

CREATE TABLE public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Junction tables (many-to-many) ──

CREATE TABLE public.theme_categories (
  theme_id UUID NOT NULL REFERENCES public.themes(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (theme_id, category_id)
);

CREATE TABLE public.theme_tags (
  theme_id UUID NOT NULL REFERENCES public.themes(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (theme_id, tag_id)
);

-- ── RLS ──

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_tags ENABLE ROW LEVEL SECURITY;

-- categories policies
CREATE POLICY "categories_select" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories_insert" ON public.categories FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "categories_update" ON public.categories FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "categories_delete" ON public.categories FOR DELETE USING (auth.role() = 'authenticated');

-- tags policies
CREATE POLICY "tags_select" ON public.tags FOR SELECT USING (true);
CREATE POLICY "tags_insert" ON public.tags FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "tags_update" ON public.tags FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "tags_delete" ON public.tags FOR DELETE USING (auth.role() = 'authenticated');

-- theme_categories policies
CREATE POLICY "theme_categories_select" ON public.theme_categories FOR SELECT USING (true);
CREATE POLICY "theme_categories_insert" ON public.theme_categories FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "theme_categories_delete" ON public.theme_categories FOR DELETE USING (auth.role() = 'authenticated');

-- theme_tags policies
CREATE POLICY "theme_tags_select" ON public.theme_tags FOR SELECT USING (true);
CREATE POLICY "theme_tags_insert" ON public.theme_tags FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "theme_tags_delete" ON public.theme_tags FOR DELETE USING (auth.role() = 'authenticated');

-- ── Triggers ──

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON public.tags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
