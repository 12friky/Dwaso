import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const BG    = '#F2EFE6';
const CARD  = '#FFFFFF';
const DARK  = '#1B3A2D';
const AMBER = '#E8943A';
const MUTED = '#9CA3AF';
const CATBG = '#EDEAE1';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: 'By accessing or using Dwaso, you agree to be bound by these Terms and Conditions. If you do not agree, please do not use the app.',
  },
  {
    title: '2. What Dwaso Does',
    body: 'Dwaso is a marketplace platform that connects buyers and sellers in Ghana. We do not buy, sell, or hold any products or services ourselves. All transactions are between users.',
  },
  {
    title: '3. User Accounts',
    body: 'You must provide accurate information when creating an account. You are responsible for keeping your login credentials secure and for all activity under your account.',
  },
  {
    title: '4. Posting Requests & Listings',
    body: 'You may post requests for items or services you need. Posts must be honest, accurate, and not violate any laws. Dwaso reserves the right to remove any post at its discretion.',
  },
  {
    title: '5. Prohibited Content',
    body: 'Users may not post illegal items, counterfeit goods, stolen property, harmful content, or anything that violates Ghanaian law. Violations may result in permanent account suspension.',
  },
  {
    title: '6. No Payment Processing',
    body: 'Dwaso does not process payments. All financial agreements are made directly between buyers and sellers. Dwaso is not responsible for any payment disputes.',
  },
  {
    title: '7. Privacy Policy',
    body: 'We collect only the information necessary to provide our service. We do not sell your personal data to third parties. Your location is used only to show nearby sellers and listings.',
  },
  {
    title: '8. Liability',
    body: 'Dwaso is not liable for any transactions, disputes, damages, or losses arising between users. Use the platform at your own discretion.',
  },
  {
    title: '9. Changes to Terms',
    body: 'We may update these terms at any time. Continued use of the app after changes constitutes acceptance of the new terms.',
  },
  {
    title: '10. Contact',
    body: 'For questions about these terms, contact us at legal@dwaso.com.',
  },
];

export default function TermsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/home/profile')} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Privacy</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}>

        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="document-text-outline" size={28} color={AMBER} />
          </View>
          <Text style={styles.heroTitle}>Terms & Privacy Policy</Text>
          <Text style={styles.heroDate}>Last updated: January 2025</Text>
        </View>

        <View style={styles.card}>
          {SECTIONS.map((s, i) => (
            <View key={s.title}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{s.title}</Text>
                <Text style={styles.sectionBody}>{s.body}</Text>
              </View>
              {i < SECTIONS.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        <View style={styles.note}>
          <Ionicons name="shield-checkmark-outline" size={16} color={AMBER} />
          <Text style={styles.noteText}>
            Your privacy matters to us. We only collect what we need to make Dwaso work for you.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: CATBG, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: DARK },
  scroll: { paddingHorizontal: 20 },
  hero: { alignItems: 'center', paddingVertical: 20, gap: 6 },
  heroIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FEF3E2', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heroTitle: { fontSize: 17, fontWeight: '800', color: DARK },
  heroDate: { fontSize: 11, color: MUTED },
  card: { backgroundColor: CARD, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1, marginBottom: 16 },
  section: { padding: 16, gap: 6 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: DARK },
  sectionBody: { fontSize: 12, color: MUTED, lineHeight: 19 },
  divider: { height: 1, backgroundColor: CATBG, marginHorizontal: 16 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#FEF3E2', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#F5E0C8' },
  noteText: { flex: 1, fontSize: 11, color: DARK, lineHeight: 17 },
});
