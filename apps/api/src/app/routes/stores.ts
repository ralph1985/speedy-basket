import type { FastifyInstance } from 'fastify';
import { getDbPool } from '../../infra/db/client';

export function registerStoresRoutes(server: FastifyInstance) {
  server.get('/stores', async () => {
    const pool = getDbPool();
    const result = await pool.query<{ id: number; name: string }>(
      'SELECT id, name FROM stores ORDER BY id ASC'
    );
    return result.rows.map((row) => ({
      id: Number(row.id),
      name: row.name,
    }));
  });
}
