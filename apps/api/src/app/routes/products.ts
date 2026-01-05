import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { getAuthUserId } from '../auth';
import { withAuthClient } from '../../infra/db/withAuth';

const createProductSchema = z.object({
  name: z.string().trim().min(1),
  category: z.string().trim().optional().nullable(),
  locale: z.enum(['es', 'en']).optional(),
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
      const { name, category, locale } = createProductSchema.parse(request.body);
      return withAuthClient(userId, async (client) => {
        const safeLocale = locale ?? 'es';
        await client.query('BEGIN');
        try {
          if (category && category.trim().length > 0) {
            await client.query(
              'INSERT INTO categories (name, created_by, locale) VALUES ($1, $2, $3) ON CONFLICT (locale, name) DO NOTHING',
              [category.trim(), userId, safeLocale]
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
          const created = result.rows[0];
          await client.query(
            'INSERT INTO product_translations (product_id, locale, name) VALUES ($1, $2, $3) ON CONFLICT (product_id, locale) DO NOTHING',
            [created.id, safeLocale, name]
          );
          await client.query('COMMIT');
          return created;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      });
    }
  );
}
