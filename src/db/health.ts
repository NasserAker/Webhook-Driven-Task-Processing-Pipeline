import { pool } from './pool';

export async function checkDatabaseConnection(): Promise<void> {
  const timeoutMs = 1000;
  await Promise.race([
    pool.query('SELECT 1'),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('DB health check timeout')), timeoutMs)),
  ]);
}
