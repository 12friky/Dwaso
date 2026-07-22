import { useEffect, useState } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../store/authStore';
import { getMyPostsApi, updatePostApi, type Post } from '../../services/api';

const BG    = '#F2EFE6';
const CARD  = '#FFFFFF';
const DARK  = '#1B3A2D';
const AMBER = '#E8943A';
const MUTED = '#9CA3AF';
const CATBG = '#EDEAE1';

const TABS = ['Active', 'Closed'];

export default function MyRequestsScreen() {
  const insets   = useSafeAreaInsets();
  const router   = useRouter();
  const { state: { accessToken } } = useAuth();
  const [tab, setTab] = useState(0);
  const [requests, setRequests] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    let mounted = true;
    setLoading(true);
    getMyPostsApi(accessToken)
      .then((res) => {
        if (mounted) setRequests(res.data.posts);
      })
      .catch((err) => {
        console.warn('Failed to load my requests', err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [accessToken]);

  const filtered = requests.filter((r) =>
    tab === 0 ? r.status === 'open' : r.status === 'closed'
  );

  const isServiceRequest = (req: Post) =>
    req.requestType === 'service' || Boolean(req.serviceType) || req.category === 'Services';

  const toggleRequestStatus = async (request: Post) => {
    if (!accessToken) return;
    const nextStatus = request.status === 'open' ? 'closed' : 'open';
    const action = nextStatus === 'open' ? 'reopen' : 'close';
    setUpdatingId(request._id);
    try {
      const res = await updatePostApi(request._id, { status: nextStatus }, accessToken);
      setRequests((prev) => prev.map((req) =>
        req._id === request._id ? res.data.post : req
      ));
    } catch (err) {
      console.warn(`Failed to ${action} request`, err);
      Alert.alert('Could not update request', `We could not ${action} this request. Please try again.`);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/home/profile')} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Requests</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => router.push('/home/my-post')}
          hitSlop={8}
        >
          <Ionicons name="add" size={22} color={AMBER} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        {TABS.map((t, i) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === i && styles.tabActive]} onPress={() => setTab(i)} activeOpacity={0.8}>
            <Text style={[styles.tabText, tab === i && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 80 }]}>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Ionicons name="search-outline" size={30} color={AMBER} /></View>
            <Text style={styles.emptyTitle}>No {TABS[tab].toLowerCase()} requests</Text>
            <Text style={styles.emptySub}>Post a request and nearby sellers will reach out.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/home/my-post')}>
              <Text style={styles.emptyBtnText}>Post a Request</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.list}>
            {filtered.map((req) => (
              <View key={req._id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.catBadge}>
                    <Text style={styles.catBadgeText}>{req.category}</Text>
                  </View>
                  <View style={[styles.statusDot, { backgroundColor: req.status === 'open' ? '#4CAF50' : MUTED }]} />
                </View>
                <Text style={styles.cardTitle}>{req.title ?? req.description}</Text>
                <Text style={styles.cardBudget}>Budget: <Text style={{ color: AMBER, fontWeight: '700' }}>{req.budget ? `GH₵${req.budget}` : 'Not specified'}</Text></Text>
                <View style={styles.cardFooter}>
                  <View style={styles.offersRow}>
                    <Ionicons name="people-outline" size={13} color={MUTED} />
                    <Text style={styles.offersText}>{req?.images?.length ?? 0} images</Text>
                  </View>
                  <Text style={styles.postedAt}>{new Date(req.createdAt).toLocaleDateString()}</Text>
                </View>
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.viewRequestBtn}
                    activeOpacity={0.85}
                    onPress={() => router.push({
                      pathname: isServiceRequest(req) ? '/home/service-detail' : '/home/product-detail',
                      params: { id: req._id, from: '/home/my-requests' },
                    })}
                  >
                    <Text style={styles.viewRequestBtnText}>View Request</Text>
                    <Ionicons name="arrow-forward" size={13} color={AMBER} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.closeRequestBtn, req.status === 'closed' && styles.openRequestBtn]}
                    activeOpacity={0.85}
                    onPress={() => toggleRequestStatus(req)}
                    disabled={updatingId === req._id}
                  >
                    <Text style={[styles.closeRequestText, req.status === 'closed' && styles.openRequestText]}>
                      {updatingId === req._id ? 'Updating…' : req.status === 'open' ? 'Close Request' : 'Open Request'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: CATBG, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: DARK },
  newBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEF3E2', alignItems: 'center', justifyContent: 'center' },
  tabRow: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 16, backgroundColor: CATBG, borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: CARD, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 12, fontWeight: '600', color: MUTED },
  tabTextActive: { color: DARK },
  scroll: { paddingHorizontal: 20 },
  list: { gap: 12 },
  card: { backgroundColor: CARD, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  catBadge: { backgroundColor: '#FEF3E2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  catBadgeText: { fontSize: 10, fontWeight: '700', color: AMBER },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: DARK, marginBottom: 4, lineHeight: 20 },
  cardBudget: { fontSize: 12, color: MUTED, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  offersRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  offersText: { fontSize: 11, color: MUTED },
  postedAt: { fontSize: 11, color: MUTED },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  viewRequestBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FEF3E2', borderRadius: 10, paddingVertical: 9, flex: 1 },
  viewRequestBtnText: { fontSize: 12, fontWeight: '700', color: AMBER },
  closeRequestBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F5F5', borderRadius: 10, paddingVertical: 9 },
  closeRequestText: { fontSize: 12, fontWeight: '700', color: DARK },
  openRequestBtn: { backgroundColor: '#E8F4EC' },
  openRequestText: { color: '#2E7D52' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#FEF3E2', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: DARK },
  emptySub: { fontSize: 12, color: MUTED, textAlign: 'center', lineHeight: 18, paddingHorizontal: 24 },
  emptyBtn: { marginTop: 8, backgroundColor: AMBER, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 11 },
  emptyBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
