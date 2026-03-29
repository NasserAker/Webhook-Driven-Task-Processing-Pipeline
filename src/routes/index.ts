import { Router } from 'express';
import pipelinesRouter from './pipelines';
import webhooksRouter from './webhooks';
import jobsRouter from './jobs';
import adminRouter from './admin';

const router = Router();

router.use('/pipelines', pipelinesRouter);
router.use('/webhooks', webhooksRouter);
router.use('/jobs', jobsRouter);
router.use('/admin', adminRouter);

export default router;
