CREATE INDEX IF NOT EXISTS idx_product_locations_store_updated
  ON product_locations (store_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_locations_store_product
  ON product_locations (store_id, product_id);

CREATE INDEX IF NOT EXISTS idx_zones_store_id
  ON zones (store_id);

CREATE INDEX IF NOT EXISTS idx_products_name
  ON products (name);

ALTER TABLE product_locations
  ADD CONSTRAINT product_locations_confidence_range
  CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1));
