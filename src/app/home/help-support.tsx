import { useState } from 'react';
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

const FAQS = [
  { q: 'How do I post a request?',              a: 'Tap the "+" button at the bottom of the screen. Select "Post a Request", fill in your details, and submit. Nearby sellers will receive a notification and can send you offers.'  },
  { q: 'Is Dwaso free to use?',                  a: 'Yes! Creating an account, posting requests, and browsing products is completely free. Dwaso connects buyers and sellers at no cost.'                                             },
  { q: 'How do I contact a seller?',             a: 'When a seller responds to your request, you\'ll receive a notification. You can then chat directly through the Chats tab to discuss details and agree on a price.'            },
  { q: 'Can I negotiate the price?',             a: 'Absolutely. Once a seller sends you an offer, you can discuss the price freely through the in-app chat.'                                                                        },
  { q: 'How do I verify my account?',            a: 'Go to Profile → Verify Account. You\'ll be asked to provide a valid Ghana ID or phone number for verification.'                                                               },
  { q: 'What should I do if I have a problem?',  a: 'Use the "Contact Support" option below or email us at support@dwaso.com. Our team responds within 24 hours.'                                                                   },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity onPress={() => setOpen(!open)} activeOpacity={0.85} style={styles.faqItem}>
      <View style={styles.faqRow}>
        <Text style={styles.faqQ}>{q}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={MUTED} />
      </View>
      {open && <Text style={styles.faqA}>{a}</Text>}
    </TouchableOpacity>
  );
}

export default function HelpSupportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/home/profile')} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="help-buoy-outline" size={32} color={AMBER} />
          </View>
          <Text style={styles.heroTitle}>How can we help?</Text>
          <Text style={styles.heroSub}>Find answers below or contact our team directly.</Text>
        </View>

        {/* Quick contact */}
        <View style={styles.contactRow}>
          {[
            { icon: 'chatbubble-ellipses-outline' as const, label: 'Live Chat',  sub: 'Avg. 5 min reply' },
            { icon: 'mail-outline'                as const, label: 'Email Us',   sub: 'support@dwaso.com' },
          ].map((c) => (
            <TouchableOpacity key={c.label} style={styles.contactCard} activeOpacity={0.85}>
              <View style={styles.contactIcon}>
                <Ionicons name={c.icon} size={22} color={AMBER} />
              </View>
              <Text style={styles.contactLabel}>{c.label}</Text>
              <Text style={styles.contactSub}>{c.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* FAQs */}
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        <View style={styles.faqCard}>
          {FAQS.map((f, i) => (
            <View key={f.q}>
              <FaqItem q={f.q} a={f.a} />
              {i < FAQS.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* Still stuck */}
        <View style={styles.stuckCard}>
          <Ionicons name="bulb-outline" size={20} color={AMBER} />
          <View style={{ flex: 1 }}>
            <Text style={styles.stuckTitle}>Still need help?</Text>
            <Text style={styles.stuckSub}>Our support team is available Mon – Sat, 8am – 6pm GMT.</Text>
          </View>
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
  hero: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  heroIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#FEF3E2', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heroTitle: { fontSize: 18, fontWeight: '800', color: DARK },
  heroSub: { fontSize: 12, color: MUTED, textAlign: 'center' },
  contactRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  contactCard: { flex: 1, backgroundColor: CARD, borderRadius: 16, padding: 16, alignItems: 'center', gap: 6, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  contactIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FEF3E2', alignItems: 'center', justifyContent: 'center' },
  contactLabel: { fontSize: 13, fontWeight: '700', color: DARK },
  contactSub: { fontSize: 10, color: MUTED, textAlign: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: DARK, marginBottom: 12 },
  faqCard: { backgroundColor: CARD, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1, marginBottom: 16 },
  faqItem: { padding: 16 },
  faqRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  faqQ: { flex: 1, fontSize: 13, fontWeight: '600', color: DARK, lineHeight: 18 },
  faqA: { fontSize: 12, color: MUTED, lineHeight: 18, marginTop: 10 },
  divider: { height: 1, backgroundColor: CATBG, marginHorizontal: 16 },
  stuckCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#FEF3E2', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#F5E0C8' },
  stuckTitle: { fontSize: 13, fontWeight: '700', color: DARK, marginBottom: 3 },
  stuckSub: { fontSize: 11, color: MUTED, lineHeight: 17 },
});
