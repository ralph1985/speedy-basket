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
  for (const file of files) {
    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
    await pool.query(sql);
    console.log(`Applied ${file}`);
  }

  await pool.end();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
