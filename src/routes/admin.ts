import { Router } from 'express';
import { clearAllTables } from '../db/clear';

const router = Router();

router.delete('/clear-all', async (_req, res, next) => {
  try {
    await clearAllTables();
    res.json({ message: 'All tables cleared successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
