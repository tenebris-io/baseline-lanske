import { Router, Request, Response } from 'express';
import { sessionMiddleware, AuthedRequest } from '../middleware/session';
import { getDb } from '../db/schema';

const router = Router();
router.use(sessionMiddleware);

function parseSystemTime(t: string): Date {
  return new Date(t.endsWith('Z') ? t : t + 'Z');
}

function cutoffIso(hours: number): string {
  return new Date(Date.now() - hours * 3600 * 1000)
    .toISOString()
    .replace(/\.\d{3}Z$/, '');
}

function computeStats(values: number[]) {
  if (values.length === 0) {
    return { timeInRange: 0, timeLow: 0, timeHigh: 0, average: 0, gmi: 0 };
  }
  const total = values.length;
  const inRange = values.filter((v) => v >= 70 && v <= 180).length;
  const low = values.filter((v) => v < 70).length;
  const high = values.filter((v) => v > 180).length;
  const average = values.reduce((s, v) => s + v, 0) / total;
  const gmi = parseFloat((3.31 + 0.02392 * average).toFixed(2));
  return {
    timeInRange: Math.round((inRange / total) * 100),
    timeLow: Math.round((low / total) * 100),
    timeHigh: Math.round((high / total) * 100),
    average: Math.round(average),
    gmi,
  };
}

// GET /api/glucose/current
router.get('/current', (req: Request, res: Response) => {
  const userId = (req as AuthedRequest).userId;
  const db = getDb();

  const row = db
    .prepare(
      `SELECT value, trend, trend_rate, status, system_time
       FROM glucose_readings WHERE user_id = ? ORDER BY system_time DESC LIMIT 1`
    )
    .get(userId) as
    | { value: number; trend: string; trend_rate: number; status: string | null; system_time: string }
    | undefined;

  if (!row) {
    res.status(404).json({ error: 'No glucose readings found' });
    return;
  }

  const minutesAgo = Math.floor(
    (Date.now() - parseSystemTime(row.system_time).getTime()) / 60000
  );

  res.json({
    value: row.value,
    trend: row.trend,
    trendRate: row.trend_rate,
    status: row.status,
    timestamp: row.system_time,
    minutesAgo,
  });
});

// GET /api/glucose/history?hours=24
router.get('/history', (req: Request, res: Response) => {
  const userId = (req as AuthedRequest).userId;
  const hours = Math.min(parseInt((req.query.hours as string) ?? '24', 10), 168);
  const db = getDb();

  const rows = db
    .prepare(
      `SELECT value, trend, trend_rate, status, system_time
       FROM glucose_readings
       WHERE user_id = ? AND system_time >= ?
       ORDER BY system_time ASC`
    )
    .all(userId, cutoffIso(hours)) as Array<{
    value: number;
    trend: string;
    trend_rate: number;
    status: string | null;
    system_time: string;
  }>;

  const readings = rows.map((r) => ({
    value: r.value,
    trend: r.trend,
    trendRate: r.trend_rate,
    status: r.status,
    timestamp: r.system_time,
  }));

  const stats = computeStats(rows.map((r) => r.value));

  res.json({ readings, unit: 'mg/dL', stats });
});

export default router;
