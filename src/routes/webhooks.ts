import { Router } from 'express';
import { getPipelineBySourceId } from '../db/pipelines';
import { createJob } from '../db/jobs';
import { getWebhookQueue, WEBHOOK_JOB_NAME } from '../queue/webhookQueue';
import { config } from '../config';

const router = Router();

router.post('/:sourceId', async (req, res, next) => {
  try {
    const pipeline = await getPipelineBySourceId(req.params.sourceId);
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

    await getWebhookQueue().add(WEBHOOK_JOB_NAME, { jobId: job.id }, { jobId: job.id });

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
