import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUserProfileApi, type ChatProfile, type ChatRequestSummary } from '../../services/api';
import { useAuth } from '../../store/authStore';

const BG = '#FFFFFF';
const DARK = '#1B3A2D';
const AMBER = '#E8943A';
const MUTED = '#9CA3AF';
const GREEN = '#2E7D52';

export default function ChatProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, conversationId } = useLocalSearchParams<{ id: string; conversationId: string }>();
  const { state: { accessToken } } = useAuth();
  const [profile, setProfile] = useState<ChatProfile | null>(null);
  const [request, setRequest] = useState<ChatRequestSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !accessToken || !conversationId) return;
    getUserProfileApi(id, accessToken, conversationId)
      .then((res) => { setProfile(res.data.user); setRequest(res.data.request); })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [id, accessToken]);

  const initials = profile?.fullName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() ?? '?';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.centred}><ActivityIndicator size="large" color={AMBER} /></View>
      ) : !profile ? (
        <View style={styles.centred}><Ionicons name="person-outline" size={44} color={MUTED} /><Text style={styles.emptyText}>Profile unavailable</Text></View>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 30 }]}>
          {profile.profilePicture ? <Image source={{ uri: profile.profilePicture }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Text style={styles.initials}>{initials}</Text></View>}
          <Text style={styles.name}>{profile.fullName}</Text>
          {profile.role === 'seller' && <View style={styles.sellerBadge}><Ionicons name="checkmark-circle" size={14} color={GREEN} /><Text style={styles.sellerText}>Verified Seller</Text></View>}

          {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
          <View style={styles.details}>
            {profile.location ? <Detail icon="location-outline" label="Location" value={profile.location} /> : null}
            {profile.phone ? <Detail icon="call-outline" label="Phone" value={profile.phone} /> : null}
            <Detail icon="person-outline" label="Account type" value={profile.role === 'seller' ? 'Seller' : 'Buyer'} />
          </View>
          {request && <View style={styles.requestSection}><Text style={styles.sectionTitle}>Request in this conversation</Text><Text style={styles.requestTitle}>{request.title || request.description || 'Request'}</Text><Text style={styles.requestMeta}>{request.category} · {request.location}</Text></View>}
        </ScrollView>
      )}
    </View>
  );
}

function Detail({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }) {
  return <View style={styles.detailRow}><Ionicons name={icon} size={19} color={AMBER} /><View><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { height: 58, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F5F5' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: DARK },
  headerSpacer: { width: 38 },
  centred: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { color: MUTED, fontSize: 13 },
  content: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 30 },
  avatar: { width: 112, height: 112, borderRadius: 56, borderWidth: 3, borderColor: AMBER },
  avatarFallback: { width: 112, height: 112, borderRadius: 56, backgroundColor: AMBER, alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#fff', fontSize: 38, fontWeight: '800' },
  name: { marginTop: 16, color: DARK, fontSize: 22, fontWeight: '800' },
  sellerBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8, backgroundColor: '#E8F4EC', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  sellerText: { color: GREEN, fontSize: 11, fontWeight: '700' },
  bio: { marginTop: 18, color: '#5A6E65', textAlign: 'center', fontSize: 13, lineHeight: 20 },
  details: { width: '100%', marginTop: 28, gap: 20 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailLabel: { color: MUTED, fontSize: 11, marginBottom: 2 },
  detailValue: { color: DARK, fontSize: 14, fontWeight: '600' },
  requestSection: { width: '100%', marginTop: 32, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#EDEAE1' },
  sectionTitle: { color: MUTED, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  requestTitle: { color: DARK, fontSize: 15, fontWeight: '700', lineHeight: 21 },
  requestMeta: { color: MUTED, fontSize: 12, marginTop: 5 },
});
