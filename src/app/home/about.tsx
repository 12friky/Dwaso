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
const GREEN  = '#2E7D52';

const HOW_IT_WORKS = [
  { icon: 'create-outline'           as const, title: 'Post a Request',          desc: 'Tell us what you need — product or service — in seconds.' },
  { icon: 'notifications-outline'    as const, title: 'Sellers Get Notified',     desc: 'Nearby sellers and service providers receive your request instantly.' },
  { icon: 'git-compare-outline'      as const, title: 'Compare Offers',           desc: 'Review multiple offers, prices, and seller ratings side by side.' },
  { icon: 'shield-checkmark-outline' as const, title: 'Buy with Confidence',      desc: 'Chat directly, verify sellers, and close deals safely.' },
];

const VALUES = [
  { icon: 'people-outline'     as const, label: 'Community First',    color: GREEN,    bg: '#E8F4EC' },
  { icon: 'flash-outline'      as const, label: 'Fast & Simple',      color: AMBER,    bg: '#FEF3E2' },
  { icon: 'shield-outline'     as const, label: 'Safe & Trusted',     color: '#3B6FD4', bg: '#EAF0FB' },
  { icon: 'location-outline'   as const, label: 'Locally Focused',    color: '#9B59B6', bg: '#F3EAF9' },
];

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/home/profile')} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About Dwaso</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}>

        {/* Brand hero */}
        <View style={styles.hero}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>D</Text>
          </View>
          <Text style={styles.appName}>Dwaso</Text>
          <Text style={styles.tagline}>"Need something? Let sellers find you."</Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>Version 1.0.0</Text>
          </View>
        </View>

        {/* Mission */}
        <View style={styles.missionCard}>
          <Text style={styles.missionTitle}>Our Mission</Text>
          <Text style={styles.missionBody}>
            Dwaso was built to flip the traditional marketplace model. Instead of buyers endlessly scrolling to find what they need, they post a request — and sellers come to them.{'\n\n'}
            We believe commerce should be simple, local, and human. Whether you need a laptop, a tailor, or a plumber, Dwaso connects you with the right people in your community — fast.
          </Text>
        </View>

        {/* How it works */}
        <Text style={styles.sectionTitle}>How Dwaso Works</Text>
        <View style={styles.stepsCard}>
          {HOW_IT_WORKS.map((step, i) => (
            <View key={step.title}>
              <View style={styles.stepRow}>
                <View style={styles.stepIconBox}>
                  <Ionicons name={step.icon} size={20} color={AMBER} />
                  <View style={styles.stepNumBadge}>
                    <Text style={styles.stepNum}>{i + 1}</Text>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                </View>
              </View>
              {i < HOW_IT_WORKS.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* Values */}
        <Text style={styles.sectionTitle}>What We Stand For</Text>
        <View style={styles.valuesGrid}>
          {VALUES.map((v) => (
            <View key={v.label} style={styles.valueCard}>
              <View style={[styles.valueIcon, { backgroundColor: v.bg }]}>
                <Ionicons name={v.icon} size={20} color={v.color} />
              </View>
              <Text style={styles.valueLabel}>{v.label}</Text>
            </View>
          ))}
        </View>

        {/* Built in Ghana */}
        <View style={styles.ghanaCard}>
          <Text style={styles.ghanaFlag}>🇬🇭</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.ghanaTitle}>Built in Ghana, for Ghana</Text>
            <Text style={styles.ghanaSub}>
              Dwaso is proudly built to serve Ghanaian communities — from Accra to Kumasi, Takoradi to Tamale.
            </Text>
          </View>
        </View>

        {/* Contact */}
        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>Get in Touch</Text>
          {[
            { icon: 'mail-outline'   as const, label: 'hello@dwaso.com'      },
            { icon: 'globe-outline'  as const, label: 'www.dwaso.com'        },
            { icon: 'logo-instagram' as const, label: '@dwaso_gh'            },
          ].map((c) => (
            <TouchableOpacity key={c.label} style={styles.contactRow} activeOpacity={0.8}>
              <View style={styles.contactIconBox}>
                <Ionicons name={c.icon} size={16} color={AMBER} />
              </View>
              <Text style={styles.contactLabel}>{c.label}</Text>
            </TouchableOpacity>
          ))}
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

  // Hero
  hero: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  logoBox: { width: 72, height: 72, borderRadius: 22, backgroundColor: DARK, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  logoText: { fontSize: 36, fontWeight: '900', color: AMBER },
  appName: { fontSize: 26, fontWeight: '900', color: DARK, letterSpacing: -0.5 },
  tagline: { fontSize: 12, color: MUTED, fontStyle: 'italic', textAlign: 'center' },
  versionBadge: { backgroundColor: CATBG, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4 },
  versionText: { fontSize: 11, color: MUTED, fontWeight: '600' },

  // Mission
  missionCard: { backgroundColor: CARD, borderRadius: 16, padding: 18, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  missionTitle: { fontSize: 14, fontWeight: '800', color: DARK, marginBottom: 10 },
  missionBody: { fontSize: 13, color: MUTED, lineHeight: 21 },

  // Steps
  sectionTitle: { fontSize: 14, fontWeight: '700', color: DARK, marginBottom: 12 },
  stepsCard: { backgroundColor: CARD, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1, marginBottom: 24 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, gap: 14 },
  stepIconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FEF3E2', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  stepNumBadge: { position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: AMBER, alignItems: 'center', justifyContent: 'center' },
  stepNum: { fontSize: 9, fontWeight: '800', color: '#fff' },
  stepTitle: { fontSize: 13, fontWeight: '700', color: DARK, marginBottom: 3 },
  stepDesc: { fontSize: 12, color: MUTED, lineHeight: 18 },
  divider: { height: 1, backgroundColor: CATBG, marginHorizontal: 16 },

  // Values
  valuesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  valueCard: { width: '47%', backgroundColor: CARD, borderRadius: 14, padding: 14, alignItems: 'center', gap: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  valueIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  valueLabel: { fontSize: 12, fontWeight: '700', color: DARK, textAlign: 'center' },

  // Ghana
  ghanaCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: CARD, borderRadius: 14, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  ghanaFlag: { fontSize: 32 },
  ghanaTitle: { fontSize: 13, fontWeight: '700', color: DARK, marginBottom: 3 },
  ghanaSub: { fontSize: 11, color: MUTED, lineHeight: 17 },

  // Contact
  contactCard: { backgroundColor: CARD, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  contactTitle: { fontSize: 13, fontWeight: '700', color: DARK, marginBottom: 12 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  contactIconBox: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FEF3E2', alignItems: 'center', justifyContent: 'center' },
  contactLabel: { fontSize: 13, color: DARK, fontWeight: '500' },
});
