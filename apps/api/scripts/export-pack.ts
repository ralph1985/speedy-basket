import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Pack } from '@speedy-basket/shared';
import { getDbPool } from '../src/infra/db/client';

function packPath() {
  return path.resolve(__dirname, '../../mobile/assets/pack.json');
}

async function run() {
  const pool = getDbPool();

  const storesResult = await pool.query('SELECT id, name FROM stores ORDER BY id ASC');
  const zonesResult = await pool.query(
    'SELECT id, store_id, name, polygon_or_meta FROM zones ORDER BY store_id ASC, id ASC'
  );
  const productsResult = await pool.query(
    'SELECT id, name, category FROM products ORDER BY id ASC'
  );
  const variantsResult = await pool.query(
    'SELECT id, product_id, brand, ean FROM product_variants ORDER BY id ASC'
  );
  const locationsResult = await pool.query(
    'SELECT product_id, store_id, zone_id, confidence, updated_at FROM product_locations ORDER BY store_id ASC, product_id ASC'
  );

  const pack: Pack = {
    version: new Date().toISOString(),
    stores: storesResult.rows.map((row) => ({ ...row, id: Number(row.id) })),
    zones: zonesResult.rows.map((row) => ({
      ...row,
      id: Number(row.id),
      store_id: Number(row.store_id),
    })),
    products: productsResult.rows.map((row) => ({ ...row, id: Number(row.id) })),
    product_variants: variantsResult.rows.map((row) => ({
      ...row,
      id: Number(row.id),
      product_id: Number(row.product_id),
    })),
    product_locations: locationsResult.rows.map((row) => ({
      ...row,
      product_id: Number(row.product_id),
      store_id: Number(row.store_id),
      zone_id: row.zone_id === null ? null : Number(row.zone_id),
    })),
  };

  await fs.writeFile(packPath(), JSON.stringify(pack, null, 2));
  await pool.end();
  console.log(`Pack exported to ${packPath()}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
