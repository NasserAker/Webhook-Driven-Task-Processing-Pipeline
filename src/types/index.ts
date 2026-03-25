// ─── Pipeline ──────────────────────────────────────────────────────────────────

export type ActionType = 'transform' | 'filter' | 'http_enrichment';

export interface Pipeline {
  id: string;
  name: string;
  description: string | null;
  source_id: string;       // UUID used in the ingest URL: /webhooks/:source_id
  action_type: ActionType;
  action_config: Record<string, unknown>;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreatePipelineInput {
  name: string;
  description?: string;
  action_type: ActionType;
  action_config: Record<string, unknown>;
}

export interface UpdatePipelineInput {
  name?: string;
  description?: string;
  action_type?: ActionType;
  action_config?: Record<string, unknown>;
  is_active?: boolean;
}

// ─── Subscriber ────────────────────────────────────────────────────────────────

export interface Subscriber {
  id: string;
  pipeline_id: string;
  url: string;
  secret: string | null;   // HMAC secret for signing delivery payloads
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSubscriberInput {
  url: string;
  secret?: string;
}

// ─── Job ───────────────────────────────────────────────────────────────────────

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'dead';

export interface Job {
  id: string;
  pipeline_id: string;
  status: JobStatus;
  payload: Record<string, unknown>;       // Raw incoming webhook payload
  processed_payload: Record<string, unknown> | null;  // After action runs
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  scheduled_at: Date;     // When it becomes eligible for pickup
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface JobWithPipeline extends Job {
  pipeline: Pipeline;
}

// ─── Delivery Attempt ─────────────────────────────────────────────────────────

export type DeliveryStatus = 'success' | 'failed';

export interface DeliveryAttempt {
  id: string;
  job_id: string;
  subscriber_id: string;
  status: DeliveryStatus;
  status_code: number | null;
  response_body: string | null;
  error_message: string | null;
  attempt_number: number;
  duration_ms: number;
  attempted_at: Date;
}

// ─── Webhook ingestion ─────────────────────────────────────────────────────────

export interface WebhookIngestionResult {
  job_id: string;
  pipeline_id: string;
  queued_at: string;
}

// ─── API responses ─────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}

export interface PaginationMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ─── Config ────────────────────────────────────────────────────────────────────

export interface AppConfig {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  redisUrl: string;
  worker: {
    pollIntervalMs: number;
    concurrency: number;
  };
  job: {
    maxAttempts: number;
    retryBaseDelayMs: number;
  };
  security: {
    apiKeySecret: string;
    webhookSignatureSecret: string;
  };
  delivery: {
    timeoutMs: number;
  };
}