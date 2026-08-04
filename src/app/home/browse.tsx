/**
 * browse.tsx  —  PRODUCTS only
 * Shows product requests. No services here at all.
 * Navigate to /home/services for service requests.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity,
  TextInput, Image, ActivityIndicator, RefreshControl,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getPostsApi, type Post } from '../../services/api';
import { useSaved } from '../../store/savedStore';
import { useAuth }  from '../../store/authStore';

const BG    = '#F2EFE6';
const CARD  = '#FFFFFF';
const DARK  = '#1B3A2D';
const AMBER = '#E8943A';
const MUTED = '#9CA3AF';
const CATBG = '#EDEAE1';
const CARD_W = '47%' as const;

const CATEGORIES = [
  { label: 'All',              icon: 'grid-outline'           as const },
  { label: 'Electronics',      icon: 'phone-portrait-outline' as const },
  { label: 'Fashion',          icon: 'shirt-outline'          as const },
  { label: 'Home & Garden',    icon: 'home-outline'           as const },
  { label: 'Vehicles',         icon: 'car-outline'            as const },
  { label: 'Food & Groceries', icon: 'fast-food-outline'      as const },
  { label: 'Health & Beauty',  icon: 'medkit-outline'         as const },
  { label: 'Other',            icon: 'ellipsis-horizontal-outline' as const },
];

const SORT_OPTIONS = ['Newest', 'Budget ↑', 'Budget ↓'];

const CAT_COLORS: Record<string, { bg: string; color: string }> = {
  Electronics:       { bg: '#E8EAF0', color: '#3B6FD4' },
  Fashion:           { bg: '#F3EAF9', color: '#9B59B6' },
  'Home & Garden':   { bg: '#E8F4EC', color: '#2E7D52' },
  Vehicles:          { bg: '#EDEAE1', color: '#7F8C8D' },
  'Food & Groceries':{ bg: '#FDECEA', color: '#E74C3C' },
  'Health & Beauty': { bg: '#E8F4EC', color: '#27AE60' },
  Other:             { bg: '#F5F3EF', color: '#6B7280' },
};
const catStyle = (cat: string) => CAT_COLORS[cat] ?? { bg: CATBG, color: DARK };

const formatBudget = (b: number | null) => b ? `GH₵${b.toLocaleString()}` : 'Negotiable';
const timeAgo = (iso: string) => {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000), h = Math.floor(d / 3600000), days = Math.floor(d / 86400000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${days}d ago`;
};

// ── Product card ──────────────────────────────────────────
function ProductCard({ item }: { item: Post }) {
  const router = useRouter();
  const { isSaved, savePost, unsavePost } = useSaved();
  const { state: { accessToken } } = useAuth();
  const saved = isSaved(item._id);
  const { bg, color } = catStyle(item.category);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.88}
      onPress={() => router.push({ pathname: '/home/product-detail', params: { id: item._id, from: '/home/browse' } })}
    >
      <View style={[styles.cardImg, { backgroundColor: bg }]}>
        {item.images.length > 0
          ? <Image source={{ uri: item.images[0] }} style={styles.cardImgFull} resizeMode="cover" />
          : <Ionicons name="image-outline" size={38} color={color} style={{ opacity: 0.5 }} />
        }
        <TouchableOpacity style={styles.heartBtn} hitSlop={8}
          onPress={() => saved ? unsavePost(item._id, accessToken ?? '') : savePost(item, accessToken ?? '')}>
          <Ionicons name={saved ? 'heart' : 'heart-outline'} size={14} color={saved ? '#E53935' : MUTED} />
        </TouchableOpacity>
        <View style={[styles.catBadge, { backgroundColor: bg }]}>
          <Text style={[styles.catBadgeText, { color }]}>{item.category}</Text>
        </View>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardPrice}>{formatBudget(item.budget)}</Text>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title ?? item.description}</Text>
        <Text style={styles.cardDesc} numberOfLines={1}>{item.description}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={10} color={MUTED} />
          <Text style={styles.metaText} numberOfLines={1}>{item.location}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={10} color={MUTED} />
          <Text style={styles.metaText}>{timeAgo(item.createdAt)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Screen ────────────────────────────────────────────────
export default function BrowseScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { cat: paramCat } = useLocalSearchParams<{ cat?: string }>();

  const [posts,      setPosts]      = useState<Post[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');
  const [search,     setSearch]     = useState('');
  const [activeCat,  setActiveCat]  = useState(paramCat ?? 'All');
  const [activeSort, setActiveSort] = useState('Newest');

  const fetchPosts = useCallback(async (cat: string, isRefresh = false) => {
    try {
      setError('');

      // 1. Show SQLite cache immediately on first load
      if (!isRefresh) {
        const { getPostsFromDb } = await import('../../db/repositories/postRepository');
        const cached = await getPostsFromDb({
          requestType: 'product',
          category: cat === 'All' ? undefined : cat,
          limit: 50,
        });
        if (cached.length > 0) setPosts(cached);
      }

      // 2. Sync fresh data from API → SQLite → UI
      const res = await getPostsApi({ category: cat === 'All' ? undefined : cat, limit: 50 });
      const products = res.data.posts.filter(
        (p) => p.category !== 'Services' && !p.serviceType && (p as any).requestType !== 'service'
      );
      if (products.length > 0) {
        const { upsertPosts } = await import('../../db/repositories/postRepository');
        await upsertPosts(products);
        setPosts(products);
      }
    } catch (err: any) {
      if (posts.length === 0) {
        setError(err?.message ?? 'Failed to load. Check your connection.');
      }
    }
  }, [posts.length]);

  useEffect(() => {
    setLoading(true);
    fetchPosts(activeCat).finally(() => setLoading(false));
  }, [activeCat]);

  const onRefresh = async () => { setRefreshing(true); await fetchPosts(activeCat, true); setRefreshing(false); };

  const filtered = posts
    .filter((p) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (p.title ?? '').toLowerCase().includes(q)
        || p.description.toLowerCase().includes(q)
        || p.location.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (activeSort === 'Budget ↑') return (a.budget ?? 0) - (b.budget ?? 0);
      if (activeSort === 'Budget ↓') return (b.budget ?? 0) - (a.budget ?? 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/home/feed')} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Requested Products</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={15} color={MUTED} style={{ marginRight: 6 }} />
          <TextInput style={styles.searchInput} placeholder="Search products…"
            placeholderTextColor={MUTED} value={search} onChangeText={setSearch} />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={15} color={MUTED} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/home/my-post' as any)}>
          <Ionicons name="add" size={22} color={DARK} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 80 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AMBER} />}
      >
        {/* Category pills */}
        <View style={styles.catRow}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.label}
              style={[styles.catPill, activeCat === c.label && styles.catPillActive]}
              onPress={() => setActiveCat(c.label)}
              activeOpacity={0.8}
            >
              <Ionicons name={c.icon} size={11} color={activeCat === c.label ? '#fff' : DARK} />
              <Text style={[styles.catPillText, activeCat === c.label && styles.catPillTextActive]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sort chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRow}>
          {SORT_OPTIONS.map((s) => (
            <TouchableOpacity key={s}
              style={[styles.sortChip, activeSort === s && styles.sortChipActive]}
              onPress={() => setActiveSort(s)} activeOpacity={0.8}>
              <Text style={[styles.sortChipText, activeSort === s && styles.sortChipTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <View style={styles.centred}><ActivityIndicator size="large" color={AMBER} /></View>
        ) : error ? (
          <View style={styles.emptyBox}>
            <Ionicons name="cloud-offline-outline" size={32} color={MUTED} />
            <Text style={styles.emptyTitle}>Could not load</Text>
            <Text style={styles.emptySub}>{error}</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => fetchPosts(activeCat)}>
              <Ionicons name="refresh-outline" size={16} color="#fff" />
              <Text style={styles.emptyBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.countText}>
              <Text style={{ color: DARK, fontWeight: '700' }}>{filtered.length}</Text> request{filtered.length !== 1 ? 's' : ''}
            </Text>
            {filtered.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="bag-outline" size={32} color={AMBER} />
                <Text style={styles.emptyTitle}>No products found</Text>
                <Text style={styles.emptySub}>{search ? 'Try a different search.' : 'Be the first to post!'}</Text>
              </View>
            ) : (
              <View style={styles.grid}>
                {filtered.map((item) => <ProductCard key={item._id} item={item} />)}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  centred: { paddingTop: 80, alignItems: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: CATBG, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: DARK },

  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 10, marginBottom: 12 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 10, paddingHorizontal: 10, height: 36, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  searchInput: { flex: 1, fontSize: 12, color: DARK },
  addBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: AMBER, alignItems: 'center', justifyContent: 'center' },

  scroll: { paddingHorizontal: 16 },

  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingBottom: 10 },
  catPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 14, backgroundColor: CARD, borderWidth: 1, borderColor: '#DDD9CF' },
  catPillActive: { backgroundColor: DARK, borderColor: DARK },
  catPillText: { fontSize: 10, fontWeight: '600', color: DARK },
  catPillTextActive: { color: '#fff' },

  sortRow: { gap: 8, paddingBottom: 12 },
  sortChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: CATBG },
  sortChipActive: { backgroundColor: AMBER },
  sortChipText: { fontSize: 11, fontWeight: '600', color: MUTED },
  sortChipTextActive: { color: '#fff' },

  countText: { fontSize: 11, color: MUTED, marginBottom: 12 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: CARD_W, backgroundColor: CARD, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#ECE8E1', elevation: 2 },
  cardImg: { width: '100%', height: 118, alignItems: 'center', justifyContent: 'center' },
  cardImgFull: { width: '100%', height: '100%' },
  heartBtn: { position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  catBadge: { position: 'absolute', bottom: 6, left: 6, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  catBadgeText: { fontSize: 9, fontWeight: '700' },
  cardInfo: { padding: 10, gap: 3 },
  cardPrice: { fontSize: 13, fontWeight: '800', color: AMBER },
  cardTitle: { fontSize: 11, fontWeight: '700', color: DARK, lineHeight: 15 },
  cardDesc: { fontSize: 10, color: MUTED },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 9, color: MUTED },

  emptyBox: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: DARK },
  emptySub: { fontSize: 12, color: MUTED, textAlign: 'center', paddingHorizontal: 20 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: AMBER, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  emptyBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
