import { Router } from 'express';
import pipelinesRouter from './pipelines';
import webhooksRouter from './webhooks';
import jobsRouter from './jobs';

const router = Router();

router.use('/pipelines', pipelinesRouter);
router.use('/webhooks', webhooksRouter);
router.use('/jobs', jobsRouter);

export default router;
