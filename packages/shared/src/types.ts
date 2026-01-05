export type EventType = 'FOUND' | 'NOT_FOUND' | 'SCANNED_EAN';

export type PackStore = {
  id: number;
  name: string;
};

export type PackZone = {
  id: number;
  store_id: number;
  name: string;
  polygon_or_meta?: string;
};

export type PackProduct = {
  id: number;
  name: string;
  category?: string;
};

export type PackProductVariant = {
  id: number;
  product_id: number;
  brand?: string;
  ean?: string;
};

export type PackProductLocation = {
  product_id: number;
  store_id: number;
  zone_id?: number | null;
  confidence?: number | null;
  updated_at?: string | null;
};

export type Pack = {
  version: string;
  stores: PackStore[];
  zones: PackZone[];
  products: PackProduct[];
  product_variants: PackProductVariant[];
  product_locations: PackProductLocation[];
};

export type OutboxEvent = {
  id: string;
  type: EventType;
  created_at: string;
  sent_at: string | null;
  payload_json: string;
};
