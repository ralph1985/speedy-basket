CREATE TABLE IF NOT EXISTS product_translations (
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (product_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_product_translations_locale_name
  ON product_translations (locale, name);

INSERT INTO product_translations (product_id, locale, name)
SELECT id, 'es', name
FROM products
ON CONFLICT (product_id, locale) DO NOTHING;

INSERT INTO product_translations (product_id, locale, name)
SELECT
  id,
  'en',
  CASE LOWER(name)
    WHEN 'leche' THEN 'Milk'
    WHEN 'pan' THEN 'Bread'
    WHEN 'manzana' THEN 'Apple'
    WHEN 'yogur' THEN 'Yogurt'
    WHEN 'agua mineral' THEN 'Mineral water'
    WHEN 'patatas fritas' THEN 'Chips'
    WHEN 'pollo' THEN 'Chicken'
    WHEN 'tomate' THEN 'Tomato'
    ELSE name
  END
FROM products
ON CONFLICT (product_id, locale) DO NOTHING;
