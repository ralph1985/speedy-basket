import { Pool } from 'pg';
import dns from 'node:dns';

let pool: Pool | null = null;

export function getDbPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  if (!pool) {
    dns.setDefaultResultOrder('ipv4first');
    const useSsl = process.env.DATABASE_SSL !== 'false';
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      family: 4,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    });
  }

  return pool;
}
