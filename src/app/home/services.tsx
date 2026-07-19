/**
 * services.tsx  —  SERVICES only
 * Shows service requests. No products here at all.
 * Navigate to /home/browse for product requests.
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
const GREEN = '#2E7D52';
const MUTED = '#9CA3AF';
const CATBG = '#EDEAE1';

const CATEGORIES = [
  { label: 'All',          icon: 'grid-outline'                as const },
  { label: 'Mason',        icon: 'hammer-outline'              as const },
  { label: 'Painter',      icon: 'color-palette-outline'       as const },
  { label: 'Plumber',      icon: 'water-outline'               as const },
  { label: 'Electrician',  icon: 'flash-outline'               as const },
  { label: 'Carpenter',    icon: 'construct-outline'           as const },
  { label: 'Cleaner',      icon: 'sparkles-outline'            as const },
  { label: 'Tailor',       icon: 'shirt-outline'               as const },
  { label: 'Mechanic',     icon: 'car-sport-outline'           as const },
  { label: 'Welder',       icon: 'flame-outline'               as const },
  { label: 'Barber',       icon: 'cut-outline'                 as const },
  { label: 'Photographer', icon: 'camera-outline'              as const },
  { label: 'AC Technician',icon: 'thermometer-outline'         as const },
  { label: 'Other',        icon: 'ellipsis-horizontal-outline' as const },
];

const SORT_OPTIONS = ['Newest', 'Budget ↑', 'Budget ↓'];

const formatBudget = (b: number | null) => b ? `GH₵${b.toLocaleString()}` : 'Negotiable';
const timeAgo = (iso: string) => {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000), h = Math.floor(d / 3600000), days = Math.floor(d / 86400000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${days}d ago`;
};

// ── Service card — full-width horizontal rectangle ────────
function ServiceCard({ item }: { item: Post }) {
  const router = useRouter();
  const { isSaved, savePost, unsavePost } = useSaved();
  const { state: { accessToken } } = useAuth();

  const saved    = isSaved(item._id);
  const buyer    = item.user;
  const initials = buyer.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const sType    = item.serviceType ?? item.category;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.87}
      onPress={() => router.push({ pathname: '/home/service-detail', params: { id: item._id, from: '/home/services' } })}
    >
      {/* ── Left: avatar + live dot ── */}
      <View style={styles.avatarCol}>
        {buyer.profilePicture ? (
          <Image source={{ uri: buyer.profilePicture }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
        )}
        <View style={styles.liveDot} />
      </View>

      {/* ── Middle: details ── */}
      <View style={styles.body}>
        {/* Row 1 — service chip + time */}
        <View style={styles.topRow}>
          <View style={styles.sChip}>
            <Ionicons name="construct-outline" size={9} color={AMBER} />
            <Text style={styles.sChipText}>{sType}</Text>
          </View>
          <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>
        </View>

        {/* Row 2 — title */}
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title ?? item.description}
        </Text>

        {/* Row 3 — description */}
        <Text style={styles.cardDesc} numberOfLines={2}>
          {item.description}
        </Text>

        {/* Row 4 — location + budget */}
        <View style={styles.bottomRow}>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={11} color={MUTED} />
            <Text style={styles.metaText} numberOfLines={1}>{item.location}</Text>
          </View>
          <View style={styles.budgetPill}>
            <Text style={styles.budgetText}>{formatBudget(item.budget)}</Text>
          </View>
        </View>
      </View>

      {/* ── Right: save button ── */}
      <TouchableOpacity
        style={styles.saveBtn}
        hitSlop={10}
        onPress={() => saved
          ? unsavePost(item._id, accessToken ?? '')
          : savePost(item, accessToken ?? '')
        }
      >
        <Ionicons
          name={saved ? 'heart' : 'heart-outline'}
          size={18}
          color={saved ? '#E53935' : MUTED}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ── Screen ────────────────────────────────────────────────
