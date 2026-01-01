import fs from 'node:fs/promises';
import path from 'node:path';
import type { Pack } from '@speedy-basket/shared';
import { getDbPool } from '../src/infra/db/client';

type PackRow<T> = {
  table: string;
  rows: T[];
  columns: string[];
  conflictKeys: string[];
};

function packPath() {
  return path.resolve(__dirname, '../../mobile/assets/pack.json');
}

async function upsertRows<T extends Record<string, unknown>>(
  pool: ReturnType<typeof getDbPool>,
  { table, rows, columns, conflictKeys }: PackRow<T>
) {
  if (rows.length === 0) return;

  const values: Array<string | number | null> = [];
  const placeholders = rows
    .map((row, rowIndex) => {
      const offset = rowIndex * columns.length;
      columns.forEach((column) => {
        const value = row[column];
        if (typeof value === 'string' || typeof value === 'number') {
          values.push(value);
        } else if (value === null || value === undefined) {
          values.push(null);
        } else {
          values.push(JSON.stringify(value));
        }
      });
      const slots = columns.map((_, colIndex) => `$${offset + colIndex + 1}`).join(', ');
      return `(${slots})`;
    })
    .join(', ');

  const updates = columns
    .filter((column) => !conflictKeys.includes(column))
    .map((column) => `${column} = EXCLUDED.${column}`)
    .join(', ');

  const query = `
    INSERT INTO ${table} (${columns.join(', ')})
    VALUES ${placeholders}
    ON CONFLICT (${conflictKeys.join(', ')}) DO UPDATE SET ${updates}
  `;

  await pool.query(query, values);
}

async function run() {
  const pool = getDbPool();
  const raw = await fs.readFile(packPath(), 'utf8');
  const pack = JSON.parse(raw) as Pack;

  await upsertRows(pool, {
    table: 'stores',
    rows: pack.stores,
    columns: ['id', 'name'],
    conflictKeys: ['id'],
  });

  await upsertRows(pool, {
    table: 'zones',
    rows: pack.zones,
    columns: ['id', 'store_id', 'name', 'polygon_or_meta'],
    conflictKeys: ['id'],
  });

  await upsertRows(pool, {
    table: 'products',
    rows: pack.products,
    columns: ['id', 'name', 'brand', 'ean', 'category'],
    conflictKeys: ['id'],
  });

  await upsertRows(pool, {
    table: 'product_locations',
    rows: pack.product_locations,
    columns: ['product_id', 'store_id', 'zone_id', 'confidence', 'updated_at'],
    conflictKeys: ['product_id', 'store_id'],
  });

  await upsertRows(pool, {
    table: 'store_packs',
    rows: [
      {
        store_id: pack.stores[0]?.id ?? 1,
        version: pack.version,
        checksum: null,
        size: JSON.stringify(pack).length,
      },
    ],
    columns: ['store_id', 'version', 'checksum', 'size'],
    conflictKeys: ['store_id'],
  });

  await pool.end();
  console.log('Pack seeded');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
