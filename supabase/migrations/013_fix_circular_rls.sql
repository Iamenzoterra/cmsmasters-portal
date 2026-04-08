-- Migration 013: Fix circular RLS policies from migration 012
-- Problem: profiles_select_all_admin queries staff_roles, whose
-- staff_roles_select_admin queries profiles back → infinite recursion → 500.
-- Fix: Drop redundant policies (already covered by 001's get_user_role()-based policies)
-- and rewrite staff_roles/activity_log admin policies to use get_user_role() (SECURITY DEFINER).

-- ── Drop redundant policies (covered by 001's get_user_role()-based policies) ──

DROP POLICY IF EXISTS profiles_select_all_admin ON profiles;
DROP POLICY IF EXISTS licenses_select_all_admin ON licenses;

-- ── Rewrite staff_roles admin policies to use get_user_role() ──
-- Old: EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
-- New: get_user_role() = 'admin' — SECURITY DEFINER bypasses RLS, no circular dependency

DROP POLICY IF EXISTS staff_roles_select_admin ON staff_roles;
CREATE POLICY staff_roles_select_admin ON staff_roles
  FOR SELECT USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS staff_roles_insert_admin ON staff_roles;
CREATE POLICY staff_roles_insert_admin ON staff_roles
  FOR INSERT WITH CHECK (get_user_role() = 'admin');

DROP POLICY IF EXISTS staff_roles_update_admin ON staff_roles;
CREATE POLICY staff_roles_update_admin ON staff_roles
  FOR UPDATE USING (get_user_role() = 'admin');

DROP POLICY IF EXISTS staff_roles_delete_admin ON staff_roles;
CREATE POLICY staff_roles_delete_admin ON staff_roles
  FOR DELETE USING (get_user_role() = 'admin');

-- ── Rewrite activity_log admin policy to use get_user_role() ──

DROP POLICY IF EXISTS activity_select_admin ON activity_log;
CREATE POLICY activity_select_admin ON activity_log
  FOR SELECT USING (get_user_role() = 'admin');
