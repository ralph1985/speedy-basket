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
