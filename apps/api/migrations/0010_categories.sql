CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  name CITEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS categories_select ON categories;
DROP POLICY IF EXISTS categories_insert ON categories;
DROP POLICY IF EXISTS categories_update ON categories;
DROP POLICY IF EXISTS categories_delete ON categories;

CREATE POLICY categories_select ON categories
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY categories_insert ON categories
  FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY categories_update ON categories
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());
CREATE POLICY categories_delete ON categories
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

INSERT INTO categories (name) VALUES
  ('Lácteos'),
  ('Panadería'),
  ('Fruta'),
  ('Verdura'),
  ('Bebidas'),
  ('Frescos'),
  ('Congelados'),
  ('Despensa'),
  ('Limpieza'),
  ('Higiene'),
  ('Snacks'),
  ('Mascotas'),
  ('Bebés')
ON CONFLICT (name) DO NOTHING;
