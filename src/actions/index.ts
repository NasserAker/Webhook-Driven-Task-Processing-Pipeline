import axios from 'axios';
import jsonata from 'jsonata';
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

async function runTransform(actionConfig: Record<string, unknown>, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const expression = String(actionConfig.expression ?? '$');
  const compiled = jsonata(expression);
  const result = await compiled.evaluate(payload);

  if (result && typeof result === 'object') return result as Record<string, unknown>;
  return { result };
}

async function runFilter(actionConfig: Record<string, unknown>, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const expression = String(actionConfig.expression ?? 'true');
  const compiled = jsonata(expression);
  const allowed = await compiled.evaluate(payload);

  if (!allowed) {
    return { filtered_out: true };
  }

  return payload;
}

async function runHttpEnrichment(actionConfig: Record<string, unknown>, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const url = String(actionConfig.url ?? '');
  if (!url) throw new Error('http_enrichment requires action_config.url');

  const method = String(actionConfig.method ?? 'POST').toUpperCase();
  const headers = (actionConfig.headers && typeof actionConfig.headers === 'object') ? (actionConfig.headers as Record<string, string>) : undefined;

  const res = await axios.request({
    url,
    method,
    headers,
    data: payload,
    timeout: 10_000,
    validateStatus: () => true,
  });

  return {
    ...payload,
    enrichment: {
      status: res.status,
      data: res.data,
    },
  };
}
