import { Queue } from 'bullmq';
import { getRedisConnection } from './redis';
import { config } from '../config';

export const WEBHOOK_QUEUE_NAME = 'webhook-jobs';
export const WEBHOOK_JOB_NAME = 'process-webhook' as const;

export type WebhookJobData = {
  jobId: string;
};

let webhookQueue: Queue<WebhookJobData, void, typeof WEBHOOK_JOB_NAME> | null = null;

export function getWebhookQueue(): Queue<WebhookJobData, void, typeof WEBHOOK_JOB_NAME> {
  if (webhookQueue) return webhookQueue;

  webhookQueue = new Queue<WebhookJobData, void, typeof WEBHOOK_JOB_NAME>(WEBHOOK_QUEUE_NAME, {
    connection: getRedisConnection() as any,
    defaultJobOptions: {
      attempts: config.job.maxAttempts,
      backoff: {
        type: 'exponential',
        delay: config.job.retryBaseDelayMs,
      },
      removeOnComplete: 1000,
      removeOnFail: 1000,
    },
  });

  return webhookQueue;
}
