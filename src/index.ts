import { createApp } from './app';
import { config } from './config';
import { pool } from './db/pool';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`[api] Server running on port ${config.port} (${config.nodeEnv})`);
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────
// Allows in-flight requests to complete before the process exits.
// Docker sends SIGTERM when stopping a container.

async function shutdown(signal: string): Promise<void> {
  console.log(`[api] Received ${signal} — shutting down gracefully...`);

  server.close(async () => {
    console.log('[api] HTTP server closed.');
    await pool.end();
    console.log('[api] Database pool closed.');
    process.exit(0);
  });

  // Force exit if graceful shutdown takes too long
  setTimeout(() => {
    console.error('[api] Graceful shutdown timed out — forcing exit.');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));