import { Pool } from 'pg';

let pool: Pool | null = null;

export function getDbPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  if (!pool) {
    const useSsl = process.env.DATABASE_SSL !== 'false';
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    });
  }

  return pool;
}
