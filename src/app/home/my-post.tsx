import { useState } from 'react';
import { Alert, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import * as ExpoLocation from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { createPostApi, type ApiError } from '../../services/api';
import { useAuth } from '../../store/authStore';

const GREEN = '#126b48';
const DARK = '#153d2d';
const AMBER = '#df9632';
const BG = '#faf8f4';
const LINE = '#e4e0d9';
const MUTED = '#777b79';
const MAX_IMAGES = 5;
const PRODUCT_CATEGORIES = ['Electronics', 'Fashion', 'Home & Garden', 'Vehicles', 'Food & Groceries', 'Health & Beauty', 'Other'];
const SERVICE_CATEGORIES = ['Electrician', 'Plumber', 'Carpenter', 'Cleaner', 'Tailor', 'Mechanic', 'Painter', 'Other'];
const REGIONS = ['Greater Accra', 'Ashanti', 'Central', 'Eastern', 'Northern', 'Volta', 'Western'];
const CITIES = ['Accra', 'Kumasi', 'Tema', 'Takoradi', 'Cape Coast', 'Tamale', 'Koforidua', 'Ho'];

type RequestType = 'product' | 'service' | '';
type PickerProps = { label: string; value: string; placeholder: string; options: string[]; onChange: (value: string) => void; required?: boolean };

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <View style={styles.field}><Text style={styles.label}>{label}{required && <Text style={styles.required}> *</Text>}</Text>{children}</View>;
}

function Select({ label, value, placeholder, options, onChange, required }: PickerProps) {
  const [open, setOpen] = useState(false);
  return <Field label={label} required={required}>
    <TouchableOpacity style={styles.input} onPress={() => setOpen(true)} activeOpacity={0.8}>
      <Text style={[styles.inputText, !value && styles.placeholder]}>{value || placeholder}</Text><Ionicons name="chevron-down" size={16} color={MUTED} />
    </TouchableOpacity>
    <Modal transparent visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
      <View style={styles.modalShade}><View style={styles.sheet}>
        <View style={styles.sheetHead}><Text style={styles.sheetTitle}>{label}</Text><TouchableOpacity onPress={() => setOpen(false)}><Ionicons name="close" size={23} color={DARK} /></TouchableOpacity></View>
        <ScrollView>{options.map((option) => <TouchableOpacity key={option} style={styles.option} onPress={() => { onChange(option); setOpen(false); }}><Text style={styles.optionText}>{option}</Text>{value === option && <Ionicons name="checkmark" size={19} color={GREEN} />}</TouchableOpacity>)}</ScrollView>
      </View></View>
    </Modal>
  </Field>;
}

function TextField({ label, value, onChange, placeholder, required, keyboardType, multiline }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; required?: boolean; keyboardType?: 'default' | 'numeric'; multiline?: boolean }) {
  return <Field label={label} required={required}><TextInput style={[styles.textInput, multiline && styles.textArea]} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#9a9b9a" keyboardType={keyboardType} multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} maxLength={multiline ? 500 : undefined} /></Field>;
}

