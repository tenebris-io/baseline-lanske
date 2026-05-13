import { Request, Response, NextFunction } from 'express';
import { validateSession } from '../db/store';

export interface AuthedRequest extends Request {
  userId: number;
}

export function sessionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = auth.slice(7);
  const userId = validateSession(token);

  if (userId === null) {
    res.status(401).json({ error: 'Invalid or expired session token' });
    return;
  }

  (req as AuthedRequest).userId = userId;
  next();
}
