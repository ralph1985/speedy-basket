import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getAuthUserId } from '../auth';
import { withAuthClient } from '../../infra/db/withAuth';

export function registerCategoriesRoutes(server: FastifyInstance) {
  server.get('/categories', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = await getAuthUserId(request);
    if (!userId) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }
    return withAuthClient(userId, async (client) => {
      const result = await client.query<{ id: number; name: string }>(
        `
        SELECT id, name
        FROM categories
        WHERE created_by IS NULL OR created_by = $1
        ORDER BY name ASC
        `,
        [userId]
      );
      return result.rows.map((row) => ({ id: Number(row.id), name: row.name }));
    });
  });
}
