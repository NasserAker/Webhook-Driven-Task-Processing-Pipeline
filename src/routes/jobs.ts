import { Router } from 'express';
import { z } from 'zod';
import { getJobById, listJobsByPipelineId } from '../db/jobs';
import { listDeliveryAttemptsByJobId } from '../db/deliveryAttempts';

const router = Router();

const uuidParamSchema = z.string().uuid();

router.get('/pipeline/:pipelineId', async (req, res, next) => {
  try {
    const pipelineId = uuidParamSchema.parse(req.params.pipelineId);
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
    const jobs = await listJobsByPipelineId(pipelineId, Math.min(Math.max(limit, 1), 200));
    res.json({ data: jobs });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/deliveries', async (req, res, next) => {
  try {
    const id = uuidParamSchema.parse(req.params.id);
    const attempts = await listDeliveryAttemptsByJobId(id);
    res.json({ data: attempts });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = uuidParamSchema.parse(req.params.id);
    const job = await getJobById(id);
    if (!job) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Job not found' });
      return;
    }
    res.json({ data: job });
  } catch (err) {
    next(err);
  }
});

export default router;
