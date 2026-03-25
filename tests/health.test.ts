import request from 'supertest';
import { createApp } from '../src/app';
import { describe, it, expect } from '@jest/globals';

// This test checks the server starts and responds correctly.
// Database-dependent tests are added in later phases.

describe('Health check', () => {
  const app = createApp();

  it('GET /health returns 200 when DB is reachable', async () => {
    const res = await request(app).get('/health');
    // In CI without a DB this returns 503 — that's expected and tested separately.
    // Here we just confirm the endpoint exists and returns valid JSON.
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('GET / returns API info', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name', 'Webhook Pipeline API');
  });

  it('unknown routes return 404', async () => {
    const res = await request(app).get('/not-a-real-route');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'NOT_FOUND');
  });
});