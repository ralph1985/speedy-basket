import type {
  GetPackDeltaResponse,
  PackDelta,
  PackProduct,
  PackProductLocation,
  PackStore,
  PackZone,
} from '@speedy-basket/shared';
import type { PackRepository } from '../../ports/PackRepository';
import { getDbPool } from './client';

export function createPackRepository(): PackRepository {
  return {
    async getPackDelta(storeId, _since) {
      const pool = getDbPool();
      const versionResult = await pool.query<{ version: string }>(
        'SELECT version FROM store_packs WHERE store_id = $1',
        [storeId]
      );
      const currentVersion = versionResult.rows[0]?.version ?? `store-${storeId}-v0`;

      if (_since && _since === currentVersion) {
        const emptyDelta: PackDelta = {
          version: currentVersion,
          stores: { upserts: [], deletes: [] },
          zones: { upserts: [], deletes: [] },
          products: { upserts: [], deletes: [] },
          product_locations: { upserts: [], deletes: [] },
        };
        return emptyDelta;
      }

      const storesResult = await pool.query<PackStore>(
        'SELECT id, name FROM stores WHERE id = $1',
        [storeId]
      );
      const zonesResult = await pool.query<PackZone>(
        'SELECT id, store_id, name, polygon_or_meta FROM zones WHERE store_id = $1',
        [storeId]
      );
      const productsResult = await pool.query<PackProduct>(
        'SELECT id, name, brand, ean, category FROM products ORDER BY id ASC'
      );
      const locationsResult = await pool.query<PackProductLocation>(
        'SELECT product_id, store_id, zone_id, confidence, updated_at FROM product_locations WHERE store_id = $1',
        [storeId]
      );

      const stores = storesResult.rows.map((row: PackStore) => ({
        ...row,
        id: Number(row.id),
      }));
      const zones = zonesResult.rows.map((row: PackZone) => ({
        ...row,
        id: Number(row.id),
        store_id: Number(row.store_id),
      }));
      const products = productsResult.rows.map((row: PackProduct) => ({
        ...row,
        id: Number(row.id),
      }));
      const productLocations = locationsResult.rows.map((row: PackProductLocation) => ({
        ...row,
        product_id: Number(row.product_id),
        store_id: Number(row.store_id),
        zone_id: row.zone_id === null ? null : Number(row.zone_id),
      }));

      const delta: PackDelta = {
        version: currentVersion,
        stores: { upserts: stores, deletes: [] },
        zones: { upserts: zones, deletes: [] },
        products: { upserts: products, deletes: [] },
        product_locations: { upserts: productLocations, deletes: [] },
      };

      const response: GetPackDeltaResponse = delta;
      return response;
    },
  };
}
