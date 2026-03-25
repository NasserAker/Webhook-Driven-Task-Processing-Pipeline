import { config } from '../config';
import { pool } from '../db/pool';
import { closeRedisConnection, getRedisConnection } from '../queue/redis';
import { WEBHOOK_QUEUE_NAME, WebhookJobData } from '../queue/webhookQueue';
import { Job, Worker } from 'bullmq';
import axios from 'axios';
import { getJobById, getJobWithPipelineById, markJobCompleted, markJobDead, markJobFailedAttempt, markJobProcessing } from '../db/jobs';
import { listActiveSubscribersByPipelineId } from '../db/subscribers';
import { recordDeliveryAttempt, hasSuccessfulDelivery } from '../db/deliveryAttempts';
import { runAction } from '../actions';

console.log(`[worker] Starting (concurrency: ${config.worker.concurrency})`);

const worker = new Worker<WebhookJobData>(
  WEBHOOK_QUEUE_NAME,
  async (bullJob: Job<WebhookJobData>) => {
    const attemptNumber = bullJob.attemptsMade + 1;
    const jobId = bullJob.data.jobId;

    const jobRow = await getJobWithPipelineById(jobId);
    if (!jobRow) {
      throw new Error(`Job not found in DB: ${jobId}`);
    }

    await markJobProcessing(jobId);

    const processed = await runAction(jobRow.pipeline, jobRow.payload);

    const subscribers = await listActiveSubscribersByPipelineId(jobRow.pipeline_id);
    for (const sub of subscribers) {
      const alreadyDelivered = await hasSuccessfulDelivery(jobId, sub.id);
      if (alreadyDelivered) continue;

      const started = Date.now();
      try {
        const res = await axios.request({
          url: sub.url,
          method: 'POST',
          data: {
            job_id: jobId,
            pipeline_id: jobRow.pipeline_id,
            source_id: jobRow.pipeline.source_id,
            payload: processed,
          },
          timeout: config.delivery.timeoutMs,
          validateStatus: () => true,
        });

        const ok = res.status >= 200 && res.status < 300;
        await recordDeliveryAttempt({
          jobId,
          subscriberId: sub.id,
          status: ok ? 'success' : 'failed',
          statusCode: res.status,
          responseBody: typeof res.data === 'string' ? res.data : JSON.stringify(res.data),
          errorMessage: ok ? null : `Non-2xx response: ${res.status}`,
          attemptNumber,
          durationMs: Date.now() - started,
        });

        if (!ok) {
          throw new Error(`Delivery failed for subscriber ${sub.id} (${sub.url}) with status ${res.status}`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown delivery error';
        await recordDeliveryAttempt({
          jobId,
          subscriberId: sub.id,
          status: 'failed',
          statusCode: null,
          responseBody: null,
          errorMessage: message,
          attemptNumber,
          durationMs: Date.now() - started,
        });
        throw err;
      }
    }

    await markJobCompleted(jobId, processed);
    return { ok: true };
  },
  {
    connection: getRedisConnection() as any,
    concurrency: config.worker.concurrency,
  }
);

worker.on('failed', async (bullJob: Job<WebhookJobData> | undefined, err: Error) => {
  if (!bullJob) return;
  const jobId = bullJob.data.jobId;
  const attemptNumber = bullJob.attemptsMade;

  const dbJob = await getJobById(jobId);
  if (!dbJob) return;

  const message = err instanceof Error ? err.message : 'Unknown error';
  const finalAttempt = attemptNumber >= dbJob.max_attempts;

  if (finalAttempt) {
    await markJobDead(jobId, attemptNumber, message);
  } else {
    await markJobFailedAttempt(jobId, attemptNumber, message);
  }
});

worker.on('completed', (bullJob: Job<WebhookJobData>) => {
  console.log(`[worker] completed job ${bullJob.data.jobId}`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`[worker] Received ${signal} — shutting down...`);
  await worker.close();
  await closeRedisConnection();
  await pool.end();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));