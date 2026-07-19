import { useEffect, useState } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useNotifications } from '../../store/notificationStore';
import { useAuth }           from '../../store/authStore';
import { type AppNotification } from '../../services/api';

const BG    = '#F2EFE6';
const CARD  = '#FFFFFF';
const DARK  = '#1B3A2D';
const AMBER = '#E8943A';
const GREEN = '#2E7D52';
const MUTED = '#9CA3AF';
const CATBG = '#EDEAE1';

// Map notification type → icon config
const TYPE_CONFIG: Record<
  AppNotification['type'],
  { icon: React.ComponentProps<typeof Ionicons>['name']; bg: string; color: string }
> = {
  new_request: { icon: 'bag-add-outline',            bg: '#E8F4EC', color: GREEN   },
  new_message: { icon: 'chatbubble-ellipses-outline', bg: '#EAF0FB', color: '#3B6FD4' },
  offer:       { icon: 'pricetag-outline',            bg: '#FEF3E2', color: AMBER   },
  system:      { icon: 'information-circle-outline',  bg: CATBG,     color: DARK    },
};

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

// ── Single notification card ──────────────────────────────────────────────────
function NotifCard({
  item, onPress,
}: {
  item: AppNotification;
  onPress: (item: AppNotification) => void;
}) {
  const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.system;
  return (
    <TouchableOpacity
      style={[styles.card, !item.read && styles.cardUnread]}
      activeOpacity={0.82}
      onPress={() => onPress(item)}
    >
      <View style={[styles.iconBox, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon} size={20} color={cfg.color} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={[styles.cardTitle, !item.read && styles.cardTitleBold]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.cardTime}>{timeAgo(item.createdAt)}</Text>
        </View>
        <Text style={styles.cardBodyText} numberOfLines={2}>{item.body}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state: { accessToken } }                              = useAuth();
  const { state, loadNotifications, markRead, markAllRead, clearAll } = useNotifications();

  const [tab, setTab] = useState<0 | 1>(0);

  // Refresh on mount
  useEffect(() => {
    if (accessToken) loadNotifications(accessToken);
  }, [accessToken]);

  const handlePress = async (item: AppNotification) => {
    if (!item.read) markRead(item._id, accessToken ?? '');

    // Deep-link based on notification type
    if (item.data?.conversationId) {
      router.push({ pathname: '/home/conversation', params: { id: item.data.conversationId } });
    } else if (item.data?.postId) {
      // Fetch the post to determine if it's a product or service
      try {
        const { getPostByIdApi } = await import('../../services/api');
        const res = await getPostByIdApi(item.data.postId);
        const post = res.data.post;
        const isService =
          (post as any).requestType === 'service' ||
          post.category === 'Services' ||
          Boolean(post.serviceType);
        const pathname = isService ? '/home/service-detail' : '/home/product-detail';
        router.push({ pathname, params: { id: item.data.postId, from: '/home/notifications' } });
      } catch {
        // Fallback to product-detail if fetch fails
        router.push({ pathname: '/home/product-detail', params: { id: item.data.postId, from: '/home/notifications' } });
      }
    }
  };

  const handleMarkAll = () => markAllRead(accessToken ?? '');

  const handleClear = () => {
    Alert.alert('Clear all notifications', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => clearAll(accessToken ?? '') },
    ]);
  };

  const displayed = tab === 0
    ? state.notifications
    : state.notifications.filter((n) => !n.read);

  const unread = state.unreadCount;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/home/feed')} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={DARK} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unread > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={handleClear} hitSlop={8} style={styles.clearBtn}>
          <Ionicons name="trash-outline" size={18} color={state.notifications.length > 0 ? MUTED : CATBG} />
        </TouchableOpacity>
      </View>

      {/* ── Tabs ── */}
      <View style={styles.tabRow}>
        {(['All', 'Unread'] as const).map((label, i) => (
          <TouchableOpacity
            key={label}
            style={[styles.tab, tab === i && styles.tabActive]}
            onPress={() => setTab(i as 0 | 1)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, tab === i && styles.tabTextActive]}>{label}</Text>
            {i === 1 && unread > 0 && (
              <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{unread}</Text></View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Mark all read link ── */}
      {unread > 0 && (
        <TouchableOpacity onPress={handleMarkAll} style={styles.markAllRow} hitSlop={8}>
          <Ionicons name="checkmark-done-outline" size={14} color={AMBER} />
          <Text style={styles.markAllText}>Mark all as read</Text>
        </TouchableOpacity>
      )}

      {/* ── Content ── */}
      {state.loading ? (
        <View style={styles.centred}>
          <ActivityIndicator size="large" color={AMBER} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        >
          {displayed.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="notifications-outline" size={32} color={AMBER} />
              </View>
              <Text style={styles.emptyTitle}>
                {tab === 1 ? 'All caught up!' : 'No notifications yet'}
              </Text>
              <Text style={styles.emptySub}>
                {tab === 1
                  ? 'You have no unread notifications.'
                  : 'Notifications about new requests and messages will appear here.'}
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {displayed.map((n) => (
                <NotifCard key={n._id} item={n} onPress={handlePress} />
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: BG },
  centred: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },

  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: CATBG, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle:  { fontSize: 18, fontWeight: '800', color: DARK },
  headerBadge:  { backgroundColor: AMBER, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  headerBadgeText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  clearBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: CATBG, alignItems: 'center', justifyContent: 'center' },

  tabRow:        { flexDirection: 'row', marginHorizontal: 20, marginBottom: 8, backgroundColor: CATBG, borderRadius: 12, padding: 4 },
  tab:           { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  tabActive:     { backgroundColor: CARD, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  tabText:       { fontSize: 12, fontWeight: '600', color: MUTED },
  tabTextActive: { color: DARK },
  tabBadge:      { backgroundColor: AMBER, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  tabBadgeText:  { fontSize: 10, color: '#fff', fontWeight: '700' },

  markAllRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingBottom: 10 },
  markAllText:{ fontSize: 12, color: AMBER, fontWeight: '600' },

  scroll: { paddingHorizontal: 16 },
  list:   { gap: 8 },

  card: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: CARD, borderRadius: 14, padding: 14, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  cardUnread: { backgroundColor: '#FFFAF5', borderWidth: 1, borderColor: '#F5E0C8' },
  iconBox:    { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  cardBody:   { flex: 1 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle:     { fontSize: 13, fontWeight: '500', color: DARK, flex: 1, marginRight: 8 },
  cardTitleBold: { fontWeight: '700' },
  cardTime:      { fontSize: 10, color: MUTED },
  cardBodyText:  { fontSize: 12, color: MUTED, lineHeight: 17 },
  unreadDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: AMBER, marginTop: 6 },

  empty:      { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyIcon:  { width: 68, height: 68, borderRadius: 34, backgroundColor: '#FEF3E2', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: DARK },
  emptySub:   { fontSize: 12, color: MUTED, textAlign: 'center', paddingHorizontal: 20, lineHeight: 18 },
});
