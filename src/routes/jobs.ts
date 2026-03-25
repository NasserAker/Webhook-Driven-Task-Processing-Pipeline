import { Router } from 'express';
import { getJobById, listJobsByPipelineId } from '../db/jobs';
import { listDeliveryAttemptsByJobId } from '../db/deliveryAttempts';

const router = Router();

router.get('/pipeline/:pipelineId', async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
    const jobs = await listJobsByPipelineId(req.params.pipelineId, Math.min(Math.max(limit, 1), 200));
    res.json({ data: jobs });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/deliveries', async (req, res, next) => {
  try {
    const attempts = await listDeliveryAttemptsByJobId(req.params.id);
    res.json({ data: attempts });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const job = await getJobById(req.params.id);
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
