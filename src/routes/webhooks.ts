import { Router } from 'express';
import { z } from 'zod';
import { getPipelineBySourceId } from '../db/pipelines';
import { createJob } from '../db/jobs';
import { getWebhookQueue, WEBHOOK_JOB_NAME } from '../queue/webhookQueue';
import { config } from '../config';

const router = Router();

const uuidParamSchema = z.string().uuid();

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeout: NodeJS.Timeout | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error('QUEUE_TIMEOUT')), ms);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

router.post('/:sourceId', async (req, res, next) => {
  try {
    const sourceId = uuidParamSchema.parse(req.params.sourceId);
    const pipeline = await getPipelineBySourceId(sourceId);
    if (!pipeline) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Pipeline not found' });
      return;
    }
    if (!pipeline.is_active) {
      res.status(409).json({ error: 'INACTIVE', message: 'Pipeline is inactive' });
      return;
    }

    const payload = (req.body && typeof req.body === 'object') ? (req.body as Record<string, unknown>) : { body: req.body };

    const job = await createJob({
      pipelineId: pipeline.id,
      payload,
      maxAttempts: config.job.maxAttempts,
    });

    try {
      await withTimeout(
        getWebhookQueue().add(WEBHOOK_JOB_NAME, { jobId: job.id }, { jobId: job.id }),
        1500
      );
    } catch (err) {
      res.status(503).json({
        error: 'QUEUE_UNAVAILABLE',
        message: 'Redis/queue is unavailable. Start Redis and retry.',
      });
      return;
    }

    res.status(202).json({
      data: {
        job_id: job.id,
        pipeline_id: pipeline.id,
        queued_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
