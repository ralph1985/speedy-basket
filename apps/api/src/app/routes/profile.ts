import type { FastifyInstance } from 'fastify';
import { getAuthUserId } from '../auth';
import { withAuthClient } from '../../infra/db/withAuth';

export function registerProfileRoutes(server: FastifyInstance) {
  server.get('/profile', async (request, reply) => {
    const userId = await getAuthUserId(request);
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    return withAuthClient(userId, async (client) => {
      const result = await client.query<{ id: string; display_name: string | null; created_at: string }>(
        `INSERT INTO profiles (id)
         VALUES ($1)
         ON CONFLICT (id)
         DO UPDATE SET display_name = profiles.display_name
         RETURNING id, display_name, created_at`,
        [userId]
      );
      return result.rows[0] ?? null;
    });
  });
}
