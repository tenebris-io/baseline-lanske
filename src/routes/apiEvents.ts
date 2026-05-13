import { Router, Request, Response } from 'express';
import { sessionMiddleware, AuthedRequest } from '../middleware/session';
import { getDb } from '../db/schema';

const router = Router();
router.use(sessionMiddleware);

function cutoffIso(hours: number): string {
  return new Date(Date.now() - hours * 3600 * 1000)
    .toISOString()
    .replace(/\.\d{3}Z$/, '');
}

// GET /api/events/recent?hours=24
router.get('/recent', (req: Request, res: Response) => {
  const userId = (req as AuthedRequest).userId;
  const hours = Math.min(parseInt((req.query.hours as string) ?? '24', 10), 168);
  const db = getDb();

  const rows = db
    .prepare(
      `SELECT event_id, event_type, event_subtype, value, unit, system_time
       FROM dexcom_events
       WHERE user_id = ? AND system_time >= ?
       ORDER BY system_time DESC`
    )
    .all(userId, cutoffIso(hours)) as Array<{
    event_id: string;
    event_type: string;
    event_subtype: string | null;
    value: number | null;
    unit: string | null;
    system_time: string;
  }>;

  res.json({
    events: rows.map((r) => ({
      id: r.event_id,
      eventType: r.event_type,
      eventSubType: r.event_subtype,
      value: r.value,
      unit: r.unit,
      timestamp: r.system_time,
    })),
  });
});

export default router;
