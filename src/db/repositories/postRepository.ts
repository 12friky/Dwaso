/**
 * postRepository.ts
 * All SQLite read/write operations for marketplace posts.
 * Screens never call the API directly — they call these functions.
 */

import { getDb, touchSyncMeta } from '../database';
import type { Post } from '../../services/api';

// ─── Upsert ───────────────────────────────────────────────────────────────────

export async function upsertPost(post: Post): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO posts
       (id, data, request_type, category, status, user_id, created_at, notified_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      post._id,
      JSON.stringify(post),
      post.requestType ?? 'product',
      post.category,
      post.status,
      post.user._id,
      post.createdAt,
      post.notifiedCount ?? 0,
    ]
  );
}

export async function upsertPosts(posts: Post[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const post of posts) {
      await db.runAsync(
        `INSERT OR REPLACE INTO posts
           (id, data, request_type, category, status, user_id, created_at, notified_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          post._id,
          JSON.stringify(post),
          post.requestType ?? 'product',
          post.category,
          post.status,
          post.user._id,
          post.createdAt,
          post.notifiedCount ?? 0,
        ]
      );
    }
  });
  await touchSyncMeta('posts');
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getPostsFromDb(opts: {
  requestType?: 'product' | 'service';
  category?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<Post[]> {
  const db = await getDb();
  const conditions: string[] = ["status = 'open'"];
  const params: any[] = [];

  if (opts.requestType) {
    conditions.push('request_type = ?');
    params.push(opts.requestType);
  }
  if (opts.category && opts.category !== 'All') {
    conditions.push('category = ?');
    params.push(opts.category);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit  = opts.limit  ?? 50;
  const offset = opts.offset ?? 0;

  const rows = await db.getAllAsync<{ data: string }>(
    `SELECT data FROM posts ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return rows.map((r) => JSON.parse(r.data) as Post);
}

export async function getPostByIdFromDb(id: string): Promise<Post | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ data: string }>(
    'SELECT data FROM posts WHERE id = ?',
    [id]
  );
  return row ? (JSON.parse(row.data) as Post) : null;
}

export async function getPostCountFromDb(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM posts WHERE status = 'open'"
  );
  return row?.cnt ?? 0;
}

// ─── My Posts ─────────────────────────────────────────────────────────────────

export async function upsertMyPosts(posts: Post[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const post of posts) {
      await db.runAsync(
        `INSERT OR REPLACE INTO my_posts
           (id, data, category, request_type, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          post._id,
          JSON.stringify(post),
          post.category,
          post.requestType ?? 'product',
          post.status,
          post.createdAt,
        ]
      );
    }
  });
}

export async function getMyPostsFromDb(): Promise<Post[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ data: string }>(
    'SELECT data FROM my_posts ORDER BY created_at DESC'
  );
  return rows.map((r) => JSON.parse(r.data) as Post);
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function clearPostsCache(): Promise<void> {
  const db = await getDb();
  await db.execAsync('DELETE FROM posts');
}
