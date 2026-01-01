import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { PostEventsRequest, PostEventsResponse, SyncEvent } from '@speedy-basket/shared';
import type { EventRepository } from '../../ports/EventRepository';
import { ingestEvents } from '../../application/ingestEvents';

const eventTypeSchema = z.enum(['FOUND', 'NOT_FOUND', 'SCANNED_EAN']);

const eventPayloadSchema = z.union([
  z.object({
    productId: z.number(),
    storeId: z.number(),
    zoneId: z.number().nullable().optional(),
  }),
  z.object({
    productId: z.number(),
    storeId: z.number(),
  }),
  z.object({
    ean: z.string(),
    storeId: z.number(),
    zoneId: z.number().nullable().optional(),
  }),
]);

const eventSchema = z.object({
  id: z.string(),
  type: eventTypeSchema,
  created_at: z.string(),
  payload: eventPayloadSchema,
});

const postEventsSchema = z.object({
  events: z.array(eventSchema),
});

export function registerEventsRoutes(server: FastifyInstance, deps: { events: EventRepository }) {
  server.post('/events', async (request) => {
    const data = postEventsSchema.parse(request.body) as PostEventsRequest;
    const accepted = await ingestEvents(deps.events, data.events as SyncEvent[]);
    const response: PostEventsResponse = { accepted };
    return response;
  });
}
