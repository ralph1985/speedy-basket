import type { SyncEvent } from '@speedy-basket/shared';

export type EventRepository = {
  addEvents(events: SyncEvent[], userId: string): Promise<number>;
};
