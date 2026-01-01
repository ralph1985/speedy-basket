import Fastify from 'fastify';
import { registerEventsRoutes } from './routes/events';
import { registerPacksRoutes } from './routes/packs';
import { registerHealthRoutes } from './routes/health';
import { createEventRepository } from '../infra/db/eventRepo';
import { createPackRepository } from '../infra/db/packRepo';

export function createServer() {
  const server = Fastify({ logger: true });

  const eventRepo = createEventRepository();
  const packRepo = createPackRepository();

  registerHealthRoutes(server);
  registerEventsRoutes(server, { events: eventRepo });
  registerPacksRoutes(server, { packs: packRepo });

  return server;
}
