import { applySellerApi, getSellerStatusApi, SellerStatus } from '@/services/api';
import { useAuth } from '@/store/authStore';
import { useEffect, useState } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';

const BG    = '#F2EFE6';
const CARD  = '#FFFFFF';
const DARK  = '#1B3A2D';
const AMBER = '#E8943A';
const MUTED = '#9CA3AF';
const CATBG = '#EDEAE1';
const GREEN  = '#2E7D52';
const RED    = '#E53935';

const SERVICE_CATS = [
  'Carpenter','Barber','Mason','Electrician','Plumber',
  'Painter','Welder','Mechanic','Tailor','Cleaner',
  'Photographer','Hair Stylist','AC Technician','Pest Control','Other',
];

const PRODUCT_CATS = [
  'Home & Furniture','Fashion','Vehicles','Electronics','Health & Beauty',
  'Phones & Tablets','Computers','Kitchen & Dining','Building Materials',
  'Groceries','Sports & Outdoors','Baby Products','Agriculture',
  'Books & Stationery','Other',
];

// MVP cities only
const GHANA_TOWNS = [
  'Accra',
  'Kumasi',
  'Takoradi',
  'Tamale',
  'Cape Coast',
];

// ── Helpers ───────────────────────────────────────────────
function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <Text style={styles.label}>
      {text}{required && <Text style={{ color: RED }}> *</Text>}
    </Text>
  );
}

function InputBox({ value, onChangeText, placeholder, keyboardType, error, autoCapitalize }: {
  value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: any; error?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <>
      <View style={[styles.inputBox, !!error && styles.inputError]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ?? ''}
          placeholderTextColor={MUTED}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? 'none'}
        />
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </>
  );
}

function RadioCard({ icon, label, sub, selected, onPress }: {
  icon: React.ComponentProps<typeof Ionicons>['name']; label: string; sub: string; selected: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.radioCard, selected && styles.radioCardSelected]} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.radioIconBox, { backgroundColor: selected ? '#FEF3E2' : CATBG }]}>
        <Ionicons name={icon} size={22} color={selected ? AMBER : DARK} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.radioLabel, selected && { color: AMBER }]}>{label}</Text>
        <Text style={styles.radioSub}>{sub}</Text>
      </View>
      <View style={[styles.radioCircle, selected && styles.radioCircleSelected]}>
        {selected && <View style={styles.radioDot} />}
      </View>
    </TouchableOpacity>
  );
}

function StepProgress({ current, total }: { current: number; total: number }) {
  const STEP_LABELS = ['Business Info', 'Contact', 'Location', 'ID Verify'];
  return (
    <View style={styles.progressWrap}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={styles.stepItem}>
          <View style={[styles.stepCircle, i < current ? styles.stepDone : i === current ? styles.stepActive : styles.stepInactive]}>
            {i < current
              ? <Ionicons name="checkmark" size={13} color="#fff" />
              : <Text style={[styles.stepNum, i === current && { color: '#fff' }]}>{i + 1}</Text>
            }
          </View>
          <Text style={[styles.stepLabel, i === current && { color: DARK, fontWeight: '700' }]}>{STEP_LABELS[i]}</Text>
          {i < total - 1 && <View style={[styles.stepLine, i < current && styles.stepLineDone]} />}
        </View>
      ))}
    </View>
  );
}

