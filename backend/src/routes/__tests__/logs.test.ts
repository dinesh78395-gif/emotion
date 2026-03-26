import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock the controller before importing the router
vi.mock('../../controllers/logsController', () => ({
  create: vi.fn((_req, res) => res.status(201).json({ id: 'mock-id' })),
  list: vi.fn((_req, res) => res.status(200).json([])),
}));

import logsRouter from '../logs';
import * as logsController from '../../controllers/logsController';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/', logsRouter);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Reset mock implementations after clearAllMocks
  (logsController.create as ReturnType<typeof vi.fn>).mockImplementation((_req, res) =>
    res.status(201).json({ id: 'mock-id' })
  );
  (logsController.list as ReturnType<typeof vi.fn>).mockImplementation((_req, res) =>
    res.status(200).json([])
  );
});

describe('logs router — route wiring', () => {
  it('POST /log calls the create controller', async () => {
    const app = buildApp();
    await request(app)
      .post('/log')
      .send({ emotion: 'happy', timestamp: '2024-01-01T00:00:00.000Z' });

    expect(logsController.create).toHaveBeenCalledTimes(1);
  });

  it('POST /log returns 201 from the create controller', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/log')
      .send({ emotion: 'happy', timestamp: '2024-01-01T00:00:00.000Z' });

    expect(res.status).toBe(201);
  });

  it('GET /logs calls the list controller', async () => {
    const app = buildApp();
    await request(app).get('/logs');

    expect(logsController.list).toHaveBeenCalledTimes(1);
  });

  it('GET /logs returns 200 from the list controller', async () => {
    const app = buildApp();
    const res = await request(app).get('/logs');

    expect(res.status).toBe(200);
  });
});

describe('logs router — 404 on unknown paths', () => {
  it('GET /unknown returns 404', async () => {
    const app = buildApp();
    const res = await request(app).get('/unknown');

    expect(res.status).toBe(404);
  });

  it('DELETE /log returns 404', async () => {
    const app = buildApp();
    const res = await request(app).delete('/log');

    expect(res.status).toBe(404);
  });
});
