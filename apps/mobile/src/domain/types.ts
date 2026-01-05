import type { OutboxEvent, Pack } from '@shared/types';

export type ProductListItem = {
  id: number;
  name: string;
  zoneName: string | null;
};

export type ProductDetail = {
  id: number;
  name: string;
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

export type ShoppingList = {
  id: number;
  name: string;
  storeId: number | null;
  role: string;
};

export type ShoppingListItem = {
  id: number;
  listId: number;
  productId: number | null;
  label: string;
  qty: string | null;
  checked: boolean;
  productName: string | null;
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
