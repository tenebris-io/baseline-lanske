import { Router, Request, Response } from 'express';
import { sessionMiddleware, AuthedRequest } from '../middleware/session';
import { incrementalSync } from '../sync/incrementalSync';

const router = Router();

router.post('/trigger', sessionMiddleware, (req: Request, res: Response) => {
  const userId = (req as AuthedRequest).userId;

  incrementalSync(userId).catch((err) =>
    console.error(`[sync/trigger] failed for user ${userId}:`, err.message)
  );

  res.json({ status: 'started' });
});

export default router;
