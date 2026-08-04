/**
 * savedRepository.ts
 * SQLite operations for saved/bookmarked posts.
 */

import { getDb } from '../database';
import type { Post } from '../../services/api';

export async function upsertSavedPosts(posts: Post[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    // Replace all saved posts with the fresh server list
    await db.execAsync('DELETE FROM saved_posts');
    for (const post of posts) {
      await db.runAsync(
        `INSERT OR REPLACE INTO saved_posts (id, post_id, data) VALUES (?, ?, ?)`,
        [post._id, post._id, JSON.stringify(post)]
      );
    }
  });
}

export async function getSavedPostsFromDb(): Promise<Post[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ data: string }>(
    'SELECT data FROM saved_posts ORDER BY saved_at DESC'
  );
  return rows.map((r) => JSON.parse(r.data) as Post);
}

export async function addSavedPostToDb(post: Post): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO saved_posts (id, post_id, data) VALUES (?, ?, ?)`,
    [post._id, post._id, JSON.stringify(post)]
  );
}

export async function removeSavedPostFromDb(postId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM saved_posts WHERE post_id = ?', [postId]);
}

export async function clearSavedPostsFromDb(): Promise<void> {
  const db = await getDb();
  await db.execAsync('DELETE FROM saved_posts');
}

export async function isSavedInDb(postId: string): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM saved_posts WHERE post_id = ?',
    [postId]
  );
  return (row?.cnt ?? 0) > 0;
}
