import type {
  GetPackDeltaResponse,
  PackDelta,
  PackProduct,
  PackProductLocation,
  PackStore,
  PackZone,
} from '@speedy-basket/shared';
import type { PackRepository } from '../../ports/PackRepository';
import { withAuthClient } from './withAuth';

export function createPackRepository(): PackRepository {
  return {
    async getPackDelta(storeId, userId, since) {
      return withAuthClient(userId, async (client) => {
        const versionResult = await client.query<{ version: string }>(
          'SELECT version FROM store_packs WHERE store_id = $1',
          [storeId]
        );
        const maxUpdated = await client.query<{ updated_at: string | null }>(
          'SELECT MAX(updated_at) as updated_at FROM product_locations WHERE store_id = $1',
          [storeId]
        );
        const latestUpdated = maxUpdated.rows[0]?.updated_at ?? null;
        const currentVersion =
          latestUpdated || versionResult.rows[0]?.version || `store-${storeId}-v0`;

        if (since && since === currentVersion) {
          const emptyDelta: PackDelta = {
            version: currentVersion,
            stores: { upserts: [], deletes: [] },
            zones: { upserts: [], deletes: [] },
            products: { upserts: [], deletes: [] },
            product_locations: { upserts: [], deletes: [] },
          };
          return emptyDelta;
        }

        const sinceDate = since ? new Date(since) : null;
        const sinceIsValid = sinceDate && !Number.isNaN(sinceDate.valueOf());
        if (sinceIsValid) {
          const locationsResult = await client.query<PackProductLocation>(
            'SELECT product_id, store_id, zone_id, confidence, updated_at FROM product_locations WHERE store_id = $1 AND updated_at > $2',
            [storeId, sinceDate?.toISOString()]
          );
          const productLocations = locationsResult.rows.map((row) => ({
            ...row,
            product_id: Number(row.product_id),
            store_id: Number(row.store_id),
            zone_id: row.zone_id === null ? null : Number(row.zone_id),
          }));
          const delta: PackDelta = {
            version: currentVersion,
            stores: { upserts: [], deletes: [] },
            zones: { upserts: [], deletes: [] },
            products: { upserts: [], deletes: [] },
            product_locations: { upserts: productLocations, deletes: [] },
          };
          const response: GetPackDeltaResponse = delta;
          return response;
        }

        const storesResult = await client.query<PackStore>(
          'SELECT id, name FROM stores WHERE id = $1',
          [storeId]
        );
        const zonesResult = await client.query<PackZone>(
          'SELECT id, store_id, name, polygon_or_meta FROM zones WHERE store_id = $1',
          [storeId]
        );
        const productsResult = await client.query<PackProduct>(
          'SELECT id, name, brand, ean, category FROM products ORDER BY id ASC'
        );
        const locationsResult = await client.query<PackProductLocation>(
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
      });
    },
  };
}
