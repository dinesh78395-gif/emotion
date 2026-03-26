import { Request, Response } from 'express';
import EmotionLog from '../models/EmotionLog';

export async function create(req: Request, res: Response): Promise<void> {
  const { emotion, timestamp } = req.body;

  if (!emotion || !timestamp) {
    res.status(400).json({ error: 'Missing required fields: emotion, timestamp' });
    return;
  }

  const doc = await EmotionLog.create({
    emotion,
    confidence: req.body.confidence,
    timestamp,
  });

  res.status(201).json({ id: doc._id });
}

export async function list(_req: Request, res: Response): Promise<void> {
  const logs = await EmotionLog.find().sort({ timestamp: -1 });
  res.status(200).json(logs);
}
