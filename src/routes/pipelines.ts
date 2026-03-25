import { Router } from 'express';
import { z } from 'zod';
import { createPipeline, deletePipeline, getPipelineById, listPipelines, updatePipeline } from '../db/pipelines';
import { createSubscriber, deleteSubscriber, listSubscribersByPipelineId } from '../db/subscribers';

const router = Router();

const createPipelineSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  action_type: z.enum(['transform', 'filter', 'http_enrichment']),
  action_config: z.record(z.any()).default({}),
});

const updatePipelineSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  action_type: z.enum(['transform', 'filter', 'http_enrichment']).optional(),
  action_config: z.record(z.any()).optional(),
  is_active: z.boolean().optional(),
});

const createSubscriberSchema = z.object({
  url: z.string().url(),
  secret: z.string().optional(),
});

router.get('/', async (_req, res, next) => {
  try {
    const pipelines = await listPipelines();
    res.json({ data: pipelines });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const input = createPipelineSchema.parse(req.body);
    const pipeline = await createPipeline(input);
    res.status(201).json({ data: pipeline });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const pipeline = await getPipelineById(req.params.id);
    if (!pipeline) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Pipeline not found' });
      return;
    }
    res.json({ data: pipeline });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const input = updatePipelineSchema.parse(req.body);
    const pipeline = await updatePipeline(req.params.id, input);
    if (!pipeline) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Pipeline not found' });
      return;
    }
    res.json({ data: pipeline });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const ok = await deletePipeline(req.params.id);
    if (!ok) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Pipeline not found' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get('/:id/subscribers', async (req, res, next) => {
  try {
    const subs = await listSubscribersByPipelineId(req.params.id);
    res.json({ data: subs });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/subscribers', async (req, res, next) => {
  try {
    const input = createSubscriberSchema.parse(req.body);
    const sub = await createSubscriber(req.params.id, input);
    res.status(201).json({ data: sub });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/subscribers/:subscriberId', async (req, res, next) => {
  try {
    const ok = await deleteSubscriber(req.params.subscriberId);
    if (!ok) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Subscriber not found' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
