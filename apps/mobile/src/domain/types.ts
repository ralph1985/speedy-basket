import type { OutboxEvent, Pack } from '@shared/types';

export type ProductListItem = {
  id: number;
  name: string;
  zoneName: string | null;
};

export type ProductDetail = {
  id: number;
  name: string;
  brand: string | null;
  category: string | null;
  zoneId: number | null;
  zoneName: string | null;
};

export type ZoneItem = {
  id: number;
  name: string;
};

export type StoreItem = {
  id: number;
  name: string;
};

export type OutboxEventItem = {
  id: OutboxEvent['id'];
  type: OutboxEvent['type'];
  created_at: OutboxEvent['created_at'];
  sent_at: OutboxEvent['sent_at'];
  payload_json: OutboxEvent['payload_json'];
};

export type TableCounts = Record<string, number>;

export type { Pack };
