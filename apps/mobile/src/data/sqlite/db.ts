import * as SQLite from 'expo-sqlite';
import type {
  OutboxEventItem,
  Pack,
  ProductDetail,
  ProductListItem,
  StoreItem,
  ZoneItem,
} from '@domain/types';
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
      category TEXT
    );

    CREATE TABLE IF NOT EXISTS product_translations (
      product_id INTEGER NOT NULL,
      locale TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT,
      PRIMARY KEY (product_id, locale),
      FOREIGN KEY(product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS product_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      brand TEXT,
      ean TEXT,
      created_at TEXT,
      FOREIGN KEY(product_id) REFERENCES products(id)
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

    CREATE TABLE IF NOT EXISTS shopping_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      remote_id INTEGER,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS shopping_list_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      remote_id INTEGER,
      list_id INTEGER NOT NULL,
      product_id INTEGER,
      label TEXT,
      qty TEXT,
      checked INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      synced_at TEXT,
      FOREIGN KEY(list_id) REFERENCES shopping_lists(id),
      FOREIGN KEY(product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_zones_store_id ON zones (store_id);
    CREATE INDEX IF NOT EXISTS idx_products_name ON products (name);
    CREATE INDEX IF NOT EXISTS idx_product_translations_locale_name ON product_translations (locale, name);
    CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants (product_id);
    CREATE INDEX IF NOT EXISTS idx_product_locations_store_updated ON product_locations (store_id, updated_at);
    CREATE INDEX IF NOT EXISTS idx_outbox_events_sent_at ON outbox_events (sent_at);
    CREATE INDEX IF NOT EXISTS idx_shopping_lists_remote ON shopping_lists (remote_id);
    CREATE INDEX IF NOT EXISTS idx_shopping_list_items_list ON shopping_list_items (list_id);
  `);
}

export async function getStoreCount(db: SQLite.SQLiteDatabase) {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM stores'
  );
  return row?.count ?? 0;
}

export async function listStores(db: SQLite.SQLiteDatabase) {
  return db.getAllAsync<StoreItem>('SELECT id, name FROM stores ORDER BY name ASC');
}

export async function listShoppingLists(db: SQLite.SQLiteDatabase) {
  return db.getAllAsync<{ id: number; name: string; remoteId: number | null }>(
    'SELECT id, name, remote_id as remoteId FROM shopping_lists ORDER BY created_at DESC'
  );
}

export async function createShoppingListLocal(
  db: SQLite.SQLiteDatabase,
  payload: { name: string }
) {
  const now = new Date().toISOString();
  const result = await db.runAsync(
    'INSERT INTO shopping_lists (name, created_at, updated_at) VALUES (?, ?, ?)',
    [payload.name, now, now]
  );
  return {
    id: result.lastInsertRowId ?? 0,
    name: payload.name,
    remoteId: null,
  };
}

export async function listShoppingListItems(db: SQLite.SQLiteDatabase, listId: number, locale: string) {
  return db.getAllAsync<{
    id: number;
    listId: number;
    productId: number | null;
    label: string;
    qty: string | null;
    checked: number;
    productName: string | null;
  }>(
    `
    SELECT
      i.id as id,
      i.list_id as listId,
      i.product_id as productId,
      COALESCE(i.label, pt.name, p.name, '') as label,
      i.qty as qty,
      i.checked as checked,
      COALESCE(pt.name, p.name) as productName
    FROM shopping_list_items i
    LEFT JOIN products p ON p.id = i.product_id
    LEFT JOIN product_translations pt ON pt.product_id = p.id AND pt.locale = ?
    WHERE i.list_id = ?
    ORDER BY i.created_at ASC
    `,
    [locale, listId]
  );
}

export async function addShoppingListItemLocal(
  db: SQLite.SQLiteDatabase,
  listId: number,
  payload: { productId?: number; label?: string; qty?: string | null }
) {
  const now = new Date().toISOString();
  const result = await db.runAsync(
    `
    INSERT INTO shopping_list_items (list_id, product_id, label, qty, checked, created_at, updated_at)
    VALUES (?, ?, ?, ?, 0, ?, ?)
    `,
    [listId, payload.productId ?? null, payload.label ?? null, payload.qty ?? null, now, now]
  );
  return result.lastInsertRowId ?? 0;
}

export async function toggleShoppingListItemLocal(
  db: SQLite.SQLiteDatabase,
  itemId: number,
  checked: boolean
) {
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE shopping_list_items SET checked = ?, updated_at = ? WHERE id = ?',
    [checked ? 1 : 0, now, itemId]
  );
}

export async function listShoppingListsNeedingSync(db: SQLite.SQLiteDatabase) {
  return db.getAllAsync<{
    id: number;
    name: string;
  }>('SELECT id, name FROM shopping_lists WHERE remote_id IS NULL');
}

export async function listShoppingListItemsNeedingSync(db: SQLite.SQLiteDatabase) {
  return db.getAllAsync<{
    id: number;
    listId: number;
    remoteId: number | null;
    productId: number | null;
    label: string | null;
    qty: string | null;
    checked: number;
    updatedAt: string;
    syncedAt: string | null;
  }>(
    `
    SELECT
      id,
      list_id as listId,
      remote_id as remoteId,
      product_id as productId,
      label,
      qty,
      checked,
      updated_at as updatedAt,
      synced_at as syncedAt
    FROM shopping_list_items
    WHERE remote_id IS NULL OR synced_at IS NULL OR updated_at > synced_at
    `
  );
}

export async function setShoppingListRemoteId(
  db: SQLite.SQLiteDatabase,
  listId: number,
  remoteId: number
) {
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE shopping_lists SET remote_id = ?, synced_at = ?, updated_at = ? WHERE id = ?',
    [remoteId, now, now, listId]
  );
}

export async function getShoppingListRemoteId(db: SQLite.SQLiteDatabase, listId: number) {
  const row = await db.getFirstAsync<{ remote_id: number | null }>(
    'SELECT remote_id FROM shopping_lists WHERE id = ?',
    [listId]
  );
  return row?.remote_id ?? null;
}

export async function setShoppingListItemRemoteId(
  db: SQLite.SQLiteDatabase,
  itemId: number,
  remoteId: number
) {
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE shopping_list_items SET remote_id = ?, synced_at = ?, updated_at = ? WHERE id = ?',
    [remoteId, now, now, itemId]
  );
}

export async function markShoppingListItemSynced(db: SQLite.SQLiteDatabase, itemId: number) {
  const now = new Date().toISOString();
  await db.runAsync('UPDATE shopping_list_items SET synced_at = ? WHERE id = ?', [now, itemId]);
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
      'INSERT OR IGNORE INTO products (id, name, category) VALUES (?, ?, ?)',
      [product.id, product.name, product.category ?? null]
    );
  }
  for (const translation of pack.product_translations) {
    await db.runAsync(
      'INSERT OR IGNORE INTO product_translations (product_id, locale, name, created_at) VALUES (?, ?, ?, ?)',
      [translation.product_id, translation.locale, translation.name, null]
    );
  }
  for (const variant of pack.product_variants) {
    await db.runAsync(
      'INSERT OR IGNORE INTO product_variants (id, product_id, brand, ean, created_at) VALUES (?, ?, ?, ?, ?)',
      [variant.id, variant.product_id, variant.brand ?? null, variant.ean ?? null, null]
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

export async function listProducts(
  db: SQLite.SQLiteDatabase,
  search = '',
  storeId: number,
  locale: string
) {
  const pattern = `%${search.toLowerCase()}%`;
  const rows = await db.getAllAsync<ProductListItem>(
    `SELECT p.id, COALESCE(pt.name, p.name) as name, z.name as zoneName
     FROM products p
     LEFT JOIN product_translations pt ON pt.product_id = p.id AND pt.locale = ?
     LEFT JOIN product_locations pl ON pl.product_id = p.id AND pl.store_id = ?
     LEFT JOIN zones z ON z.id = pl.zone_id
     WHERE LOWER(COALESCE(pt.name, p.name)) LIKE ?
     ORDER BY name ASC`,
    [locale, storeId, pattern]
  );
  return rows;
}

export async function listCategories(db: SQLite.SQLiteDatabase) {
  const rows = await db.getAllAsync<{ category: string }>(
    `
    SELECT DISTINCT category
    FROM products
    WHERE category IS NOT NULL AND TRIM(category) <> ''
    ORDER BY LOWER(category) ASC
    `
  );
  return rows.map((row) => row.category);
}

export async function createLocalProduct(
  db: SQLite.SQLiteDatabase,
  payload: { name: string; category: string | null; locale: string }
) {
  const now = new Date().toISOString();
  const localId = -Math.floor(Date.now() + Math.random() * 1000);
  await db.runAsync('INSERT INTO products (id, name, category) VALUES (?, ?, ?)', [
    localId,
    payload.name,
    payload.category ?? null,
  ]);
  await db.runAsync(
    'INSERT OR REPLACE INTO product_translations (product_id, locale, name, created_at) VALUES (?, ?, ?, ?)',
    [localId, payload.locale, payload.name, now]
  );
  return localId;
}

export async function listProductsNeedingSync(db: SQLite.SQLiteDatabase, locale: string) {
  return db.getAllAsync<{
    id: number;
    name: string;
    category: string | null;
  }>(
    `
    SELECT
      p.id as id,
      COALESCE(pt.name, p.name) as name,
      p.category as category
    FROM products p
    LEFT JOIN product_translations pt ON pt.product_id = p.id AND pt.locale = ?
    WHERE p.id < 0
    `,
    [locale]
  );
}

export async function replaceProductId(
  db: SQLite.SQLiteDatabase,
  localId: number,
  remoteId: number
) {
  await db.runAsync('UPDATE products SET id = ? WHERE id = ?', [remoteId, localId]);
  await db.runAsync('UPDATE product_translations SET product_id = ? WHERE product_id = ?', [
    remoteId,
    localId,
  ]);
  await db.runAsync('UPDATE product_variants SET product_id = ? WHERE product_id = ?', [
    remoteId,
    localId,
  ]);
  await db.runAsync('UPDATE product_locations SET product_id = ? WHERE product_id = ?', [
    remoteId,
    localId,
  ]);
  await db.runAsync('UPDATE shopping_list_items SET product_id = ? WHERE product_id = ?', [
    remoteId,
    localId,
  ]);
}

export async function insertProduct(
  db: SQLite.SQLiteDatabase,
  product: { id: number; name: string; category: string | null; locale: string }
) {
  await db.runAsync('INSERT OR REPLACE INTO products (id, name, category) VALUES (?, ?, ?)', [
    product.id,
    product.name,
    product.category ?? null,
  ]);
  await db.runAsync(
    'INSERT OR REPLACE INTO product_translations (product_id, locale, name, created_at) VALUES (?, ?, ?, ?)',
    [product.id, product.locale, product.name, null]
  );
}

export async function getProductDetail(
  db: SQLite.SQLiteDatabase,
  productId: number,
  storeId: number,
  locale: string
) {
  return db.getFirstAsync<ProductDetail>(
    `SELECT p.id, COALESCE(pt.name, p.name) as name, p.category, pl.zone_id as zoneId, z.name as zoneName
     FROM products p
     LEFT JOIN product_translations pt ON pt.product_id = p.id AND pt.locale = ?
     LEFT JOIN product_locations pl ON pl.product_id = p.id AND pl.store_id = ?
     LEFT JOIN zones z ON z.id = pl.zone_id
     WHERE p.id = ?`,
    [locale, storeId, productId]
  );
}

export async function listZones(db: SQLite.SQLiteDatabase, storeId: number) {
  return db.getAllAsync<ZoneItem>(
    'SELECT id, name FROM zones WHERE store_id = ? ORDER BY id ASC',
    [storeId]
  );
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
  const tables = [
    'stores',
    'zones',
    'products',
    'product_translations',
    'product_variants',
    'product_locations',
    'outbox_events',
    'shopping_lists',
    'shopping_list_items',
  ];
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
    DELETE FROM product_variants;
    DELETE FROM product_translations;
    DELETE FROM products;
    DELETE FROM shopping_list_items;
    DELETE FROM shopping_lists;
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
      'INSERT OR REPLACE INTO products (id, name, category) VALUES (?, ?, ?)',
      [product.id, product.name, product.category ?? null]
    );
  }
  for (const translation of delta.product_translations.upserts) {
    await db.runAsync(
      'INSERT OR REPLACE INTO product_translations (product_id, locale, name, created_at) VALUES (?, ?, ?, ?)',
      [translation.product_id, translation.locale, translation.name, null]
    );
  }
  for (const variant of delta.product_variants.upserts) {
    await db.runAsync(
      'INSERT OR REPLACE INTO product_variants (id, product_id, brand, ean, created_at) VALUES (?, ?, ?, ?, ?)',
      [variant.id, variant.product_id, variant.brand ?? null, variant.ean ?? null, null]
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
  if (delta.product_translations.deletes.length > 0) {
    const placeholders = delta.product_translations.deletes.map(() => '?').join(', ');
    await db.runAsync(
      `DELETE FROM product_translations WHERE product_id IN (${placeholders})`,
      delta.product_translations.deletes
    );
  }
  if (delta.product_variants.deletes.length > 0) {
    const placeholders = delta.product_variants.deletes.map(() => '?').join(', ');
    await db.runAsync(
      `DELETE FROM product_variants WHERE id IN (${placeholders})`,
      delta.product_variants.deletes
    );
  }
}
