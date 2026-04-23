-- Security Advisor flagged public.notification_settings with RLS disabled.
-- Mirrors the admin-gated pattern used on licenses/profiles/audit_log.
-- service_role bypasses RLS, so Hono API access is unaffected.

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_settings_select_admin"
  ON public.notification_settings
  FOR SELECT
  USING (get_user_role() = 'admin');

CREATE POLICY "notification_settings_insert_admin"
  ON public.notification_settings
  FOR INSERT
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "notification_settings_update_admin"
  ON public.notification_settings
  FOR UPDATE
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "notification_settings_delete_admin"
  ON public.notification_settings
  FOR DELETE
  USING (get_user_role() = 'admin');
