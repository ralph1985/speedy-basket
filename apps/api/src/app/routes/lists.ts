import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { getAuthUserId } from '../auth';
import { withAuthClient } from '../../infra/db/withAuth';

const listIdSchema = z.coerce.number().int().positive();
const itemIdSchema = z.coerce.number().int().positive();

const createListSchema = z.object({
  name: z.string().trim().min(1),
});

const createItemSchema = z.object({
  productId: z.number().int().positive().optional(),
  label: z.string().trim().min(1).optional(),
  qty: z.string().trim().min(1).optional(),
  locale: z.enum(['es', 'en']).optional(),
});

const toggleItemSchema = z.object({
  checked: z.boolean(),
});

const addMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['owner', 'editor', 'viewer']).optional(),
});

export function registerListsRoutes(server: FastifyInstance) {
  server.get('/lists', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = await getAuthUserId(request);
    if (!userId) {
      reply.code(401).send({ error: 'Unauthorized' });
      return;
    }
    return withAuthClient(userId, async (client) => {
      const result = await client.query<{
        id: number;
        name: string;
        owner_id: string;
        role: string | null;
      }>(
        `
        SELECT
          l.id,
          l.name,
          l.owner_id,
          CASE WHEN l.owner_id = $1 THEN 'owner' ELSE m.role END as role
        FROM shopping_lists l
        LEFT JOIN shopping_list_members m
          ON m.list_id = l.id AND m.user_id = $1
        WHERE l.owner_id = $1 OR m.user_id = $1
        ORDER BY l.created_at DESC
        `,
        [userId]
      );
      return result.rows.map((row) => ({
        id: Number(row.id),
        name: row.name,
        ownerId: row.owner_id,
        role: row.role ?? 'viewer',
      }));
    });
  });

  server.post(
    '/lists',
    async (
      request: FastifyRequest<{ Body: { name: string } }>,
      reply: FastifyReply
    ) => {
      const userId = await getAuthUserId(request);
      if (!userId) {
        reply.code(401).send({ error: 'Unauthorized' });
        return;
      }
      const { name } = createListSchema.parse(request.body);
      return withAuthClient(userId, async (client) => {
        const listResult = await client.query<{
          id: number;
          name: string;
        }>(
          'INSERT INTO shopping_lists (owner_id, name) VALUES ($1, $2) RETURNING id, name',
          [userId, name]
        );
        const created = listResult.rows[0];
        await client.query(
          'INSERT INTO shopping_list_members (list_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [created.id, userId, 'owner']
        );
        return {
          id: Number(created.id),
          name: created.name,
          ownerId: userId,
          role: 'owner',
        };
      });
    }
  );

  server.delete(
    '/lists/:listId',
    async (
      request: FastifyRequest<{ Params: { listId: string } }>,
      reply: FastifyReply
    ) => {
      const userId = await getAuthUserId(request);
      if (!userId) {
        reply.code(401).send({ error: 'Unauthorized' });
        return;
      }
      const listId = listIdSchema.parse(request.params.listId);
      return withAuthClient(userId, async (client) => {
        const result = await client.query<{ id: number }>(
          'DELETE FROM shopping_lists WHERE id = $1 AND owner_id = $2 RETURNING id',
          [listId, userId]
        );
        if (result.rowCount === 0) {
          reply.code(404).send({ error: 'List not found' });
          return;
        }
        reply.code(204).send();
      });
    }
  );

  server.get(
    '/lists/:listId/items',
    async (
      request: FastifyRequest<{ Params: { listId: string }; Querystring: { lang?: string } }>,
      reply: FastifyReply
    ) => {
      const userId = await getAuthUserId(request);
      if (!userId) {
        reply.code(401).send({ error: 'Unauthorized' });
        return;
      }
      const listId = listIdSchema.parse(request.params.listId);
      const { lang } = z
        .object({ lang: z.string().optional() })
        .parse(request.query ?? {});
      const locale = lang === 'en' ? 'en' : 'es';
      return withAuthClient(userId, async (client) => {
        const result = await client.query<{
          id: number;
          list_id: number;
          product_id: number | null;
          label: string | null;
          qty: string | null;
          checked: boolean;
          product_name: string | null;
        }>(
          `
          SELECT
            i.id,
            i.list_id,
            i.product_id,
            i.label,
            i.qty,
            i.checked,
            COALESCE(pt.name, p.name, i.label) as product_name
          FROM shopping_list_items i
          LEFT JOIN products p ON p.id = i.product_id
          LEFT JOIN product_translations pt
            ON pt.product_id = p.id AND pt.locale = $2
          WHERE i.list_id = $1
          ORDER BY i.created_at ASC
          `,
          [listId, locale]
        );
        return result.rows.map((row) => ({
          id: Number(row.id),
          listId: Number(row.list_id),
          productId: row.product_id ? Number(row.product_id) : null,
          label: row.label ?? row.product_name ?? '',
          qty: row.qty ?? null,
          checked: row.checked,
          productName: row.product_name ?? null,
        }));
      });
    }
  );

  server.post(
    '/lists/:listId/items',
    async (
      request: FastifyRequest<{ Params: { listId: string }; Body: { productId?: number } }>,
      reply: FastifyReply
    ) => {
      const userId = await getAuthUserId(request);
      if (!userId) {
        reply.code(401).send({ error: 'Unauthorized' });
        return;
      }
      const listId = listIdSchema.parse(request.params.listId);
      const { productId, label, qty, locale } = createItemSchema.parse(request.body);
      if (!productId && !label) {
        reply.code(400).send({ error: 'productId or label is required' });
        return;
      }
      const safeLocale = locale === 'en' ? 'en' : 'es';
      return withAuthClient(userId, async (client) => {
        let finalLabel = label?.trim() ?? null;
        if (!finalLabel && productId) {
          const nameResult = await client.query<{ name: string }>(
            `
            SELECT COALESCE(pt.name, p.name) as name
            FROM products p
            LEFT JOIN product_translations pt
              ON pt.product_id = p.id AND pt.locale = $2
            WHERE p.id = $1
            `,
            [productId, safeLocale]
          );
          finalLabel = nameResult.rows[0]?.name ?? null;
        }

        const result = await client.query<{
          id: number;
          list_id: number;
          product_id: number | null;
          label: string | null;
          qty: string | null;
          checked: boolean;
        }>(
          `
          INSERT INTO shopping_list_items (list_id, product_id, label, qty)
          VALUES ($1, $2, $3, $4)
          RETURNING id, list_id, product_id, label, qty, checked
          `,
          [listId, productId ?? null, finalLabel, qty ?? null]
        );

        const created = result.rows[0];
        return {
          id: Number(created.id),
          listId: Number(created.list_id),
          productId: created.product_id ? Number(created.product_id) : null,
          label: created.label ?? '',
          qty: created.qty ?? null,
          checked: created.checked,
        };
      });
    }
  );

  server.patch(
    '/lists/:listId/items/:itemId',
    async (
      request: FastifyRequest<{ Params: { listId: string; itemId: string } }>,
      reply: FastifyReply
    ) => {
      const userId = await getAuthUserId(request);
      if (!userId) {
        reply.code(401).send({ error: 'Unauthorized' });
        return;
      }
      const listId = listIdSchema.parse(request.params.listId);
      const itemId = itemIdSchema.parse(request.params.itemId);
      const { checked } = toggleItemSchema.parse(request.body);
      return withAuthClient(userId, async (client) => {
        const result = await client.query<{ id: number; checked: boolean }>(
          `
          UPDATE shopping_list_items
          SET checked = $3
          WHERE id = $1 AND list_id = $2
          RETURNING id, checked
          `,
          [itemId, listId, checked]
        );
        if (result.rows.length === 0) {
          reply.code(404).send({ error: 'Item not found' });
          return;
        }
        return {
          id: Number(result.rows[0].id),
          checked: result.rows[0].checked,
        };
      });
    }
  );

  server.post(
    '/lists/:listId/members',
    async (
      request: FastifyRequest<{ Params: { listId: string }; Body: { userId: string } }>,
      reply: FastifyReply
    ) => {
      const userId = await getAuthUserId(request);
      if (!userId) {
        reply.code(401).send({ error: 'Unauthorized' });
        return;
      }
      const listId = listIdSchema.parse(request.params.listId);
      const { userId: targetUserId, role } = addMemberSchema.parse(request.body);
      return withAuthClient(userId, async (client) => {
        await client.query(
          'INSERT INTO shopping_list_members (list_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [listId, targetUserId, role ?? 'editor']
        );
        return { ok: true };
      });
    }
  );
}
