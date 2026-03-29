import { pool } from './pool';

export async function clearAllTables(): Promise<void> {
  await pool.query('DELETE FROM delivery_attempts');
  await pool.query('DELETE FROM jobs');
  await pool.query('DELETE FROM subscribers');
  await pool.query('DELETE FROM pipelines');
}
