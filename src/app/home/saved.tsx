import { useState, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView,
  TouchableOpacity, Image, Alert, RefreshControl,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSaved } from '../../store/savedStore';
import { useAuth }  from '../../store/authStore';
import { type Post } from '../../services/api';

// ── Palette ───────────────────────────────────────────────
const BG    = '#F2EFE6';
const CARD  = '#FFFFFF';
const DARK  = '#1B3A2D';
const AMBER = '#E8943A';
const MUTED = '#9CA3AF';
const CATBG = '#EDEAE1';
const CARD_W = '47%' as const;

// ── Helpers ───────────────────────────────────────────────
const formatBudget = (budget: number | null) =>
  budget ? `GH₵${budget.toLocaleString()}` : 'Negotiable';

const timeAgo = (iso: string) => {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'Just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

const CAT_COLORS: Record<string, { bg: string; color: string }> = {
  Electronics: { bg: '#E8EAF0', color: '#3B6FD4' },
  Fashion:     { bg: '#F3EAF9', color: '#9B59B6' },
  Home:        { bg: '#E8F4EC', color: '#2E7D52' },
  Vehicles:    { bg: '#EDEAE1', color: '#7F8C8D' },
  Services:    { bg: '#FEF3E2', color: '#E8943A' },
  Food:        { bg: '#FDECEA', color: '#E74C3C' },
  Health:      { bg: '#E8F4EC', color: '#27AE60' },
};
const catStyle = (cat: string) => CAT_COLORS[cat] ?? { bg: CATBG, color: DARK };

// ── Saved card ────────────────────────────────────────────
function SavedCard({ item }: { item: Post }) {
  const router = useRouter();
  const { unsavePost }                = useSaved();
  const { state: { accessToken } }    = useAuth();
  const { bg, color }                 = catStyle(item.category);

  const isService =
    (item as any).requestType === 'service' ||
    item.category === 'Services' ||
    Boolean(item.serviceType);

  const handlePress = () => {
    const pathname = isService ? '/home/service-detail' : '/home/product-detail';
    router.push({ pathname, params: { id: item._id, from: '/home/saved' } });
  };

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.88}
      onPress={handlePress}
    >
      {/* image / placeholder */}
      <View style={[styles.cardImg, { backgroundColor: isService ? '#E8F4EC' : bg }]}>
        {isService ? (
          /* Service — show construct icon instead of image */
          <Ionicons name="construct-outline" size={38} color="#2E7D52" style={{ opacity: 0.5 }} />
        ) : item.images.length > 0 ? (
          <Image source={{ uri: item.images[0] }} style={styles.cardImgFull} resizeMode="cover" />
        ) : (
          <Ionicons name="image-outline" size={36} color={color} style={{ opacity: 0.45 }} />
        )}

        {/* unsave button */}
        <TouchableOpacity
          style={styles.heartBtn}
          hitSlop={8}
          onPress={() => unsavePost(item._id, accessToken ?? '')}
        >
          <Ionicons name="heart" size={15} color="#E53935" />
        </TouchableOpacity>

        {/* category badge */}
        <View style={[styles.catBadge, { backgroundColor: bg }]}>
          <Text style={[styles.catBadgeText, { color }]}>{item.category}</Text>
        </View>

        {/* time badge */}
        <View style={styles.timeBadge}>
          <Text style={styles.timeBadgeText}>{timeAgo(item.createdAt)}</Text>
        </View>
      </View>

      {/* info */}
      <View style={styles.cardInfo}>
        <Text style={styles.cardBudget}>{formatBudget(item.budget)}</Text>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title ?? item.description}
        </Text>
        <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={10} color={MUTED} />
          <Text style={styles.metaText}>{item.location}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Empty state ───────────────────────────────────────────
function EmptyState() {
  const router = useRouter();
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconBox}>
        <Ionicons name="heart-outline" size={36} color={AMBER} />
      </View>
      <Text style={styles.emptyTitle}>Nothing saved yet</Text>
      <Text style={styles.emptySub}>
        Tap the heart on any request to save it here.
      </Text>
      <TouchableOpacity
        style={styles.emptyBtn}
        onPress={() => router.push('/home/browse' as any)}
        activeOpacity={0.85}
      >
        <Ionicons name="search-outline" size={16} color="#fff" />
        <Text style={styles.emptyBtnText}>Browse Requests</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────
export default function SavedScreen() {
  const insets = useSafeAreaInsets();
  const { state: { posts }, clearSaved, loadSaved } = useSaved();
  const { state: { accessToken } } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    if (!accessToken) return;
    setRefreshing(true);
    await loadSaved(accessToken);
    setRefreshing(false);
  }, [accessToken, loadSaved]);

  const handleClearAll = () => {
    if (posts.length === 0) return;
    Alert.alert('Clear All Saved', 'Remove all saved requests?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: () => clearSaved(accessToken ?? '') },
    ]);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Saved</Text>
        <TouchableOpacity style={styles.clearBtn} hitSlop={8} onPress={handleClearAll}>
          <Ionicons name="trash-outline" size={18} color={posts.length > 0 ? MUTED : CATBG} />
        </TouchableOpacity>
      </View>

      {/* ── Count ── */}
      {posts.length > 0 && (
        <Text style={styles.countText}>
          <Text style={{ color: DARK, fontWeight: '700' }}>{posts.length}</Text> saved request{posts.length !== 1 ? 's' : ''}
        </Text>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 80 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AMBER} colors={[AMBER]} />
        }
      >
        {posts.length === 0 ? (
          <EmptyState />
        ) : (
          <View style={styles.grid}>
            {posts.map((post) => (
              <SavedCard key={post._id} item={post} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: DARK },
  clearBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: CATBG, alignItems: 'center', justifyContent: 'center' },

  countText: { fontSize: 12, color: MUTED, paddingHorizontal: 20, marginBottom: 10 },

  scroll: { paddingHorizontal: 20 },

  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  // Card
  card: { width: CARD_W, backgroundColor: CARD, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardImg: { width: '100%', height: 118, alignItems: 'center', justifyContent: 'center' },
  cardImgFull: { width: '100%', height: '100%' },

  heartBtn: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },

  catBadge: { position: 'absolute', bottom: 6, left: 6, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  catBadgeText: { fontSize: 9, fontWeight: '700' },

  timeBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  timeBadgeText: { fontSize: 9, color: '#fff', fontWeight: '600' },

  cardInfo: { padding: 10, gap: 3 },
  cardBudget: { fontSize: 13, fontWeight: '700', color: AMBER },
  cardTitle: { fontSize: 11, fontWeight: '600', color: DARK },
  cardDesc: { fontSize: 10, color: MUTED, lineHeight: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 9, color: MUTED },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIconBox: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FEF3E2', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: DARK },
  emptySub: { fontSize: 12, color: MUTED, textAlign: 'center', lineHeight: 18, paddingHorizontal: 20 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: AMBER, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, marginTop: 8 },
  emptyBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
