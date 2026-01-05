import type {
  EventType,
  PackProduct,
  PackProductLocation,
  PackProductTranslation,
  PackProductVariant,
  PackStore,
  PackZone,
} from './types';

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
  product_translations: PackDeltaTable<PackProductTranslation>;
  product_variants: PackDeltaTable<PackProductVariant>;
  product_locations: PackDeltaTable<PackProductLocation>;
  checksum?: string;
};

export type PostEventsRequest = {
  events: SyncEvent[];
};

export type PostEventsResponse = {
  accepted: number;
};

export type GetPackDeltaResponse = PackDelta;
