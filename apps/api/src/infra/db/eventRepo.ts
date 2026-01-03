import type { SyncEvent } from '@speedy-basket/shared';
import type { EventRepository } from '../../ports/EventRepository';
import { getDbPool } from './client';

function extractStoreId(event: SyncEvent) {
  return event.payload.storeId;
}

function isFoundEvent(
  event: SyncEvent
): event is SyncEvent & {
  payload: { productId: number; storeId: number; zoneId?: number | null };
} {
  return event.type === 'FOUND';
}

function isNotFoundEvent(
  event: SyncEvent
): event is SyncEvent & {
  payload: { productId: number; storeId: number };
} {
  return event.type === 'NOT_FOUND';
}

export function createEventRepository(): EventRepository {
  return {
    async addEvents(events) {
      if (events.length === 0) return 0;
      const pool = getDbPool();
      const values: Array<string | number | object | null> = [];
      const placeholders = events
        .map((event, index) => {
          const offset = index * 5;
          values.push(
            event.id,
            event.type,
            JSON.stringify(event.payload),
            extractStoreId(event),
            event.created_at
          );
          return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${
            offset + 5
          })`;
        })
        .join(', ');

      const query = `
        INSERT INTO events (id, type, payload, store_id, created_at)
        VALUES ${placeholders}
        ON CONFLICT (id) DO NOTHING
      `;

      const result = await pool.query(query, values);

      const foundEvents = events.filter(isFoundEvent);
      if (foundEvents.length > 0) {
        const confidence = 0.7;
        const foundValues: Array<number | string | null> = [];
        const foundPlaceholders = foundEvents
          .map((event, index) => {
            const offset = index * 5;
            foundValues.push(
              event.payload.productId,
              event.payload.storeId,
              event.payload.zoneId ?? null,
              confidence,
              event.created_at
            );
            return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${
              offset + 5
            })`;
          })
          .join(', ');

        const upsertQuery = `
          INSERT INTO product_locations (product_id, store_id, zone_id, confidence, updated_at)
          VALUES ${foundPlaceholders}
          ON CONFLICT (product_id, store_id)
          DO UPDATE SET
            zone_id = EXCLUDED.zone_id,
            confidence = EXCLUDED.confidence,
            updated_at = EXCLUDED.updated_at
        `;
        await pool.query(upsertQuery, foundValues);
      }

      const notFoundEvents = events.filter(isNotFoundEvent);
      if (notFoundEvents.length > 0) {
        const confidence = 0.2;
        const notFoundValues: Array<number | string | null> = [];
        const notFoundPlaceholders = notFoundEvents
          .map((event, index) => {
            const offset = index * 5;
            notFoundValues.push(
              event.payload.productId,
              event.payload.storeId,
              null,
              confidence,
              event.created_at
            );
            return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${
              offset + 5
            })`;
          })
          .join(', ');

        const notFoundQuery = `
          INSERT INTO product_locations (product_id, store_id, zone_id, confidence, updated_at)
          VALUES ${notFoundPlaceholders}
          ON CONFLICT (product_id, store_id)
          DO UPDATE SET
            zone_id = EXCLUDED.zone_id,
            confidence = EXCLUDED.confidence,
            updated_at = EXCLUDED.updated_at
        `;
        await pool.query(notFoundQuery, notFoundValues);
      }

      return result.rowCount ?? 0;
    },
  };
}
