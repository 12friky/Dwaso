/**
 * syncService.ts
 * Orchestrates all communication between the backend and SQLite.
 *
 * FLOW:
 *   Login          → fullSync()     — fetches everything, stores in SQLite
 *   Pull-to-refresh → refreshEntity() — fetches one entity, updates SQLite
 *   Back online    → flushOfflineQueue() — replays queued offline actions
 *
 * Screens NEVER call the API directly.
 * Screens call the repositories, which read from SQLite.
 * Only this file (and _layout.tsx which calls it) talks to the API.
 */

import {
  getPostsApi,
  getMyPostsApi,
  getSavedApi,
  getNotificationsApi,
  getMyConversationsApi,
  getMessagesApi,
  savePostApi,
  unsavePostApi,
  clearSavedApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
  clearAllNotificationsApi,
  type Post,
  type Conversation,
} from '../services/api';

import { upsertPosts, upsertMyPosts }             from './repositories/postRepository';
import { upsertSavedPosts }                        from './repositories/savedRepository';
import { upsertNotifications }                     from './repositories/notificationRepository';
import { upsertConversations, upsertMessages }     from './repositories/conversationRepository';
import { touchSyncMeta }                           from './database';
import {
  getPendingActions,
  deleteQueueItem,
  incrementRetry,
  pruneStalledActions,
} from './repositories/offlineQueueRepository';

// ─── Network check ────────────────────────────────────────────────────────────
// Simple connectivity check — tries to reach the backend.
// Falls back to `true` if the check itself fails (avoid blocking sync on error).
export async function isOnline(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch('https://clients3.google.com/generate_204', {
      method: 'HEAD',
      signal: controller.signal,
      cache:  'no-store',
    });
    clearTimeout(timeout);
    return res.status === 204;
  } catch {
    return false;
  }
}

/**
 * Called once after successful login / OTP verification.
 * Fetches all data the app needs and writes it to SQLite.
 * After this, every screen reads from SQLite — no more direct API calls.
 */
export async function fullSync(accessToken: string): Promise<void> {
  const online = await isOnline();
  if (!online) {
    console.log('[Sync] Offline — skipping full sync, will use cached data');
    return;
  }

  console.log('[Sync] Starting full sync…');

  await Promise.allSettled([
    syncFeedPosts(accessToken),
    syncMyPosts(accessToken),
    syncSavedPosts(accessToken),
    syncNotifications(accessToken),
    syncConversations(accessToken),
  ]);

  console.log('[Sync] Full sync complete');
}

// ─── Individual entity syncs ──────────────────────────────────────────────────

export async function syncFeedPosts(accessToken: string): Promise<void> {
  try {
    const [products, services] = await Promise.all([
      getPostsApi({ requestType: 'product', limit: 50 }),
      getPostsApi({ requestType: 'service', limit: 50 }),
    ]);
    const all = [...products.data.posts, ...services.data.posts];
    await upsertPosts(all);
    console.log(`[Sync] Feed posts: ${all.length} cached`);
  } catch (err) {
    console.warn('[Sync] syncFeedPosts failed:', err);
  }
}

export async function syncMyPosts(accessToken: string): Promise<void> {
  try {
    const res = await getMyPostsApi(accessToken);
    await upsertMyPosts(res.data.posts);
    console.log(`[Sync] My posts: ${res.data.posts.length} cached`);
  } catch (err) {
    console.warn('[Sync] syncMyPosts failed:', err);
  }
}

export async function syncSavedPosts(accessToken: string): Promise<void> {
  try {
    const res = await getSavedApi(accessToken);
    await upsertSavedPosts(res.data.posts);
    console.log(`[Sync] Saved posts: ${res.data.posts.length} cached`);
  } catch (err) {
    console.warn('[Sync] syncSavedPosts failed:', err);
  }
}

export async function syncNotifications(accessToken: string): Promise<void> {
  try {
    const res = await getNotificationsApi(accessToken);
    await upsertNotifications(res.data.notifications);
    console.log(`[Sync] Notifications: ${res.data.notifications.length} cached`);
  } catch (err) {
    console.warn('[Sync] syncNotifications failed:', err);
  }
}

export async function syncConversations(accessToken: string): Promise<void> {
  try {
    const res = await getMyConversationsApi(accessToken);
    await upsertConversations(res.data.conversations);

    // Also cache the most recent 20 messages per conversation
    for (const conv of res.data.conversations.slice(0, 10)) {
      try {
        const msgs = await getMessagesApi(conv._id, accessToken);
        await upsertMessages(msgs.data.messages);
      } catch { /* non-fatal per-conversation failure */ }
    }

    console.log(`[Sync] Conversations: ${res.data.conversations.length} cached`);
  } catch (err) {
    console.warn('[Sync] syncConversations failed:', err);
  }
}

// ─── Offline queue flush ──────────────────────────────────────────────────────

/**
 * Called when the device comes back online.
 * Replays all queued offline actions against the backend.
 */
export async function flushOfflineQueue(accessToken: string): Promise<void> {
  await pruneStalledActions();
  const pending = await getPendingActions();
  if (pending.length === 0) return;

  console.log(`[Sync] Flushing ${pending.length} offline actions…`);

  for (const item of pending) {
    try {
      const payload = JSON.parse(item.payload);

      switch (item.action) {
        case 'save_post':
          await savePostApi(payload.postId, accessToken);
          break;
        case 'unsave_post':
          await unsavePostApi(payload.postId, accessToken);
          break;
        case 'clear_saved':
          await clearSavedApi(accessToken);
          break;
        case 'mark_notif_read':
          await markNotificationReadApi(payload.id, accessToken);
          break;
        case 'mark_all_notifs_read':
          await markAllNotificationsReadApi(accessToken);
          break;
        case 'clear_notifs':
          await clearAllNotificationsApi(accessToken);
          break;
        default:
          console.warn('[Sync] Unknown queued action:', item.action);
      }

      await deleteQueueItem(item.id);
      console.log(`[Sync] Flushed action: ${item.action}`);
    } catch (err) {
      console.warn(`[Sync] Failed to flush action ${item.action}:`, err);
      await incrementRetry(item.id);
    }
  }
}

// ─── Post-create sync ─────────────────────────────────────────────────────────

/**
 * After creating a new post, immediately cache it locally so it appears
 * in the feed and my-posts screens without a full refresh.
 */
export async function cacheNewPost(post: Post): Promise<void> {
  const { upsertPost, upsertMyPosts } = await import('./repositories/postRepository');
  await upsertPost(post);
  await upsertMyPosts([post]);
}
