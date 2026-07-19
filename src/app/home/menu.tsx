import {
  StyleSheet, View, Text, ScrollView,
  TouchableOpacity, Dimensions, Image, Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../store/authStore';

const BG    = '#F2EFE6';
const CARD  = '#FFFFFF';
const DARK  = '#1B3A2D';
const AMBER = '#E8943A';
const MUTED = '#9CA3AF';
const CATBG = '#EDEAE1';
const GREEN  = '#2E7D52';

const SCREEN_W = Dimensions.get('window').width;

const MENU_SECTIONS = [
  {
    title: 'Discover',
    items: [
      { icon: 'home-outline'         as const, label: 'Home',                route: '/home/feed'          },
      { icon: 'search-outline'       as const, label: 'Search Requests',      route: '/home/search'        },
      { icon: 'bag-outline'          as const, label: 'Requested Products',   route: '/home/browse'        },
      { icon: 'notifications-outline' as const, label: 'Notifications',       route: '/home/notifications' },
      { icon: 'storefront-outline'  as const, label: 'Become a Seller',      route: '/home/become-seller' },
    ],
  },
  {
    title: 'My Activity',
    items: [
      { icon: 'create-outline'       as const, label: 'Post a Request',       route: '/home/my-post'       },
      { icon: 'list-outline'         as const, label: 'My Requests',          route: '/home/my-requests'   },
      { icon: 'heart-outline'        as const, label: 'Saved Items',          route: '/home/saved'         },
      { icon: 'chatbubbles-outline'  as const, label: 'My Chats',             route: '/home/chat'          },
    ],
  },
  {
    title: 'Account',
    items: [
      { icon: 'person-outline'       as const, label: 'My Profile',           route: '/home/profile'       },
      { icon: 'create-outline'       as const, label: 'Edit Profile',         route: '/home/edit-profile'  },
      { icon: 'location-outline'     as const, label: 'Saved Addresses',      route: '/home/saved-addresses'},
      { icon: 'shield-checkmark-outline' as const, label: 'Verify Account',   route: null                  },
    ],
  },
  {
    title: 'Support',
    items: [
      { icon: 'help-circle-outline'  as const, label: 'Help & Support',       route: '/home/help-support'  },
      { icon: 'document-text-outline' as const, label: 'Terms & Privacy',     route: '/home/terms'         },
      { icon: 'information-circle-outline' as const, label: 'About Dwaso',    route: '/home/about'         },
    ],
  },
];

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state: { user }, clearUser } = useAuth();

  const navigate = (route: string | null) => {
    if (!route) return;
    router.push(route as any);
  };

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
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} hitSlop={8}>
          <Ionicons name="close" size={24} color={DARK} />
        </TouchableOpacity>
        <Text style={styles.appName}>Dwaso</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* ── Profile summary ── */}
      <TouchableOpacity style={styles.profileRow} activeOpacity={0.85} onPress={() => router.push('/home/profile')}>
        <View style={styles.avatarCircle}>
          {user?.profilePicture ? (
            <Image source={{ uri: user.profilePicture }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarInitial}>
              {user?.fullName?.charAt(0)?.toUpperCase() ?? '?'}
            </Text>
          )}
          <View style={styles.onlineDot} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{user?.fullName ?? '—'}</Text>
          <Text style={styles.profilePhone}>+233 {user?.phone ?? '—'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={MUTED} />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}>

        {MENU_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, i) => (
                <View key={item.label}>
                  <TouchableOpacity
                    style={styles.menuItem}
                    activeOpacity={0.78}
                    onPress={() => navigate(item.route)}
                  >
                    <View style={styles.menuIconBox}>
                      <Ionicons name={item.icon} size={18} color={DARK} />
                    </View>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    <Ionicons name="chevron-forward" size={15} color={MUTED} />
                  </TouchableOpacity>
                  {i < section.items.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* ── Sign out ── */}
        <TouchableOpacity style={styles.signOutBtn} activeOpacity={0.85} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={18} color="#E53935" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Dwaso v1.0.0 · Built in Ghana 🇬🇭</Text>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: CATBG, alignItems: 'center', justifyContent: 'center' },
  appName: { fontSize: 20, fontWeight: '900', color: DARK },

  profileRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: CARD, marginHorizontal: 20, borderRadius: 16,
    padding: 14, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  avatarCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: AMBER, alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' },
  avatarImg: { width: 48, height: 48, borderRadius: 24 },
  avatarInitial: { fontSize: 20, fontWeight: '800', color: '#fff' },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: 6, backgroundColor: '#4CAF50', borderWidth: 2, borderColor: CARD },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 14, fontWeight: '700', color: DARK, marginBottom: 3 },
  profilePhone: { fontSize: 11, color: MUTED },

  scroll: { paddingHorizontal: 20 },

  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  sectionCard: { backgroundColor: CARD, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  menuIconBox: { width: 34, height: 34, borderRadius: 10, backgroundColor: CATBG, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 13, fontWeight: '500', color: DARK },
  divider: { height: 1, backgroundColor: CATBG, marginLeft: 62 },

  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: CARD, borderRadius: 14, paddingVertical: 13,
    marginBottom: 12, borderWidth: 1, borderColor: '#FDDDD9',
  },
  signOutText: { fontSize: 13, fontWeight: '700', color: '#E53935' },
  version: { textAlign: 'center', fontSize: 11, color: MUTED },
});
