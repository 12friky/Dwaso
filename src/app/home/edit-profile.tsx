import { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, ScrollView,
  TouchableOpacity, TextInput, Alert, Image,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../store/authStore';
import { getMeApi, updateProfileApi, type UpdateProfilePayload } from '../../services/api';

const BG    = '#F2EFE6';
const CARD  = '#FFFFFF';
const DARK  = '#1B3A2D';
const AMBER = '#E8943A';
const MUTED = '#9CA3AF';
const CATBG = '#EDEAE1';

function Field({
  label, value, onChangeText, placeholder, keyboardType, multiline,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: any; multiline?: boolean;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputBox, multiline && styles.inputBoxTall]}>
        <TextInput
          style={[styles.input, multiline && styles.inputMulti]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ?? ''}
          placeholderTextColor={MUTED}
          keyboardType={keyboardType}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'auto'}
        />
      </View>
    </View>
  );
}

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state: { user, accessToken }, updateUser } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [selectedAvatarUri, setSelectedAvatarUri] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [phone,     setPhone]     = useState('');
  const [location,  setLocation]  = useState('');
  const [bio,       setBio]       = useState('');

  useEffect(() => {
    if (!user) return;
    const [first, ...rest] = user.fullName.split(' ');
    setFirstName(first ?? '');
    setLastName(rest.join(' ') || '');
    setEmail(user.email ?? '');
    setPhone(user.phone ?? '');
    setLocation(user.location ?? '');
    setBio(user.bio ?? '');
    setSelectedAvatarUri(null);
  }, [user]);

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedAvatarUri(result.assets[0].uri);
    }
  };

  useEffect(() => {
    if (!accessToken) return;
    getMeApi(accessToken)
      .then((res) => updateUser(res.data.user))
      .catch(() => {});
  }, [accessToken, updateUser]);

  const handleSave = async () => {
    if (!accessToken) return;
    setIsSaving(true);

    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const payload: UpdateProfilePayload = {
        fullName,
        phone: phone.trim(),
        email: email.trim() || null,
        location: location.trim() || null,
        bio: bio.trim() || null,
      };

      if (selectedAvatarUri) {
        payload.avatarUri = selectedAvatarUri;
      }

      const res = await updateProfileApi(payload, accessToken);
      updateUser(res.data.user);
      Alert.alert('Profile updated', 'Your profile changes have been saved.');
      router.back();
    } catch (err) {
      Alert.alert('Update failed', 'Unable to save your profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/home/profile')} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarWrap} onPress={pickAvatar} activeOpacity={0.85}>
            {selectedAvatarUri || user?.profilePicture ? (
              <Image source={{ uri: selectedAvatarUri ?? user!.profilePicture! }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarEmoji}>👤</Text>
              </View>
            )}
            <View style={styles.cameraBtn}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap to change photo</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Personal Information</Text>
          <Field label="First Name"   value={firstName} onChangeText={setFirstName} placeholder="e.g. Adeline" />
          <View style={styles.divider} />
          <Field label="Last Name"    value={lastName}  onChangeText={setLastName}  placeholder="e.g. Mensah" />
          <View style={styles.divider} />
          <Field label="Phone Number" value={phone}     onChangeText={setPhone}     placeholder="+233 00 000 0000" keyboardType="phone-pad" />
          <View style={styles.divider} />
          <Field label="Email"        value={email}     onChangeText={setEmail}     placeholder="you@email.com"   keyboardType="email-address" />
          <View style={styles.divider} />
          <Field label="Location"     value={location}  onChangeText={setLocation}  placeholder="e.g. East Legon, Accra" />
          <View style={styles.divider} />
          <Field label="Bio (optional)" value={bio}     onChangeText={setBio}       placeholder="Tell buyers a little about yourself…" multiline />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={styles.saveBtn} activeOpacity={0.88} onPress={handleSave} disabled={isSaving}>
          <Text style={styles.saveBtnText}>{isSaving ? 'Saving...' : 'Save Changes'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: CATBG, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: DARK },
  scroll: { paddingHorizontal: 20, paddingTop: 4 },
  avatarSection: { alignItems: 'center', marginBottom: 20 },
  avatarWrap: { position: 'relative' },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: CATBG, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: BG },
  avatarEmoji: { fontSize: 38 },
  cameraBtn: { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: AMBER, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: CARD },
  avatarHint: { fontSize: 11, color: MUTED, marginTop: 8 },
  card: { backgroundColor: CARD, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: DARK, marginBottom: 14 },
  fieldWrap: { paddingVertical: 4 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: MUTED, marginBottom: 6 },
  inputBox: { borderWidth: 1, borderColor: '#E5E1D8', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: BG },
  inputBoxTall: { paddingVertical: 10 },
  input: { fontSize: 13, color: DARK },
  inputMulti: { minHeight: 70, lineHeight: 20 },
  divider: { height: 1, backgroundColor: CATBG, marginVertical: 10 },
  footer: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: BG, borderTopWidth: 1, borderTopColor: '#E5E1D8' },
  saveBtn: { backgroundColor: AMBER, borderRadius: 14, paddingVertical: 14, alignItems: 'center', shadowColor: AMBER, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  saveBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
