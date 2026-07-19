/**
 * search.tsx
 * Live search screen — queries the backend as the user types (debounced 400ms).
 * Recent searches stored in local state (session-only; could be persisted with AsyncStorage if needed).
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, FlatList,
  TouchableOpacity, TextInput, Image,
  ActivityIndicator, Dimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getPostsApi, type Post } from '@/services/api';
import { useSaved } from '@/store/savedStore';
import { useAuth } from '@/store/authStore';

const BG     = '#F2EFE6';
const CARD   = '#FFFFFF';
const DARK   = '#1B3A2D';
const AMBER  = '#E8943A';
const MUTED  = '#9CA3AF';
const CATBG  = '#EDEAE1';
const SCREEN_W = Dimensions.get('window').width;

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

const formatBudget = (budget: number | null) =>
  budget ? `GH₵${budget.toLocaleString()}` : 'Negotiable';

const TRENDING_CATEGORIES = [
  { label: 'Electronics', icon: 'phone-portrait-outline' as const },
  { label: 'Fashion',     icon: 'shirt-outline'          as const },
  { label: 'Home',        icon: 'home-outline'           as const },
  { label: 'Vehicles',    icon: 'car-outline'            as const },
  { label: 'Services',    icon: 'construct-outline'      as const },
  { label: 'Health',      icon: 'medkit-outline'         as const },
];

// ── Result card ───────────────────────────────────────────
function ResultCard({ item }: { item: Post }) {
  const router  = useRouter();
  const { isSaved, savePost, unsavePost } = useSaved();
  const { state: { accessToken } }        = useAuth();
  const { bg, color } = catStyle(item.category);
  const saved = isSaved(item._id);

  return (
    <TouchableOpacity
      style={styles.resultCard}
      activeOpacity={0.85}
      onPress={() => router.push({ pathname: '/home/product-detail', params: { id: item._id, from: '/home/search' } })}
    >
      {/* image / placeholder */}
      <View style={[styles.resultImg, { backgroundColor: bg }]}>
        {item.images.length > 0 ? (
          <Image source={{ uri: item.images[0] }} style={styles.resultImgFull} resizeMode="cover" />
        ) : (
          <Ionicons name="image-outline" size={32} color={color} style={{ opacity: 0.5 }} />
        )}
      </View>

      <View style={styles.resultInfo}>
        <View style={styles.resultTopRow}>
          <View style={[styles.catBadge, { backgroundColor: bg }]}>
            <Text style={[styles.catBadgeText, { color }]}>{item.category}</Text>
          </View>
          <TouchableOpacity
            hitSlop={8}
            onPress={() =>
              saved
                ? unsavePost(item._id, accessToken ?? '')
                : savePost(item, accessToken ?? '')
            }
          >
            <Ionicons name={saved ? 'heart' : 'heart-outline'} size={16} color={saved ? '#E53935' : MUTED} />
          </TouchableOpacity>
        </View>
        <Text style={styles.resultName} numberOfLines={1}>
          {item.title ?? item.description}
        </Text>
        <Text style={styles.resultDesc} numberOfLines={2}>{item.description}</Text>
        <View style={styles.resultMeta}>
          <Text style={styles.resultPrice}>{formatBudget(item.budget)}</Text>
          <View style={styles.resultLocRow}>
            <Ionicons name="location-outline" size={11} color={MUTED} />
            <Text style={styles.resultLoc}>{item.location}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Screen ────────────────────────────────────────────────
