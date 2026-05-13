import { Router, Request, Response } from 'express';
import { buildAuthUrl } from '../auth/dexcom';
import {
  createPendingAuth,
  deleteSession,
  validateSession,
} from '../db/store';
import { getDb } from '../db/schema';
import { sessionMiddleware, AuthedRequest } from '../middleware/session';

const router = Router();

// POST /api/auth/initiate — mobile calls this to start the OAuth flow
router.post('/initiate', (_req: Request, res: Response) => {
  const state = createPendingAuth('mobile');
  const authUrl = buildAuthUrl(state);
  res.json({ authUrl, state });
});

// GET /api/auth/status — check if this session is still connected
router.get('/status', sessionMiddleware, (req: Request, res: Response) => {
  const userId = (req as AuthedRequest).userId;
  const db = getDb();

  const token = db
    .prepare('SELECT expires_at, updated_at FROM dexcom_tokens WHERE user_id = ?')
    .get(userId) as { expires_at: number; updated_at: string } | undefined;

  const sync = db
    .prepare(
      `SELECT finished_at FROM sync_log
       WHERE user_id = ? AND error IS NULL AND finished_at IS NOT NULL
       ORDER BY finished_at DESC LIMIT 1`
    )
    .get(userId) as { finished_at: string } | undefined;

  res.json({
    connected: !!token && token.expires_at > Date.now(),
    lastSync: sync?.finished_at ?? null,
    userId,
  });
});

// POST /api/auth/logout
router.post('/logout', sessionMiddleware, (req: Request, res: Response) => {
  const token = req.headers.authorization!.slice(7);
  deleteSession(token);
  res.json({ success: true });
});

// GET /api/auth/validate — lightweight token check used by the app on startup
router.get('/validate', (req: Request, res: Response) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    res.json({ valid: false });
    return;
  }
  const userId = validateSession(auth.slice(7));
  res.json({ valid: userId !== null, userId });
});

export default router;
