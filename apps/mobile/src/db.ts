import * as SQLite from 'expo-sqlite';

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
  `);
}

export async function ensureSeedStore(db: SQLite.SQLiteDatabase) {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM stores'
  );
  if (!row || row.count === 0) {
    await db.runAsync('INSERT INTO stores (name) VALUES (?)', ['Demo Store']);
  }
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

type Pack = {
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

export async function importPackIfNeeded(db: SQLite.SQLiteDatabase, pack: Pack) {
  const existingVersion = await getMetaValue(db, 'pack_version');
  const storeCount = await getStoreCount(db);
  if (existingVersion && storeCount > 0) return false;

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

export type ProductListItem = {
  id: number;
  name: string;
  zoneName: string | null;
};

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

export type ProductDetail = {
  id: number;
  name: string;
  brand: string | null;
  category: string | null;
  zoneName: string | null;
};

export async function getProductDetail(db: SQLite.SQLiteDatabase, productId: number) {
  return db.getFirstAsync<ProductDetail>(
    `SELECT p.id, p.name, p.brand, p.category, z.name as zoneName
     FROM products p
     LEFT JOIN product_locations pl ON pl.product_id = p.id
     LEFT JOIN zones z ON z.id = pl.zone_id
     WHERE p.id = ?`,
    [productId]
  );
}

export async function createOutboxEvent(
  db: SQLite.SQLiteDatabase,
  type: 'FOUND' | 'NOT_FOUND',
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
