import dotenv from 'dotenv';
import { AppConfig } from './types';

dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

export function loadConfig(): AppConfig {
  return {
    port: parseInt(optionalEnv('PORT', '3000'), 10),
    nodeEnv: optionalEnv('NODE_ENV', 'development'),
    databaseUrl: requireEnv('DATABASE_URL'),
    redisUrl: optionalEnv('REDIS_URL', 'redis://localhost:6379'),
    worker: {
      pollIntervalMs: parseInt(optionalEnv('WORKER_POLL_INTERVAL_MS', '1000'), 10),
      concurrency: parseInt(optionalEnv('WORKER_CONCURRENCY', '5'), 10),
    },
    job: {
      maxAttempts: parseInt(optionalEnv('JOB_MAX_ATTEMPTS', '5'), 10),
      retryBaseDelayMs: parseInt(optionalEnv('JOB_RETRY_BASE_DELAY_MS', '1000'), 10),
    },
    security: {
      apiKeySecret: optionalEnv('API_KEY_SECRET', 'dev-secret'),
      webhookSignatureSecret: optionalEnv('WEBHOOK_SIGNATURE_SECRET', 'dev-webhook-secret'),
    },
    delivery: {
      timeoutMs: parseInt(optionalEnv('DELIVERY_TIMEOUT_MS', '10000'), 10),
    },
  };
}

export const config = loadConfig();