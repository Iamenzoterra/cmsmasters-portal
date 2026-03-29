-- ============================================================================
-- CMSMasters Portal — Initial Schema (MVP)
-- 4 tables: profiles, themes, licenses, audit_log
-- 3 functions: handle_new_user, get_user_role, update_updated_at
-- 3 triggers: on_auth_user_created, profiles_updated, themes_updated
-- 6 indexes, RLS on all tables, 15 policies
-- ============================================================================

-- ═══ Users & Auth ═══

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'registered'
    CHECK (role IN ('registered', 'licensed', 'admin', 'content_manager', 'support_operator')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ═══ Themes & Content ═══

CREATE TABLE themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  category TEXT,
  price DECIMAL(10,2),
  demo_url TEXT,
  themeforest_url TEXT,
  themeforest_id TEXT,
  thumbnail_url TEXT,
  preview_images JSONB DEFAULT '[]'::jsonb,
  features JSONB DEFAULT '[]'::jsonb,
  included_plugins JSONB DEFAULT '[]'::jsonb,
  custom_sections JSONB DEFAULT '[]'::jsonb,
  seo_title TEXT,
  seo_description TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══ Licenses ═══

CREATE TABLE licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  theme_id UUID NOT NULL REFERENCES themes(id),
  purchase_code TEXT UNIQUE,
  license_type TEXT CHECK (license_type IN ('regular', 'extended')),
  verified_at TIMESTAMPTZ,
  support_until TIMESTAMPTZ,
  envato_item_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══ Audit Log ═══

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(id),
  actor_role TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══ Indexes ═══

CREATE INDEX idx_themes_slug ON themes(slug);
CREATE INDEX idx_themes_status ON themes(status);
CREATE INDEX idx_licenses_user ON licenses(user_id);
CREATE INDEX idx_licenses_theme ON licenses(theme_id);
CREATE INDEX idx_audit_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

-- ═══ Updated_at trigger ═══

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER themes_updated BEFORE UPDATE ON themes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══ Row Level Security ═══

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Helper function for role checks
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ═══ profiles policies ═══

CREATE POLICY profiles_select_own ON profiles FOR SELECT
  USING (id = auth.uid());
CREATE POLICY profiles_select_admin ON profiles FOR SELECT
  USING (get_user_role() = 'admin');
CREATE POLICY profiles_update_own ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
CREATE POLICY profiles_update_admin ON profiles FOR UPDATE
  USING (get_user_role() = 'admin');

-- ═══ themes policies ═══

CREATE POLICY themes_select_published ON themes FOR SELECT
  USING (status = 'published');
CREATE POLICY themes_select_staff ON themes FOR SELECT
  USING (get_user_role() IN ('content_manager', 'admin'));
CREATE POLICY themes_insert_staff ON themes FOR INSERT
  WITH CHECK (get_user_role() IN ('content_manager', 'admin'));
CREATE POLICY themes_update_staff ON themes FOR UPDATE
  USING (get_user_role() IN ('content_manager', 'admin'));
CREATE POLICY themes_select_anon ON themes FOR SELECT TO anon
  USING (status = 'published');

-- ═══ licenses policies ═══

CREATE POLICY licenses_select_own ON licenses FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY licenses_select_admin ON licenses FOR SELECT
  USING (get_user_role() = 'admin');
CREATE POLICY licenses_insert_admin ON licenses FOR INSERT
  WITH CHECK (get_user_role() = 'admin');
CREATE POLICY licenses_update_admin ON licenses FOR UPDATE
  USING (get_user_role() = 'admin');

-- ═══ audit_log policies ═══

CREATE POLICY audit_select_admin ON audit_log FOR SELECT
  USING (get_user_role() = 'admin');
CREATE POLICY audit_insert_any ON audit_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
