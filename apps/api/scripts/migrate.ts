import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { getDbPool } from '../src/infra/db/client';

async function run() {
  const migrationsDir = path.resolve(__dirname, '../migrations');
  const files = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No migrations found.');
    return;
  }

  const pool = getDbPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const appliedRes = await pool.query<{ filename: string }>(
    'SELECT filename FROM schema_migrations'
  );
  const applied = new Set(appliedRes.rows.map((row) => row.filename));

  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }
    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
    try {
      await pool.query('BEGIN');
      await pool.query(sql);
      await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [
        file,
      ]);
      await pool.query('COMMIT');
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
    console.log(`Applied ${file}`);
  }

  await pool.end();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
