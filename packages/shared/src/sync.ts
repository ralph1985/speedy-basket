import type { EventType, PackProduct, PackProductLocation, PackStore, PackZone } from './types';

export type FoundEventPayload = {
  productId: number;
  storeId: number;
  zoneId?: number | null;
};

export type NotFoundEventPayload = {
  productId: number;
  storeId: number;
};

export type ScannedEanEventPayload = {
  ean: string;
  storeId: number;
  zoneId?: number | null;
};

export type SyncEventPayload = FoundEventPayload | NotFoundEventPayload | ScannedEanEventPayload;

export type SyncEvent = {
  id: string;
  type: EventType;
  created_at: string;
  payload: SyncEventPayload;
};

export type PackDeltaTable<T> = {
  upserts: T[];
  deletes: number[];
};

export type PackDelta = {
  version: string;
  stores: PackDeltaTable<PackStore>;
  zones: PackDeltaTable<PackZone>;
  products: PackDeltaTable<PackProduct>;
  product_locations: PackDeltaTable<PackProductLocation>;
  checksum?: string;
};