export default function MyPostScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { state: { accessToken } } = useAuth();
  const [step, setStep] = useState(1);
  const [type, setType] = useState<RequestType>('');
  const [productCategory, setProductCategory] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  const [productTitle, setProductTitle] = useState('');
  const [serviceTitle, setServiceTitle] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [budgetType, setBudgetType] = useState(''); const [budget, setBudget] = useState(''); const [contact, setContact] = useState('Chat');
  const [showInFeed, setShowInFeed] = useState<boolean | null>(null);
  const [brand, setBrand] = useState(''); const [model, setModel] = useState(''); const [color, setColor] = useState(''); const [size, setSize] = useState(''); const [quantity, setQuantity] = useState('1'); const [condition, setCondition] = useState('Any');
  const [delivery, setDelivery] = useState('Yes, I need delivery'); const [urgency, setUrgency] = useState('Urgent Today');
  const [region, setRegion] = useState(''); const [city, setCity] = useState(''); const [address, setAddress] = useState('');
  const [date, setDate] = useState(''); const [time, setTime] = useState(''); const [duration, setDuration] = useState(''); const [workers, setWorkers] = useState('1'); const [images, setImages] = useState<string[]>([]); const [loading, setLoading] = useState(false);

  const chooseImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') return Alert.alert('Permission needed', 'Allow photo library access to attach images.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, selectionLimit: MAX_IMAGES - images.length, quality: 0.8 });
    if (!result.canceled) setImages((current) => [...current, ...result.assets.map((asset) => asset.uri)].slice(0, MAX_IMAGES));
  };

  const isProduct = type === 'product';
  const validateDetails = () => {
    const currentTitle = isProduct ? productTitle : serviceTitle;
    const currentCategory = isProduct ? productCategory : serviceCategory;
    const currentDescription = isProduct ? productDescription : serviceDescription;

    if (!currentTitle.trim() || !currentCategory || !region || !city) {
      Alert.alert('Complete required details', 'Add a title, category, and location before continuing.'); return false;
    }
    return true;
  };
  const submit = async () => {
    if (!accessToken) return Alert.alert('Not logged in', 'Please sign in to post a request.');
    if (showInFeed === null) return Alert.alert('Choose visibility', 'Choose whether to show or hide your request from the public feed.');
    setLoading(true);
    try {
      const currentTitle = isProduct ? productTitle : serviceTitle;
      const currentCategory = isProduct ? productCategory : serviceCategory;
      const currentDescription = isProduct ? productDescription : serviceDescription;

      // Silently attempt to get buyer's GPS for distance-based seller matching.
      // If permission is denied or location fails, the post still submits without coords.
      let buyerLat: number | undefined;
      let buyerLng: number | undefined;
      try {
        const { status } = await ExpoLocation.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced });
          buyerLat = loc.coords.latitude;
          buyerLng = loc.coords.longitude;
        }
      } catch { /* non-fatal — post proceeds without coords */ }

      await createPostApi({
        requestType: type || undefined,
        category: currentCategory,
        title: currentTitle.trim(),
        description: currentDescription.trim(),
        budget,
        budgetType,
        contactPreference: contact,
        quantity: type === 'product' ? quantity : undefined,
        condition: type === 'product' ? condition : undefined,
        deliveryRequired: type === 'product' ? delivery : undefined,
        urgency: type === 'product' ? urgency : undefined,
        serviceType: type === 'service' ? currentCategory : undefined,
        location: `${city}, ${region}`,
        imageUris: images,
        brand,
        model,
        preferredColor: color,
        preferredSize: size,
        region,
        city,
        exactAddress: address,
        preferredDate: date,
        preferredTime: time,
        estimatedDuration: duration,
        workersNeeded: type === 'service' ? workers : undefined,
        showInFeed,
        lat: buyerLat,
        lng: buyerLng,
      }, accessToken);

      // Clear the form so fields are empty when returning to Post screen
      const resetForm = () => {
        setStep(1);
        setType('');
        setProductCategory('');
        setServiceCategory('');
        setProductTitle('');
        setServiceTitle('');
        setProductDescription('');
        setServiceDescription('');
        setBudgetType('');
        setBudget('');
        setContact('Chat');
        setBrand('');
        setModel('');
        setColor('');
        setSize('');
        setQuantity('1');
        setCondition('Any');
        setDelivery('Yes, I need delivery');
        setUrgency('Urgent Today');
        setRegion('');
        setCity('');
        setAddress('');
        setDate('');
        setTime('');
        setDuration('');
        setWorkers('1');
        setImages([]);
        setShowInFeed(null);
      };

      resetForm();
      Alert.alert('Posted!', 'Your request is now live. Sellers will reach out soon.', [{ text: 'OK', onPress: () => router.push('/home/profile') }]);
    } catch (error) { Alert.alert('Could not post request', (error as ApiError).message ?? 'Please try again.'); } finally { setLoading(false); }
  };
  const title = isProduct ? productTitle : serviceTitle;
  const description = isProduct ? productDescription : serviceDescription;
  const category = isProduct ? productCategory : serviceCategory;
  const setTitleValue = isProduct ? setProductTitle : setServiceTitle;
  const setDescriptionValue = isProduct ? setProductDescription : setServiceDescription;
  const setCategoryValue = isProduct ? setProductCategory : setServiceCategory;
  const next = () => { if (step === 1) { if (!type) return Alert.alert('Choose a request type', 'Select Product or Service to continue.'); setStep(2); } else if (step === 2 && validateDetails()) setStep(3); else if (step === 3) submit(); };

  return <View style={[styles.root, { paddingTop: insets.top }]}>
    <View style={styles.header}><TouchableOpacity onPress={() => step === 1 ? router.back() : setStep(step - 1)} hitSlop={12}><Ionicons name="arrow-back" size={25} color={DARK} /></TouchableOpacity><Text style={styles.headerTitle}>Post Request</Text><View style={{ width: 25 }} /></View>
    <View style={styles.steps}>{['Request Type', 'Details', 'Review'].map((label, index) => <View key={label} style={styles.stepWrap}>{index > 0 && <View style={[styles.stepLine, step > index && styles.stepLineActive]} />}<View style={[styles.stepDot, step === index + 1 && styles.stepCurrent, step > index + 1 && styles.stepDone]}><Text style={styles.stepNumber}>{step > index + 1 ? '✓' : index + 1}</Text></View><Text style={[styles.stepLabel, step === index + 1 && styles.stepLabelActive]}>{label}</Text></View>)}</View>
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 115 + insets.bottom }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {step === 1 && <><Text style={styles.heading}>What are you looking for?</Text><Text style={styles.subheading}>Choose the type of request you want to post.</Text><View style={styles.typeRow}>
        <TouchableOpacity style={[styles.typeCard, isProduct && styles.typeCardSelected]} onPress={() => setType('product')}><View style={[styles.typeIcon, { backgroundColor: '#eaf5ef' }]}><Ionicons name="cube" size={31} color={GREEN} /></View><Text style={styles.typeTitle}>Product</Text><Text style={styles.typeDesc}>I want to buy or find{`\n`}a product</Text>{isProduct && <Ionicons style={styles.cornerCheck} name="checkmark-circle" size={22} color={GREEN} />}</TouchableOpacity>
        <TouchableOpacity style={[styles.typeCard, type === 'service' && styles.typeCardSelected]} onPress={() => { setType('service'); setImages([]); }}><View style={[styles.typeIcon, { backgroundColor: '#fff3e5' }]}><Ionicons name="construct" size={31} color={AMBER} /></View><Text style={styles.typeTitle}>Service</Text><Text style={styles.typeDesc}>I need someone to{`\n`}do a service</Text>{type === 'service' && <Ionicons style={styles.cornerCheck} name="checkmark-circle" size={22} color={GREEN} />}</TouchableOpacity>
      </View></>}
      {step === 2 && <>
        <View style={styles.card}><Text style={styles.cardTitle}>{isProduct ? 'Product Details' : 'Service Details'}</Text><Text style={styles.cardHint}>Tell sellers exactly what you need.</Text><TextField label={isProduct ? 'Product Title' : 'Service Title'} required value={title} onChange={setTitleValue} placeholder={isProduct ? 'e.g. Samsung Galaxy S24, 256GB, Black' : 'e.g. Need a professional plumber'} /><Select label={isProduct ? 'Product Category' : 'Service Category'} required value={category} placeholder="Select a category" options={isProduct ? PRODUCT_CATEGORIES : SERVICE_CATEGORIES} onChange={setCategoryValue} /><TextField label="Description (Optional)" value={description} onChange={setDescriptionValue} placeholder={isProduct ? 'Describe the product you are looking for in detail...' : 'Describe the service you need in detail...'} multiline /></View>
        {isProduct ? <><View style={styles.card}><Text style={styles.cardTitle}>Product Specifications</Text><View style={styles.twoCols}><TextField label="Brand (Optional)" value={brand} onChange={setBrand} placeholder="e.g. Samsung" /><TextField label="Model (Optional)" value={model} onChange={setModel} placeholder="e.g. S24" /><TextField label="Preferred Color (Optional)" value={color} onChange={setColor} placeholder="e.g. Black" /><TextField label="Preferred Size (Optional)" value={size} onChange={setSize} placeholder="e.g. Large" /></View><View style={styles.twoCols}><TextField label="Quantity Needed" required value={quantity} onChange={setQuantity} placeholder="1" keyboardType="numeric" /><Select label="Condition" required value={condition} placeholder="Any" options={['Any', 'New', 'Used', 'Refurbished']} onChange={setCondition} /></View></View><View style={styles.card}><Text style={styles.cardTitle}>Timing</Text><Select label="Urgency" required value={urgency} placeholder="Select timing" options={['Urgent Today', 'Within 3 Days', 'Within a Week', 'No Deadline']} onChange={setUrgency} /></View></> : <View style={styles.card}><Text style={styles.cardTitle}>Service Information</Text><View style={styles.twoCols}><TextField label="Preferred Date" value={date} onChange={setDate} placeholder="Select date" /><TextField label="Preferred Time" value={time} onChange={setTime} placeholder="Select time" /></View><View style={styles.twoCols}><TextField label="Estimated Duration (Optional)" value={duration} onChange={setDuration} placeholder="Select duration" /><TextField label="Workers Needed (Optional)" value={workers} onChange={setWorkers} placeholder="1" keyboardType="numeric" /></View></View>}
        <Budget budgetType={budgetType} setBudgetType={setBudgetType} budget={budget} setBudget={setBudget} /><Location region={region} setRegion={setRegion} city={city} setCity={setCity} address={address} setAddress={setAddress} />
      </>}
      {step === 3 && <>
        {isProduct ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Images <Text style={styles.optional}>(Optional)</Text></Text>
            <Text style={styles.cardHint}>Add up to 5 images for reference.</Text>
            <TouchableOpacity style={styles.uploadZone} onPress={chooseImages}>
              <Ionicons name="cloud-upload-outline" size={31} color={DARK} />
              <Text style={styles.uploadTitle}>Upload Images</Text>
              <Text style={styles.uploadHint}>Tap to select images (Max 5)</Text>
            </TouchableOpacity>
            <View style={styles.imageRow}>
              {images.map((uri) => (
                <View key={uri} style={styles.thumb}>
                  <Image source={{ uri }} style={styles.image} />
                  <TouchableOpacity style={styles.removeImage} onPress={() => setImages(images.filter((item) => item !== uri))}>
                    <Ionicons name="close" size={13} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {Array.from({ length: Math.max(0, MAX_IMAGES - images.length) }).map((_, i) => (
                <TouchableOpacity key={i} style={styles.emptyThumb} onPress={chooseImages}>
                  <Ionicons name="add" size={22} color={DARK} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Service requests do not require images</Text>
            <Text style={styles.cardHint}>Only the requester's profile picture will display in service details.</Text>
          </View>
        )}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Visibility</Text>
          <Text style={styles.cardHint}>Choose whether your request should appear in the public feed.</Text>
          <View style={styles.visibilityOptions}>
            <TouchableOpacity style={[styles.visibilityOption, showInFeed === true && styles.visibilityOptionSelected]} onPress={() => setShowInFeed(true)}>
              <Ionicons name="eye-outline" size={20} color={showInFeed === true ? GREEN : DARK} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.visibilityTitle}>Show in Feed</Text>
                <Text style={styles.visibilityHint}>Your request can appear in the public feed.</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.visibilityOption, showInFeed === false && styles.visibilityOptionSelected]} onPress={() => setShowInFeed(false)}>
              <Ionicons name="eye-off-outline" size={20} color={showInFeed === false ? GREEN : DARK} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.visibilityTitle}>Hide from Feed</Text>
                <Text style={styles.visibilityHint}>Your request will not appear in the public feed.</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.card}><Text style={styles.cardTitle}>Contact Preference</Text><Text style={styles.cardHint}>How should sellers contact you?</Text><View style={styles.contactRow}>{[['Chat', 'chatbubbles'], ['Phone Call', 'call'], ['WhatsApp', 'logo-whatsapp']].map(([name, icon]) => <TouchableOpacity key={name} style={[styles.contactButton, contact === name && styles.contactSelected]} onPress={() => setContact(name)}><Ionicons name={icon as any} size={24} color={contact === name ? GREEN : DARK} /><Text style={styles.contactText}>{name}</Text></TouchableOpacity>)}</View></View>
        {isProduct && <View style={styles.card}><Text style={styles.cardTitle}>Delivery Required?</Text><View style={styles.deliveryRow}>{['Yes, I need delivery', 'No, I will pick up'].map((choice) => <TouchableOpacity key={choice} style={[styles.deliveryBtn, delivery === choice && styles.deliverySelected]} onPress={() => setDelivery(choice)}><Text style={styles.deliveryText}>{choice}</Text></TouchableOpacity>)}</View></View>}
        <View style={styles.info}><Ionicons name="shield-checkmark" size={26} color={GREEN} /><View style={{ flex: 1 }}><Text style={styles.infoTitle}>Why provide all details?</Text><Text style={styles.infoText}>The more details you provide, the better matched sellers you will get.</Text></View></View>
        <View style={styles.card}><Text style={styles.cardTitle}>Review your request</Text><Summary label="Type" value={isProduct ? 'Product' : 'Service'} /><Summary label="Title" value={title} /><Summary label="Category" value={category} /><Summary label="Visibility" value={showInFeed === true ? 'Show in Feed' : showInFeed === false ? 'Hide from Feed' : ''} /><Summary label="Location" value={`${city}, ${region}`} /><Summary label="Budget" value={budget ? `GHS ${budget}${budgetType ? ` · ${budgetType}` : ''}` : budgetType} /></View>
      </>}
    </ScrollView>
    <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}><TouchableOpacity style={[styles.primaryButton, loading && { opacity: 0.65 }]} disabled={loading} onPress={next}>{loading ? <ActivityIndicator color="#fff" /> : <><Text style={styles.primaryText}>{step === 1 ? 'Continue' : step === 2 ? 'Review Request' : 'Post Request'}</Text><Ionicons name="arrow-forward" size={20} color="#fff" /></>}</TouchableOpacity></View>
  </View>;
}

