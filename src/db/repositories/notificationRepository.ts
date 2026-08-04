/**
 * notificationRepository.ts
 * SQLite operations for notifications.
 */

import { getDb, touchSyncMeta } from '../database';
import type { AppNotification } from '../../services/api';

export async function upsertNotifications(notifications: AppNotification[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const n of notifications) {
      await db.runAsync(
        `INSERT OR REPLACE INTO notifications
           (id, type, title, body, read, data, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          n._id, n.type, n.title, n.body,
          n.read ? 1 : 0,
          JSON.stringify(n.data),
          n.createdAt,
        ]
      );
    }
  });
  await touchSyncMeta('notifications');
}

export async function upsertNotification(n: AppNotification): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO notifications
       (id, type, title, body, read, data, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [n._id, n.type, n.title, n.body, n.read ? 1 : 0, JSON.stringify(n.data), n.createdAt]
  );
}

export async function getNotificationsFromDb(): Promise<{ notifications: AppNotification[]; unreadCount: number }> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string; type: string; title: string; body: string;
    read: number; data: string; created_at: string;
  }>(
    'SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100'
  );

  const notifications: AppNotification[] = rows.map((r) => ({
    _id:       r.id,
    type:      r.type as AppNotification['type'],
    title:     r.title,
    body:      r.body,
    read:      r.read === 1,
    data:      JSON.parse(r.data ?? '{}'),
    createdAt: r.created_at,
  }));

  const unreadCount = notifications.filter((n) => !n.read).length;
  return { notifications, unreadCount };
}

export async function markNotificationReadInDb(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE notifications SET read = 1, updated_at = datetime('now') WHERE id = ?",
    [id]
  );
}

export async function markAllNotificationsReadInDb(): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "UPDATE notifications SET read = 1, updated_at = datetime('now') WHERE read = 0"
  );
}

export async function clearNotificationsInDb(): Promise<void> {
  const db = await getDb();
  await db.execAsync('DELETE FROM notifications');
}
