import { describe, it, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import request from 'supertest';

// Mock mongoose and EmotionLog model before importing the app
vi.mock('mongoose', async () => {
  const actual = await vi.importActual<typeof import('mongoose')>('mongoose');
  return {
    ...actual,
    connect: vi.fn().mockResolvedValue(undefined),
    connection: { on: vi.fn(), once: vi.fn() },
  };
});

vi.mock('../models/EmotionLog', () => {
  const mockSort = vi.fn();
  const mockFind = vi.fn(() => ({ sort: mockSort }));
  const mockCreate = vi.fn();

  return {
    default: {
      create: mockCreate,
      find: mockFind,
      _mockSort: mockSort,
    },
  };
});

import { app } from '../server';
import EmotionLog from '../models/EmotionLog';

const emotionLabels = [
  'happy', 'sad', 'angry', 'surprised', 'neutral', 'fearful', 'disgusted',
] as const;

beforeEach(() => {
  vi.clearAllMocks();
  // Default: create resolves with a fake doc
  (EmotionLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({ _id: 'fake-id' });
  // Default: find().sort() resolves with empty array
  (EmotionLog as any)._mockSort.mockResolvedValue([]);
});

afterEach(() => {
  vi.clearAllMocks();
});

// Feature: beauty-insight-studio, Property 6: Server returns 201 for all valid POST /log requests
describe('Property 6: Server returns 201 for all valid POST /log requests', () => {
  it('responds with 201 for any valid emotion and ISO 8601 timestamp', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...emotionLabels),
        fc.date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') }),
        async (emotion, date) => {
          const timestamp = date.toISOString();
          const res = await request(app)
            .post('/log')
            .send({ emotion, timestamp });

          return res.status === 201;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: beauty-insight-studio, Property 7: Server returns 400 for all incomplete POST /log requests
describe('Property 7: Server returns 400 for all incomplete POST /log requests', () => {
  it('responds with 400 when emotion, timestamp, or both are missing', async () => {
    // Arbitrary that produces a body missing at least one required field
    const incompleteBodyArb = fc.oneof(
      // missing emotion only
      fc.record({
        timestamp: fc.date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') })
          .map(d => d.toISOString()),
      }),
      // missing timestamp only
      fc.record({
        emotion: fc.constantFrom(...emotionLabels),
      }),
      // missing both
      fc.constant({})
    );

    await fc.assert(
      fc.asyncProperty(incompleteBodyArb, async (body) => {
        const res = await request(app)
          .post('/log')
          .send(body);

        return res.status === 400;
      }),
      { numRuns: 100 }
    );
  });
});

// Feature: beauty-insight-studio, Property 8: GET /logs returns logs in descending timestamp order
describe('Property 8: GET /logs returns logs in descending timestamp order', () => {
  it('returns logs ordered by timestamp descending for any set of logs', async () => {
    const logArb = fc.record({
      _id: fc.hexaString({ minLength: 24, maxLength: 24 }),
      emotion: fc.constantFrom(...emotionLabels),
      confidence: fc.float({ min: 0, max: 1 }),
      timestamp: fc.date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') })
        .map(d => d.toISOString()),
    });

    await fc.assert(
      fc.asyncProperty(
        fc.array(logArb, { minLength: 0, maxLength: 20 }),
        async (logs) => {
          // Sort the logs descending by timestamp (simulating what the DB would return)
          const sorted = [...logs].sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );

          // Mock the DB to return the sorted list
          (EmotionLog as any)._mockSort.mockResolvedValue(sorted);

          const res = await request(app).get('/logs');

          if (res.status !== 200) return false;

          const body: Array<{ timestamp: string }> = res.body;

          // Verify descending order
          for (let i = 0; i < body.length - 1; i++) {
            const curr = new Date(body[i].timestamp).getTime();
            const next = new Date(body[i + 1].timestamp).getTime();
            if (curr < next) return false;
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: beauty-insight-studio, Property 13: CORS header present on all API responses
describe('Property 13: CORS header present on all API responses', () => {
  it('includes Access-Control-Allow-Origin header on all responses', async () => {
    const httpMethodArb = fc.constantFrom('GET', 'POST');

    await fc.assert(
      fc.asyncProperty(httpMethodArb, async (method) => {
        let res: request.Response;

        if (method === 'POST') {
          res = await request(app)
            .post('/log')
            .set('Origin', 'http://localhost:5173')
            .send({ emotion: 'happy', timestamp: new Date().toISOString() });
        } else {
          res = await request(app)
            .get('/logs')
            .set('Origin', 'http://localhost:5173');
        }

        return 'access-control-allow-origin' in res.headers;
      }),
      { numRuns: 100 }
    );
  });
});