export default function ServicesScreen() {
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

  const fetchPosts = useCallback(async () => {
    try {
      setError('');
      const res = await getPostsApi({ requestType: 'service', limit: 100 });
      setPosts(res.data.posts);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load. Check your connection.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchPosts().finally(() => setLoading(false));
  }, [fetchPosts]);

  const onRefresh = async () => { setRefreshing(true); await fetchPosts(); setRefreshing(false); };

  const filtered = posts
    .filter((p) => {
      if (activeCat !== 'All') {
        const cat   = (p.category    ?? '').toLowerCase();
        const sType = (p.serviceType ?? '').toLowerCase();
        const pill  = activeCat.toLowerCase();
        if (cat !== pill && sType !== pill) return false;
      }
      if (!search) return true;
      const q = search.toLowerCase();
      return (p.title       ?? '').toLowerCase().includes(q)
          || p.description.toLowerCase().includes(q)
          || p.location.toLowerCase().includes(q)
          || (p.serviceType ?? '').toLowerCase().includes(q)
          || (p.category    ?? '').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (activeSort === 'Budget ↑') return (a.budget ?? 0) - (b.budget ?? 0);
      if (activeSort === 'Budget ↓') return (b.budget ?? 0) - (a.budget ?? 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/home/feed')} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Requested Services</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* ── Search bar ── */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={15} color={MUTED} style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search services…"
            placeholderTextColor={MUTED}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={15} color={MUTED} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/home/my-post' as any)}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 80 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AMBER} />}
      >
        {/* ── Category pills (horizontal scroll) ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
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
        </ScrollView>

        {/* ── Sort chips ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRow}>
          {SORT_OPTIONS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.sortChip, activeSort === s && styles.sortChipActive]}
              onPress={() => setActiveSort(s)}
              activeOpacity={0.8}
            >
              <Text style={[styles.sortChipText, activeSort === s && styles.sortChipTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Content ── */}
        {loading ? (
          <View style={styles.centred}><ActivityIndicator size="large" color={AMBER} /></View>
        ) : error ? (
          <View style={styles.emptyBox}>
            <Ionicons name="cloud-offline-outline" size={32} color={MUTED} />
            <Text style={styles.emptyTitle}>Could not load</Text>
            <Text style={styles.emptySub}>{error}</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={fetchPosts}>
              <Ionicons name="refresh-outline" size={16} color="#fff" />
              <Text style={styles.emptyBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.countText}>
              <Text style={{ color: DARK, fontWeight: '700' }}>{filtered.length}</Text>
              {' '}request{filtered.length !== 1 ? 's' : ''}
            </Text>
            {filtered.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="construct-outline" size={36} color={AMBER} />
                <Text style={styles.emptyTitle}>No services found</Text>
                <Text style={styles.emptySub}>
                  {search ? 'Try a different search.' : 'No service requests yet.'}
                </Text>
              </View>
            ) : (
              <View style={styles.list}>
                {filtered.map((item) => <ServiceCard key={item._id} item={item} />)}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: BG },
  centred: { paddingTop: 80, alignItems: 'center' },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: CATBG, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: DARK },

  searchRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 10, marginBottom: 12 },
  searchBar:   { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 10, paddingHorizontal: 10, height: 40, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  searchInput: { flex: 1, fontSize: 12, color: DARK },
  addBtn:      { width: 40, height: 40, borderRadius: 10, backgroundColor: AMBER, alignItems: 'center', justifyContent: 'center' },

  scroll: { paddingHorizontal: 16 },

  catRow:            { gap: 7, paddingBottom: 12 },
  catPill:           { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: CARD, borderWidth: 1, borderColor: '#DDD9CF' },
  catPillActive:     { backgroundColor: DARK, borderColor: DARK },
  catPillText:       { fontSize: 10, fontWeight: '600', color: DARK },
  catPillTextActive: { color: '#fff' },

  sortRow:            { gap: 8, paddingBottom: 14 },
  sortChip:           { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: CATBG },
  sortChipActive:     { backgroundColor: AMBER },
  sortChipText:       { fontSize: 11, fontWeight: '600', color: MUTED },
  sortChipTextActive: { color: '#fff' },

  countText: { fontSize: 11, color: MUTED, marginBottom: 10 },

  // ── Horizontal card list ──────────────────────────────
  list: { gap: 10 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ECE8E1',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  // Left — avatar
  avatarCol:      { position: 'relative', marginRight: 14 },
  avatar:         { width: 58, height: 58, borderRadius: 29, borderWidth: 2.5, borderColor: '#E8F4EC' },
  avatarFallback: { backgroundColor: AMBER, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontSize: 20, fontWeight: '900', color: '#fff' },
  liveDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#4CAF50', borderWidth: 2, borderColor: CARD,
  },

  // Middle — body
  body:    { flex: 1, gap: 4 },
  topRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sChip:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3E2', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  sChipText: { fontSize: 9, fontWeight: '700', color: AMBER },
  timeText:  { fontSize: 9, color: MUTED, fontWeight: '500' },

  cardTitle: { fontSize: 13, fontWeight: '800', color: DARK, lineHeight: 18 },
  cardDesc:  { fontSize: 11, color: MUTED, lineHeight: 16 },

  bottomRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  metaItem:   { flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1 },
  metaText:   { fontSize: 10, color: MUTED },
  budgetPill: { backgroundColor: '#E8F4EC', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  budgetText: { fontSize: 10, fontWeight: '800', color: GREEN },

  // Right — save
  saveBtn: { paddingLeft: 10 },

  // Empty / error
  emptyBox:     { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle:   { fontSize: 15, fontWeight: '700', color: DARK },
  emptySub:     { fontSize: 12, color: MUTED, textAlign: 'center', paddingHorizontal: 20 },
  emptyBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: AMBER, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  emptyBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