export default function SearchScreen() {
  const insets   = useSafeAreaInsets();
  const router   = useRouter();
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState<Post[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false); // true after first real search
  const [recents,  setRecents]  = useState<string[]>([]);

  // Auto-focus on mount
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await getPostsApi({ search: trimmed, limit: 30 });
      setResults(res.data.posts);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChangeText = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(text), 400);
  };

  const handleSubmit = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (!trimmed) return;
    // Add to recents (max 6, no duplicates)
    setRecents((prev) => [trimmed, ...prev.filter((r) => r.toLowerCase() !== trimmed.toLowerCase())].slice(0, 6));
    doSearch(trimmed);
  };

  const applyRecent = (term: string) => {
    setQuery(term);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    doSearch(term);
  };

  const clearRecents = () => setRecents([]);

  const showHome    = query.trim().length === 0;
  const showEmpty   = searched && !loading && results.length === 0 && query.trim().length > 0;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* ── Search bar ── */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={14} color={MUTED} style={{ marginRight: 6 }} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search requests, categories…"
            placeholderTextColor={MUTED}
            value={query}
            onChangeText={handleChangeText}
            onSubmitEditing={handleSubmit}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setSearched(false); }} hitSlop={8}>
              <Ionicons name="close-circle" size={14} color={MUTED} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item._id}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListHeaderComponent={
          <>
            {/* ── Default: recents + trending ── */}
            {showHome && (
              <>
                {recents.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionTitle}>Recent Searches</Text>
                      <TouchableOpacity hitSlop={8} onPress={clearRecents}>
                        <Text style={styles.clearText}>Clear</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.chipRow}>
                      {recents.map((r) => (
                        <TouchableOpacity key={r} style={styles.recentChip} onPress={() => applyRecent(r)} activeOpacity={0.8}>
                          <Ionicons name="time-outline" size={13} color={MUTED} />
                          <Text style={styles.recentText}>{r}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Browse Categories</Text>
                  <View style={styles.trendGrid}>
                    {TRENDING_CATEGORIES.map((t) => (
                      <TouchableOpacity
                        key={t.label}
                        style={styles.trendCard}
                        activeOpacity={0.85}
                        onPress={() => router.push({ pathname: '/home/browse', params: { cat: t.label } })}
                      >
                        <View style={styles.trendIconBox}>
                          <Ionicons name={t.icon} size={20} color={AMBER} />
                        </View>
                        <Text style={styles.trendLabel}>{t.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            )}

            {/* ── Loading spinner ── */}
            {loading && (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={AMBER} />
                <Text style={styles.loadingText}>Searching…</Text>
              </View>
            )}

            {/* ── Results count ── */}
            {!loading && results.length > 0 && (
              <Text style={styles.resultsCount}>
                <Text style={{ color: DARK, fontWeight: '700' }}>{results.length}</Text> result{results.length !== 1 ? 's' : ''} for "{query.trim()}"
              </Text>
            )}

            {/* ── No results ── */}
            {showEmpty && (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconBox}>
                  <Ionicons name="search-outline" size={30} color={AMBER} />
                </View>
                <Text style={styles.emptyTitle}>No results found</Text>
                <Text style={styles.emptySub}>Try a different keyword, category or location.</Text>
              </View>
            )}
          </>
        }
        renderItem={({ item }) => <ResultCard item={item} />}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: {
    paddingHorizontal: 40, paddingVertical: 10,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 0,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 12, color: DARK, height: 36 },

  scroll: { paddingHorizontal: 16 },

  section: { marginBottom: 22 },
  sectionHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: DARK, marginBottom: 12 },
  clearText:    { fontSize: 12, color: AMBER, fontWeight: '600' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recentChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: CARD, borderRadius: 20,
    borderWidth: 1, borderColor: '#E5E1D8',
    paddingHorizontal: 12, paddingVertical: 7,
  },
  recentText: { fontSize: 12, color: DARK },

  trendGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  trendCard: {
    width: (SCREEN_W - 32 - 20) / 3,
    backgroundColor: CARD, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center', gap: 8,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  trendIconBox: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#FEF3E2', alignItems: 'center', justifyContent: 'center',
  },
  trendLabel: { fontSize: 11, fontWeight: '600', color: DARK },

  loadingBox:   { alignItems: 'center', paddingVertical: 24, gap: 8, flexDirection: 'row', justifyContent: 'center' },
  loadingText:  { fontSize: 13, color: MUTED },

  resultsCount: { fontSize: 12, color: MUTED, marginBottom: 12 },

  // Result card — horizontal layout
  resultCard: {
    flexDirection: 'row', backgroundColor: CARD, borderRadius: 12,
    overflow: 'hidden', height: 80,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },
  resultImg:     { width: 80, alignItems: 'center', justifyContent: 'center' },
  resultImgFull: { width: '100%', height: '100%' },
  resultInfo:    { flex: 1, paddingHorizontal: 10, paddingVertical: 8, gap: 2 },
  resultTopRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 1 },
  catBadge:      { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  catBadgeText:  { fontSize: 8, fontWeight: '700' },
  resultName:    { fontSize: 12, fontWeight: '700', color: DARK },
  resultDesc:    { fontSize: 10, color: MUTED, lineHeight: 14 },
  resultMeta:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  resultPrice:   { fontSize: 12, fontWeight: '800', color: AMBER },
  resultLocRow:  { flexDirection: 'row', alignItems: 'center', gap: 3 },
  resultLoc:     { fontSize: 9, color: MUTED },

  emptyState:   { alignItems: 'center', paddingTop: 50, gap: 10 },
  emptyIconBox: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#FEF3E2', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: DARK },
  emptySub:   { fontSize: 12, color: MUTED, textAlign: 'center', lineHeight: 18 },
});
