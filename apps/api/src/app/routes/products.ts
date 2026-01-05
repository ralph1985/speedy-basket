import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { getAuthUserId } from '../auth';
import { withAuthClient } from '../../infra/db/withAuth';

const createProductSchema = z.object({
  name: z.string().trim().min(1),
  category: z.string().trim().optional().nullable(),
});

export function registerProductsRoutes(server: FastifyInstance) {
  server.post(
    '/products',
    async (
      request: FastifyRequest<{ Body: { name: string; category?: string | null } }>,
      reply: FastifyReply
    ) => {
      const userId = await getAuthUserId(request);
      if (!userId) {
        reply.code(401).send({ error: 'Unauthorized' });
        return;
      }
      const { name, category } = createProductSchema.parse(request.body);
      return withAuthClient(userId, async (client) => {
        if (category && category.trim().length > 0) {
          await client.query(
            'INSERT INTO categories (name, created_by) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
            [category.trim(), userId]
          );
        }
        const result = await client.query<{
          id: number;
          name: string;
          category: string | null;
        }>(
          'INSERT INTO products (name, category, created_by) VALUES ($1, $2, $3) RETURNING id, name, category',
          [name, category ?? null, userId]
        );
        return result.rows[0];
      });
    }
  );
}
