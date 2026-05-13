import express, { Request, Response } from 'express';
import axios from 'axios';
import { buildAuthUrl, exchangeCodeForTokens, getValidAccessToken } from './auth/dexcom';
import { createUser, saveTokens, getLastSuccessfulSync, countEgvs, countEvents } from './db/store';
import { fullSync } from './sync/fullSync';
import { getDb } from './db/schema';

export function createApp(): express.Application {
  const app = express();

  // ─── Step 1: redirect to Dexcom login ─────────────────────────────────────
  app.get('/auth/dexcom', (_req: Request, res: Response) => {
    const url = buildAuthUrl();
    console.log('[auth] redirecting to Dexcom authorization URL');
    res.redirect(url);
  });

  // ─── Step 2: handle OAuth callback ────────────────────────────────────────
  app.get('/auth/dexcom/callback', async (req: Request, res: Response) => {
    const code = req.query.code as string | undefined;

    if (!code) {
      res.status(400).send('Missing authorization code in callback.');
      return;
    }

    try {
      console.log('[auth/callback] exchanging code for tokens');
      const tokens = await exchangeCodeForTokens(code);

      const userId = createUser();
      saveTokens(userId, tokens);
      console.log(`[auth/callback] user ${userId} created and tokens saved`);

      // Kick off a full sync in the background — don't await so the browser
      // gets a response immediately
      res.send(
        `<html><body>
          <h2>Connected to Dexcom!</h2>
          <p>User ID: <strong>${userId}</strong></p>
          <p>Full sync started in the background.
             Check <a href="/status/${userId}">/status/${userId}</a> in a moment.</p>
        </body></html>`
      );

      fullSync(userId).catch((err) => {
        console.error(`[fullSync] background sync failed for user ${userId}:`, err.message);
      });
    } catch (err) {
      console.error('[auth/callback] error:', (err as Error).message);
      res.status(500).send(`Authentication failed: ${(err as Error).message}`);
    }
  });

  // ─── Status endpoint ───────────────────────────────────────────────────────
  app.get('/status/:userId', (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId)) {
      res.status(400).json({ error: 'Invalid userId' });
      return;
    }

    const lastSync = getLastSuccessfulSync(userId);
    const readingsCount = countEgvs(userId);
    const eventsCount = countEvents(userId);

    res.json({
      userId,
      lastSync: lastSync?.finished_at ?? null,
      lastSyncType: lastSync?.sync_type ?? null,
      readingsCount,
      eventsCount,
    });
  });

  // ─── Raw API probe: shows unmodified Dexcom responses ────────────────────
  app.get('/raw-test/:userId', async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId)) { res.status(400).json({ error: 'Invalid userId' }); return; }

    try {
      const token = await getValidAccessToken(userId);
      const base = process.env.DEXCOM_BASE_URL;
      const headers = { Authorization: `Bearer ${token}` };

      const [rangeRes, egvRes, eventRes] = await Promise.all([
        axios.get(`${base}/v3/users/self/dataRange`, { headers }),
        axios.get(`${base}/v3/users/self/egvs`, {
          headers,
          params: { startDate: '2022-01-01T00:00:00', endDate: '2022-01-08T00:00:00' },
        }),
        axios.get(`${base}/v3/users/self/events`, {
          headers,
          params: { startDate: '2022-01-01T00:00:00', endDate: '2022-01-08T00:00:00' },
        }),
      ]);

      res.json({
        dataRange: rangeRes.data,
        egvSample: egvRes.data,
        eventSample: eventRes.data,
      });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        res.status(500).json({ status: err.response?.status, body: err.response?.data });
      } else {
        res.status(500).json({ error: (err as Error).message });
      }
    }
  });

  // ─── Debug: inspect sync state and raw API response ──────────────────────
  app.get('/debug/:userId', (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId)) {
      res.status(400).json({ error: 'Invalid userId' });
      return;
    }

    const db = getDb();

    const users = db.prepare('SELECT * FROM users').all();

    const syncLogs = db
      .prepare(`SELECT * FROM sync_log WHERE user_id = ? ORDER BY id DESC LIMIT 10`)
      .all(userId) as Record<string, unknown>[];

    const egvRows = db
      .prepare(
        `SELECT id, system_time, display_time, value, trend, trend_rate, status, raw_json
         FROM glucose_readings WHERE user_id = ? ORDER BY id DESC LIMIT 3`
      )
      .all(userId) as Record<string, unknown>[];

    const eventRows = db
      .prepare(
        `SELECT id, event_type, event_subtype, value, unit, system_time, raw_json
         FROM dexcom_events WHERE user_id = ? ORDER BY id DESC LIMIT 3`
      )
      .all(userId) as Record<string, unknown>[];

    res.json({
      users,
      syncLogs,
      egvSample: egvRows.map((r) => ({
        storedColumns: r,
        rawApiResponse: JSON.parse(r.raw_json as string),
      })),
      eventSample: eventRows.map((r) => ({
        storedColumns: r,
        rawApiResponse: JSON.parse(r.raw_json as string),
      })),
    });
  });

  // Generic status (uses userId=1 as default for single-user dev flow)
  app.get('/status', (req: Request, res: Response) => {
    const lastSync = getLastSuccessfulSync(1);
    const readingsCount = countEgvs(1);
    const eventsCount = countEvents(1);

    res.json({
      userId: 1,
      lastSync: lastSync?.finished_at ?? null,
      lastSyncType: lastSync?.sync_type ?? null,
      readingsCount,
      eventsCount,
    });
  });

  return app;
}
