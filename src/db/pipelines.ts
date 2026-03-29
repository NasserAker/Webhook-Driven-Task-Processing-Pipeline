import { desc, eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { db } from './drizzle';
import { pipelines } from './schema';
import { CreatePipelineInput, Pipeline, UpdatePipelineInput } from '../types';

function omitUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}

export async function createPipeline(input: CreatePipelineInput): Promise<Pipeline> {
  const [pipeline] = await db
    .insert(pipelines)
    .values({
      name: input.name,
      description: input.description ?? null,
      source_id: randomUUID(),
      action_type: input.action_type,
      action_config: input.action_config ?? {},
      is_active: true,
    })
    .returning();

  return pipeline as unknown as Pipeline;
}

export async function listPipelines(): Promise<Pipeline[]> {
  const rows = await db.select().from(pipelines).orderBy(desc(pipelines.created_at));
  return rows as unknown as Pipeline[];
}

export async function getPipelineById(id: string): Promise<Pipeline | null> {
  const [row] = await db.select().from(pipelines).where(eq(pipelines.id, id)).limit(1);
  return (row as unknown as Pipeline) ?? null;
}

export async function getPipelineBySourceId(sourceId: string): Promise<Pipeline | null> {
  const [row] = await db.select().from(pipelines).where(eq(pipelines.source_id, sourceId)).limit(1);
  return (row as unknown as Pipeline) ?? null;
}

export async function updatePipeline(id: string, input: UpdatePipelineInput): Promise<Pipeline | null> {
  try {
    const update = omitUndefined({
      name: input.name,
      description: input.description,
      action_type: input.action_type,
      action_config: input.action_config,
      is_active: input.is_active,
    });

    const [row] = await db.update(pipelines).set(update).where(eq(pipelines.id, id)).returning();
    return row as unknown as Pipeline;
  } catch {
    return null;
  }
}

export async function deletePipeline(id: string): Promise<boolean> {
  try {
    const res = await db.delete(pipelines).where(eq(pipelines.id, id)).returning({ id: pipelines.id });
    return res.length > 0;
  } catch {
    return false;
  }
}
