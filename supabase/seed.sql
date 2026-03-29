-- Test theme (Flavor — most recognizable CMSMasters theme)
INSERT INTO themes (slug, name, tagline, category, price, status, features, included_plugins)
VALUES (
  'flavor',
  'Flavor Theme',
  'Creative Multipurpose WordPress Theme',
  'creative',
  59.00,
  'published',
  '[{"icon": "palette", "title": "Elementor Builder", "description": "Full visual editing experience"}]'::jsonb,
  '[{"name": "CMSMasters Addon", "slug": "cmsmasters-addon", "value": 29}]'::jsonb
);

-- Role assignment (run after creating test users via Supabase Auth dashboard):
-- UPDATE profiles SET role = 'admin' WHERE email = 'dmitry@cmsmasters.com';
-- UPDATE profiles SET role = 'content_manager' WHERE email = 'content@cmsmasters.com';