function Budget({ budgetType, setBudgetType, budget, setBudget }: { budgetType: string; setBudgetType: (v: string) => void; budget: string; setBudget: (v: string) => void }) { return <View style={styles.card}><Text style={styles.cardTitle}>Budget <Text style={styles.optional}>(Optional)</Text></Text><Field label="Budget Type"><View style={styles.segmented}>{['Fixed Price', 'Price Range', 'Negotiable'].map((value) => <TouchableOpacity key={value} style={[styles.segment, budgetType === value && styles.segmentSelected]} onPress={() => setBudgetType(value)}><Text style={styles.segmentText}>{value}</Text></TouchableOpacity>)}</View></Field><TextField label="Budget Amount (Optional)" value={budget} onChange={setBudget} placeholder="GHS   Enter amount" keyboardType="numeric" /></View>; }
function Location({ region, setRegion, city, setCity, address, setAddress }: any) { return <View style={styles.card}><Text style={styles.cardTitle}>Location</Text><View style={styles.twoCols}><Select label="Region" required value={region} placeholder="Select region" options={REGIONS} onChange={setRegion} /><Select label="City / Town" required value={city} placeholder="Select city" options={CITIES} onChange={setCity} /></View><TextField label="Exact Address (Optional)" value={address} onChange={setAddress} placeholder="e.g. House number, street name" /></View>; }
function Summary({ label, value }: { label: string; value: string }) { return <View style={styles.summary}><Text style={styles.summaryLabel}>{label}</Text><Text style={styles.summaryValue}>{value || 'Not provided'}</Text></View>; }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG }, header: { height: 58, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, headerTitle: { fontSize: 20, fontWeight: '800', color: DARK }, steps: { flexDirection: 'row', justifyContent: 'center', paddingHorizontal: 31, paddingBottom: 24 }, stepWrap: { flex: 1, alignItems: 'center', position: 'relative' }, stepLine: { position: 'absolute', height: 1.5, backgroundColor: '#d7d6d2', width: '83%', right: '58%', top: 14 }, stepLineActive: { backgroundColor: GREEN }, stepDot: { width: 29, height: 29, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#d4d4d4' }, stepCurrent: { backgroundColor: AMBER }, stepDone: { backgroundColor: GREEN }, stepNumber: { color: '#fff', fontSize: 13, fontWeight: '800' }, stepLabel: { marginTop: 6, color: DARK, fontSize: 10, fontWeight: '600' }, stepLabelActive: { fontWeight: '800' }, content: { paddingHorizontal: 13 }, heading: { fontSize: 16, fontWeight: '800', color: DARK, marginTop: 7 }, subheading: { fontSize: 12, color: MUTED, marginTop: 8, marginBottom: 18 }, typeRow: { flexDirection: 'row', gap: 14 }, typeCard: { flex: 1, minHeight: 175, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: LINE, alignItems: 'center', padding: 20, position: 'relative' }, typeCardSelected: { borderColor: GREEN, backgroundColor: '#fbfffc' }, typeIcon: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 15 }, typeTitle: { fontSize: 15, fontWeight: '800', color: '#111' }, typeDesc: { color: '#444', fontSize: 11, lineHeight: 18, textAlign: 'center', marginTop: 8 }, cornerCheck: { position: 'absolute', top: 7, right: 7 }, card: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 11, borderWidth: 1, borderColor: '#f0ede8' }, cardTitle: { fontSize: 14, fontWeight: '800', color: DARK }, cardHint: { color: MUTED, fontSize: 11, marginTop: 5 }, visibilityOptions: { gap: 10, marginTop: 12 }, visibilityOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f7f5ef', borderRadius: 10, borderWidth: 1, borderColor: LINE, padding: 12 }, visibilityOptionSelected: { borderColor: GREEN, backgroundColor: '#f4fbf7' }, visibilityTitle: { fontSize: 13, fontWeight: '700', color: DARK }, visibilityHint: { fontSize: 11, color: MUTED, marginTop: 2 }, field: { marginTop: 14, flex: 1 }, label: { color: '#303532', fontWeight: '700', fontSize: 11, marginBottom: 6 }, required: { color: '#e44747' }, input: { borderWidth: 1, borderColor: '#ddd9d3', height: 40, borderRadius: 7, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, inputText: { color: DARK, fontSize: 12 }, placeholder: { color: '#949593' }, textInput: { borderWidth: 1, borderColor: '#ddd9d3', minHeight: 40, borderRadius: 7, paddingHorizontal: 11, fontSize: 12, color: DARK }, textArea: { height: 91, paddingTop: 10 }, twoCols: { flexDirection: 'row', gap: 13 }, segmented: { flexDirection: 'row', borderWidth: 1, borderColor: '#ddd9d3', borderRadius: 7, overflow: 'hidden' }, segment: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRightWidth: 1, borderColor: '#e5e1dc' }, segmentSelected: { borderWidth: 1, borderColor: GREEN, margin: -1, backgroundColor: '#f7fcf8' }, segmentText: { fontSize: 10, fontWeight: '700', color: DARK }, uploadZone: { height: 151, borderWidth: 1.3, borderStyle: 'dashed', borderColor: '#c8c4be', borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 15 }, uploadTitle: { fontSize: 12, fontWeight: '800', color: DARK, marginTop: 7 }, uploadHint: { fontSize: 11, color: MUTED, marginTop: 5 }, imageRow: { flexDirection: 'row', gap: 10, marginTop: 15 }, thumb: { width: 59, height: 56, position: 'relative' }, image: { width: '100%', height: '100%', borderRadius: 8 }, emptyThumb: { width: 59, height: 56, borderRadius: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: '#c8c4be', alignItems: 'center', justifyContent: 'center' }, removeImage: { position: 'absolute', top: -5, right: -5, width: 18, height: 18, borderRadius: 9, backgroundColor: '#d94646', alignItems: 'center', justifyContent: 'center' }, contactRow: { flexDirection: 'row', gap: 9, marginTop: 15 }, contactButton: { flex: 1, height: 68, borderRadius: 9, borderWidth: 1, borderColor: '#e0ddd8', alignItems: 'center', justifyContent: 'center', gap: 4 }, contactSelected: { borderColor: GREEN, backgroundColor: '#f5fcf7' }, contactText: { fontWeight: '700', fontSize: 10, color: DARK }, deliveryRow: { flexDirection: 'row', gap: 10, marginTop: 13 }, deliveryBtn: { flex: 1, padding: 12, borderWidth: 1, borderColor: '#ddd9d3', borderRadius: 8, alignItems: 'center' }, deliverySelected: { borderColor: GREEN, backgroundColor: '#f5fcf7' }, deliveryText: { fontSize: 11, fontWeight: '700', color: DARK }, info: { backgroundColor: '#f8f0e5', padding: 15, borderRadius: 10, flexDirection: 'row', gap: 12, marginBottom: 16 }, infoTitle: { color: DARK, fontSize: 12, fontWeight: '800' }, infoText: { color: '#4d514e', fontSize: 11, lineHeight: 18, marginTop: 4 }, summary: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderColor: '#f0ede8' }, summaryLabel: { color: MUTED, fontSize: 12 }, summaryValue: { color: DARK, fontSize: 12, fontWeight: '700', maxWidth: '64%', textAlign: 'right' }, optional: { color: MUTED, fontSize: 11, fontWeight: '400' }, bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 29, paddingTop: 10, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eeeae4' }, primaryButton: { height: 46, borderRadius: 9, backgroundColor: GREEN, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }, primaryText: { color: '#fff', fontWeight: '800', fontSize: 14 }, modalShade: { flex: 1, backgroundColor: 'rgba(0,0,0,.35)', justifyContent: 'flex-end' }, sheet: { maxHeight: '65%', backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }, sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 11 }, sheetTitle: { fontSize: 16, fontWeight: '800', color: DARK }, option: { minHeight: 49, borderBottomWidth: 1, borderColor: '#f0ede8', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, optionText: { color: DARK, fontSize: 14 }
});
