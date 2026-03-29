import IORedis from 'ioredis';
import { config } from '../config';

let connection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (connection) return connection;

  connection = new IORedis(config.redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    enableOfflineQueue: false,
    connectTimeout: 1500,
    retryStrategy: (times) => {
      if (times >= 3) return null;
      return Math.min(200 * times, 1000);
    },
  });

  connection.on('error', (err: Error) => {
    console.error('[redis] connection error:', err);
  });

  connection.on('connect', () => {
    console.log('[redis] connected');
  });

  return connection;
}

export async function closeRedisConnection(): Promise<void> {
  if (!connection) return;
  const c = connection;
  connection = null;
  await c.quit();
}
