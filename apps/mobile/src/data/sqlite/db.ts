import * as SQLite from 'expo-sqlite';
import type { OutboxEventItem, Pack, ProductDetail, ProductListItem, ZoneItem } from '@domain/types';
import type { EventType } from '@shared/types';
import type { PackDelta } from '@shared/sync';

const DB_NAME = 'speedy_basket.db';

export async function openDatabase() {
  return SQLite.openDatabaseAsync(DB_NAME);
}

export async function initDatabase(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS zones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      polygon_or_meta TEXT,
      FOREIGN KEY(store_id) REFERENCES stores(id)
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      brand TEXT,
      ean TEXT,
      category TEXT
    );

    CREATE TABLE IF NOT EXISTS product_locations (
      product_id INTEGER NOT NULL,
      store_id INTEGER NOT NULL,
      zone_id INTEGER,
      confidence REAL,
      updated_at TEXT,
      PRIMARY KEY (product_id, store_id),
      FOREIGN KEY(product_id) REFERENCES products(id),
      FOREIGN KEY(store_id) REFERENCES stores(id),
      FOREIGN KEY(zone_id) REFERENCES zones(id)
    );

    CREATE TABLE IF NOT EXISTS outbox_events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      sent_at TEXT
    );

    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_zones_store_id ON zones (store_id);
    CREATE INDEX IF NOT EXISTS idx_products_name ON products (name);
    CREATE INDEX IF NOT EXISTS idx_product_locations_store_updated ON product_locations (store_id, updated_at);
    CREATE INDEX IF NOT EXISTS idx_outbox_events_sent_at ON outbox_events (sent_at);
  `);
}

export async function getStoreCount(db: SQLite.SQLiteDatabase) {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM stores'
  );
  return row?.count ?? 0;
}

export async function getMetaValue(db: SQLite.SQLiteDatabase, key: string) {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_meta WHERE key = ?',
    [key]
  );
  return row?.value ?? null;
}

export async function setMetaValue(db: SQLite.SQLiteDatabase, key: string, value: string) {
  await db.runAsync('INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)', [
    key,
    value,
  ]);
}

export async function importPack(db: SQLite.SQLiteDatabase, pack: Pack, force = false) {
  if (!force) {
    const existingVersion = await getMetaValue(db, 'pack_version');
    const storeCount = await getStoreCount(db);
    if (existingVersion && storeCount > 0) return false;
  }

  for (const store of pack.stores) {
    await db.runAsync('INSERT OR IGNORE INTO stores (id, name) VALUES (?, ?)', [
      store.id,
      store.name,
    ]);
  }
  for (const zone of pack.zones) {
    await db.runAsync(
      'INSERT OR IGNORE INTO zones (id, store_id, name, polygon_or_meta) VALUES (?, ?, ?, ?)',
      [zone.id, zone.store_id, zone.name, zone.polygon_or_meta ?? null]
    );
  }
  for (const product of pack.products) {
    await db.runAsync(
      'INSERT OR IGNORE INTO products (id, name, brand, ean, category) VALUES (?, ?, ?, ?, ?)',
      [product.id, product.name, product.brand ?? null, product.ean ?? null, product.category ?? null]
    );
  }
  for (const location of pack.product_locations) {
    await db.runAsync(
      'INSERT OR IGNORE INTO product_locations (product_id, store_id, zone_id, confidence, updated_at) VALUES (?, ?, ?, ?, ?)',
      [
        location.product_id,
        location.store_id,
        location.zone_id ?? null,
        location.confidence ?? null,
        location.updated_at ?? null,
      ]
    );
  }

  await setMetaValue(db, 'pack_version', pack.version);
  return true;
}

export async function importPackIfNeeded(db: SQLite.SQLiteDatabase, pack: Pack) {
  return importPack(db, pack, false);
}

export async function listProducts(db: SQLite.SQLiteDatabase, search = '') {
  const pattern = `%${search.toLowerCase()}%`;
  const rows = await db.getAllAsync<ProductListItem>(
    `SELECT p.id, p.name, z.name as zoneName
     FROM products p
     LEFT JOIN product_locations pl ON pl.product_id = p.id
     LEFT JOIN zones z ON z.id = pl.zone_id
     WHERE LOWER(p.name) LIKE ?
     ORDER BY p.name ASC`,
    [pattern]
  );
  return rows;
}

export async function getProductDetail(db: SQLite.SQLiteDatabase, productId: number) {
  return db.getFirstAsync<ProductDetail>(
    `SELECT p.id, p.name, p.brand, p.category, pl.zone_id as zoneId, z.name as zoneName
     FROM products p
     LEFT JOIN product_locations pl ON pl.product_id = p.id
     LEFT JOIN zones z ON z.id = pl.zone_id
     WHERE p.id = ?`,
    [productId]
  );
}

export async function listZones(db: SQLite.SQLiteDatabase) {
  return db.getAllAsync<ZoneItem>('SELECT id, name FROM zones ORDER BY id ASC');
}

export async function createOutboxEvent(
  db: SQLite.SQLiteDatabase,
  type: EventType,
  payload: Record<string, unknown>
) {
  const id = `evt_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
  const createdAt = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO outbox_events (id, type, payload_json, created_at) VALUES (?, ?, ?, ?)',
    [id, type, JSON.stringify(payload), createdAt]
  );
  return id;
}

