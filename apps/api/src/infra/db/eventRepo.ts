import type { SyncEvent } from '@speedy-basket/shared';
import type { EventRepository } from '../../ports/EventRepository';
import { getDbPool } from './client';

function extractStoreId(event: SyncEvent) {
  return event.payload.storeId;
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
      return result.rowCount ?? 0;
    },
  };
}
