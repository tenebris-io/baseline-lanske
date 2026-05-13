import crypto from 'crypto';
import { getDb } from './schema';
import type { TokenSet } from '../auth/dexcom';

// ─── Users ────────────────────────────────────────────────────────────────────

export function createUser(): number {
  const db = getDb();
  const result = db.prepare('INSERT INTO users DEFAULT VALUES').run();
  return Number(result.lastInsertRowid);
}

// ─── Tokens ───────────────────────────────────────────────────────────────────

export function saveTokens(userId: number, tokens: TokenSet): void {
  const db = getDb();
  const existing = db
    .prepare('SELECT id FROM dexcom_tokens WHERE user_id = ?')
    .get(userId);

  if (existing) {
    db.prepare(
      `UPDATE dexcom_tokens
       SET access_token = ?, refresh_token = ?, expires_at = ?, updated_at = datetime('now')
       WHERE user_id = ?`
    ).run(tokens.accessToken, tokens.refreshToken, tokens.expiresAt, userId);
  } else {
    db.prepare(
      `INSERT INTO dexcom_tokens (user_id, access_token, refresh_token, expires_at)
       VALUES (?, ?, ?, ?)`
    ).run(userId, tokens.accessToken, tokens.refreshToken, tokens.expiresAt);
  }
}

export function markUserNeedsReauth(userId: number): void {
  const db = getDb();
  db.prepare('UPDATE dexcom_tokens SET expires_at = 0 WHERE user_id = ?').run(userId);
}

// ─── Glucose readings ─────────────────────────────────────────────────────────

export interface EgvRow {
  systemTime: string;
  displayTime: string;
  value: number;
  trend: string | null;
  trendRate: number | null;
  status: string | null;
  rawJson: string;
}

export function upsertEgvs(userId: number, rows: EgvRow[]): number {
  if (rows.length === 0) return 0;

  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO glucose_readings
       (user_id, system_time, display_time, value, trend, trend_rate, status, raw_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, system_time) DO UPDATE SET
       display_time = excluded.display_time,
       value        = excluded.value,
       trend        = excluded.trend,
       trend_rate   = excluded.trend_rate,
       status       = excluded.status,
       raw_json     = excluded.raw_json`
  );

  db.exec('BEGIN');
  try {
    for (const r of rows) {
      stmt.run(
        userId,
        r.systemTime ?? null,
        r.displayTime ?? null,
        r.value ?? null,
        r.trend ?? null,
        r.trendRate ?? null,
        r.status ?? null,
        r.rawJson ?? null
      );
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return rows.length;
}

export function getLastEgvTime(userId: number): string | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT system_time FROM glucose_readings
       WHERE user_id = ? ORDER BY system_time DESC LIMIT 1`
    )
    .get(userId) as { system_time: string } | undefined;
  return row?.system_time ?? null;
}

export function countEgvs(userId: number): number {
  const db = getDb();
  const row = db
    .prepare('SELECT COUNT(*) as cnt FROM glucose_readings WHERE user_id = ?')
    .get(userId) as { cnt: number };
  return row.cnt;
}

// ─── Events ───────────────────────────────────────────────────────────────────

export interface EventRow {
  eventId: string;
  eventType: string;
  eventSubtype: string | null;
  value: number | null;
  unit: string | null;
  systemTime: string;
  displayTime: string;
  rawJson: string;
}

export function upsertEvents(userId: number, rows: EventRow[]): number {
  if (rows.length === 0) return 0;

  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO dexcom_events
       (user_id, event_id, event_type, event_subtype, value, unit, system_time, display_time, raw_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, event_id) DO UPDATE SET
       event_type    = excluded.event_type,
       event_subtype = excluded.event_subtype,
       value         = excluded.value,
       unit          = excluded.unit,
       system_time   = excluded.system_time,
       display_time  = excluded.display_time,
       raw_json      = excluded.raw_json`
  );

  db.exec('BEGIN');
  try {
    for (const r of rows) {
      stmt.run(
        userId,
        r.eventId ?? null,
        r.eventType ?? null,
        r.eventSubtype ?? null,
        r.value ?? null,
        r.unit ?? null,
        r.systemTime ?? null,
        r.displayTime ?? null,
        r.rawJson ?? null
      );
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return rows.length;
}

export function countEvents(userId: number): number {
  const db = getDb();
  const row = db
    .prepare('SELECT COUNT(*) as cnt FROM dexcom_events WHERE user_id = ?')
    .get(userId) as { cnt: number };
  return row.cnt;
}

// ─── Sync log ─────────────────────────────────────────────────────────────────

export function startSyncLog(
  userId: number,
  syncType: 'full' | 'incremental'
): number {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO sync_log (user_id, sync_type, started_at)
       VALUES (?, ?, datetime('now'))`
    )
    .run(userId, syncType);
  return Number(result.lastInsertRowid);
}

export function finishSyncLog(
  syncId: number,
  egvsCount: number,
  eventsCount: number,
  error?: string
): void {
  const db = getDb();
  db.prepare(
    `UPDATE sync_log
     SET finished_at = datetime('now'), egvs_count = ?, events_count = ?, error = ?
     WHERE id = ?`
  ).run(egvsCount, eventsCount, error ?? null, syncId);
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export function createSession(userId: number): string {
  const db = getDb();
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(
    `INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)`
  ).run(userId, token, expiresAt);
  return token;
}

export function validateSession(token: string): number | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT user_id, expires_at FROM sessions WHERE token = ?`)
    .get(token) as { user_id: number; expires_at: string } | undefined;

  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) return null;

  db.prepare(`UPDATE sessions SET last_used = datetime('now') WHERE token = ?`).run(token);
  return Number(row.user_id);
}

export function deleteSession(token: string): void {
  getDb().prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

// ─── Pending auth ─────────────────────────────────────────────────────────────

export function createPendingAuth(source: 'mobile' | 'web'): string {
  const db = getDb();
  const stateToken = crypto.randomBytes(16).toString('hex');
  db.prepare(`INSERT INTO pending_auth (state_token, source) VALUES (?, ?)`).run(stateToken, source);
  return stateToken;
}

export function lookupPendingAuth(stateToken: string): { source: string } | null {
  const row = getDb()
    .prepare(`SELECT source FROM pending_auth WHERE state_token = ? AND used = 0`)
    .get(stateToken) as { source: string } | undefined;
  return row ?? null;
}

export function markPendingAuthUsed(stateToken: string): void {
  getDb().prepare(`UPDATE pending_auth SET used = 1 WHERE state_token = ?`).run(stateToken);
}

// ─── Sync log ─────────────────────────────────────────────────────────────────

export function getLastSuccessfulSync(
  userId: number
): { finished_at: string; sync_type: string } | null {
  const db = getDb();
  return (
    (db
      .prepare(
        `SELECT finished_at, sync_type FROM sync_log
         WHERE user_id = ? AND error IS NULL AND finished_at IS NOT NULL
         ORDER BY finished_at DESC LIMIT 1`
      )
      .get(userId) as { finished_at: string; sync_type: string } | undefined) ?? null
  );
}
