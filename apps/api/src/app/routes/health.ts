import type { FastifyInstance } from 'fastify';

export function registerHealthRoutes(server: FastifyInstance) {
  server.get('/health', async () => ({ status: 'ok' }));
}
