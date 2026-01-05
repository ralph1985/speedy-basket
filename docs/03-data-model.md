# Modelo de datos

## SQLite (app)

- stores(id, name)
- zones(id, store_id, name, polygon_or_meta)
- products(id, name, category)
- product_variants(id, product_id, brand?, ean?)
- product_locations(product_id, store_id, zone_id, confidence, updated_at)
- outbox_events(id, type, payload_json, created_at, sent_at?)
- app*meta(key, value) # key/value para estado local (pack_version, sync_last*\*)

## Auth (Supabase)

- auth.users (gestionado por Supabase)

## Postgres (central)

- stores (created_by)
- profiles (id = auth.users.id, display_name, created_at)
- roles (key: admin, map_editor, store_editor, user)
- user_roles (user_id, role_id, store_id)
- zones
- products (genericos, created_by, created_at)
- categories (name, created_by, created_at)
- product_variants (marca + ean)
- events (append-only)
- product_locations (consolidado)
- store_packs (store_id, version, created_at, hash, size)
- shopping_lists (owner_id, name, store_id?, created_at)
- shopping_list_members (list_id, user_id, role: owner/editor/viewer)
- shopping_list_items (list_id, product_id?, label, qty, checked, created_at)

## Indices / claves

- events: (store_id, created_at)
- product_locations: (store_id, product_id) unique
- shopping_list_members: (list_id, user_id) unique
