INSERT INTO roles (key) VALUES
  ('user'),
  ('store_admin'),
  ('admin_god')
ON CONFLICT (key) DO NOTHING;
