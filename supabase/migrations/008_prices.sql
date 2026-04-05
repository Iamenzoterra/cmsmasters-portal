-- Prices taxonomy: reusable price entries with type (normal / discount)

CREATE TABLE public.prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'normal' CHECK (type IN ('normal', 'discount')),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Junction: theme ↔ price (many-to-many)
CREATE TABLE public.theme_prices (
  theme_id UUID NOT NULL REFERENCES public.themes(id) ON DELETE CASCADE,
  price_id UUID NOT NULL REFERENCES public.prices(id) ON DELETE CASCADE,
  PRIMARY KEY (theme_id, price_id)
);

-- RLS
ALTER TABLE public.prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prices_select" ON public.prices FOR SELECT USING (true);
CREATE POLICY "prices_insert" ON public.prices FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "prices_update" ON public.prices FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "prices_delete" ON public.prices FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "theme_prices_select" ON public.theme_prices FOR SELECT USING (true);
CREATE POLICY "theme_prices_insert" ON public.theme_prices FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "theme_prices_delete" ON public.theme_prices FOR DELETE USING (auth.role() = 'authenticated');

-- Trigger
CREATE TRIGGER update_prices_updated_at BEFORE UPDATE ON public.prices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
