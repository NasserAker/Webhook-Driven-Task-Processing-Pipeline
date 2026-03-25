import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { checkDatabaseConnection } from './db/health';
import apiRouter from './routes';

export function createApp() {
  const app = express();

  // ─── Security middleware ──────────────────────────────────────────────────
  app.use(helmet());
  app.use(cors());

  // Parse JSON bodies. Raw body is preserved on /webhooks/* for signature
  // verification (added in the webhooks router).
  app.use(express.json({ limit: '1mb' }));

  // ─── Health check ─────────────────────────────────────────────────────────
  // Intentionally unauthenticated — load balancers and Docker need this.
  app.get('/health', async (_req, res) => {
    try {
      await checkDatabaseConnection();
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime_seconds: Math.floor(process.uptime()),
      });
    } catch (_err) {
      res.status(503).json({
        status: 'error',
        error: 'Database unreachable',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // ─── API routes (mounted in phase 3) ─────────────────────────────────────
  // Placeholder so the server starts cleanly right now.
  app.get('/', (_req, res) => {
    res.json({
      name: 'Webhook Pipeline API',
      version: '1.0.0',
      docs: 'See README.md for API documentation',
    });
  });

  app.use('/api', apiRouter);

  // ─── 404 handler ─────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Route not found' });
  });

  // ─── Global error handler ─────────────────────────────────────────────────
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[api] Unhandled error:', err);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    });
  });

  return app;
}