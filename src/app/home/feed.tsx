import { useEffect, useRef, useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../store/authStore';
import { useNotifications } from '../../store/notificationStore';
import { getPostsApi, type Post as ApiPost } from '../../services/api';

const BG    = '#F2EFE6';
const CARD  = '#FFFFFF';
const DARK  = '#1B3A2D';
const AMBER = '#E8943A';
const MUTED = '#9CA3AF';
const CATBG = '#EDEAE1';
const CARD_W = '47%' as const;

const CATEGORIES = [
  { label: 'Electronics', icon: 'phone-portrait-outline' as const, browsecat: 'Electronics', isService: false },
  { label: 'Fashion',     icon: 'shirt-outline'          as const, browsecat: 'Fashion',     isService: false },
  { label: 'Home',        icon: 'home-outline'           as const, browsecat: 'Home',        isService: false },
  { label: 'Vehicles',    icon: 'car-outline'            as const, browsecat: 'Vehicles',    isService: false },
  { label: 'Services',    icon: 'construct-outline'      as const, browsecat: 'Services',    isService: true  },
  { label: 'More',        icon: 'grid-outline'           as const, browsecat: 'All',         isService: false },
];

// previously dummy live requests; now loaded from API

const POPULAR = [
  { id: '1', price: 'GH₵850',   name: 'iPhone 12',    location: 'Airport',    rating: 4.8, reviews: 36, bg: '#DDE2E8', emoji: '📱' },
  { id: '2', price: 'GH₵1,200', name: 'Sofa Set',     location: 'East Legon', rating: 4.9, reviews: 18, bg: '#E8E2D5', emoji: '🛋️' },
  { id: '3', price: 'GH₵450',   name: 'Office Chair', location: 'Lapaz',      rating: 4.7, reviews: 24, bg: '#C8B99A', emoji: '🪑' },
  { id: '4', price: 'GH₵2,500', name: 'Smart TV',     location: 'Tema',       rating: 4.6, reviews: 11, bg: '#C5D0D8', emoji: '📺' },
];

const HOW_STEPS = [
  { icon: 'create-outline'           as const, label: 'Post what\nyou need',            badge: 1    },
  { icon: 'notifications-outline'    as const, label: 'Sellers receive\nnotifications', badge: 2    },
  { icon: 'git-compare-outline'      as const, label: 'Compare\noffers',                badge: 8    },
  { icon: 'shield-checkmark-outline' as const, label: 'Buy\nconfidently',               badge: null },
];

function CatItem({ label, icon, shakeRef, onPress }: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  shakeRef: (fn: () => void) => void;
  onPress: () => void;
}) {
  const rotate = useRef(new Animated.Value(0)).current;
  const scale  = useRef(new Animated.Value(1)).current;

  const shake = useCallback(() => {
    rotate.setValue(0); scale.setValue(1);
    Animated.sequence([
      Animated.parallel([
        Animated.sequence([
          Animated.timing(rotate, { toValue: 1,  duration: 80,  useNativeDriver: true }),
          Animated.timing(rotate, { toValue: -1, duration: 80,  useNativeDriver: true }),
          Animated.timing(rotate, { toValue: 1,  duration: 80,  useNativeDriver: true }),
          Animated.timing(rotate, { toValue: -1, duration: 80,  useNativeDriver: true }),
          Animated.timing(rotate, { toValue: 0,  duration: 60,  useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.2, duration: 120, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1,   duration: 160, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  }, [rotate, scale]);

  useEffect(() => { shakeRef(shake); }, [shake, shakeRef]);

  const spin = rotate.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-18deg', '0deg', '18deg'] });

  return (
    <TouchableOpacity style={styles.catItem} activeOpacity={0.75} onPress={() => { shake(); onPress(); }}>
      <Animated.View style={[styles.catIconBox, { transform: [{ rotate: spin }, { scale }] }]}>
        <Ionicons name={icon} size={22} color={DARK} />
      </Animated.View>
      <Text style={styles.catLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state: { user } } = useAuth();
  const { state: { unreadCount: notifUnread } } = useNotifications();

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.fullName?.split(' ')[0] ?? 'there';

  const [locationAsked, setLocationAsked] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') setLocationAsked(true);
    })();
  }, []);

  const requestLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') setLocationAsked(false);
  };

  const shakeFns = useRef<Record<number, () => void>>({});
  const lastIdx  = useRef<number>(-1);

  useEffect(() => {
    const interval = setInterval(() => {
      const total = CATEGORIES.length;
      let idx: number;
      do { idx = Math.floor(Math.random() * total); }
      while (idx === lastIdx.current && total > 1);
      lastIdx.current = idx;
      shakeFns.current[idx]?.();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const makeShakeRef = (idx: number) => (fn: () => void) => { shakeFns.current[idx] = fn; };

  // live posts from backend
  const [livePosts, setLivePosts] = useState<ApiPost[]>([]);
  const [loadingLive, setLoadingLive] = useState(false);

  const getIconForCategory = (cat: string) => {
    const found = CATEGORIES.find((c) => c.browsecat === cat || c.label === cat);
    return (found?.icon as React.ComponentProps<typeof Ionicons>['name']) || 'grid-outline';
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingLive(true);
      try {
        const res = await getPostsApi({ page: 1, limit: 10 });
        if (mounted) setLivePosts(res.data.posts || []);
      } catch (err) {
        console.warn('Failed to load live posts', err);
      } finally {
        if (mounted) setLoadingLive(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity hitSlop={8} onPress={() => router.push('/home/menu')}>
          <Ionicons name="menu-outline" size={26} color={DARK} />
        </TouchableOpacity>
        <Text style={styles.appTitle}>Dwaso</Text>
        <TouchableOpacity style={styles.bellWrap} hitSlop={8} onPress={() => router.push('/home/notifications')}>
          <Ionicons name="notifications-outline" size={24} color={DARK} />
          {notifUnread > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{notifUnread > 99 ? '99+' : notifUnread}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Greeting ── */}
        <View style={styles.greetRow}>
          <Text style={styles.greetSub}>{greeting}, {firstName} 👋</Text>
        </View>

        {/* ── Location permission banner ── */}
        {locationAsked && (
          <TouchableOpacity style={styles.locationBanner} onPress={requestLocation} activeOpacity={0.88}>
            <View style={styles.locationBannerIcon}>
              <Ionicons name="location-outline" size={20} color={AMBER} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.locationBannerTitle}>Enable Location</Text>
              <Text style={styles.locationBannerSub}>Find sellers and requests near you</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={AMBER} />
            <TouchableOpacity onPress={() => setLocationAsked(false)} hitSlop={8} style={{ padding: 4 }}>
              <Ionicons name="close" size={16} color={MUTED} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* ── Banner ── */}
        <View style={styles.bannerWrapper}>
          <Image source={require('../../../assets/images/banner.png')} style={styles.bannerImage} resizeMode="cover" />
        </View>

        {/* ── Search bar ── */}
        <TouchableOpacity style={styles.searchRow} activeOpacity={0.85} onPress={() => router.push('/home/search')}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={MUTED} style={{ marginRight: 8 }} />
            <Text style={styles.searchPlaceholder}>Search for anything...</Text>
          </View>
          <View style={styles.filterBtn}>
            <Ionicons name="options-outline" size={20} color={DARK} />
          </View>
        </TouchableOpacity>

        {/* ── Post a Request banner ── */}
        <View style={styles.postReqBanner}>
          <View style={styles.postReqIcon}>
            <Ionicons name="document-text-outline" size={28} color={AMBER} />
          </View>
          <View style={styles.postReqText}>
            <Text style={styles.postReqTitle}>Post a request</Text>
            <Text style={styles.postReqSub}>Tell us what you need and{'\n'}get offers from nearby sellers.</Text>
          </View>
          <TouchableOpacity style={styles.postReqBtn} activeOpacity={0.85} onPress={() => router.push('/home/my-post')}>
            <Text style={styles.postReqBtnText}>POST REQUEST</Text>
            <Ionicons name="arrow-forward" size={14} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ── Quick actions ── */}
        <View style={styles.quickRow}>
          {[
            { icon: 'bag-outline'        as const, label: 'Requested\nProducts', iconBg: '#E8F4EC', iconColor: '#2E7D52', onPress: () => router.push('/home/browse')        },
            { icon: 'help-circle-outline'as const, label: 'Post\nRequest',       iconBg: '#FEF3E2', iconColor: AMBER,     onPress: () => router.push('/home/my-post')       },
            { icon: 'construct-outline'  as const, label: 'Service\nRequested',  iconBg: '#FFF4E6', iconColor: '#E8943A', onPress: () => router.push('/home/services') },
            { icon: 'storefront-outline' as const, label: 'Become\na Seller',    iconBg: '#EAF0FB', iconColor: '#3B6FD4', onPress: () => router.push('/home/become-seller') },
          ].map((q, i, arr) => (
            <TouchableOpacity key={q.label} style={[styles.quickItem, i < arr.length - 1 && styles.quickItemBorder]} activeOpacity={0.8} onPress={q.onPress}>
              <View style={[styles.quickIconBox, { backgroundColor: q.iconBg }]}>
                <Ionicons name={q.icon} size={20} color={q.iconColor} />
              </View>
              <Text style={styles.quickLabel}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </View>


        {/* ── Categories ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <TouchableOpacity><Text style={styles.seeAll}>See all</Text></TouchableOpacity>
        </View>
        <View style={styles.categoriesRow}>
          {CATEGORIES.map((cat, i) => (
            <CatItem
              key={cat.label} label={cat.label} icon={cat.icon}
              shakeRef={makeShakeRef(i)}
              onPress={() => {
                if (cat.isService) {
                  router.push('/home/services');
                } else {
                  router.push({ pathname: '/home/browse', params: { cat: cat.browsecat } });
                }
              }}
            />
          ))}
        </View>


        {/* ── Live Requests ── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.fireEmoji}>🔥</Text>
            <Text style={styles.sectionTitle}>Live Requests</Text>
          </View>
          <TouchableOpacity><Text style={styles.seeAll}>See all</Text></TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.liveScroll}>
          {livePosts.map((post) => (
            <TouchableOpacity
              key={post._id}
              style={styles.liveCard}
              activeOpacity={0.85}
              onPress={() => {
                const isService =
                  post.category === 'Services' ||
                  Boolean(post.serviceType) ||
                  (post as any).requestType === 'service';
                router.push({
                  pathname: isService ? '/home/service-detail' : '/home/product-detail',
                  params: { id: post._id, from: '/home/feed' },
                });
              }}
            >
              <View style={styles.liveCardTop}>
                <View style={styles.liveIconBox}>
                  <Ionicons name={getIconForCategory(post.category)} size={20} color={DARK} />
                </View>
                <View style={styles.liveDot} />
              </View>
              <Text style={styles.liveCat}>{post.category}</Text>
              <Text style={styles.liveTitle} numberOfLines={2} ellipsizeMode="tail">{post.title ?? post.description.substring(0, 60)}</Text>
              <Text style={styles.liveBudget}>Budget: <Text style={{ color: AMBER }}>{post.budget ? `GH₵${post.budget}` : '—'}</Text></Text>
              <View style={styles.liveFooter}>
                <View style={styles.liveAvatarStack}>
                  {[...Array(3)].map((_, i) => (
                    <View key={i} style={[styles.liveAvatar, { left: i * 14 }]}>
                      <Text style={{ fontSize: 9 }}>👤</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.liveSellers}>12 sellers notified</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── How Dwaso Works ── */}
        <View style={styles.howSection}>
          <View style={styles.howHeader}><Text style={styles.howTitle}>How Dwaso Works</Text></View>
          <View style={styles.howDivider} />
          <View style={styles.howStepsRow}>
            {HOW_STEPS.map((step, i) => (
              <View key={step.label} style={styles.howStep}>
                <View style={styles.howIconWrap}>
                  <Ionicons name={step.icon} size={20} color={DARK} />
                  {step.badge !== null && (
                    <View style={styles.howBadge}><Text style={styles.howBadgeText}>{step.badge}</Text></View>
                  )}
                </View>
                {i < HOW_STEPS.length - 1 && <Ionicons name="arrow-forward" size={14} color={MUTED} style={styles.howArrow} />}
                <Text style={styles.howLabel}>{step.label}</Text>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
  appTitle: { fontSize: 22, fontWeight: '800', color: DARK, letterSpacing: -0.3 },
  bellWrap: { position: 'relative', width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  bellBadge: { position: 'absolute', top: 0, right: 0, width: 16, height: 16, borderRadius: 8, backgroundColor: AMBER, alignItems: 'center', justifyContent: 'center' },
  bellBadgeText: { fontSize: 8, color: '#fff', fontWeight: '700' },
  scroll: { paddingBottom: 48 },
  greetRow: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 },
  greetSub: { fontSize: 11, color: MUTED },

  // Location banner
  locationBanner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 12, backgroundColor: '#FFF8F0', borderRadius: 14, padding: 12, gap: 10, borderWidth: 1, borderColor: '#F5E0C8' },
  locationBannerIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FDE9D0', alignItems: 'center', justifyContent: 'center' },
  locationBannerTitle: { fontSize: 12, fontWeight: '700', color: DARK, marginBottom: 2 },
  locationBannerSub: { fontSize: 10, color: MUTED },

  bannerWrapper: { marginBottom: 16 },
  bannerImage: { width: '100%', height: 130 },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 10, marginBottom: 4 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  searchPlaceholder: { flex: 1, fontSize: 12, color: MUTED },
  filterBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  postReqBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8F0', marginHorizontal: 20, borderRadius: 16, padding: 16, marginBottom: 20, gap: 12, borderWidth: 1, borderColor: '#F5E0C8' },
  postReqIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#FDE9D0', alignItems: 'center', justifyContent: 'center' },
  postReqText: { flex: 1 },
  postReqTitle: { fontSize: 12, fontWeight: '700', color: DARK, marginBottom: 2 },
  postReqSub: { fontSize: 10, color: MUTED, lineHeight: 15 },
  postReqBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: AMBER, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  postReqBtnText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 20, marginBottom: 28, backgroundColor: CARD, borderRadius: 16, paddingVertical: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  quickItem: { flex: 1, minWidth: 0, alignItems: 'center', gap: 6, paddingVertical: 8 },
  quickItemBorder: { borderRightWidth: 1, borderRightColor: '#EEEBE3' },
  quickIconBox: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 10, fontWeight: '600', color: DARK, textAlign: 'center', lineHeight: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 14 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fireEmoji: { fontSize: 14 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: DARK },
  seeAll: { fontSize: 12, fontWeight: '600', color: AMBER },
  liveScroll: { paddingHorizontal: 20, paddingBottom: 4, gap: 12, marginBottom: 28 },
  liveCard: { width: 170, backgroundColor: CARD, borderRadius: 16, padding: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  liveCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  liveIconBox: { width: 40, height: 25, borderRadius: 10, backgroundColor: CATBG, alignItems: 'center', justifyContent: 'center' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: AMBER },
  liveCat: { fontSize: 10, color: AMBER, fontWeight: '600', marginBottom: 2 },
  liveTitle: { fontSize: 11, fontWeight: '700', color: DARK, lineHeight: 14, marginBottom: 4 },
  liveBudget: { fontSize: 10, color: MUTED, marginBottom: 6 },
  liveFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveAvatarStack: { flexDirection: 'row', width: 42, height: 16, position: 'relative' },
  liveAvatar: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: CATBG, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: CARD },
  liveSellers: { fontSize: 9, color: MUTED },
  categoriesRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 28 },
  catItem: { alignItems: 'center', gap: 6 },
  catIconBox: { width: 52, height: 52, borderRadius: 14, backgroundColor: CATBG, alignItems: 'center', justifyContent: 'center' },
  catLabel: { fontSize: 9, fontWeight: '600', color: DARK, textAlign: 'center' },
  popularScroll: { paddingHorizontal: 20, paddingBottom: 4, gap: 12, marginBottom: 28 },
  popularCard: { width: CARD_W, backgroundColor: CARD, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  popularImg: { width: '100%', height: 120, alignItems: 'center', justifyContent: 'center' },
  popularEmoji: { fontSize: 48 },
  heartBtn: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  popularInfo: { padding: 10, gap: 3 },
  popularPrice: { fontSize: 12, fontWeight: '700', color: AMBER },
  popularName: { fontSize: 11, fontWeight: '600', color: DARK },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 9, color: MUTED },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locationText: { fontSize: 9, color: MUTED },
  howSection: { marginHorizontal: 20, backgroundColor: CARD, borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  howHeader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  howTitle: { fontSize: 14, fontWeight: '700', color: DARK },
  howDivider: { height: 1, backgroundColor: CATBG, marginHorizontal: 16, marginBottom: 4 },
  howStepsRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: 16, paddingTop: 14 },
  howStep: { alignItems: 'center', gap: 6, flex: 1 },
  howIconWrap: { position: 'relative', width: 40, height: 40, borderRadius: 20, backgroundColor: CATBG, alignItems: 'center', justifyContent: 'center' },
  howBadge: { position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: AMBER, alignItems: 'center', justifyContent: 'center' },
  howBadgeText: { fontSize: 8, color: '#fff', fontWeight: '700' },
  howArrow: { position: 'absolute', right: -8, top: 12 },
  howLabel: { fontSize: 8, color: DARK, textAlign: 'center', lineHeight: 12, fontWeight: '500' },
});
