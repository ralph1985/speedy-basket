import type { GetPackDeltaResponse, PackDelta } from '@speedy-basket/shared';
import type { PackRepository } from '../../ports/PackRepository';

export function createPackRepository(): PackRepository {
  return {
    async getPackDelta(storeId, _since) {
      const emptyDelta: PackDelta = {
        version: `store-${storeId}-v0`,
        stores: { upserts: [], deletes: [] },
        zones: { upserts: [], deletes: [] },
        products: { upserts: [], deletes: [] },
        product_locations: { upserts: [], deletes: [] },
      };
      const response: GetPackDeltaResponse = emptyDelta;
      return response;
    },
  };
}
