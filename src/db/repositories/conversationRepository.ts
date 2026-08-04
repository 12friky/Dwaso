/**
 * conversationRepository.ts
 * SQLite operations for conversations and messages.
 */

import { getDb, touchSyncMeta } from '../database';
import type { Conversation, ChatMessage } from '../../services/api';

// ─── Conversations ────────────────────────────────────────────────────────────

export async function upsertConversations(conversations: Conversation[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const c of conversations) {
      await db.runAsync(
        `INSERT OR REPLACE INTO conversations
           (id, data, last_message, last_message_at, unread_buyer, unread_seller)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          c._id,
          JSON.stringify(c),
          c.lastMessage,
          c.lastMessageAt,
          c.unreadBuyer,
          c.unreadSeller,
        ]
      );
    }
  });
  await touchSyncMeta('conversations');
}

export async function upsertConversation(c: Conversation): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO conversations
       (id, data, last_message, last_message_at, unread_buyer, unread_seller)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [c._id, JSON.stringify(c), c.lastMessage, c.lastMessageAt, c.unreadBuyer, c.unreadSeller]
  );
}

export async function getConversationsFromDb(): Promise<Conversation[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ data: string }>(
    'SELECT data FROM conversations ORDER BY last_message_at DESC'
  );
  return rows.map((r) => JSON.parse(r.data) as Conversation);
}

// ─── Messages ────────────────────────────────────────────────────────────────

export async function upsertMessages(messages: ChatMessage[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const m of messages) {
      await db.runAsync(
        `INSERT OR REPLACE INTO messages
           (id, conversation_id, sender_id, text, read, data, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          m._id,
          m.conversation,
          m.sender._id,
          m.text,
          m.read ? 1 : 0,
          JSON.stringify(m),
          m.createdAt,
        ]
      );
    }
  });
}

export async function upsertMessage(m: ChatMessage): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO messages
       (id, conversation_id, sender_id, text, read, data, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [m._id, m.conversation, m.sender._id, m.text, m.read ? 1 : 0, JSON.stringify(m), m.createdAt]
  );
}

export async function getMessagesFromDb(conversationId: string): Promise<ChatMessage[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ data: string }>(
    'SELECT data FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
    [conversationId]
  );
  return rows.map((r) => JSON.parse(r.data) as ChatMessage);
}

export async function markMessagesReadInDb(conversationId: string, userId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE messages SET read = 1 WHERE conversation_id = ? AND sender_id != ?',
    [conversationId, userId]
  );
}
