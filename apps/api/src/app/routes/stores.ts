import type { FastifyInstance } from 'fastify';
import { getAuthUserId } from '../auth';
import { withAuthClient } from '../../infra/db/withAuth';

export function registerStoresRoutes(server: FastifyInstance) {
  server.get('/stores', async (request, reply) => {
    const userId = await getAuthUserId(request);
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    return withAuthClient(userId, async (client) => {
      const result = await client.query<{ id: number; name: string }>(
        'SELECT id, name FROM stores ORDER BY id ASC'
      );
      return result.rows.map((row) => ({
        id: Number(row.id),
        name: row.name,
      }));
    });
  });
}
