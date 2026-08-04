import { useState } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  ScrollView, Image, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { signupApi, sendOtpApi, type ApiError } from '../services/api';

// ─────────────────────────────────────────────────────────────
// TOKENS — matches the login screen's white editorial style
// ─────────────────────────────────────────────────────────────

const PAPER  = '#FFFFFF';
const INK    = '#12241C';
const DARK   = '#1B3A2D';
const AMBER  = '#E8943A';
const GREEN  = '#2E7D52';
const MUTED  = '#8A8F87';
const LINE   = '#E7E4DC';
const FIELD  = '#F7F6F2';
const RED    = '#C4432E';

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  // intent='seller' means redirect to become-seller after OTP verification
  const { intent } = useLocalSearchParams<{ intent?: string }>();

  const [avatar,      setAvatar]      = useState<string | null>(null);
  const [fullName,    setFullName]    = useState('');
  const [phone,       setPhone]       = useState('');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [confirmPwd,  setConfirmPwd]  = useState('');
  const [showPwd,     setShowPwd]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed,      setAgreed]      = useState(false);
  const [loading,     setLoading]     = useState(false);

  const [nameErr,    setNameErr]    = useState('');
  const [phoneErr,   setPhoneErr]   = useState('');
  const [emailErr,   setEmailErr]   = useState('');
  const [pwdErr,     setPwdErr]     = useState('');
  const [confirmErr, setConfirmErr] = useState('');

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow access to your photo library.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setAvatar(result.assets[0].uri);
  };

  const validate = () => {
    let ok = true;
    setNameErr(''); setPhoneErr(''); setEmailErr(''); setPwdErr(''); setConfirmErr('');
    if (!fullName.trim())                        { setNameErr('Full name is required.'); ok = false; }
    if (!phone.trim() || phone.trim().length < 9){ setPhoneErr('Enter a valid phone number.'); ok = false; }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailErr('Enter a valid email.'); ok = false; }
    if (password.length < 6)                     { setPwdErr('Password must be at least 6 characters.'); ok = false; }
    if (password !== confirmPwd)                 { setConfirmErr('Passwords do not match.'); ok = false; }
    if (!agreed) { Alert.alert('Terms', 'Please agree to the Terms & Privacy Policy.'); ok = false; }
    return ok;
  };

  const handleSignUp = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await signupApi({
        fullName: fullName.trim(), phone: phone.trim(),
        email: email.trim() || undefined, password, avatarUri: avatar,
      });
      const fullPhone = res.data.phone;
      const otpRes    = await sendOtpApi(fullPhone);
      router.push({
        pathname: '/otp',
        params: {
          phone: fullPhone,
          requestId: otpRes.requestId,
          prefix: otpRes.prefix,
          from: 'signup',
          intent: intent ?? 'buyer',
        },
      } as any);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.errors?.length) {
        apiErr.errors.forEach(({ path, msg }) => {
          if (path === 'fullName') setNameErr(msg);
          else if (path === 'phone') setPhoneErr(msg);
          else if (path === 'email') setEmailErr(msg);
          else if (path === 'password') setPwdErr(msg);
        });
      } else {
        Alert.alert('Sign Up Failed', apiErr.message ?? 'Something went wrong. Please try again.');
      }
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={18} color={INK} />
        </TouchableOpacity>

        {/* Brand */}
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <View style={styles.logoDot} />
          </View>
          <Text style={styles.appName}>Dwaso</Text>
        </View>

        {/* Heading */}
        <Text style={styles.title}>Create your account</Text>
        <View style={styles.titleRule} />
        <Text style={styles.subtitle}>Join Dwaso and let sellers come to you.</Text>

        {/* Avatar */}
        <TouchableOpacity style={styles.avatarWrap} onPress={pickAvatar} activeOpacity={0.85}>
          {avatar
            ? <Image source={{ uri: avatar }} style={styles.avatarImg} />
            : <View style={styles.avatarPlaceholder}><Ionicons name="person-outline" size={26} color={MUTED} /></View>
          }
          <View style={styles.cameraBadge}><Ionicons name="camera" size={12} color="#fff" /></View>
        </TouchableOpacity>
        <Text style={styles.avatarHint}>Profile picture (optional)</Text>

        {/* Full name */}
        <Text style={styles.label}>Full Name <Text style={styles.req}>*</Text></Text>
        <View style={[styles.inputBox, !!nameErr && styles.inputErr]}>
          <Ionicons name="person-outline" size={15} color={MUTED} style={styles.inputIcon} />
          <TextInput style={styles.input} placeholder="e.g. Ama Owusu" placeholderTextColor={MUTED} value={fullName} onChangeText={setFullName} />
        </View>
        {!!nameErr && <Text style={styles.errText}>{nameErr}</Text>}

        {/* Phone */}
        <Text style={styles.label}>Phone Number <Text style={styles.req}>*</Text></Text>
        <View style={[styles.inputBox, !!phoneErr && styles.inputErr]}>
          <Text style={styles.dialCode}>+233</Text>
          <View style={styles.dialSep} />
          <TextInput style={styles.input} placeholder="24 000 0000" placeholderTextColor={MUTED} keyboardType="phone-pad"
            value={phone} onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 10))} />
        </View>
        {!!phoneErr && <Text style={styles.errText}>{phoneErr}</Text>}

        {/* Email */}
        <Text style={styles.label}>Email <Text style={styles.opt}>(optional)</Text></Text>
        <View style={[styles.inputBox, !!emailErr && styles.inputErr]}>
          <Ionicons name="mail-outline" size={15} color={MUTED} style={styles.inputIcon} />
          <TextInput style={styles.input} placeholder="you@email.com" placeholderTextColor={MUTED}
            keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
        </View>
        {!!emailErr && <Text style={styles.errText}>{emailErr}</Text>}

        {/* Password */}
        <Text style={styles.label}>Password <Text style={styles.req}>*</Text></Text>
        <View style={[styles.inputBox, !!pwdErr && styles.inputErr]}>
          <Ionicons name="lock-closed-outline" size={15} color={MUTED} style={styles.inputIcon} />
          <TextInput style={styles.input} placeholder="Min. 6 characters" placeholderTextColor={MUTED}
            secureTextEntry={!showPwd} value={password} onChangeText={setPassword} />
          <TouchableOpacity onPress={() => setShowPwd(!showPwd)} hitSlop={8}>
            <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={17} color={MUTED} />
          </TouchableOpacity>
        </View>
        {!!pwdErr && <Text style={styles.errText}>{pwdErr}</Text>}

        {/* Confirm password */}
        <Text style={styles.label}>Confirm Password <Text style={styles.req}>*</Text></Text>
        <View style={[styles.inputBox, !!confirmErr && styles.inputErr]}>
          <Ionicons name="lock-closed-outline" size={15} color={MUTED} style={styles.inputIcon} />
          <TextInput style={styles.input} placeholder="Re-enter your password" placeholderTextColor={MUTED}
            secureTextEntry={!showConfirm} value={confirmPwd} onChangeText={setConfirmPwd} />
          <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} hitSlop={8}>
            <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={17} color={MUTED} />
          </TouchableOpacity>
        </View>
        {!!confirmErr && <Text style={styles.errText}>{confirmErr}</Text>}

        {/* Terms */}
        <TouchableOpacity style={styles.termsRow} onPress={() => setAgreed(!agreed)} activeOpacity={0.8}>
          <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
            {agreed && <Ionicons name="checkmark" size={11} color="#fff" />}
          </View>
          <Text style={styles.termsText}>
            I agree to Dwaso's{' '}
            <Text style={styles.termsLink} onPress={() => router.push('/home/terms' as any)}>
              Terms & Privacy Policy
            </Text>
          </Text>
        </TouchableOpacity>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.signUpBtn, loading && { opacity: 0.65 }]}
          onPress={handleSignUp} activeOpacity={0.88} disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <><Text style={styles.signUpText}>Create Account</Text><Ionicons name="arrow-forward" size={18} color="#fff" /></>
          }
        </TouchableOpacity>

        {/* Login link */}
        <TouchableOpacity style={styles.loginRow} onPress={() => router.push('/login')} activeOpacity={0.8}>
          <Text style={styles.loginText}>
            Already have an account? <Text style={styles.loginLink}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: PAPER },
  content: { paddingHorizontal: 24 },

  backBtn: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: FIELD,
    borderWidth: 1, borderColor: LINE,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },

  // ── Brand ──
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 22,
  },
  logoBadge: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: AMBER,
    alignItems: 'center', justifyContent: 'center',
  },
  logoDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#fff' },
  appName: { fontSize: 16, fontWeight: '900', color: INK, letterSpacing: -0.2 },

  // ── Heading ──
  title:    { fontSize: 22, fontWeight: '900', color: INK, letterSpacing: -0.5 },
  titleRule: {
    width: 34, height: 3, borderRadius: 2,
    backgroundColor: AMBER,
    marginTop: 10, marginBottom: 10,
  },
  subtitle: { fontSize: 12.5, color: MUTED, lineHeight: 18, marginBottom: 22 },

  avatarWrap:        { alignSelf: 'center', marginBottom: 4, position: 'relative' },
  avatarImg:         { width: 72, height: 72, borderRadius: 36, borderWidth: 2.5, borderColor: AMBER },
  avatarPlaceholder: { width: 72, height: 72, borderRadius: 36, backgroundColor: FIELD, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: LINE, borderStyle: 'dashed' },
  cameraBadge:       { position: 'absolute', bottom: 0, right: 0, width: 23, height: 23, borderRadius: 8, backgroundColor: AMBER, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: PAPER },
  avatarHint:        { textAlign: 'center', fontSize: 11, color: MUTED, marginBottom: 20 },

  label:     { fontSize: 11, fontWeight: '700', color: INK, marginBottom: 6, marginTop: 12, letterSpacing: 0.1 },
  req:       { color: RED },
  opt:       { color: MUTED, fontWeight: '400' },

  inputBox:  {
    flexDirection: 'row', alignItems: 'center', height: 46,
    backgroundColor: FIELD, borderRadius: 8,
    paddingHorizontal: 12, borderWidth: 1.5, borderColor: LINE,
  },
  inputErr:  { borderColor: RED },
  inputIcon: { marginRight: 8 },
  input:     { flex: 1, fontSize: 13, color: INK },
  dialCode:  { fontSize: 13, fontWeight: '700', color: INK, marginRight: 8 },
  dialSep:   { width: 1, height: 16, backgroundColor: LINE, marginRight: 8 },
  errText:   { fontSize: 11, color: RED, marginTop: 4 },

  termsRow:        { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 18, marginBottom: 22 },
  checkbox:        { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: LINE, backgroundColor: PAPER, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxChecked: { backgroundColor: AMBER, borderColor: AMBER },
  termsText:       { flex: 1, fontSize: 12, color: MUTED, lineHeight: 18 },
  termsLink:       { color: AMBER, fontWeight: '700' },

  signUpBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 50, backgroundColor: AMBER, borderRadius: 8,
    shadowColor: AMBER, shadowOpacity: 0.28, shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 }, elevation: 5,
  },
  signUpText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  loginRow:  { alignItems: 'center', marginTop: 20 },
  loginText: { fontSize: 13, color: MUTED },
  loginLink: { color: AMBER, fontWeight: '700' },
});