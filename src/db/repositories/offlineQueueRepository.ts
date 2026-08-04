/**
 * offlineQueueRepository.ts
 * Stores actions that failed due to no connectivity so they can be
 * replayed when the device comes back online.
 */

import { getDb } from '../database';

export type QueuedAction =
  | { action: 'save_post';    payload: { postId: string; postData: string } }
  | { action: 'unsave_post';  payload: { postId: string } }
  | { action: 'clear_saved';  payload: Record<string, never> }
  | { action: 'mark_notif_read';     payload: { id: string } }
  | { action: 'mark_all_notifs_read'; payload: Record<string, never> }
  | { action: 'clear_notifs';        payload: Record<string, never> };

export interface QueueRow {
  id:      number;
  action:  string;
  payload: string;
  retries: number;
}

export async function enqueue(item: QueuedAction): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO offline_queue (action, payload) VALUES (?, ?)`,
    [item.action, JSON.stringify(item.payload)]
  );
}

export async function getPendingActions(): Promise<QueueRow[]> {
  const db = await getDb();
  return db.getAllAsync<QueueRow>(
    'SELECT * FROM offline_queue ORDER BY id ASC'
  );
}

export async function deleteQueueItem(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM offline_queue WHERE id = ?', [id]);
}

export async function incrementRetry(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE offline_queue SET retries = retries + 1 WHERE id = ?',
    [id]
  );
}

/** Prune items that have been retried too many times (>5). */
export async function pruneStalledActions(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM offline_queue WHERE retries > 5');
}
