import { boolean, index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const pipelines = pgTable(
  'pipelines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    description: text('description'),
    source_id: uuid('source_id').notNull().unique().defaultRandom(),
    action_type: text('action_type').notNull(),
    action_config: jsonb('action_config').$type<Record<string, unknown>>().notNull().default({}),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    idx_source_id: index('idx_pipelines_source_id').on(t.source_id),
  })
);

export const subscribers = pgTable(
  'subscribers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pipeline_id: uuid('pipeline_id')
      .notNull()
      .references(() => pipelines.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    secret: text('secret'),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    idx_pipeline_id: index('idx_subscribers_pipeline_id').on(t.pipeline_id),
  })
);

export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pipeline_id: uuid('pipeline_id')
      .notNull()
      .references(() => pipelines.id, { onDelete: 'cascade' }),
    status: text('status').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    processed_payload: jsonb('processed_payload').$type<Record<string, unknown> | null>(),
    attempts: integer('attempts').notNull().default(0),
    max_attempts: integer('max_attempts').notNull(),
    last_error: text('last_error'),
    scheduled_at: timestamp('scheduled_at', { withTimezone: true }).notNull().defaultNow(),
    started_at: timestamp('started_at', { withTimezone: true }),
    completed_at: timestamp('completed_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    idx_pipeline_id_created_at: index('idx_jobs_pipeline_id_created_at').on(t.pipeline_id, t.created_at),
    idx_status_scheduled_at: index('idx_jobs_status_scheduled_at').on(t.status, t.scheduled_at),
  })
);

export const delivery_attempts = pgTable(
  'delivery_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    job_id: uuid('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    subscriber_id: uuid('subscriber_id')
      .notNull()
      .references(() => subscribers.id, { onDelete: 'cascade' }),
    status: text('status').notNull(),
    status_code: integer('status_code'),
    response_body: text('response_body'),
    error_message: text('error_message'),
    attempt_number: integer('attempt_number').notNull(),
    duration_ms: integer('duration_ms').notNull(),
    attempted_at: timestamp('attempted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    idx_job_id: index('idx_delivery_attempts_job_id').on(t.job_id),
    idx_subscriber_id: index('idx_delivery_attempts_subscriber_id').on(t.subscriber_id),
  })
);
