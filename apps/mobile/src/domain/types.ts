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

export type OutboxEventItem = {
  id: string;
  type: string;
  created_at: string;
  sent_at: string | null;
  payload_json: string;
};

export type TableCounts = Record<string, number>;

export type Pack = {
  version: string;
  stores: Array<{ id: number; name: string }>;
  zones: Array<{ id: number; store_id: number; name: string; polygon_or_meta?: string }>;
  products: Array<{
    id: number;
    name: string;
    brand?: string;
    ean?: string;
    category?: string;
  }>;
  product_locations: Array<{
    product_id: number;
    store_id: number;
    zone_id?: number | null;
    confidence?: number | null;
    updated_at?: string | null;
  }>;
};
