import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { create, list } from '../logsController';

// Mock the EmotionLog model
vi.mock('../../models/EmotionLog', () => {
  const mockSort = vi.fn();
  const mockFind = vi.fn(() => ({ sort: mockSort }));
  const mockCreate = vi.fn();

  const EmotionLog = {
    create: mockCreate,
    find: mockFind,
    _mockSort: mockSort,
  };

  return { default: EmotionLog };
});

import EmotionLog from '../../models/EmotionLog';

function makeReq(body: Record<string, unknown> = {}): Request {
  return { body } as Request;
}

function makeRes(): { res: Response; status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> } {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const res = { status, json } as unknown as Response;
  // Allow res.status(x).json() and res.json() directly
  (res as any).json = json;
  return { res, status, json };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('logsController.create', () => {
  it('returns 201 with { id } for a valid POST body', async () => {
    const fakeId = 'abc123';
    (EmotionLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({ _id: fakeId });

    const req = makeReq({ emotion: 'happy', timestamp: '2024-01-01T00:00:00.000Z', confidence: 0.9 });
    const { res, status, json } = makeRes();

    await create(req, res);

    expect(status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith({ id: fakeId });
  });

  it('returns 400 with error message when emotion is missing', async () => {
    const req = makeReq({ timestamp: '2024-01-01T00:00:00.000Z' });
    const { res, status, json } = makeRes();

    await create(req, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
    expect((EmotionLog.create as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  it('returns 400 with error message when timestamp is missing', async () => {
    const req = makeReq({ emotion: 'happy' });
    const { res, status, json } = makeRes();

    await create(req, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
    expect((EmotionLog.create as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });
});

describe('logsController.list', () => {
  it('returns array sorted descending by timestamp', async () => {
    const fakeLogs = [
      { emotion: 'happy', timestamp: '2024-01-02T00:00:00.000Z' },
      { emotion: 'sad', timestamp: '2024-01-01T00:00:00.000Z' },
    ];

    const mockSort = (EmotionLog as any)._mockSort;
    mockSort.mockResolvedValue(fakeLogs);

    const req = {} as Request;
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const res = { status, json } as unknown as Response;
    (res as any).json = json;

    await list(req, res);

    expect((EmotionLog.find as ReturnType<typeof vi.fn>)).toHaveBeenCalled();
    expect(mockSort).toHaveBeenCalledWith({ timestamp: -1 });
    expect(json).toHaveBeenCalledWith(fakeLogs);
  });
});
