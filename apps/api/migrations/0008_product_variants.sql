CREATE TABLE IF NOT EXISTS product_variants (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  brand TEXT,
  ean TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_variants_ean
  ON product_variants (ean)
  WHERE ean IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_product_variants_product
  ON product_variants (product_id);

INSERT INTO product_variants (product_id, brand, ean)
SELECT id, brand, ean
FROM products
WHERE brand IS NOT NULL OR ean IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_variants_select ON product_variants;
DROP POLICY IF EXISTS product_variants_insert ON product_variants;
DROP POLICY IF EXISTS product_variants_update ON product_variants;
DROP POLICY IF EXISTS product_variants_delete ON product_variants;

CREATE POLICY product_variants_select ON product_variants
  FOR SELECT TO authenticated
  USING (true);
CREATE POLICY product_variants_insert ON product_variants
  FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY product_variants_update ON product_variants
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);
CREATE POLICY product_variants_delete ON product_variants
  FOR DELETE TO authenticated
  USING (true);