function AlreadyAppliedScreen({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  const router = useRouter();
  const isPending  = status === 'pending';
  const isApproved = status === 'approved';

  const icon  = isApproved ? 'checkmark-circle' : isPending ? 'time-outline' : 'close-circle-outline';
  const color = isApproved ? GREEN : isPending ? AMBER : RED;
  const title = isApproved
    ? 'You Are Already a Seller!'
    : isPending
    ? 'Application Under Review'
    : 'Application Rejected';
  const body = isApproved
    ? 'Your seller account is active. You can start listing products or services right away.'
    : isPending
    ? 'You have already submitted a seller application. Our team is reviewing it. We will notify you once a decision is made — please check back later.'
    : 'Your previous application was not approved. Please contact support for more information.';

  return (
    <View style={styles.successWrap}>
      <View style={[styles.successIconBox, { backgroundColor: isApproved ? '#E8F4EC' : isPending ? '#FEF3E2' : '#FDECEA' }]}>
        <Ionicons name={icon} size={64} color={color} />
      </View>
      <Text style={styles.successTitle}>{title}</Text>
      <Text style={styles.successBody}>{body}</Text>
      <View style={[styles.pendingBadge, { backgroundColor: isApproved ? '#E8F4EC' : isPending ? '#FEF3E2' : '#FDECEA', borderColor: isApproved ? '#B8DEC8' : isPending ? '#F5E0C8' : '#F5C6C6' }]}>
        <Ionicons name={icon} size={14} color={color} />
        <Text style={[styles.pendingText, { color }]}>
          Status: {isApproved ? 'Approved' : isPending ? 'Pending Approval' : 'Rejected'}
        </Text>
      </View>
      <TouchableOpacity style={styles.successBtn} onPress={() => router.back()} activeOpacity={0.88}>
        <Text style={styles.successBtnText}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

function SuccessScreen() {
  const router = useRouter();
  return (
    <View style={styles.successWrap}>
      <View style={styles.successIconBox}>
        <Ionicons name="checkmark-circle" size={64} color={GREEN} />
      </View>
      <Text style={styles.successTitle}>Application Submitted!</Text>
      <Text style={styles.successBody}>
        Your seller application has been submitted successfully. Our team will review your information, and you will be notified once your account has been approved.
      </Text>
      <View style={styles.pendingBadge}>
        <Ionicons name="time-outline" size={14} color={AMBER} />
        <Text style={styles.pendingText}>Status: Pending Approval</Text>
      </View>
      <TouchableOpacity style={styles.successBtn} onPress={() => router.push('/home/feed')} activeOpacity={0.88}>
        <Text style={styles.successBtnText}>Back to Home</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────
export default function BecomeSellerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { state: { accessToken } } = useAuth();

  // ── Status check on mount ─────────────────────────────────────────────────
  const [statusLoading,    setStatusLoading]    = useState(true);
  const [existingStatus,   setExistingStatus]   = useState<SellerStatus>('none');

  useEffect(() => {
    (async () => {
      try {
        const res = await getSellerStatusApi(accessToken ?? '');
        setExistingStatus(res.data.status);
      } catch {
        // If the check fails just let the user proceed — backend will guard on submit
      } finally {
        setStatusLoading(false);
      }
    })();
  }, []);

  const [step,      setStep]      = useState(0);
  const [submitted, setSubmitted] = useState(false);

  // Step 1
  const [bizName,          setBizName]          = useState('');
  const [bizType,          setBizType]          = useState<'product' | 'service' | ''>('');
  const [selCat,           setSelCat]           = useState('');
  const [showCatDropdown,  setShowCatDropdown]  = useState(false);

  // Step 2
  const [phone,    setPhone]    = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email,    setEmail]    = useState('');
  const [phoneErr, setPhoneErr] = useState('');

  // Step 3 — Location
  const [town,           setTown]           = useState('');
  const [townErr,        setTownErr]        = useState('');
  const [showTownModal,  setShowTownModal]  = useState(false);
  const [gps,            setGps]            = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading,     setGpsLoading]     = useState(false);

  // Step 4
  const [cardNumber,    setCardNumber]    = useState('');
  const [cardNumberErr, setCardNumberErr] = useState('');
  const [cardFront,     setCardFront]     = useState<string | null>(null);
  const [submitting,    setSubmitting]    = useState(false);

  const cats = bizType === 'service' ? SERVICE_CATS : PRODUCT_CATS;

  // ── Validation ────────────────────────────────────────────────────────────
  const validateStep1 = () => {
    if (!bizName.trim()) { Alert.alert('Required', 'Please enter your business name.'); return false; }
    if (!bizType)        { Alert.alert('Required', 'Please select a business type.');  return false; }
    if (!selCat)         { Alert.alert('Required', 'Please select a category.');        return false; }
    return true;
  };

  const validateStep2 = () => {
    setPhoneErr('');
    const cleaned = phone.trim();
    if (!/^0\d{9}$/.test(cleaned)) {
      setPhoneErr('Enter a valid 10-digit phone number starting with 0 (e.g. 0241234567).');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    setTownErr('');
    if (!town.trim()) { setTownErr('Please enter your business town.'); return false; }
    if (!gps) { Alert.alert('Required', 'Please capture your GPS location.'); return false; }
    return true;
  };

  const validateStep4 = () => {
    let valid = true;
    setCardNumberErr('');
    const ghCardRegex = /^GHA-[A-Z0-9]{10}-\d$/;
    if (!ghCardRegex.test(cardNumber.trim())) {
      setCardNumberErr('Enter a valid Ghana Card number (e.g. GHA-XXXXXXXXXX-X)');
      valid = false;
    }
    if (!cardFront) {
      Alert.alert('Required', 'Please upload the front of your Ghana Card.');
      valid = false;
    }
    return valid;
  };

  const pickCardImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow access to your photo library.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled && result.assets[0]) setCardFront(result.assets[0].uri);
  };

  const captureGPS = async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to capture your GPS coordinates.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setGps({ lat: loc.coords.latitude, lng: loc.coords.longitude });
    } catch {
      Alert.alert('Error', 'Could not get location. Please try again.');
    } finally {
      setGpsLoading(false);
    }
  };

  const next = () => {
    if (step === 0 && !validateStep1()) return;
    if (step === 1 && !validateStep2()) return;
    if (step === 2 && !validateStep3()) return;
    setStep((s) => s + 1);
  };

  const submit = async () => {
    if (!validateStep4()) return;
    if (!gps || !cardFront) return;

    setSubmitting(true);
    try {
      await applySellerApi(
        {
          bizName,
          bizType: bizType as 'product' | 'service',
          category: selCat,
          phone: phone.trim(),
          whatsapp: whatsapp.trim() || undefined,
          email:    email.trim()    || undefined,
          town:     town.trim(),
          lat:      gps.lat,
          lng:      gps.lng,
          ghanaCardNumber: cardNumber.trim(),
          cardFrontUri:    cardFront,
        },
        accessToken ?? ''
      );
      setSubmitted(true);
    } catch (err: any) {
      Alert.alert('Submission Failed', err?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Guards ────────────────────────────────────────────────────────────────
  if (statusLoading) return (
    <View style={[styles.root, styles.centerFill, { paddingTop: insets.top }]}>
      <ActivityIndicator size="large" color={AMBER} />
      <Text style={styles.checkingText}>Checking your account…</Text>
    </View>
  );

  if (existingStatus === 'pending' || existingStatus === 'approved' || existingStatus === 'rejected') return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Become a Seller</Text>
        <View style={{ width: 36 }} />
      </View>
      <AlreadyAppliedScreen status={existingStatus} />
    </View>
  );

  if (submitted) return (
    <View style={[styles.root, { paddingTop: insets.top }]}><SuccessScreen /></View>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 36 }} />
        <Text style={styles.headerTitle}>Become a Seller</Text>
        <View style={{ width: 36 }} />
      </View>

      <StepProgress current={step} total={4} />

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 110 }]}>

        {/* ═══ STEP 1 — Business Info ═══ */}
        {step === 0 && (
          <>
            <Text style={styles.stepHeading}>Business Information</Text>

            <Label text="Business Name" required />
            <InputBox value={bizName} onChangeText={setBizName} placeholder="e.g. Kofi Electronics" />

            <Label text="Business Type" required />
            <View style={styles.radioGroup}>
              <RadioCard
                icon="pricetag-outline" label="Product Seller" sub="I sell physical products"
                selected={bizType === 'product'}
                onPress={() => { setBizType('product'); setSelCat(''); setShowCatDropdown(false); }}
              />
              <RadioCard
                icon="briefcase-outline" label="Service Provider" sub="I offer a skilled service"
                selected={bizType === 'service'}
                onPress={() => { setBizType('service'); setSelCat(''); setShowCatDropdown(false); }}
              />
            </View>

            {bizType !== '' && (
              <>
                <Label text={bizType === 'service' ? 'Service Category' : 'Product Category'} required />

                {/* Single-select dropdown */}
                <TouchableOpacity
                  style={styles.inputBox}
                  onPress={() => setShowCatDropdown(!showCatDropdown)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.input, { color: selCat ? DARK : MUTED }]}>
                    {selCat || 'Select a category…'}
                  </Text>
                  <Ionicons name={showCatDropdown ? 'chevron-up' : 'chevron-down'} size={16} color={MUTED} />
                </TouchableOpacity>
                {showCatDropdown && (
                  <View style={styles.dropdown}>
                    {cats.map((c) => (
                      <TouchableOpacity
                        key={c}
                        style={[styles.dropdownItem, selCat === c && styles.dropdownItemSelected]}
                        onPress={() => { setSelCat(c); setShowCatDropdown(false); }}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.dropdownText, selCat === c && { color: AMBER, fontWeight: '700' }]}>{c}</Text>
                        {selCat === c && <Ionicons name="checkmark" size={15} color={AMBER} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}
          </>
        )}

        {/* ═══ STEP 2 — Contact ═══ */}
        {step === 1 && (
          <>
            <Text style={styles.stepHeading}>Contact Information</Text>

            <Label text="Business Phone Number" required />
            <InputBox value={phone} onChangeText={(v) => { setPhone(v); setPhoneErr(''); }} placeholder="0241234567 (10 digits)" keyboardType="phone-pad" error={phoneErr} />

            <Label text="WhatsApp Number" />
            <InputBox value={whatsapp} onChangeText={setWhatsapp} placeholder="0241234567 (optional)" keyboardType="phone-pad" />

            <Label text="Email Address" />
            <InputBox value={email} onChangeText={setEmail} placeholder="you@email.com (optional)" keyboardType="email-address" />

            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={16} color={AMBER} />
              <Text style={styles.infoText}>
                Buyers will use these details to contact you. Make sure they are correct.
              </Text>
            </View>
          </>
        )}

        {/* ═══ STEP 3 — Location ═══ */}
        {step === 2 && (
          <>
            <Text style={styles.stepHeading}>Business Location</Text>

            <Label text="Business Town / Area" required />
            <TouchableOpacity
              style={[styles.inputBox, !!townErr && styles.inputError]}
              onPress={() => setShowTownModal(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="location-outline" size={15} color={MUTED} style={{ marginRight: 8 }} />
              <Text style={[styles.input, { color: town ? DARK : MUTED }]}>
                {town || 'Select your town / city…'}
              </Text>
              <Ionicons name="chevron-down" size={15} color={MUTED} />
            </TouchableOpacity>
            {!!townErr && <Text style={styles.errorText}>{townErr}</Text>}

            {/* Town picker modal */}
            <Modal
              visible={showTownModal}
              animationType="slide"
              transparent
              onRequestClose={() => setShowTownModal(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalSheet}>
                  {/* Handle + title */}
                  <View style={styles.modalHandle} />
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Select Town / City</Text>
                    <TouchableOpacity onPress={() => setShowTownModal(false)} hitSlop={8}>
                      <Ionicons name="close" size={22} color={DARK} />
                    </TouchableOpacity>
                  </View>
                  {/* List */}
                  <FlatList
                    data={GHANA_TOWNS}
                    keyExtractor={(item) => item}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[styles.townItem, town === item && styles.townItemSelected]}
                        onPress={() => {
                          setTown(item);
                          setTownErr('');
                          setShowTownModal(false);
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name="location-outline"
                          size={14}
                          color={town === item ? AMBER : MUTED}
                          style={{ marginRight: 10 }}
                        />
                        <Text style={[styles.townItemText, town === item && styles.townItemTextSelected]}>
                          {item}
                        </Text>
                        {town === item && <Ionicons name="checkmark" size={15} color={AMBER} />}
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                      <View style={{ alignItems: 'center', paddingTop: 40 }}>
                        <Text style={{ color: MUTED, fontSize: 13 }}>No towns found</Text>
                      </View>
                    }
                  />
                </View>
              </View>
            </Modal>

            <Label text="GPS Coordinates" required />
            <TouchableOpacity style={styles.gpsBtn} onPress={captureGPS} activeOpacity={0.85} disabled={gpsLoading}>
              {gpsLoading
                ? <ActivityIndicator size="small" color={AMBER} />
                : <Ionicons name="navigate-outline" size={18} color={AMBER} />
              }
              <Text style={styles.gpsBtnText}>
                {gps
                  ? `📍 ${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}`
                  : 'Tap to capture current location'}
              </Text>
              {gps && (
                <TouchableOpacity onPress={() => setGps(null)} hitSlop={8}>
                  <Ionicons name="close-circle-outline" size={18} color={MUTED} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>

            <View style={styles.infoCard}>
              <Ionicons name="shield-checkmark-outline" size={16} color={GREEN} />
              <Text style={styles.infoText}>
                Your GPS coordinates help nearby buyers find your business faster. We only store the coordinates — your exact address is never shown publicly.
              </Text>
            </View>
          </>
        )}

        {/* ═══ STEP 4 — ID Verification ═══ */}
        {step === 3 && (
          <>
            <Text style={styles.stepHeading}>ID Verification</Text>

            <View style={styles.infoCard}>
              <Ionicons name="shield-checkmark-outline" size={16} color={GREEN} />
              <Text style={styles.infoText}>
                Enter your Ghana Card number and upload the front page. This helps us verify your identity and protect buyers.
              </Text>
            </View>

            {/* Ghana Card number */}
            <Label text="Ghana Card Number" required />
            <View style={[styles.inputBox, !!cardNumberErr && styles.inputError]}>
              <TextInput
                style={styles.input}
                value={cardNumber}
                onChangeText={(v) => { setCardNumber(v.toUpperCase()); setCardNumberErr(''); }}
                placeholder="GHA-XXXXXXXXXX-X"
                placeholderTextColor={MUTED}
                autoCapitalize="characters"
              />
            </View>
            {!!cardNumberErr && <Text style={styles.errorText}>{cardNumberErr}</Text>}

            {/* Front only */}
            <Label text="Ghana Card — Front Page" required />
            <TouchableOpacity
              style={[styles.cardUpload, cardFront && styles.cardUploadDone]}
              onPress={pickCardImage}
              activeOpacity={0.85}
            >
              {cardFront ? (
                <View style={styles.cardUploadedRow}>
                  <Ionicons name="checkmark-circle" size={22} color={GREEN} />
                  <Text style={styles.cardUploadedText}>Front page uploaded ✓</Text>
                  <TouchableOpacity onPress={() => setCardFront(null)} hitSlop={8}>
                    <Ionicons name="close-circle-outline" size={20} color={MUTED} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.cardUploadInner}>
                  <Ionicons name="camera-outline" size={28} color={AMBER} />
                  <Text style={styles.cardUploadTitle}>Upload Front Page</Text>
                  <Text style={styles.cardUploadSub}>Tap to choose from gallery or take a photo</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={[styles.infoCard, { marginTop: 12 }]}>
              <Ionicons name="lock-closed-outline" size={16} color={MUTED} />
              <Text style={styles.infoText}>
                Your ID is encrypted and only reviewed by our verification team. It is never shared with buyers or sellers.
              </Text>
            </View>
          </>
        )}

      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        {step > 0 && (
          <TouchableOpacity style={styles.backFooterBtn} onPress={() => setStep(s => s - 1)} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={16} color={AMBER} />
            <Text style={styles.backFooterText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextBtn, step === 0 && { flex: 1 }]}
          onPress={step === 3 ? submit : next}
          activeOpacity={0.88}
          disabled={submitting}
        >
          {submitting
            ? <ActivityIndicator size="small" color="#fff" />
            : <>
                <Text style={styles.nextBtnText}>{step === 3 ? 'Submit Application' : 'Next'}</Text>
                <Ionicons name={step === 3 ? 'checkmark-circle-outline' : 'arrow-forward'} size={17} color="#fff" />
              </>
          }
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  centerFill: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  checkingText: { fontSize: 13, color: MUTED, fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: CATBG, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: DARK },

  progressWrap: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', paddingHorizontal: 20, paddingBottom: 16, gap: 0 },
  stepItem: { alignItems: 'center', flex: 1, position: 'relative' },
  stepCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  stepActive: { backgroundColor: AMBER },
  stepDone: { backgroundColor: GREEN },
  stepInactive: { backgroundColor: CATBG },
  stepNum: { fontSize: 12, fontWeight: '700', color: MUTED },
  stepLabel: { fontSize: 10, color: MUTED, textAlign: 'center' },
  stepLine: { position: 'absolute', top: 14, left: '60%', right: '-60%', height: 2, backgroundColor: CATBG, zIndex: -1 },
  stepLineDone: { backgroundColor: GREEN },

  scroll: { paddingHorizontal: 20 },
  stepHeading: { fontSize: 18, fontWeight: '800', color: DARK, marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '700', color: DARK, marginBottom: 8, marginTop: 16 },

  inputBox: { flexDirection: 'row', alignItems: 'center', height: 44, backgroundColor: CARD, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: '#E5E1D8' },
  inputError: { borderColor: RED },
  input: { flex: 1, fontSize: 13, color: DARK },
  errorText: { fontSize: 11, color: RED, marginTop: 4 },

  radioGroup: { gap: 10 },
  radioCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 14, padding: 14, gap: 12, borderWidth: 1.5, borderColor: 'transparent', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  radioCardSelected: { borderColor: AMBER, backgroundColor: '#FFFAF5' },
  radioIconBox: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  radioLabel: { fontSize: 13, fontWeight: '700', color: DARK, marginBottom: 2 },
  radioSub: { fontSize: 11, color: MUTED },
  radioCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#D1CBBF', alignItems: 'center', justifyContent: 'center' },
  radioCircleSelected: { borderColor: AMBER },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: AMBER },

  dropdown: { backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: '#E5E1D8', overflow: 'hidden', marginTop: 4, marginBottom: 4 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: CATBG },
  dropdownItemSelected: { backgroundColor: '#FFF8F0' },
  dropdownText: { fontSize: 13, color: DARK },

  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#FEF3E2', borderRadius: 12, padding: 14, marginTop: 16, borderWidth: 1, borderColor: '#F5E0C8' },
  infoText: { flex: 1, fontSize: 11, color: DARK, lineHeight: 17 },

  gpsBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: CARD, borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: '#F5E0C8', borderStyle: 'dashed' },
  gpsBtnText: { fontSize: 13, fontWeight: '600', color: AMBER, flex: 1 },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 12, backgroundColor: BG, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E1D8' },
  backFooterBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: CARD, borderRadius: 14, paddingVertical: 13, borderWidth: 1.5, borderColor: AMBER },
  backFooterText: { fontSize: 13, fontWeight: '700', color: AMBER },
  nextBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: AMBER, borderRadius: 14, paddingVertical: 13, shadowColor: AMBER, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  nextBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },

  cardUpload: { borderWidth: 1.5, borderColor: '#DDD9CF', borderStyle: 'dashed', borderRadius: 14, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center', paddingVertical: 24, marginBottom: 4 },
  cardUploadDone: { borderColor: GREEN, borderStyle: 'solid', backgroundColor: '#F0FBF4' },
  cardUploadInner: { alignItems: 'center', gap: 6 },
  cardUploadTitle: { fontSize: 13, fontWeight: '700', color: DARK },
  cardUploadSub: { fontSize: 11, color: MUTED, textAlign: 'center' },
  cardUploadedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  cardUploadedText: { flex: 1, fontSize: 13, fontWeight: '600', color: GREEN },

  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 },
  successIconBox: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#E8F4EC', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  successTitle: { fontSize: 22, fontWeight: '900', color: DARK, textAlign: 'center' },
  successBody: { fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 21 },
  pendingBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3E2', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: '#F5E0C8' },
  pendingText: { fontSize: 12, fontWeight: '700', color: AMBER },
  successBtn: { backgroundColor: AMBER, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40, marginTop: 8, shadowColor: AMBER, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  successBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },

  // ── Town picker modal ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet:   { backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', paddingBottom: 32 },
  modalHandle:  { width: 40, height: 4, borderRadius: 2, backgroundColor: CATBG, alignSelf: 'center', marginTop: 10, marginBottom: 8 },
  modalHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  modalTitle:   { fontSize: 16, fontWeight: '800', color: DARK },
  modalSearch:  { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, backgroundColor: CATBG, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  townItem:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: CATBG },
  townItemSelected: { backgroundColor: '#FFF8F0' },
  townItemText:     { flex: 1, fontSize: 13, color: DARK },
  townItemTextSelected: { color: AMBER, fontWeight: '700' },
});
