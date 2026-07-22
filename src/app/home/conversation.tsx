/**
 * conversation.tsx
 * Individual chat screen between a buyer and a seller.
 *
 * Fixes applied:
 *  1. Keyboard covering input — use KeyboardAvoidingView with correct offsets
 *     + FlatList automaticallyAdjustKeyboardInsets (iOS 15+) + Android
 *     windowSoftInputMode handled via flex layout.
 *  2. Messages appearing twice — removed unreliable 3-sec optimistic cleanup.
 *     Instead: socket echo replaces the optimistic by matching a `localId` tag
 *     that is echoed back from the server.
 *  3. Auto intro message — reads `autoMessage` from route params and sends it
 *     automatically on first open (only if the conversation has no messages yet).
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet, View, Text, FlatList, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, Image,
  ActivityIndicator, Dimensions, Linking,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useAuth } from '@/store/authStore';
import {
  getMessagesApi, sendMessageApi,
  type ChatMessage, type Conversation,
  getMyConversationsApi,
} from '@/services/api';
import SocketService from '@/services/socket';

// ── Palette ───────────────────────────────────────────────
const BG    = '#F2EFE6';
const CARD  = '#FFFFFF';
const DARK  = '#1B3A2D';
const AMBER = '#E8943A';
const MUTED = '#9CA3AF';
const CATBG = '#EDEAE1';
const GREEN  = '#2E7D52';

const SCREEN_W = Dimensions.get('window').width;

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// ── Avatar ────────────────────────────────────────────────
function Avatar({ uri, name, size = 38 }: { uri: string | null; name: string; size?: number }) {
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  return uri ? (
    <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  ) : (
    <View style={[styles.avatarCircle, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={{ fontSize: size * 0.35, color: '#fff', fontWeight: '800' }}>{initials}</Text>
    </View>
  );
}

// ── Message bubble ────────────────────────────────────────
function Bubble({ item, mine }: { item: ChatMessage; mine: boolean }) {
  const isOptimistic = item._id.startsWith('opt-');
  return (
    <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.text}</Text>
      </View>
      <View style={[styles.bubbleMeta, mine && { alignItems: 'flex-end' }]}>
        <Text style={styles.bubbleTime}>{isOptimistic ? 'Sending…' : formatTime(item.createdAt)}</Text>
        {mine && !isOptimistic && (
          <Ionicons
            name={item.read ? 'checkmark-done' : 'checkmark'}
            size={12}
            color={item.read ? GREEN : MUTED}
          />
        )}
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────
export default function ConversationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // autoMessage is passed from product-detail when seller taps "I Have This!"
  const { id: conversationId, autoMessage } = useLocalSearchParams<{
    id: string;
    autoMessage?: string;
  }>();
  const { state: { accessToken, user } } = useAuth();
  const isFocused = useIsFocused();

  const flatRef      = useRef<FlatList>(null);
  const myId         = user?._id ?? '';
  const autoSentRef  = useRef(false); // guard — only send auto-message once

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages,     setMessages]     = useState<ChatMessage[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [sending,      setSending]      = useState(false);
  const [input,        setInput]        = useState('');

  // ── Load conversation metadata ────────────────────────────
  const loadConversation = useCallback(async () => {
    if (!accessToken || !conversationId) return;
    try {
      const res  = await getMyConversationsApi(accessToken);
      const conv = res.data.conversations.find((c) => c._id === conversationId);
      if (conv) setConversation(conv);
    } catch { /* non-fatal */ }
  }, [accessToken, conversationId]);

  // ── Load messages ─────────────────────────────────────────
  const loadMessages = useCallback(async () => {
    if (!accessToken || !conversationId) return;
    try {
      const res = await getMessagesApi(conversationId, accessToken);
      setMessages(res.data.messages);
      return res.data.messages;
    } catch { return []; }
  }, [accessToken, conversationId]);

  // ── Mount: load data, then maybe send auto-intro ──────────
  useEffect(() => {
    setLoading(true);
    Promise.all([loadConversation(), loadMessages()])
      .then(([, msgs]) => {
        // Send the auto-intro only if:
        //  - a message was passed from the product detail screen
        //  - this conversation is brand new (no messages yet)
        //  - we haven't already sent it this session
        if (
          autoMessage &&
          Array.isArray(msgs) &&
          msgs.length === 0 &&
          !autoSentRef.current
        ) {
          autoSentRef.current = true;
          // Small delay so the screen is visible before the message flies in
          setTimeout(() => sendText(autoMessage), 400);
        }
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Socket: join room + real-time messages ────────────────
  useEffect(() => {
    if (!conversationId || !isFocused) return;

    SocketService.emit('join_conversation', { conversationId });
    // The authenticated message request marks this user's existing messages
    // as read and the server broadcasts the updated count to all app screens.
    void loadMessages();

    const unsubNewMessage = SocketService.on('new_message', (msg: ChatMessage & { localId?: string }) => {
      if (msg.conversation !== conversationId) return;

      setMessages((prev) => {
        // If this is the echo of an optimistic message, replace it by localId
        if (msg.localId) {
          const hasOptimistic = prev.some((m) => m._id === `opt-${msg.localId}`);
          if (hasOptimistic) {
            return prev.map((m) =>
              m._id === `opt-${msg.localId}` ? { ...msg } : m
            );
          }
        }
        // Otherwise deduplicate by real _id
        if (prev.some((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });

      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);
    });

    const unsubConversationRead = SocketService.on('conversation_read', ({ conversationId: readConversationId }: { conversationId: string }) => {
      if (readConversationId !== conversationId) return;
      setMessages((prev) => prev.map((message) => (message.sender._id !== myId && !message.read ? { ...message, read: true } : message)));
    });

    return () => {
      unsubNewMessage();
      unsubConversationRead();
      SocketService.emit('leave_conversation', { conversationId });
    };
  }, [conversationId, isFocused, loadMessages, myId]);

  // ── Core send logic (used by both manual send and auto-intro) ──
  const sendText = async (text: string) => {
    if (!text.trim() || sending) return;
    setSending(true);

    // Unique tag so the server can echo it back and we can replace the optimistic
    const localId = Date.now().toString();

    // Optimistic message shown immediately
    const optimistic: ChatMessage = {
      _id:          `opt-${localId}`,
      conversation: conversationId ?? '',
      sender: {
        _id:            user?._id ?? '',
        fullName:       user?.fullName ?? '',
        profilePicture: user?.profilePicture ?? null,
      },
      text:      text.trim(),
      read:      false,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);

    try {
      if (SocketService.isConnected()) {
        // Pass localId so the server echoes it back — allows exact replacement
        SocketService.emit('send_message', { conversationId, text: text.trim(), localId });
        // No cleanup timer — the socket echo replaces the optimistic via localId
      } else {
        // REST fallback
        const res = await sendMessageApi(conversationId!, text.trim(), accessToken ?? '');
        setMessages((prev) => [
          ...prev.filter((m) => m._id !== optimistic._id),
          res.data.message,
        ]);
      }
    } catch {
      // Mark optimistic as failed — keep it visible so user knows it didn't send
      setMessages((prev) =>
        prev.map((m) =>
          m._id === optimistic._id ? { ...m, text: `${m.text} ⚠️` } : m
        )
      );
    } finally {
      setSending(false);
    }
  };

  // ── Manual send from input bar ────────────────────────────
  const send = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    sendText(text);
  };

  // ── Derived ───────────────────────────────────────────────
  const other = conversation
    ? (conversation.buyer._id === myId ? conversation.seller : conversation.buyer)
    : null;
  const postTitle = conversation?.post?.title ?? conversation?.post?.description ?? '';

  if (loading) {
    return (
      <View style={[styles.root, styles.centred, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={AMBER} />
      </View>
    );
  }

  return (
    // ── KeyboardAvoidingView — proper keyboard handling ──────
    // iOS: behavior="padding" pushes the whole view up by the keyboard height.
    // Android: behavior="height" shrinks the view; keyboardVerticalOffset accounts
    //          for the status bar so the input stays visible.
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
    >
      {/* ── Safe-area top padding ── */}
      <View style={{ paddingTop: insets.top, backgroundColor: CARD }}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/home/chat')} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={DARK} />
          </TouchableOpacity>

          {other && (
            <TouchableOpacity
              style={styles.profileTrigger}
              activeOpacity={0.75}
              onPress={() => router.push({ pathname: '/home/chat-profile', params: { id: other._id, conversationId } })}
            >
              <Avatar uri={other.profilePicture} name={other.fullName} size={40} />
              <View style={styles.headerInfo}>
                <Text style={styles.headerName} numberOfLines={1}>{other.fullName}</Text>
                {postTitle ? (
                  <Text style={styles.headerSub} numberOfLines={1}>Re: {postTitle}</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          )}

          {other?.phone && conversation?.post?.contactPreference !== 'Chat' ? (
            <TouchableOpacity
              style={styles.callBtn}
              hitSlop={8}
              onPress={() => Linking.openURL(`tel:${other.phone}`)}
            >
              <Ionicons name="call-outline" size={20} color={AMBER} />
            </TouchableOpacity>
          ) : <View style={{ width: 36 }} />}
        </View>
      </View>

      {/* ── Messages ── */}
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(m) => m._id}
        contentContainerStyle={[styles.messageList, { paddingBottom: 16 }]}
        showsVerticalScrollIndicator={false}
        // iOS 15+ — automatically scrolls up when keyboard opens
        automaticallyAdjustKeyboardInsets
        // Keeps scroll position when new messages arrive at the bottom
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Ionicons name="chatbubble-outline" size={40} color={MUTED} style={{ opacity: 0.4 }} />
            <Text style={styles.emptyChatText}>Say hello 👋</Text>
            <Text style={styles.emptyChatSub}>Start the conversation below</Text>
          </View>
        }
        renderItem={({ item }) => <Bubble item={item} mine={item.sender._id === myId} />}
      />

      {/* ── Input bar ── */}
      {/* paddingBottom uses insets.bottom so it sits above the home bar on iOS */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <TextInput
          style={styles.textInput}
          placeholder="Type a message…"
          placeholderTextColor={MUTED}
          value={input}
          onChangeText={setInput}
          multiline
          returnKeyType="default"
          // Do NOT use onSubmitEditing with multiline — it is unreliable cross-platform
          // User taps the send button instead
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: input.trim() ? AMBER : CATBG }]}
          onPress={send}
          activeOpacity={0.85}
          disabled={!input.trim() || sending}
        >
          {sending
            ? <ActivityIndicator size="small" color={MUTED} />
            : <Ionicons name="send" size={16} color={input.trim() ? '#fff' : MUTED} />
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: BG },
  centred: { alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, gap: 10,
    backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: CATBG,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: CATBG, alignItems: 'center', justifyContent: 'center',
  },
  avatarCircle: { backgroundColor: AMBER, alignItems: 'center', justifyContent: 'center' },
  profileTrigger: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerInfo:   { flex: 1 },
  headerName:   { fontSize: 14, fontWeight: '700', color: DARK },
  headerSub:    { fontSize: 10, color: AMBER, fontWeight: '600', marginTop: 1 },
  callBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FEF3E2', alignItems: 'center', justifyContent: 'center',
  },

  messageList: { paddingHorizontal: 16, paddingTop: 12 },

  bubbleRow:     { marginBottom: 10, alignItems: 'flex-start' },
  bubbleRowMine: { alignItems: 'flex-end' },
  bubble: {
    maxWidth: SCREEN_W * 0.72,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 18, borderBottomLeftRadius: 4,
    backgroundColor: CARD,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  bubbleMine: {
    backgroundColor: AMBER,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: CARD,
    borderBottomLeftRadius: 4,
  },
  bubbleText:     { fontSize: 13, color: DARK, lineHeight: 19 },
  bubbleTextMine: { color: '#fff' },
  bubbleMeta: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    marginTop: 3, marginHorizontal: 4,
  },
  bubbleTime: { fontSize: 10, color: MUTED },

  emptyChat:     { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyChatText: { fontSize: 15, fontWeight: '700', color: DARK },
  emptyChatSub:  { fontSize: 12, color: MUTED },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, paddingTop: 10,
    backgroundColor: CARD, borderTopWidth: 1, borderTopColor: CATBG,
    gap: 8,
  },
  textInput: {
    flex: 1, minHeight: 40, maxHeight: 120,
    backgroundColor: BG, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 13, color: DARK,
    borderWidth: 1, borderColor: '#E5E1D8',
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 0,
  },
});
