import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerEventsRoutes } from './routes/events';
import { registerPacksRoutes } from './routes/packs';
import { registerHealthRoutes } from './routes/health';
import { createEventRepository } from '../infra/db/eventRepo';
import { createPackRepository } from '../infra/db/packRepo';
import { registerStoresRoutes } from './routes/stores';

export function createServer() {
  const server = Fastify({ logger: true });
  const allowedOrigins = new Set([
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ]);

  server.register(cors, {
    origin: (origin, cb) => {
      if (!origin) {
        cb(null, true);
        return;
      }
      cb(null, allowedOrigins.has(origin));
    },
  });

  const eventRepo = createEventRepository();
  const packRepo = createPackRepository();

  registerHealthRoutes(server);
  registerEventsRoutes(server, { events: eventRepo });
  registerPacksRoutes(server, { packs: packRepo });
  registerStoresRoutes(server);

  return server;
}
