import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { config } from '../config';

// Use a fresh pool just for migrations — we don't want the shared pool
// initialised before migrations have run.
async function runMigrations(): Promise<void> {
  const migrationPool = new Pool({ connectionString: config.databaseUrl });

  try {
    // Ensure the migrations tracking table exists
    await migrationPool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id         SERIAL PRIMARY KEY,
        filename   TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Collect .sql files in numeric order
    const migrationsDir = path.join(__dirname, '../../migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort(); // Lexicographic sort on "001_..., 002_..." gives correct order

    // Find already-applied migrations
    const { rows } = await migrationPool.query<{ filename: string }>(
      'SELECT filename FROM _migrations'
    );
    const applied = new Set(rows.map((r) => r.filename));

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`[migrate] ✓ ${file} (already applied)`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      const client = await migrationPool.connect();

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`[migrate] ✓ ${file} (applied)`);
        count++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[migrate] ✗ ${file} failed:`, err);
        throw err;
      } finally {
        client.release();
      }
    }

    if (count === 0) {
      console.log('[migrate] All migrations already applied — nothing to do.');
    } else {
      console.log(`[migrate] Applied ${count} migration(s).`);
    }
  } finally {
    await migrationPool.end();
  }
}

// Allow running directly: ts-node src/db/migrate.ts
runMigrations().catch((err) => {
  console.error('[migrate] Fatal error:', err);
  process.exit(1);
});

export default runMigrations;