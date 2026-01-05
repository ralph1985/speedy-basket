import type { SyncEvent } from '@speedy-basket/shared';
import type { EventRepository } from '../ports/EventRepository';

export async function ingestEvents(
  repo: EventRepository,
  events: SyncEvent[],
  userId: string
) {
  if (events.length === 0) return 0;
  return repo.addEvents(events, userId);
}
