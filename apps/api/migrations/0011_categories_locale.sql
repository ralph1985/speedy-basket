ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'es';

ALTER TABLE categories
  DROP CONSTRAINT IF EXISTS categories_name_key;

DROP INDEX IF EXISTS idx_categories_locale_name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_locale_name
  ON categories (locale, name);

INSERT INTO categories (name, locale) VALUES
  ('Dairy', 'en'),
  ('Bakery', 'en'),
  ('Fruit', 'en'),
  ('Vegetables', 'en'),
  ('Drinks', 'en'),
  ('Fresh', 'en'),
  ('Frozen', 'en'),
  ('Pantry', 'en'),
  ('Cleaning', 'en'),
  ('Personal care', 'en'),
  ('Snacks', 'en'),
  ('Pets', 'en'),
  ('Baby', 'en')
ON CONFLICT (locale, name) DO NOTHING;
