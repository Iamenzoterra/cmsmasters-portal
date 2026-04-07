-- WP-015: Use Cases taxonomy ("Perfect For") + junction table

-- ── Entity table ──

CREATE TABLE public.use_cases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Junction table (many-to-many) ──

CREATE TABLE public.theme_use_cases (
  theme_id UUID NOT NULL REFERENCES public.themes(id) ON DELETE CASCADE,
  use_case_id UUID NOT NULL REFERENCES public.use_cases(id) ON DELETE CASCADE,
  PRIMARY KEY (theme_id, use_case_id)
);

-- ── RLS ──

ALTER TABLE public.use_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_use_cases ENABLE ROW LEVEL SECURITY;

-- use_cases policies
CREATE POLICY "use_cases_select" ON public.use_cases FOR SELECT USING (true);
CREATE POLICY "use_cases_insert" ON public.use_cases FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "use_cases_update" ON public.use_cases FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "use_cases_delete" ON public.use_cases FOR DELETE USING (auth.role() = 'authenticated');

-- theme_use_cases policies
CREATE POLICY "theme_use_cases_select" ON public.theme_use_cases FOR SELECT USING (true);
CREATE POLICY "theme_use_cases_insert" ON public.theme_use_cases FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "theme_use_cases_delete" ON public.theme_use_cases FOR DELETE USING (auth.role() = 'authenticated');

-- ── Triggers ──

CREATE TRIGGER update_use_cases_updated_at BEFORE UPDATE ON public.use_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
