import { asc, eq, and } from 'drizzle-orm';
import { db } from './drizzle';
import { delivery_attempts } from './schema';
import { DeliveryAttempt } from '../types';

export async function recordDeliveryAttempt(params: {
  jobId: string;
  subscriberId: string;
  status: 'success' | 'failed';
  statusCode: number | null;
  responseBody: string | null;
  errorMessage: string | null;
  attemptNumber: number;
  durationMs: number;
}): Promise<DeliveryAttempt> {
  const [row] = await db
    .insert(delivery_attempts)
    .values({
      job_id: params.jobId,
      subscriber_id: params.subscriberId,
      status: params.status,
      status_code: params.statusCode,
      response_body: params.responseBody,
      error_message: params.errorMessage,
      attempt_number: params.attemptNumber,
      duration_ms: params.durationMs,
    })
    .returning();

  return row as unknown as DeliveryAttempt;
}

export async function listDeliveryAttemptsByJobId(jobId: string): Promise<DeliveryAttempt[]> {
  const rows = await db
    .select()
    .from(delivery_attempts)
    .where(eq(delivery_attempts.job_id, jobId))
    .orderBy(asc(delivery_attempts.attempted_at));
  return rows as unknown as DeliveryAttempt[];
}

export async function hasSuccessfulDelivery(jobId: string, subscriberId: string): Promise<boolean> {
  const rows = await db
    .select({ id: delivery_attempts.id })
    .from(delivery_attempts)
    .where(
      and(
        eq(delivery_attempts.job_id, jobId),
        eq(delivery_attempts.subscriber_id, subscriberId),
        eq(delivery_attempts.status, 'success')
      )
    )
    .limit(1);
  return rows.length > 0;
}
