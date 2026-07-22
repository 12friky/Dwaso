/**
 * service-detail.tsx
 * Detail screen for SERVICE requests — dark-green hero card redesign.
 */

import { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity,
  Image, ActivityIndicator, Modal, Linking, Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getPostByIdApi, getOrCreateConversationApi, getMeApi, type Post } from '../../services/api';
import { useAuth }  from '../../store/authStore';
import { useSaved } from '../../store/savedStore';

const BG    = '#FFFFFF';
const DARK  = '#1B3A2D';
const AMBER = '#E8943A';
const GREEN = '#2E7D52';
const MUTED = '#9CA3AF';
const HERO  = '#1B3A2D';

const formatBudget = (b: number | null) => b ? `GH₵${b.toLocaleString()}` : 'Negotiable';

const timeAgo = (iso: string) => {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'Just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

function NotSellerModal({ visible, onClose, onRegister }: {
  visible: boolean; onClose: () => void; onRegister: () => void;
}) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalIconBox}><Ionicons name="storefront-outline" size={40} color={AMBER} /></View>
          <Text style={styles.modalTitle}>Sellers Only</Text>
          <Text style={styles.modalBody}>Only registered sellers can contact buyers. Register as a seller to respond to requests.</Text>
          <TouchableOpacity style={styles.modalPrimaryBtn} onPress={onRegister} activeOpacity={0.88}>
            <Ionicons name="storefront-outline" size={16} color="#fff" />
            <Text style={styles.modalPrimaryText}>Become a Seller</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalSecondaryBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.modalSecondaryText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({ icon, label, value, iconBg }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string; value: string; iconBg?: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={[styles.detailIconBox, { backgroundColor: iconBg ?? '#FEF3E2' }]}>
        <Ionicons name={icon} size={15} color={AMBER} />
      </View>
      <View style={styles.detailTexts}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function ServiceDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const { state: { user, accessToken }, updateUser } = useAuth();
  const { isSaved, savePost, unsavePost } = useSaved();

  const [post,        setPost]        = useState<Post | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [showGate,    setShowGate]    = useState(false);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    getMeApi(accessToken).then((res) => { if (res.data.user.role !== user?.role) updateUser(res.data.user); }).catch(() => {});
  }, [accessToken]);

  useEffect(() => {
    if (!id) { setError('No post ID.'); setLoading(false); return; }
    getPostByIdApi(id, accessToken ?? undefined).then((res) => setPost(res.data.post)).catch((err) => setError(err?.message ?? 'Failed to load.')).finally(() => setLoading(false));
  }, [id, accessToken]);

  const goBack = () => {
    if (from === '/home/browse')               router.replace('/home/browse');
    else if (from === '/home/saved')           router.replace('/home/saved');
    else if (from === '/home/feed')            router.replace('/home/feed');
    else if (from === '/home/notifications')   router.replace('/home/notifications');
    else                                       router.replace('/home/services');
  };

  const requireSeller = () => { if (user?.role !== 'seller') { setShowGate(true); return false; } return true; };

  const handleChat = async () => {
    if (!requireSeller() || !post || !id) return;
    setChatLoading(true);
    try {
      const res    = await getOrCreateConversationApi(id, accessToken ?? '');
      const convId = res.data.conversation._id;
      const name   = post.title ?? post.serviceType ?? post.description;
      const budget = post.budget ? `GH₵${post.budget.toLocaleString()}` : 'negotiable';
      const intro  = `Hi! I saw your request for "${name}" (${post.category}) with a budget of ${budget} in ${post.location}. I can help — are you still looking?`;
      router.push({ pathname: '/home/conversation', params: { id: convId, autoMessage: intro } });
    } catch (err: any) { Alert.alert('Error', err?.message ?? 'Could not open chat.'); }
    finally { setChatLoading(false); }
  };

  const handleCall = () => { if (!requireSeller()) return; if (post?.user?.phone) Linking.openURL(`tel:${post.user.phone}`); };
  const handleWhatsApp = () => {
    if (!requireSeller()) return;
    const phone = post?.user?.phone?.replace(/\D/g, '');
    if (phone) Linking.openURL(`https://wa.me/${phone}`);
  };

  if (loading) return <View style={styles.centred}><ActivityIndicator size="large" color={AMBER} /><Text style={styles.loadingText}>Loading service…</Text></View>;
  if (error || !post) return (
    <View style={styles.centred}>
      <Ionicons name="alert-circle-outline" size={48} color={MUTED} />
      <Text style={styles.errorTitle}>Not found</Text>
      <Text style={styles.errorSub}>{error}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={goBack}><Text style={styles.retryText}>Go Back</Text></TouchableOpacity>
    </View>
  );

  const buyer       = post.user;
  const initials    = buyer.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const savedState  = isSaved(post._id);
  const sType       = post.serviceType ?? post.category;
  const contactPref = ((post as any).contactPreference ?? 'Chat') as string;

  return (
    <View style={styles.root}>
      {/* Floating back + bookmark over hero */}
      <View style={[styles.floatRow, { top: insets.top + 8 }]} pointerEvents="box-none">
        <TouchableOpacity style={styles.floatBtn} onPress={goBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.floatBtn} hitSlop={8}
          onPress={() => savedState ? unsavePost(post._id, accessToken ?? '') : savePost(post, accessToken ?? '')}>
          <Ionicons name={savedState ? 'bookmark' : 'bookmark-outline'} size={20} color={savedState ? AMBER : '#fff'} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}>
        {/* Dark green hero */}
        <View style={[styles.hero, { paddingTop: insets.top + 52 }]}>
          <View style={styles.heroPatternDot1} pointerEvents="none" />
          <View style={styles.heroPatternDot2} pointerEvents="none" />
          <View style={styles.heroPatternDot3} pointerEvents="none" />

          <View style={styles.heroAvatarWrap}>
            {buyer.profilePicture
              ? <Image source={{ uri: buyer.profilePicture }} style={styles.heroAvatar} />
              : <View style={[styles.heroAvatar, styles.heroAvatarFallback]}><Text style={styles.heroInitials}>{initials}</Text></View>
            }
            <View style={styles.heroOnlineDot} />
          </View>

          <Text style={styles.heroName}>{buyer.fullName}</Text>
          <View style={styles.heroVerifiedRow}>
            <Ionicons name="shield-checkmark" size={12} color="#7DD3A8" />
            <Text style={styles.heroVerifiedText}>Verified Buyer</Text>
          </View>
          <View style={styles.heroChipRow}>
            <View style={styles.heroServiceChip}>
              <Ionicons name="construct-outline" size={11} color={AMBER} />
              <Text style={styles.heroServiceChipText}>{sType}</Text>
            </View>
            <View style={styles.heroLiveBadge}>
              <View style={styles.heroLiveDot} />
              <Text style={styles.heroLiveBadgeText}>Live</Text>
            </View>
          </View>
        </View>
        <View style={styles.heroArc} />

        {/* Title + time */}
        <View style={styles.titleSection}>
          <Text style={styles.postTitle}>{post.title ?? post.description}</Text>
          <Text style={styles.postedAt}>Posted {timeAgo(post.createdAt)}</Text>
        </View>

        {/* 3 stat cards */}
        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#FEF3E2' }]}><Ionicons name="cash-outline" size={18} color={AMBER} /></View>
            <Text style={styles.statLabel}>Budget</Text>
            <Text style={styles.statValue}>{formatBudget(post.budget)}</Text>
          </View>
          <View style={[styles.statCard, styles.locationCard]}>
            <View style={[styles.statIconBox, { backgroundColor: '#E8F4EC' }]}><Ionicons name="location-outline" size={18} color={GREEN} /></View>
            <Text style={styles.statLabel}>Location</Text>
            <Text style={styles.statValue} numberOfLines={2}>{post.location}</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#EAF0FB' }]}><Ionicons name="radio-button-on-outline" size={18} color="#3B6FD4" /></View>
            <Text style={styles.statLabel}>Status</Text>
            <Text style={[styles.statValue, { textTransform: 'capitalize' }]}>{post.status}</Text>
          </View>
        </View>

        {/* Service details */}
        <View style={styles.detailCard}>
          <Text style={styles.cardHeading}>Service Details</Text>
          {post.serviceType    && <DetailRow icon="construct-outline"  label="Service type"   value={post.serviceType}  iconBg="#FEF3E2" />}
          {post.urgency        && <DetailRow icon="timer-outline"      label="Timing"         value={post.urgency}      iconBg="#FEF3E2" />}
          {(post as any).preferredDate     && <DetailRow icon="calendar-outline"  label="Preferred date"  value={(post as any).preferredDate}     iconBg="#E8F4EC" />}
          {(post as any).preferredTime     && <DetailRow icon="time-outline"      label="Preferred time"  value={(post as any).preferredTime}     iconBg="#E8F4EC" />}
          {(post as any).estimatedDuration && <DetailRow icon="hourglass-outline" label="Est. duration"   value={(post as any).estimatedDuration} iconBg="#EAF0FB" />}
          {(post as any).workersNeeded != null && <DetailRow icon="people-outline" label="Workers needed" value={String((post as any).workersNeeded)} iconBg="#EAF0FB" />}
          {(post as any).budgetType        && <DetailRow icon="pricetag-outline"  label="Budget type"     value={(post as any).budgetType}        iconBg="#FEF3E2" />}
          {(post as any).contactPreference && <DetailRow icon="chatbubble-outline" label="Contact via"    value={(post as any).contactPreference} iconBg="#E8F4EC" />}
          {!post.serviceType && !post.urgency && !(post as any).preferredDate && (
            <Text style={styles.noDetailsText}>No additional details provided.</Text>
          )}
        </View>

        {post.title && post.description && (
          <View style={styles.detailCard}>
            <Text style={styles.cardHeading}>What the buyer needs</Text>
            <Text style={styles.descText}>{post.description}</Text>
          </View>
        )}

        <View style={styles.tipBanner}>
          <View style={styles.tipIconBox}><Ionicons name="bulb-outline" size={20} color={AMBER} /></View>
          <Text style={styles.tipText}>Can you do this job? Tap <Text style={{ fontWeight: '800', color: AMBER }}>"I Can Do This!"</Text> below to send your offer directly to the buyer.</Text>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        {contactPref === 'Phone Call' && (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: AMBER }]} onPress={handleCall} activeOpacity={0.85}>
            <Ionicons name="call" size={22} color="#fff" /><Text style={styles.actionBtnText}>Call Buyer</Text>
          </TouchableOpacity>
        )}
        {contactPref === 'WhatsApp' && (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#25D366' }]} onPress={handleWhatsApp} activeOpacity={0.85}>
            <Ionicons name="logo-whatsapp" size={22} color="#fff" /><Text style={styles.actionBtnText}>WhatsApp Buyer</Text>
          </TouchableOpacity>
        )}
        {contactPref === 'Chat' && (
          <TouchableOpacity style={styles.actionBtn} onPress={handleChat} activeOpacity={0.88} disabled={chatLoading}>
            {chatLoading ? <ActivityIndicator size="small" color="#fff" /> : <><Ionicons name="chatbubble-ellipses" size={22} color="#fff" /><Text style={styles.actionBtnText}>I Can Do This!</Text></>}
          </TouchableOpacity>
        )}
        {!['Phone Call', 'WhatsApp', 'Chat'].includes(contactPref) && (
          <>
            <TouchableOpacity style={[styles.actionBtnSmall, { borderColor: AMBER }]} onPress={handleCall}><Ionicons name="call-outline" size={20} color={AMBER} /></TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleChat} disabled={chatLoading}>
              {chatLoading ? <ActivityIndicator size="small" color="#fff" /> : <><Ionicons name="chatbubble-ellipses" size={20} color="#fff" /><Text style={styles.actionBtnText}>I Can Do This!</Text></>}
            </TouchableOpacity>
          </>
        )}
      </View>

      <NotSellerModal visible={showGate} onClose={() => setShowGate(false)} onRegister={() => { setShowGate(false); router.push('/home/become-seller'); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: BG },
  centred: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: BG, paddingHorizontal: 32 },
  loadingText: { fontSize: 13, color: MUTED },
  errorTitle:  { fontSize: 16, fontWeight: '700', color: DARK },
  errorSub:    { fontSize: 12, color: MUTED, textAlign: 'center' },
  retryBtn:    { marginTop: 8, backgroundColor: AMBER, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10 },
  retryText:   { fontSize: 13, fontWeight: '700', color: '#fff' },

  floatRow: { position: 'absolute', left: 0, right: 0, zIndex: 20, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20 },
  floatBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' },

  hero:             { backgroundColor: HERO, alignItems: 'center', paddingBottom: 40, overflow: 'hidden' },
  heroPatternDot1:  { position: 'absolute', top: 20, right: 30, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.04)' },
  heroPatternDot2:  { position: 'absolute', bottom: 40, left: -20, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.03)' },
  heroPatternDot3:  { position: 'absolute', top: 60, left: 40, width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.04)' },
  heroAvatarWrap:   { position: 'relative', marginBottom: 10 },
  heroAvatar:       { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)' },
  heroAvatarFallback: { backgroundColor: AMBER, alignItems: 'center', justifyContent: 'center' },
  heroInitials:     { fontSize: 28, fontWeight: '900', color: '#fff' },
  heroOnlineDot:    { position: 'absolute', bottom: 3, right: 3, width: 14, height: 14, borderRadius: 7, backgroundColor: '#4CAF50', borderWidth: 2, borderColor: HERO },
  heroName:         { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 4 },
  heroVerifiedRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  heroVerifiedText: { fontSize: 11, color: '#7DD3A8', fontWeight: '600' },
  heroChipRow:      { flexDirection: 'row', gap: 8, alignItems: 'center' },
  heroServiceChip:  { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(232,148,58,0.18)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(232,148,58,0.3)' },
  heroServiceChipText: { fontSize: 11, fontWeight: '700', color: AMBER },
  heroLiveBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(46,125,82,0.25)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(46,125,82,0.4)' },
  heroLiveDot:      { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4CAF50' },
  heroLiveBadgeText:{ fontSize: 11, fontWeight: '700', color: '#7DD3A8' },
  heroArc:          { height: 28, backgroundColor: BG, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -28, zIndex: 1 },

  titleSection: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8 },
  postTitle:    { fontSize: 22, fontWeight: '900', color: DARK, lineHeight: 30, marginBottom: 4 },
  postedAt:     { fontSize: 11, color: MUTED },
  descText:     { fontSize: 13, color: '#5A6E65', lineHeight: 22 },

  statRow:  { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 6, marginBottom: 4 },
  statCard: { flex: 1, minWidth: 0, padding: 12, alignItems: 'center', gap: 6 },
  locationCard: { flex: 1.35 },
  statIconBox: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  statLabel:   { fontSize: 9, color: MUTED, fontWeight: '600' },
  statValue:   { fontSize: 11, fontWeight: '800', color: DARK, textAlign: 'center', flexShrink: 1 },

  detailCard:   { marginHorizontal: 16, marginTop: 12, padding: 18 },
  cardHeading:  { fontSize: 13, fontWeight: '700', color: DARK, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  detailIconBox:{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  detailTexts:  { flex: 1 },
  detailLabel:  { fontSize: 10, color: MUTED, fontWeight: '600' },
  detailValue:  { fontSize: 13, fontWeight: '700', color: DARK, marginTop: 1 },
  noDetailsText:{ fontSize: 12, color: MUTED, fontStyle: 'italic' },

  buyerCard:       { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: BG, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#EAE6DC' },
  buyerAvatarWrap: { position: 'relative' },
  buyerAvatar:     { width: 50, height: 50, borderRadius: 25 },
  buyerInitials:   { fontSize: 18, fontWeight: '800', color: '#fff' },
  onlineDot:       { position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: 6, backgroundColor: '#4CAF50', borderWidth: 2, borderColor: BG },
  buyerInfo:       { flex: 1 },
  buyerName:       { fontSize: 14, fontWeight: '700', color: DARK, marginBottom: 3 },
  verifiedRow:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedText:    { fontSize: 11, color: GREEN, fontWeight: '600' },
  buyerBadge:      { backgroundColor: '#E8F4EC', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  buyerBadgeText:  { fontSize: 10, fontWeight: '700', color: GREEN },

  tipBanner:  { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, marginHorizontal: 16, marginTop: 12, marginBottom: 6 },
  tipIconBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FDE9D0', alignItems: 'center', justifyContent: 'center' },
  tipText:    { flex: 1, fontSize: 12, color: DARK, lineHeight: 19 },

  bottomBar:      { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 10, backgroundColor: BG, paddingHorizontal: 16, paddingTop: 8 },
  actionBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: AMBER, borderRadius: 12, height: 44, shadowColor: AMBER, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  actionBtnText:  { fontSize: 13, fontWeight: '800', color: '#fff' },
  actionBtnSmall: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },

  modalOverlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  modalCard:         { width: '100%', backgroundColor: BG, borderRadius: 20, padding: 28, alignItems: 'center', gap: 12 },
  modalIconBox:      { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FEF3E2', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  modalTitle:        { fontSize: 18, fontWeight: '900', color: DARK, textAlign: 'center' },
  modalBody:         { fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 20 },
  modalPrimaryBtn:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: AMBER, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 28, marginTop: 8, width: '100%', justifyContent: 'center', elevation: 6 },
  modalPrimaryText:  { fontSize: 14, fontWeight: '800', color: '#fff' },
  modalSecondaryBtn: { paddingVertical: 8 },
  modalSecondaryText:{ fontSize: 13, color: MUTED, fontWeight: '600' },
});
