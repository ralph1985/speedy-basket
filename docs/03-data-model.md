# Modelo de datos

## SQLite (app)
- stores(id, name)
- zones(id, store_id, name, polygon_or_meta)
- products(id, name, brand, ean?, category)
- product_locations(product_id, store_id, zone_id, confidence, updated_at)
- outbox_events(id, type, payload_json, created_at, sent_at?)

## Postgres (central)
- stores
- zones
- products
- events (append-only)
- product_locations (consolidado)
- store_packs (store_id, version, created_at, hash, size)

## Indices / claves
- events: (store_id, created_at)
- product_locations: (store_id, product_id) unique
