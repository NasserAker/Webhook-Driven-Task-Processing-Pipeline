import { asc, eq } from 'drizzle-orm';
import { db } from './drizzle';
import { subscribers } from './schema';
import { CreateSubscriberInput, Subscriber } from '../types';

export async function createSubscriber(pipelineId: string, input: CreateSubscriberInput): Promise<Subscriber> {
  const [row] = await db
    .insert(subscribers)
    .values({
      pipeline_id: pipelineId,
      url: input.url,
      secret: input.secret ?? null,
      is_active: true,
    })
    .returning();
  return row as unknown as Subscriber;
}

export async function listSubscribersByPipelineId(pipelineId: string): Promise<Subscriber[]> {
  const rows = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.pipeline_id, pipelineId))
    .orderBy(asc(subscribers.created_at));
  return rows as unknown as Subscriber[];
}

export async function listActiveSubscribersByPipelineId(pipelineId: string): Promise<Subscriber[]> {
  const rows = await db
    .select()
    .from(subscribers)
    .where(eq(subscribers.pipeline_id, pipelineId))
    .orderBy(asc(subscribers.created_at));

  return rows.filter((r) => r.is_active) as unknown as Subscriber[];
}

export async function getSubscriberById(id: string): Promise<Subscriber | null> {
  const [row] = await db.select().from(subscribers).where(eq(subscribers.id, id)).limit(1);
  return (row as unknown as Subscriber) ?? null;
}

export async function deleteSubscriber(id: string): Promise<boolean> {
  try {
    const res = await db.delete(subscribers).where(eq(subscribers.id, id)).returning({ id: subscribers.id });
    return res.length > 0;
  } catch {
    return false;
  }
}
