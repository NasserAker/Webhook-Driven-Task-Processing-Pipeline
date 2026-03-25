import { desc, eq, sql } from 'drizzle-orm';
import { db } from './drizzle';
import { jobs, pipelines } from './schema';
import { Job, JobStatus, JobWithPipeline, Pipeline } from '../types';

export async function createJob(params: {
  pipelineId: string;
  payload: Record<string, unknown>;
  maxAttempts: number;
}): Promise<Job> {
  const [row] = await db
    .insert(jobs)
    .values({
      pipeline_id: params.pipelineId,
      status: 'pending',
      payload: params.payload ?? {},
      max_attempts: params.maxAttempts,
    })
    .returning();

  return row as unknown as Job;
}

export async function getJobById(id: string): Promise<Job | null> {
  const [row] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  return (row as unknown as Job) ?? null;
}

export async function getJobWithPipelineById(id: string): Promise<JobWithPipeline | null> {
  const rows = await db
    .select({
      job: jobs,
      pipeline: pipelines,
    })
    .from(jobs)
    .innerJoin(pipelines, eq(jobs.pipeline_id, pipelines.id))
    .where(eq(jobs.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const jobRow = row.job as unknown as Job;
  const pipelineRow = row.pipeline as unknown as Pipeline;
  return { ...jobRow, pipeline: pipelineRow } as JobWithPipeline;
}

export async function listJobsByPipelineId(pipelineId: string, limit: number): Promise<Job[]> {
  const rows = await db
    .select()
    .from(jobs)
    .where(eq(jobs.pipeline_id, pipelineId))
    .orderBy(desc(jobs.created_at))
    .limit(limit);
  return rows as unknown as Job[];
}

export async function markJobProcessing(id: string): Promise<void> {
  await db
    .update(jobs)
    .set({
      status: 'processing',
      started_at: new Date(),
    })
    .where(eq(jobs.id, id));
}

export async function markJobCompleted(id: string, processedPayload: Record<string, unknown>): Promise<void> {
  await db
    .update(jobs)
    .set({
      status: 'completed',
      processed_payload: processedPayload ?? {},
      completed_at: new Date(),
    })
    .where(eq(jobs.id, id));
}

export async function markJobFailedAttempt(id: string, attempts: number, error: string): Promise<void> {
  await db
    .update(jobs)
    .set({
      status: 'failed',
      attempts,
      last_error: error,
    })
    .where(eq(jobs.id, id));
}

export async function markJobDead(id: string, attempts: number, error: string): Promise<void> {
  await db
    .update(jobs)
    .set({
      status: 'dead',
      attempts,
      last_error: error,
      completed_at: new Date(),
    })
    .where(eq(jobs.id, id));
}

export async function bumpJobAttempts(id: string): Promise<number> {
  const [row] = await db
    .update(jobs)
    .set({ attempts: sql`${jobs.attempts} + 1` })
    .where(eq(jobs.id, id))
    .returning({ attempts: jobs.attempts });

  return row?.attempts ?? 0;
}

export async function setJobStatus(id: string, status: JobStatus): Promise<void> {
  await db.update(jobs).set({ status }).where(eq(jobs.id, id));
}
