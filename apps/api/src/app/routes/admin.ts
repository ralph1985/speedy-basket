import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { PackRepository } from '../../ports/PackRepository';
import { getPackDelta } from '../../application/getPackDelta';
import { getAuthUserId } from '../auth';
import { withAuthClient } from '../../infra/db/withAuth';

const packQuerySchema = z.object({
  storeId: z.coerce.number(),
  since: z.string().optional(),
});

type AuthRequest = { headers: { authorization?: string } };
type Reply = { code: (status: number) => { send: (payload: { error: string }) => void } };

async function requireAdminGod(request: AuthRequest, reply: Reply) {
  const userId = await getAuthUserId(request);
  if (!userId) {
    reply.code(401).send({ error: 'Unauthorized' });
    return null;
  }
  const isAdmin = await withAuthClient(userId, async (client) => {
    const result = await client.query<{ exists: boolean }>(
      `
      SELECT EXISTS (
        SELECT 1
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = $1
          AND r.key = 'admin_god'
      ) as exists
      `,
      [userId]
    );
    return result.rows[0]?.exists ?? false;
  });

  if (!isAdmin) {
    reply.code(403).send({ error: 'Forbidden' });
    return null;
  }
  return userId;
}

export function registerAdminRoutes(server: FastifyInstance, deps: { packs: PackRepository }) {
  server.get('/admin/stores', async (request, reply) => {
    const userId = await requireAdminGod(request, reply);
    if (!userId) return;
    return withAuthClient(userId, async (client) => {
      const result = await client.query<{ id: number; name: string }>(
        'SELECT id, name FROM stores ORDER BY id ASC'
      );
      return result.rows.map((row) => ({ id: Number(row.id), name: row.name }));
    });
  });

  server.get('/admin/pack', async (request, reply) => {
    const userId = await requireAdminGod(request, reply);
    if (!userId) return;
    const { storeId, since } = packQuerySchema.parse(request.query);
    return getPackDelta(deps.packs, storeId, userId, since);
  });
}
