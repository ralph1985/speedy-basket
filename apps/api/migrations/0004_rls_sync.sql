DROP POLICY IF EXISTS product_locations_insert ON product_locations;
DROP POLICY IF EXISTS product_locations_update ON product_locations;

CREATE POLICY product_locations_insert ON product_locations
  FOR INSERT TO authenticated
  WITH CHECK (TRUE);

CREATE POLICY product_locations_update ON product_locations
  FOR UPDATE TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS store_packs_update ON store_packs;
DROP POLICY IF EXISTS store_packs_insert ON store_packs;

CREATE POLICY store_packs_update ON store_packs
  FOR UPDATE TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

CREATE POLICY store_packs_insert ON store_packs
  FOR INSERT TO authenticated
  WITH CHECK (TRUE);
