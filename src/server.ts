import express, { Request, Response } from 'express';
import axios from 'axios';
import { buildAuthUrl, exchangeCodeForTokens, getValidAccessToken } from './auth/dexcom';
import {
  createUser,
  saveTokens,
  getLastSuccessfulSync,
  countEgvs,
  countEvents,
  createSession,
  lookupPendingAuth,
  markPendingAuthUsed,
} from './db/store';
import { fullSync } from './sync/fullSync';
import { getDb } from './db/schema';
import apiAuthRouter from './routes/apiAuth';
import apiGlucoseRouter from './routes/apiGlucose';
import apiEventsRouter from './routes/apiEvents';
import apiSyncRouter from './routes/apiSync';

export function createApp(): express.Application {
  const app = express();
  app.use(express.json());

  // ─── Mobile API routes ────────────────────────────────────────────────────
  app.use('/api/auth', apiAuthRouter);
  app.use('/api/glucose', apiGlucoseRouter);
  app.use('/api/events', apiEventsRouter);
  app.use('/api/sync', apiSyncRouter);

  // ─── Web: redirect to Dexcom login ────────────────────────────────────────
  app.get('/auth/dexcom', (_req: Request, res: Response) => {
    res.redirect(buildAuthUrl());
  });

  // ─── OAuth callback (used by both web and mobile deep-link flows) ─────────
  app.get('/auth/dexcom/callback', async (req: Request, res: Response) => {
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;

    if (!code) {
      res.status(400).send('Missing authorization code in callback.');
      return;
    }

    // Determine if this was initiated by the mobile app
    let source = 'web';
    if (state) {
      const pending = lookupPendingAuth(state);
      if (pending) {
        source = pending.source;
        markPendingAuthUsed(state);
      }
    }

    try {
      const tokens = await exchangeCodeForTokens(code);
      const userId = createUser();
      saveTokens(userId, tokens);
      console.log(`[auth/callback] user ${userId} created (source=${source})`);

      fullSync(userId).catch((err) =>
        console.error(`[fullSync] failed for user ${userId}:`, err.message)
      );

      if (source === 'mobile') {
        const sessionToken = createSession(userId);
        res.redirect(`fiercelydiabetic://auth/callback?session=${sessionToken}`);
      } else {
        res.send(
          `<html><body>
            <h2>Connected to Dexcom!</h2>
            <p>User ID: <strong>${userId}</strong></p>
            <p>Full sync started in the background.
               Check <a href="/status/${userId}">/status/${userId}</a> in a moment.</p>
          </body></html>`
        );
      }
    } catch (err) {
      console.error('[auth/callback] error:', (err as Error).message);
      if (source === 'mobile') {
        res.redirect('fiercelydiabetic://auth/callback?error=auth_failed');
      } else {
        res.status(500).send(`Authentication failed: ${(err as Error).message}`);
      }
    }
  });

  // ─── Legacy status endpoints ───────────────────────────────────────────────
  app.get('/status/:userId', (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId)) { res.status(400).json({ error: 'Invalid userId' }); return; }
    const lastSync = getLastSuccessfulSync(userId);
    res.json({
      userId,
      lastSync: lastSync?.finished_at ?? null,
      readingsCount: countEgvs(userId),
      eventsCount: countEvents(userId),
    });
  });

  app.get('/status', (_req: Request, res: Response) => {
    const lastSync = getLastSuccessfulSync(1);
    res.json({
      userId: 1,
      lastSync: lastSync?.finished_at ?? null,
      readingsCount: countEgvs(1),
      eventsCount: countEvents(1),
    });
  });

  // ─── Dev/debug endpoints ───────────────────────────────────────────────────
  app.get('/raw-test/:userId', async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId)) { res.status(400).json({ error: 'Invalid userId' }); return; }
    try {
      const token = await getValidAccessToken(userId);
      const base = process.env.DEXCOM_BASE_URL;
      const headers = { Authorization: `Bearer ${token}` };
      const [rangeRes, egvRes, eventRes] = await Promise.all([
        axios.get(`${base}/v3/users/self/dataRange`, { headers }),
        axios.get(`${base}/v3/users/self/egvs`, { headers, params: { startDate: '2022-01-01T00:00:00', endDate: '2022-01-08T00:00:00' } }),
        axios.get(`${base}/v3/users/self/events`, { headers, params: { startDate: '2022-01-01T00:00:00', endDate: '2022-01-08T00:00:00' } }),
      ]);
      res.json({ dataRange: rangeRes.data, egvSample: egvRes.data, eventSample: eventRes.data });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        res.status(500).json({ status: err.response?.status, body: err.response?.data });
      } else {
        res.status(500).json({ error: (err as Error).message });
      }
    }
  });

  app.get('/debug/:userId', (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId)) { res.status(400).json({ error: 'Invalid userId' }); return; }
    const db = getDb();
    res.json({
      users: db.prepare('SELECT * FROM users').all(),
      syncLogs: db.prepare('SELECT * FROM sync_log WHERE user_id = ? ORDER BY id DESC LIMIT 10').all(userId),
      sessions: db.prepare('SELECT id, user_id, created_at, last_used, expires_at FROM sessions WHERE user_id = ?').all(userId),
    });
  });

  return app;
}
