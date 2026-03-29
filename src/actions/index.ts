import { ActionType, Pipeline } from '../types';

export async function runAction(pipeline: Pipeline, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  switch (pipeline.action_type as ActionType) {
    case 'transform':
      return runTransform(pipeline.action_config, payload);
    case 'filter':
      return runFilter(pipeline.action_config, payload);
    case 'http_enrichment':
      return runHttpEnrichment(pipeline.action_config, payload);
    default:
      throw new Error(`Unsupported action_type: ${pipeline.action_type}`);
  }
}

async function runTransform(_actionConfig: Record<string, unknown>, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  return {
    ...payload,
    processed_at: new Date().toISOString(),
    event_uppercase: typeof payload.event === 'string' ? payload.event.toUpperCase() : null,
  };
}

async function runFilter(_actionConfig: Record<string, unknown>, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const amount = typeof payload.amount === 'number' ? payload.amount : 0;
  
  if (amount <= 0) {
    return { filtered_out: true, reason: 'amount must be greater than 0' };
  }

  return payload;
}

async function runHttpEnrichment(_actionConfig: Record<string, unknown>, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const multiplier = typeof _actionConfig.multiplier === 'number' ? _actionConfig.multiplier : 1.1;
  const amount = typeof payload.amount === 'number' ? payload.amount : 0;

  return {
    ...payload,
    original_amount: amount,
    calculated_amount: amount * multiplier,
    calculation_note: `Applied ${multiplier}x multiplier`,
  };
}
