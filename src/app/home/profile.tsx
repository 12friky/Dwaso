import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, View, Text, ScrollView,
  TouchableOpacity, Switch, Image, Alert, RefreshControl,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../store/authStore';
import { getMeApi, getMyPostsApi, getSavedApi } from '../../services/api';

// ── Palette ───────────────────────────────────────────────
const BG    = '#FFFFFF';

const DARK  = '#1B3A2D';
const AMBER = '#E8943A';
const MUTED = '#9CA3AF';
const CATBG = '#F3F4F1';
const GREEN  = '#2E7D52';

const ACCOUNT_ITEMS = [
  { icon: 'person-outline'           as const, label: 'Edit Profile',    route: '/home/edit-profile'    },
  { icon: 'location-outline'         as const, label: 'Saved Addresses', route: '/home/saved-addresses' },
];

const ACTIVITY_ITEMS = [
  { icon: 'search-outline' as const, label: 'My Requests', route: '/home/my-requests' },
  { icon: 'heart-outline'  as const, label: 'Saved Items', route: '/home/saved'       },
];

const SUPPORT_ITEMS = [
  { icon: 'help-circle-outline'        as const, label: 'Help & Support',  route: '/home/help-support' },
  { icon: 'document-text-outline'      as const, label: 'Terms & Privacy', route: '/home/terms'        },
  { icon: 'information-circle-outline' as const, label: 'About Dwaso',     route: '/home/about'        },
];

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuItem({
  icon, label, badge, right, onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  badge?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} activeOpacity={0.75} onPress={onPress}>
      <View style={styles.menuIconBox}>
        <Ionicons name={icon} size={18} color={DARK} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <View style={styles.menuRight}>
        {badge && <View style={styles.menuBadge}><Text style={styles.menuBadgeText}>{badge}</Text></View>}
        {right ?? <Ionicons name="chevron-forward" size={16} color={MUTED} />}
      </View>
    </TouchableOpacity>
  );
}

function MenuSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.menuSection}>
      <Text style={styles.menuSectionTitle}>{title}</Text>
      <View style={styles.menuCard}>{children}</View>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state: { user, accessToken }, clearUser, updateUser } = useAuth();
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requestCount, setRequestCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);

  const stats = [
    { label: 'Requests', value: String(requestCount) },
    { label: 'Saved', value: String(savedCount) },
  ];

  const fetchUser = useCallback(async () => {
    if (!accessToken) return;
    try {
      const [userRes, postsRes, savedRes] = await Promise.all([
        getMeApi(accessToken),
        getMyPostsApi(accessToken),
        getSavedApi(accessToken),
      ]);
      updateUser(userRes.data.user);
      setRequestCount(postsRes.data.posts.length);
      setSavedCount(savedRes.data.posts.length);
    } catch { /* non-fatal */ }
  }, [accessToken, updateUser]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUser();
    setRefreshing(false);
  }, [fetchUser]);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive', onPress: () => {
          clearUser();
          router.replace('/login');
        },
      },
    ]);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity style={styles.settingsBtn} hitSlop={8}>
          <Ionicons name="settings-outline" size={20} color={DARK} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 90 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={AMBER} colors={[AMBER]} />
        }
      >
        {/* ── Profile card ── */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            {user?.profilePicture ? (
              <Image source={{ uri: user.profilePicture }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarInitial}>
                  {user?.fullName?.charAt(0)?.toUpperCase() ?? '?'}
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.editAvatarBtn}
              onPress={() => router.push('/home/edit-profile' as any)}
            >
              <Ionicons name="camera" size={13} color="#fff" />
            </TouchableOpacity>
          </View>

          <Text style={styles.profileName}>{user?.fullName ?? '—'}</Text>
          <Text style={styles.profileEmail}>{user?.email ?? user?.phone ?? '—'}</Text>

          <View style={styles.locationRow}>
            <Ionicons name="call-outline" size={12} color={MUTED} />
            <Text style={styles.locationText}>+233 {user?.phone ?? '—'}</Text>
          </View>

          {user?.role === 'seller' ? (
            <View style={[styles.sellerBadge, styles.sellerBadgeSeller]}>
              <Ionicons name="checkmark-circle-outline" size={14} color={GREEN} />
              <Text style={[styles.sellerBadgeText, styles.sellerBadgeSellerText]}>Verified Seller</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.sellerBadge}
              activeOpacity={0.85}
              onPress={() => router.push('/home/become-seller' as any)}
            >
              <Ionicons name="storefront-outline" size={14} color={AMBER} />
              <Text style={styles.sellerBadgeText}>Become a Seller</Text>
              <Ionicons name="arrow-forward" size={13} color={AMBER} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Stats ── */}
        <View style={styles.statsRow}>
          {stats.map((s) => <StatCard key={s.label} {...s} />)}
        </View>

        {/* ── Quick actions ── */}
        <View style={styles.quickRow}>
          {[
            { icon: 'search-outline' as const, label: 'My\nRequests', bg: '#FEF3E2', color: AMBER, route: '/home/my-requests' },
            { icon: 'heart-outline'  as const, label: 'Saved\nItems', bg: '#E8F4EC', color: GREEN,  route: '/home/saved'       },
          ].map((q, i, arr) => (
            <TouchableOpacity
              key={q.label}
              style={[styles.quickItem, i < arr.length - 1 && styles.quickItemBorder]}
              activeOpacity={0.8}
              onPress={() => router.push(q.route as any)}
            >
              <View style={[styles.quickIconBox, { backgroundColor: q.bg }]}>
                <Ionicons name={q.icon} size={18} color={q.color} />
              </View>
              <Text style={styles.quickLabel}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Account ── */}
        <MenuSection title="Account">
          {ACCOUNT_ITEMS.map((item, i) => (
            <View key={item.label}>
              <MenuItem
                icon={item.icon}
                label={item.label}
                onPress={item.route ? () => router.push(item.route as any) : undefined}
              />
              {i < ACCOUNT_ITEMS.length - 1 && <View style={styles.menuDivider} />}
            </View>
          ))}
        </MenuSection>

        {/* ── Activity ── */}
        <MenuSection title="Activity">
          {ACTIVITY_ITEMS.map((item, i) => (
            <View key={item.label}>
              <MenuItem icon={item.icon} label={item.label} onPress={() => router.push(item.route as any)} />
              {i < ACTIVITY_ITEMS.length - 1 && <View style={styles.menuDivider} />}
            </View>
          ))}
        </MenuSection>

        {/* ── Preferences ── */}
        <MenuSection title="Preferences">
          <MenuItem
            icon="notifications-outline"
            label="Push Notifications"
            right={
              <Switch
                value={notificationsOn}
                onValueChange={setNotificationsOn}
                trackColor={{ false: CATBG, true: AMBER }}
                thumbColor={BG}
                ios_backgroundColor={CATBG}
                style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
              />
            }
          />
          <View style={styles.menuDivider} />
          <MenuItem icon="moon-outline" label="Dark Mode (coming soon)" />
          <View style={styles.menuDivider} />
          <MenuItem icon="language-outline" label="Language" badge="English" />
        </MenuSection>

        {/* ── Support ── */}
        <MenuSection title="Support">
          {SUPPORT_ITEMS.map((item, i) => (
            <View key={item.label}>
              <MenuItem icon={item.icon} label={item.label} onPress={() => router.push(item.route as any)} />
              {i < SUPPORT_ITEMS.length - 1 && <View style={styles.menuDivider} />}
            </View>
          ))}
        </MenuSection>

        {/* ── Sign out ── */}
        <TouchableOpacity style={styles.signOutBtn} activeOpacity={0.85} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={18} color="#E53935" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Dwaso v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: DARK },
  settingsBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: CATBG, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 4 },

  profileCard: { backgroundColor: BG, borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: CATBG},
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatarImg: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: AMBER },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: AMBER, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: BG },
  avatarInitial: { fontSize: 34, fontWeight: '800', color: '#fff' },
  editAvatarBtn: { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: AMBER, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: BG },

  profileName: { fontSize: 18, fontWeight: '800', color: DARK, marginBottom: 3 },
  profileEmail: { fontSize: 12, color: MUTED, marginBottom: 8 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 14 },
  locationText: { fontSize: 11, color: MUTED },
  sellerBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF3E2', borderRadius: 20, borderWidth: 1, borderColor: '#F5E0C8', paddingHorizontal: 16, paddingVertical: 8 },
  sellerBadgeText: { fontSize: 12, fontWeight: '700', color: AMBER },
  sellerBadgeSeller: { backgroundColor: '#E8F4EC', borderColor: '#C7E4D4' },
  sellerBadgeSellerText: { color: GREEN },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: BG, borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: CATBG },
  statValue: { fontSize: 16, fontWeight: '800', color: DARK, marginBottom: 3 },
  statLabel: { fontSize: 10, color: MUTED, fontWeight: '600' },

  quickRow: { flexDirection: 'row', backgroundColor: BG, borderRadius: 16, paddingVertical: 14, marginBottom: 20, borderWidth: 1, borderColor: CATBG },
  quickItem: { flex: 1, alignItems: 'center', gap: 6 },
  quickItemBorder: { borderRightWidth: 1, borderRightColor: '#EEEBE3' },
  quickIconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 9, fontWeight: '600', color: DARK, textAlign: 'center', lineHeight: 13 },

  menuSection: { marginBottom: 16 },
  menuSectionTitle: { fontSize: 11, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  menuCard: { backgroundColor: BG, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: CATBG },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  menuIconBox: { width: 34, height: 34, borderRadius: 10, backgroundColor: CATBG, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 13, fontWeight: '500', color: DARK },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuBadge: { backgroundColor: '#FEF3E2', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  menuBadgeText: { fontSize: 10, fontWeight: '700', color: AMBER },
  menuDivider: { height: 1, backgroundColor: CATBG, marginLeft: 62 },

  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: BG, borderRadius: 16, paddingVertical: 14, marginBottom: 12, borderWidth: 1, borderColor: CATBG },
  signOutText: { fontSize: 13, fontWeight: '700', color: '#E53935' },
  version: { textAlign: 'center', fontSize: 11, color: MUTED, marginBottom: 8 },
});
