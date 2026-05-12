import { DatabaseSync } from 'node:sqlite';
import path from 'path';

const DB_PATH = path.resolve(process.cwd(), 'dexcom.db');

let _db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!_db) {
    _db = new DatabaseSync(DB_PATH);
    _db.exec('PRAGMA journal_mode = WAL');
    _db.exec('PRAGMA foreign_keys = ON');
    initSchema(_db);
  }
  return _db;
}

function initSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS dexcom_tokens (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       INTEGER NOT NULL REFERENCES users(id),
      access_token  TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      expires_at    INTEGER NOT NULL,
      updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS glucose_readings (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL REFERENCES users(id),
      system_time  TEXT NOT NULL,
      display_time TEXT NOT NULL,
      value        REAL NOT NULL,
      trend        TEXT,
      trend_rate   REAL,
      status       TEXT,
      raw_json     TEXT NOT NULL,
      UNIQUE(user_id, system_time)
    );

    CREATE TABLE IF NOT EXISTS dexcom_events (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       INTEGER NOT NULL REFERENCES users(id),
      event_id      TEXT NOT NULL,
      event_type    TEXT NOT NULL,
      event_subtype TEXT,
      value         REAL,
      unit          TEXT,
      system_time   TEXT NOT NULL,
      display_time  TEXT NOT NULL,
      raw_json      TEXT NOT NULL,
      UNIQUE(user_id, event_id)
    );

    CREATE TABLE IF NOT EXISTS sync_log (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL REFERENCES users(id),
      sync_type    TEXT NOT NULL,
      started_at   TEXT NOT NULL,
      finished_at  TEXT,
      egvs_count   INTEGER DEFAULT 0,
      events_count INTEGER DEFAULT 0,
      error        TEXT
    );
  `);
}
