/**
 * database.ts
 * Opens and initialises the SQLite database.
 * Uses the expo-sqlite v16 async API exclusively (no deprecated methods).
 *
 * Call `getDb()` anywhere to get the singleton connection.
 * Call `initDatabase()` once at app startup (in _layout.tsx).
 */

import * as SQLite from 'expo-sqlite';

const DB_NAME    = 'dwaso.db';
const DB_VERSION = 3; // bump this when you add a migration

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync(DB_NAME);
  return _db;
}

// ─── Schema migrations ────────────────────────────────────────────────────────

const MIGRATIONS: Record<number, string[]> = {
  1: [
    // Posts / marketplace requests
    `CREATE TABLE IF NOT EXISTS posts (
      id            TEXT PRIMARY KEY,
      data          TEXT NOT NULL,         -- JSON blob
      request_type  TEXT,
      category      TEXT,
      status        TEXT,
      user_id       TEXT,
      created_at    TEXT,
      updated_at    TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_posts_category   ON posts(category)`,
    `CREATE INDEX IF NOT EXISTS idx_posts_rtype      ON posts(request_type)`,
    `CREATE INDEX IF NOT EXISTS idx_posts_status     ON posts(status)`,
    `CREATE INDEX IF NOT EXISTS idx_posts_user       ON posts(user_id)`,

    // Saved / bookmarked posts
    `CREATE TABLE IF NOT EXISTS saved_posts (
      id         TEXT PRIMARY KEY,
      post_id    TEXT NOT NULL,
      data       TEXT NOT NULL,            -- full Post JSON
      saved_at   TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_saved_post ON saved_posts(post_id)`,

    // Notifications
    `CREATE TABLE IF NOT EXISTS notifications (
      id         TEXT PRIMARY KEY,
      type       TEXT,
      title      TEXT,
      body       TEXT,
      read       INTEGER DEFAULT 0,
      data       TEXT,                     -- JSON blob for deep-link data
      created_at TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_notif_read ON notifications(read)`,

    // Conversations (chat list)
    `CREATE TABLE IF NOT EXISTS conversations (
      id              TEXT PRIMARY KEY,
      data            TEXT NOT NULL,       -- full Conversation JSON
      last_message    TEXT,
      last_message_at TEXT,
      unread_buyer    INTEGER DEFAULT 0,
      unread_seller   INTEGER DEFAULT 0,
      updated_at      TEXT DEFAULT (datetime('now'))
    )`,

    // Messages per conversation
    `CREATE TABLE IF NOT EXISTS messages (
      id              TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender_id       TEXT,
      text            TEXT,
      read            INTEGER DEFAULT 0,
      data            TEXT NOT NULL,       -- full ChatMessage JSON
      created_at      TEXT,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_msg_conv ON messages(conversation_id)`,

    // User profile cache
    `CREATE TABLE IF NOT EXISTS user_profile (
      id         TEXT PRIMARY KEY,
      data       TEXT NOT NULL,            -- full User JSON
      updated_at TEXT DEFAULT (datetime('now'))
    )`,

    // Sync metadata — tracks last successful sync time per entity
    `CREATE TABLE IF NOT EXISTS sync_meta (
      entity     TEXT PRIMARY KEY,
      synced_at  TEXT
    )`,

    // Offline action queue — actions that failed due to no connectivity
    `CREATE TABLE IF NOT EXISTS offline_queue (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      action     TEXT NOT NULL,            -- e.g. 'save_post', 'unsave_post', 'send_message'
      payload    TEXT NOT NULL,            -- JSON
      created_at TEXT DEFAULT (datetime('now')),
      retries    INTEGER DEFAULT 0
    )`,
  ],

  2: [
    // My own posts (requests I created)
    `CREATE TABLE IF NOT EXISTS my_posts (
      id           TEXT PRIMARY KEY,
      data         TEXT NOT NULL,
      category     TEXT,
      request_type TEXT,
      status       TEXT,
      created_at   TEXT,
      updated_at   TEXT DEFAULT (datetime('now'))
    )`,
  ],

  3: [
    // Ensure we can track notified-seller counts locally
    `ALTER TABLE posts ADD COLUMN notified_count INTEGER DEFAULT 0`,
  ],
};

// ─── Initialise / migrate ─────────────────────────────────────────────────────

export async function initDatabase(): Promise<void> {
  const db = await getDb();

  // Enable WAL mode for better concurrent read performance
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Read current schema version
  const result = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );
  let currentVersion = result?.user_version ?? 0;

  // Run each pending migration in order
  for (let v = currentVersion + 1; v <= DB_VERSION; v++) {
    const stmts = MIGRATIONS[v];
    if (!stmts) continue;

    await db.withTransactionAsync(async () => {
      for (const sql of stmts) {
        // ALTER TABLE may fail if column already exists — treat as warning, not error
        try {
          await db.execAsync(sql);
        } catch (err: any) {
          if (err.message?.includes('duplicate column name')) {
            console.warn(`[DB] Migration v${v} skipped (already applied):`, err.message);
          } else {
            throw err;
          }
        }
      }
      // Update schema version inside the same transaction
      await db.execAsync(`PRAGMA user_version = ${v}`);
    });

    console.log(`[DB] Migration v${v} applied`);
    currentVersion = v;
  }

  console.log(`[DB] Ready — schema v${currentVersion}`);
}

// ─── Convenience helpers ──────────────────────────────────────────────────────

/** Update the sync timestamp for an entity. */
export async function touchSyncMeta(entity: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO sync_meta (entity, synced_at)
     VALUES (?, datetime('now'))`,
    [entity]
  );
}

/** Get the last sync time for an entity (ISO string or null). */
export async function getSyncMeta(entity: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ synced_at: string }>(
    'SELECT synced_at FROM sync_meta WHERE entity = ?',
    [entity]
  );
  return row?.synced_at ?? null;
}
