ALTER TABLE pipelines
  ALTER COLUMN source_id SET DEFAULT gen_random_uuid();
