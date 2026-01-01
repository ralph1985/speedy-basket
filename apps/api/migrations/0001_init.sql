CREATE TABLE IF NOT EXISTS stores (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS zones (
  id BIGINT PRIMARY KEY,
  store_id BIGINT NOT NULL REFERENCES stores(id),
  name TEXT NOT NULL,
  polygon_or_meta TEXT
);

CREATE TABLE IF NOT EXISTS products (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT,
  ean TEXT,
  category TEXT
);

CREATE TABLE IF NOT EXISTS product_locations (
  product_id BIGINT NOT NULL REFERENCES products(id),
  store_id BIGINT NOT NULL REFERENCES stores(id),
  zone_id BIGINT REFERENCES zones(id),
  confidence NUMERIC,
  updated_at TIMESTAMPTZ,
  PRIMARY KEY (product_id, store_id)
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  store_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS store_packs (
  store_id BIGINT PRIMARY KEY REFERENCES stores(id),
  version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checksum TEXT,
  size INTEGER
);

CREATE INDEX IF NOT EXISTS idx_events_store_created ON events (store_id, created_at DESC);
