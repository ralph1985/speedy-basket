import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { PackRepository } from '../../ports/PackRepository';
import { getPackDelta } from '../../application/getPackDelta';

const packQuerySchema = z.object({
  storeId: z.coerce.number(),
  since: z.string().optional(),
});

export function registerPacksRoutes(server: FastifyInstance, deps: { packs: PackRepository }) {
  server.get('/pack', async (request) => {
    const { storeId, since } = packQuerySchema.parse(request.query);
    return getPackDelta(deps.packs, storeId, since);
  });
}
