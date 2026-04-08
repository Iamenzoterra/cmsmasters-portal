-- Migration 012: staff_roles + activity_log tables
-- Part of WP-017 Layer 3 (Dashboard + Admin)
-- Adds entitlement-based staff roles (ADR-020 V3) and activity logging

-- ── staff_roles table ──────────────────────────────────────────

CREATE TABLE staff_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'content_manager', 'support_operator')),
  permissions jsonb DEFAULT '[]'::jsonb,
  granted_by uuid REFERENCES profiles(id),
  granted_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE staff_roles ENABLE ROW LEVEL SECURITY;

-- User reads own staff roles
CREATE POLICY staff_roles_select_own ON staff_roles
  FOR SELECT USING (user_id = auth.uid());

-- Admin reads all staff roles
CREATE POLICY staff_roles_select_admin ON staff_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin manages staff roles
CREATE POLICY staff_roles_insert_admin ON staff_roles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY staff_roles_update_admin ON staff_roles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY staff_roles_delete_admin ON staff_roles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ── activity_log table ─────────────────────────────────────────

CREATE TABLE activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  action text NOT NULL,
  theme_slug text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can INSERT their own activity
CREATE POLICY activity_insert_auth ON activity_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admin reads all activity
CREATE POLICY activity_select_admin ON activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- User reads own activity
CREATE POLICY activity_select_own ON activity_log
  FOR SELECT USING (user_id = auth.uid());

-- ── Seed staff_roles from existing profiles ────────────────────

INSERT INTO staff_roles (user_id, role, permissions)
SELECT id, role, '["*"]'::jsonb
FROM profiles
WHERE role IN ('admin', 'content_manager', 'support_operator');

-- ── Update get_user_role() — staff_roles first, profiles.role fallback ──

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM staff_roles WHERE user_id = auth.uid() ORDER BY granted_at DESC LIMIT 1),
    (SELECT role FROM profiles WHERE id = auth.uid())
  )
$$;

-- ── Admin can read ALL profiles (for User Inspector) ───────────

CREATE POLICY profiles_select_all_admin ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM staff_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ── Admin can read ALL licenses (for User Inspector) ───────────

CREATE POLICY licenses_select_all_admin ON licenses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM staff_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
