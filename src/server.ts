import express, { Request, Response } from 'express';
import { buildAuthUrl, exchangeCodeForTokens } from './auth/dexcom';
import { createUser, saveTokens, getLastSuccessfulSync, countEgvs, countEvents } from './db/store';
import { fullSync } from './sync/fullSync';

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
