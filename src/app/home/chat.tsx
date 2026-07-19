/**
 * chat.tsx
 * Conversations list — shows all conversations for the logged-in user.
 * Real-time: updates when a new message arrives via socket event.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity,
  TextInput, Image, ActivityIndicator, RefreshControl, Animated,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/store/authStore';
import { useUnread } from '@/store/unreadStore';
import { getMyConversationsApi, type Conversation } from '@/services/api';
import SocketService from '@/services/socket';

// ── Palette ───────────────────────────────────────────────
const BG    = '#F2EFE6';
const DARK  = '#1B3A2D';
const AMBER = '#E8943A';
const MUTED = '#9CA3AF';
const CATBG = '#EDEAE1';

// ── Helpers ───────────────────────────────────────────────
const timeAgo = (iso: string) => {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'Just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

// ── Avatar ────────────────────────────────────────────────
function Avatar({ uri, name, size = 48 }: { uri: string | null; name: string; size?: number }) {
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  return uri ? (
    <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  ) : (
    <View style={[styles.avatarCircle, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarInitials, { fontSize: size * 0.35 }]}>{initials}</Text>
    </View>
  );
}

// ── Conversation row ──────────────────────────────────────
function ConvoRow({ conv, myId }: { conv: Conversation; myId: string }) {
  const router  = useRouter();
  const isBuyer = conv.buyer._id === myId;
  const other   = isBuyer ? conv.seller : conv.buyer;
  const unread  = isBuyer ? conv.unreadBuyer : conv.unreadSeller;
  const postTitle = conv.post?.title ?? conv.post?.description ?? 'Request';

  return (
    <TouchableOpacity
      style={styles.convoRow}
      activeOpacity={0.82}
      onPress={() => router.push({ pathname: '/home/conversation', params: { id: conv._id } })}
    >
      <View style={styles.avatarWrap}>
        <Avatar uri={other.profilePicture} name={other.fullName} />
        {unread > 0 && <View style={styles.onlineDot} />}
      </View>

      <View style={styles.convoBody}>
        <View style={styles.convoTopRow}>
          <Text style={[styles.convoName, unread > 0 && styles.bold]} numberOfLines={1}>
            {other.fullName}
          </Text>
          <Text style={styles.convoTime}>{timeAgo(conv.lastMessageAt)}</Text>
        </View>
        <Text style={styles.convoCat} numberOfLines={1}>Re: {postTitle}</Text>
        <View style={styles.convoBottomRow}>
          <Text style={[styles.convoMsg, unread > 0 && styles.bold]} numberOfLines={1}>
            {conv.lastMessage || 'No messages yet'}
          </Text>
          {unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Screen ────────────────────────────────────────────────
export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { state: { accessToken, user } } = useAuth();
  const { setTotalUnread } = useUnread();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [search,        setSearch]        = useState('');
  const [searchOpen,    setSearchOpen]    = useState(false);
  // 'unread' is default — shows only conversations with unread messages
  const [tab,           setTab]           = useState<'unread' | 'all'>('all');

  const searchInputRef = useRef<TextInput>(null);
  const searchAnim     = useRef(new Animated.Value(0)).current;

  const openSearch = () => {
    setSearchOpen(true);
    Animated.timing(searchAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start(() => {
      searchInputRef.current?.focus();
    });
  };

  const closeSearch = () => {
    setSearch('');
    Animated.timing(searchAnim, { toValue: 0, duration: 150, useNativeDriver: false }).start(() => {
      setSearchOpen(false);
    });
  };

  const fetchConversations = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await getMyConversationsApi(accessToken);
      setConversations(res.data.conversations);
    } catch { /* silently fail */ }
  }, [accessToken]);

  useEffect(() => {
    setLoading(true);
    fetchConversations().finally(() => setLoading(false));
  }, [fetchConversations]);

  // Real-time list updates — new message arrives
  useEffect(() => {
    const unsubUpdated = SocketService.on('conversation_updated', ({ conversationId, lastMessage, lastMessageAt }) => {
      setConversations((prev) =>
        prev
          .map((c) =>
            c._id === conversationId
              ? {
                  ...c,
                  lastMessage,
                  lastMessageAt,
                  unreadBuyer:  user?._id === c.buyer._id  ? c.unreadBuyer  + 1 : c.unreadBuyer,
                  unreadSeller: user?._id === c.seller._id ? c.unreadSeller + 1 : c.unreadSeller,
                }
              : c
          )
          .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
      );
    });

    // Real-time: a conversation was read — zero out its unread count immediately
    const unsubRead = SocketService.on('conversation_read', ({ conversationId }: { conversationId: string }) => {
      setConversations((prev) =>
        prev.map((c) =>
          c._id === conversationId
            ? { ...c, unreadBuyer: 0, unreadSeller: 0 }
            : c
        )
      );
    });

    return () => {
      unsubUpdated();
      unsubRead();
    };
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  };

  const totalUnread = conversations.reduce((n, c) => {
    const isBuyer = c.buyer._id === user?._id;
    return n + (isBuyer ? c.unreadBuyer : c.unreadSeller);
  }, 0);

  // Keep the global store in sync so the tab bar badge reflects reality
  useEffect(() => {
    setTotalUnread(totalUnread);
  }, [totalUnread]);

  // Apply tab filter first, then search
  const tabFiltered = conversations.filter((c) => {
    if (tab === 'unread') {
      const isBuyer = c.buyer._id === user?._id;
      const unread  = isBuyer ? c.unreadBuyer : c.unreadSeller;
      return unread > 0;
    }
    return true; // 'all'
  });

  const filtered = tabFiltered.filter((c) => {
    if (!search) return true;
    const q     = search.toLowerCase();
    const other = c.buyer._id === user?._id ? c.seller : c.buyer;
    return (
      other.fullName.toLowerCase().includes(q) ||
      (c.lastMessage ?? '').toLowerCase().includes(q)
    );
  });

  // Animated search bar width
  const searchWidth = searchAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0%', '70%'],
  });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={styles.header}>

        {/* Title — hides when search is open */}
        {!searchOpen && (
          <View>
            <Text style={styles.headerTitle}>Chats</Text>
            {totalUnread > 0 && (
              <Text style={styles.headerSub}>{totalUnread} unread</Text>
            )}
          </View>
        )}

        <View style={styles.headerActions}>
          {/* Animated inline search bar */}
          {searchOpen && (
            <Animated.View style={[styles.inlineSearch, { width: searchWidth }]}>
              <Ionicons name="search-outline" size={14} color={MUTED} />
              <TextInput
                ref={searchInputRef}
                style={styles.inlineSearchInput}
                placeholder="Search…"
                placeholderTextColor={MUTED}
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={closeSearch} hitSlop={8}>
                <Ionicons name="close-circle" size={15} color={MUTED} />
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Search icon */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={searchOpen ? closeSearch : openSearch}
            hitSlop={8}
          >
            <Ionicons
              name={searchOpen ? 'close-outline' : 'search-outline'}
              size={20}
              color={AMBER}
            />
          </TouchableOpacity>

          {/* Refresh icon */}
          <TouchableOpacity style={styles.iconBtn} onPress={onRefresh} hitSlop={8}>
            <Ionicons name="refresh-outline" size={20} color={AMBER} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── All / Unread tabs ── */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === 'all' && styles.tabActive]}
          onPress={() => setTab('all')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, tab === 'all' && styles.tabTextActive]}>
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, tab === 'unread' && styles.tabActive]}
          onPress={() => setTab('unread')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, tab === 'unread' && styles.tabTextActive]}>
            Unread
          </Text>
          {totalUnread > 0 && (
            <View style={[styles.tabBadge, tab === 'unread' && styles.tabBadgeActive]}>
              <Text style={[styles.tabBadgeText, tab === 'unread' && styles.tabBadgeTextActive]}>
                {totalUnread}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── List ── */}
      {loading ? (
        <View style={styles.centred}>
          <ActivityIndicator size="large" color={AMBER} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 80 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AMBER} />}
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Ionicons name="chatbubbles-outline" size={32} color={AMBER} />
              </View>
              <Text style={styles.emptyTitle}>
                {tab === 'unread' ? 'No unread messages' : 'No conversations yet'}
              </Text>
              <Text style={styles.emptySub}>
                {search
                  ? 'No results for that search.'
                  : tab === 'unread'
                  ? 'You are all caught up! Switch to All to see everything.'
                  : 'When a seller responds to your request or you reply as a seller, the chat will appear here.'}
              </Text>
              {tab === 'unread' && conversations.length > 0 && (
                <TouchableOpacity style={styles.switchTabBtn} onPress={() => setTab('all')}>
                  <Text style={styles.switchTabText}>View all chats</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.convoList}>
              {filtered.map((conv, i) => (
                <View key={conv._id}>
                  <ConvoRow conv={conv} myId={user?._id ?? ''} />
                  {i < filtered.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: BG },
  centred: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: DARK },
  headerSub:   { fontSize: 11, color: AMBER, fontWeight: '600', marginTop: 2 },
  headerActions: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FEF3E2',
    alignItems: 'center', justifyContent: 'center',
  },

  // Inline animated search
  inlineSearch: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CATBG, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 6,
    gap: 6, overflow: 'hidden',
  },
  inlineSearchInput: {
    flex: 1, fontSize: 12, color: DARK, padding: 0,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 20, paddingBottom: 14,
  },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: 20, backgroundColor: CATBG,
  },
  tabActive:    { backgroundColor: DARK },
  tabText:      { fontSize: 12, fontWeight: '600', color: MUTED },
  tabTextActive:{ color: '#fff' },
  tabBadge: {
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#D5CFC5',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeActive:     { backgroundColor: AMBER },
  tabBadgeText:       { fontSize: 9, fontWeight: '800', color: MUTED },
  tabBadgeTextActive: { color: '#fff' },

  scroll: { paddingHorizontal: 20, paddingTop: 4 },

  convoList: { borderRadius: 20, overflow: 'hidden' },
  convoRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 4, paddingVertical: 14, gap: 12,
  },
  divider: { height: 1, backgroundColor: CATBG, marginLeft: 60 },

  avatarWrap:     { position: 'relative' },
  avatarCircle:   { backgroundColor: AMBER, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { color: '#fff', fontWeight: '800' },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: AMBER, borderWidth: 2, borderColor: BG,
  },

  convoBody:    { flex: 1 },
  convoTopRow:  {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 2,
  },
  convoName:    { fontSize: 13, fontWeight: '500', color: DARK, flex: 1, marginRight: 8 },
  convoTime:    { fontSize: 10, color: MUTED },
  convoCat:     { fontSize: 10, color: AMBER, fontWeight: '600', marginBottom: 3 },
  convoBottomRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  convoMsg:     { flex: 1, fontSize: 12, color: MUTED, marginRight: 8 },
  bold:         { fontWeight: '700', color: DARK },

  unreadBadge: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: AMBER, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadText: { fontSize: 10, color: '#fff', fontWeight: '800' },

  emptyState:   { alignItems: 'center', paddingTop: 70, gap: 10 },
  emptyIconBox: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: '#FEF3E2', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle:   { fontSize: 15, fontWeight: '700', color: DARK },
  emptySub:     { fontSize: 12, color: MUTED, textAlign: 'center', lineHeight: 18, paddingHorizontal: 24 },
  switchTabBtn: { marginTop: 6, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 12, backgroundColor: CATBG },
  switchTabText:{ fontSize: 12, fontWeight: '700', color: DARK },
});