export async function listOutboxEvents(db: SQLite.SQLiteDatabase, limit = 20) {
  return db.getAllAsync<OutboxEventItem>(
    'SELECT id, type, payload_json, created_at, sent_at FROM outbox_events ORDER BY created_at DESC LIMIT ?',
    [limit]
  );
}

export async function listPendingOutboxEvents(db: SQLite.SQLiteDatabase, limit = 50) {
  return db.getAllAsync<OutboxEventItem>(
    'SELECT id, type, payload_json, created_at, sent_at FROM outbox_events WHERE sent_at IS NULL ORDER BY created_at ASC LIMIT ?',
    [limit]
  );
}

export async function markOutboxEventsSent(db: SQLite.SQLiteDatabase, ids: string[]) {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(', ');
  await db.runAsync(
    `UPDATE outbox_events SET sent_at = ? WHERE id IN (${placeholders})`,
    [new Date().toISOString(), ...ids]
  );
}

export async function getTableCounts(db: SQLite.SQLiteDatabase) {
  const tables = ['stores', 'zones', 'products', 'product_locations', 'outbox_events'];
  const counts: Record<string, number> = {};
  for (const table of tables) {
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${table}`
    );
    counts[table] = row?.count ?? 0;
  }
  return counts;
}

export async function resetDatabase(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    DELETE FROM product_locations;
    DELETE FROM products;
    DELETE FROM zones;
    DELETE FROM stores;
    DELETE FROM outbox_events;
    DELETE FROM app_meta;
  `);
}

export async function applyPackDelta(db: SQLite.SQLiteDatabase, delta: PackDelta) {
  for (const store of delta.stores.upserts) {
    await db.runAsync('INSERT OR REPLACE INTO stores (id, name) VALUES (?, ?)', [
      store.id,
      store.name,
    ]);
  }
  for (const zone of delta.zones.upserts) {
    await db.runAsync(
      'INSERT OR REPLACE INTO zones (id, store_id, name, polygon_or_meta) VALUES (?, ?, ?, ?)',
      [zone.id, zone.store_id, zone.name, zone.polygon_or_meta ?? null]
    );
  }
  for (const product of delta.products.upserts) {
    await db.runAsync(
      'INSERT OR REPLACE INTO products (id, name, brand, ean, category) VALUES (?, ?, ?, ?, ?)',
      [product.id, product.name, product.brand ?? null, product.ean ?? null, product.category ?? null]
    );
  }
  for (const location of delta.product_locations.upserts) {
    await db.runAsync(
      'INSERT OR REPLACE INTO product_locations (product_id, store_id, zone_id, confidence, updated_at) VALUES (?, ?, ?, ?, ?)',
      [
        location.product_id,
        location.store_id,
        location.zone_id ?? null,
        location.confidence ?? null,
        location.updated_at ?? null,
      ]
    );
  }

  if (delta.stores.deletes.length > 0) {
    const placeholders = delta.stores.deletes.map(() => '?').join(', ');
    await db.runAsync(`DELETE FROM stores WHERE id IN (${placeholders})`, delta.stores.deletes);
  }
  if (delta.zones.deletes.length > 0) {
    const placeholders = delta.zones.deletes.map(() => '?').join(', ');
    await db.runAsync(`DELETE FROM zones WHERE id IN (${placeholders})`, delta.zones.deletes);
  }
  if (delta.products.deletes.length > 0) {
    const placeholders = delta.products.deletes.map(() => '?').join(', ');
    await db.runAsync(`DELETE FROM products WHERE id IN (${placeholders})`, delta.products.deletes);
  }
}
