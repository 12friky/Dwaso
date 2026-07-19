/**
 * product-detail.tsx
 * Detail screen for PRODUCT requests — beautiful modern redesign.
 */

import { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity,
  Dimensions, Image, ActivityIndicator, Modal, Linking, Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getPostByIdApi, getOrCreateConversationApi, getMeApi, type Post } from '../../services/api';
import { useAuth }  from '../../store/authStore';
import { useSaved } from '../../store/savedStore';

const BG    = '#F2EFE6';
const CARD  = '#FFFFFF';
const DARK  = '#1B3A2D';
const AMBER = '#E8943A';
const GREEN = '#2E7D52';
const MUTED = '#9CA3AF';
const CATBG = '#EDEAE1';
const SCREEN_W = Dimensions.get('window').width;

const formatBudget = (budget: number | null) =>
  budget ? `GH₵${budget.toLocaleString()}` : 'Negotiable';

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

function ImageSection({ images, category }: { images: string[]; category: string }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const { bg, color } = catStyle(category);
  if (images.length === 0) {
    return (
      <View style={[imgSt.box, { backgroundColor: bg }]}>
        <Ionicons name="image-outline" size={72} color={color} style={{ opacity: 0.35 }} />
        <Text style={{ color, fontSize: 11, marginTop: 6, fontWeight: '600', opacity: 0.5 }}>No image</Text>
      </View>
    );
  }
  return (
    <View>
      <ScrollView
        horizontal pagingEnabled showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) =>
          setActiveIdx(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))
        }
      >
        {images.map((uri, i) => (
          <Image key={i} source={{ uri }} style={imgSt.slide} resizeMode="cover" />
        ))}
      </ScrollView>
      <View style={imgSt.grad1} pointerEvents="none" />
      <View style={imgSt.grad2} pointerEvents="none" />
      <View style={imgSt.grad3} pointerEvents="none" />
      {images.length > 1 && (
        <View style={imgSt.dotRow}>
          {images.map((_, i) => (
            <View key={i} style={[imgSt.dot, i === activeIdx && imgSt.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

const imgSt = StyleSheet.create({
  box:      { width: SCREEN_W, height: 300, alignItems: 'center', justifyContent: 'center' },
  slide:    { width: SCREEN_W, height: 300 },
  grad1:    { position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, backgroundColor: 'rgba(0,0,0,0.03)' },
  grad2:    { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,  backgroundColor: 'rgba(0,0,0,0.09)' },
  grad3:    { position: 'absolute', bottom: 0, left: 0, right: 0, height: 44,  backgroundColor: 'rgba(0,0,0,0.20)' },
  dotRow:   { position: 'absolute', bottom: 34, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot:      { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive:{ backgroundColor: '#fff', width: 18, borderRadius: 3 },
});

function NotSellerModal({ visible, onClose, onRegister }: {
  visible: boolean; onClose: () => void; onRegister: () => void;
}) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalIconBox}><Ionicons name="storefront-outline" size={40} color={AMBER} /></View>
          <Text style={styles.modalTitle}>Sellers Only</Text>
          <Text style={styles.modalBody}>Only registered sellers can contact buyers. Register as a seller to reply to requests.</Text>
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

function SpecChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.specChip}>
      <Text style={styles.specChipLabel}>{label}</Text>
      <Text style={styles.specChipValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

export default function ProductDetailScreen() {
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
    if (!id) { setError('No post ID provided.'); setLoading(false); return; }
    getPostByIdApi(id).then((res) => setPost(res.data.post)).catch((err) => setError(err?.message ?? 'Failed to load post.')).finally(() => setLoading(false));
  }, [id]);

  const goBack = () => {
    if (from === '/home/services')         router.replace('/home/services');
    else if (from === '/home/saved')       router.replace('/home/saved');
    else if (from === '/home/feed')        router.replace('/home/feed');
    else if (from === '/home/notifications') router.replace('/home/notifications');
    else                                   router.replace('/home/browse');
  };

  const requireSeller = () => { if (user?.role !== 'seller') { setShowGate(true); return false; } return true; };

  const handleChat = async () => {
    if (!requireSeller() || !post || !id) return;
    setChatLoading(true);
    try {
      const res    = await getOrCreateConversationApi(id, accessToken ?? '');
      const convId = res.data.conversation._id;
      const name   = post.title ?? post.description;
      const budget = post.budget ? `GH₵${post.budget.toLocaleString()}` : 'negotiable';
      const intro  = `Hi! I saw you requested "${name}" (${post.category}) with a budget of ${budget} in ${post.location}. I have what you need — do you still need it?`;
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

  if (loading) return <View style={styles.centred}><ActivityIndicator size="large" color={AMBER} /><Text style={styles.loadingText}>Loading request…</Text></View>;
  if (error || !post) return (
    <View style={styles.centred}>
      <Ionicons name="alert-circle-outline" size={48} color={MUTED} />
      <Text style={styles.errorTitle}>Post not found</Text>
      <Text style={styles.errorSub}>{error}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={goBack}><Text style={styles.retryText}>Go Back</Text></TouchableOpacity>
    </View>
  );

  const buyer       = post.user;
  const savedState  = isSaved(post._id);
  const initials    = buyer.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const contactPref = ((post as any).contactPreference ?? 'Chat') as string;

  const specs: Array<{ label: string; value: string }> = [];
  if ((post as any).brand)            specs.push({ label: 'Brand',     value: (post as any).brand });
  if ((post as any).model)            specs.push({ label: 'Model',     value: (post as any).model });
  if ((post as any).condition)        specs.push({ label: 'Condition', value: (post as any).condition });
  if ((post as any).quantity != null) specs.push({ label: 'Quantity',  value: String((post as any).quantity) });
  if ((post as any).preferredColor)   specs.push({ label: 'Colour',    value: (post as any).preferredColor });
  if ((post as any).preferredSize)    specs.push({ label: 'Size',      value: (post as any).preferredSize });
  if ((post as any).deliveryRequired) specs.push({ label: 'Delivery',  value: (post as any).deliveryRequired });
  if ((post as any).urgency)          specs.push({ label: 'Timing',    value: (post as any).urgency });

  return (
    <View style={styles.root}>
      <View style={[styles.floatRow, { top: insets.top + 8 }]} pointerEvents="box-none">
        <TouchableOpacity style={styles.floatBtn} onPress={goBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color={DARK} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.floatBtn} hitSlop={8}
          onPress={() => savedState ? unsavePost(post._id, accessToken ?? '') : savePost(post, accessToken ?? '')}>
          <Ionicons name={savedState ? 'bookmark' : 'bookmark-outline'} size={20} color={savedState ? AMBER : DARK} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}>
        <ImageSection images={post.images} category={post.category} />

        <View style={styles.contentCard}>
          <View style={styles.chipRow}>
            <View style={styles.catChip}><Text style={styles.catChipText}>{post.category}</Text></View>
            <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveBadgeText}>Live</Text></View>
          </View>
          <Text style={styles.postTitle}>{post.title ?? post.description}</Text>
          <Text style={styles.postedAt}>Posted {timeAgo(post.createdAt)}</Text>

          <View style={styles.statRow}>
            <View style={styles.statPill}>
              <View style={[styles.statIcon, { backgroundColor: '#FEF3E2' }]}><Ionicons name="cash-outline" size={16} color={AMBER} /></View>
              <View><Text style={styles.statLabel}>Budget</Text><Text style={styles.statValue}>{formatBudget(post.budget)}</Text></View>
            </View>
            <View style={styles.statPill}>
              <View style={[styles.statIcon, { backgroundColor: '#E8F4EC' }]}><Ionicons name="location-outline" size={16} color={GREEN} /></View>
              <View><Text style={styles.statLabel}>Location</Text><Text style={styles.statValue} numberOfLines={1}>{post.location}</Text></View>
            </View>
            <View style={styles.statPill}>
              <View style={[styles.statIcon, { backgroundColor: '#EAF0FB' }]}><Ionicons name="radio-button-on-outline" size={16} color="#3B6FD4" /></View>
              <View><Text style={styles.statLabel}>Status</Text><Text style={[styles.statValue, { textTransform: 'capitalize' }]}>{post.status}</Text></View>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>What the buyer needs</Text>
          <Text style={styles.descText}>{post.description}</Text>
        </View>

        {specs.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeading}>Product specs</Text>
            <View style={styles.specGrid}>
              {specs.map((s, i) => <SpecChip key={i} label={s.label} value={s.value} />)}
            </View>
          </View>
        )}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Posted by</Text>
          <View style={styles.buyerCard}>
            <View style={styles.buyerAvatarWrap}>
              {buyer.profilePicture
                ? <Image source={{ uri: buyer.profilePicture }} style={styles.buyerAvatar} />
                : <View style={[styles.buyerAvatar, { backgroundColor: AMBER, alignItems: 'center', justifyContent: 'center' }]}><Text style={styles.buyerInitials}>{initials}</Text></View>
              }
              <View style={styles.onlineDot} />
            </View>
            <View style={styles.buyerInfo}>
              <Text style={styles.buyerName}>{buyer.fullName}</Text>
              <View style={styles.verifiedRow}><Ionicons name="shield-checkmark" size={12} color={GREEN} /><Text style={styles.verifiedText}>Verified Buyer</Text></View>
            </View>
            <View style={styles.buyerBadge}><Text style={styles.buyerBadgeText}>Buyer</Text></View>
          </View>
        </View>

        <View style={styles.tipBanner}>
          <View style={styles.tipIconBox}><Ionicons name="bulb-outline" size={20} color={AMBER} /></View>
          <Text style={styles.tipText}>If you have what this buyer needs, tap <Text style={{ fontWeight: '800', color: AMBER }}>"I Have This!"</Text> to send your offer directly.</Text>
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
            {chatLoading ? <ActivityIndicator size="small" color="#fff" /> : <><Ionicons name="chatbubble-ellipses" size={22} color="#fff" /><Text style={styles.actionBtnText}>I Have This!</Text></>}
          </TouchableOpacity>
        )}
        {!['Phone Call', 'WhatsApp', 'Chat'].includes(contactPref) && (
          <>
            <TouchableOpacity style={[styles.actionBtnSmall, { borderColor: AMBER }]} onPress={handleCall}><Ionicons name="call-outline" size={20} color={AMBER} /></TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleChat} disabled={chatLoading}>
              {chatLoading ? <ActivityIndicator size="small" color="#fff" /> : <><Ionicons name="chatbubble-ellipses" size={20} color="#fff" /><Text style={styles.actionBtnText}>I Have This!</Text></>}
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
  floatBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4 },

  contentCard: { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -24, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 4, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: -2 }, elevation: 3 },

  chipRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  catChip:       { backgroundColor: CATBG, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  catChipText:   { fontSize: 11, fontWeight: '700', color: DARK },
  liveBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#E8F4EC', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  liveDot:       { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4CAF50' },
  liveBadgeText: { fontSize: 11, fontWeight: '700', color: GREEN },

  postTitle: { fontSize: 22, fontWeight: '900', color: DARK, lineHeight: 30, marginBottom: 4 },
  postedAt:  { fontSize: 11, color: MUTED, marginBottom: 18 },

  statRow:  { flexDirection: 'row', gap: 10, marginBottom: 6 },
  statPill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: BG, borderRadius: 14, padding: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2, borderWidth: 1, borderColor: '#EAE6DC' },
  statIcon:  { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 9, color: MUTED, fontWeight: '600' },
  statValue: { fontSize: 11, fontWeight: '800', color: DARK },

  sectionCard:    { backgroundColor: CARD, borderRadius: 16, padding: 18, marginHorizontal: 16, marginTop: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  sectionHeading: { fontSize: 13, fontWeight: '700', color: DARK, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  descText:       { fontSize: 13, color: '#5A6E65', lineHeight: 22 },

  specGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  specChip:       { backgroundColor: BG, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, minWidth: '46%', flex: 1, borderWidth: 1, borderColor: '#EAE6DC' },
  specChipLabel:  { fontSize: 10, color: MUTED, fontWeight: '600', marginBottom: 2 },
  specChipValue:  { fontSize: 13, fontWeight: '700', color: DARK },

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

  tipBanner:  { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#FFF8F0', borderRadius: 14, padding: 14, marginHorizontal: 16, marginTop: 12, marginBottom: 6, borderWidth: 1, borderColor: '#F5E0C8' },
  tipIconBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FDE9D0', alignItems: 'center', justifyContent: 'center' },
  tipText:    { flex: 1, fontSize: 12, color: DARK, lineHeight: 19 },

  bottomBar:      { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 12, backgroundColor: CARD, paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#E5E1D8', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 10 },
  actionBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: AMBER, borderRadius: 14, height: 52, shadowColor: AMBER, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  actionBtnText:  { fontSize: 15, fontWeight: '800', color: '#fff' },
  actionBtnSmall: { width: 52, height: 52, borderRadius: 14, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },

  modalOverlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  modalCard:         { width: '100%', backgroundColor: CARD, borderRadius: 20, padding: 28, alignItems: 'center', gap: 12 },
  modalIconBox:      { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FEF3E2', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  modalTitle:        { fontSize: 18, fontWeight: '900', color: DARK, textAlign: 'center' },
  modalBody:         { fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 20 },
  modalPrimaryBtn:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: AMBER, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 28, marginTop: 8, width: '100%', justifyContent: 'center', elevation: 6 },
  modalPrimaryText:  { fontSize: 14, fontWeight: '800', color: '#fff' },
  modalSecondaryBtn: { paddingVertical: 8 },
  modalSecondaryText:{ fontSize: 13, color: MUTED, fontWeight: '600' },
});
