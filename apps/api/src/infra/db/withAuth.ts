import type { PoolClient } from 'pg';
import { getDbPool } from './client';

export async function withAuthClient<T>(
  userId: string,
  fn: (client: PoolClient) => Promise<T>
) {
  const pool = getDbPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify({ sub: userId, role: 'authenticated' }),
    ]);
    await client.query(`SELECT set_config('role', $1, true)`, ['authenticated']);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
