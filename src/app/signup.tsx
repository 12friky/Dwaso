import { useState } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  ScrollView, Image, Alert, ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { signupApi, type ApiError } from '../services/api';
import { useAuth } from '../store/authStore';

const BG    = '#F2EFE6';
const CARD  = '#FFFFFF';
const DARK  = '#1B3A2D';
const AMBER = '#E8943A';
const MUTED = '#9CA3AF';
const CATBG = '#EDEAE1';
const RED   = '#E53935';

export default function SignUpScreen() {
  const [avatar,       setAvatar]       = useState<string | null>(null);
  const [fullName,     setFullName]     = useState('');
  const [phone,        setPhone]        = useState('');
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [confirmPwd,   setConfirmPwd]   = useState('');
  const [showPwd,      setShowPwd]      = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [agreed,       setAgreed]       = useState(false);
  const [loading,      setLoading]      = useState(false);
  const { setUser } = useAuth();

  // field errors
  const [nameErr,    setNameErr]    = useState('');
  const [phoneErr,   setPhoneErr]   = useState('');
  const [emailErr,   setEmailErr]   = useState('');
  const [pwdErr,     setPwdErr]     = useState('');
  const [confirmErr, setConfirmErr] = useState('');

  // ─── Avatar ────────────────────────────────────────────────────────────────
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
    if (!result.canceled && result.assets[0]) setAvatar(result.assets[0].uri);
  };

  // ─── Client-side validation ────────────────────────────────────────────────
  const validate = () => {
    let ok = true;
    setNameErr(''); setPhoneErr(''); setEmailErr(''); setPwdErr(''); setConfirmErr('');

    if (!fullName.trim())
      { setNameErr('Full name is required.');  ok = false; }
    if (!phone.trim() || phone.trim().length < 9)
      { setPhoneErr('Enter a valid phone number.'); ok = false; }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      { setEmailErr('Enter a valid email.'); ok = false; }
    if (password.length < 6)
      { setPwdErr('Password must be at least 6 characters.'); ok = false; }
    if (password !== confirmPwd)
      { setConfirmErr('Passwords do not match.'); ok = false; }
    if (!agreed)
      { Alert.alert('Terms', 'Please agree to the Terms & Privacy Policy.'); ok = false; }

    return ok;
  };

  // ─── Submit ────────────────────────────────────────────────────────────────
  const handleSignUp = async () => {
    if (!validate()) return;
    setLoading(true);

    try {
      const res = await signupApi({
        fullName: fullName.trim(),
        phone:    phone.trim(),
        email:    email.trim() || undefined,
        password,
        avatarUri: avatar,
      });

      // Save user globally
      setUser(res.data.user, res.data.accessToken);

      // Account created — go to OTP screen
      router.push(`/otp?phone=${encodeURIComponent(`+233 ${phone}`)}` as any);

    } catch (err) {
      const apiErr = err as ApiError;

      // Surface validation errors from the server
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
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Back */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
        <Ionicons name="arrow-back" size={20} color={DARK} />
      </TouchableOpacity>

      {/* Header */}
      <Text style={styles.appName}>Dwaso</Text>
      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.subtitle}>Join Dwaso and let sellers come to you.</Text>

      {/* Avatar picker */}
      <TouchableOpacity style={styles.avatarWrap} onPress={pickAvatar} activeOpacity={0.85}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatarImg} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person-outline" size={32} color={MUTED} />
          </View>
        )}
        <View style={styles.cameraBadge}>
          <Ionicons name="camera" size={14} color="#fff" />
        </View>
      </TouchableOpacity>
      <Text style={styles.avatarHint}>Upload a profile picture (optional)</Text>

      {/* Full name */}
      <Text style={styles.label}>Full Name <Text style={styles.req}>*</Text></Text>
      <View style={[styles.inputBox, !!nameErr && styles.inputErr]}>
        <Ionicons name="person-outline" size={16} color={MUTED} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="e.g. Ama Owusu"
          placeholderTextColor={MUTED}
          value={fullName}
          onChangeText={setFullName}
        />
      </View>
      {!!nameErr && <Text style={styles.errText}>{nameErr}</Text>}

      {/* Phone */}
      <Text style={styles.label}>Phone Number <Text style={styles.req}>*</Text></Text>
      <View style={[styles.inputBox, !!phoneErr && styles.inputErr]}>
        <Text style={styles.dialCode}>+233</Text>
        <View style={styles.dialSep} />
        <TextInput
          style={styles.input}
          placeholder="24 000 0000"
          placeholderTextColor={MUTED}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 10))}
        />
      </View>
      {!!phoneErr && <Text style={styles.errText}>{phoneErr}</Text>}

      {/* Email (optional) */}
      <Text style={styles.label}>
        Email Address <Text style={styles.opt}>(optional)</Text>
      </Text>
      <View style={[styles.inputBox, !!emailErr && styles.inputErr]}>
        <Ionicons name="mail-outline" size={16} color={MUTED} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="you@email.com"
          placeholderTextColor={MUTED}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
      </View>
      {!!emailErr && <Text style={styles.errText}>{emailErr}</Text>}

      {/* Password */}
      <Text style={styles.label}>Password <Text style={styles.req}>*</Text></Text>
      <View style={[styles.inputBox, !!pwdErr && styles.inputErr]}>
        <Ionicons name="lock-closed-outline" size={16} color={MUTED} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Min. 6 characters"
          placeholderTextColor={MUTED}
          secureTextEntry={!showPwd}
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity onPress={() => setShowPwd(!showPwd)} hitSlop={8}>
          <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={18} color={MUTED} />
        </TouchableOpacity>
      </View>
      {!!pwdErr && <Text style={styles.errText}>{pwdErr}</Text>}

      {/* Confirm password */}
      <Text style={styles.label}>Confirm Password <Text style={styles.req}>*</Text></Text>
      <View style={[styles.inputBox, !!confirmErr && styles.inputErr]}>
        <Ionicons name="lock-closed-outline" size={16} color={MUTED} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Re-enter your password"
          placeholderTextColor={MUTED}
          secureTextEntry={!showConfirm}
          value={confirmPwd}
          onChangeText={setConfirmPwd}
        />
        <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} hitSlop={8}>
          <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color={MUTED} />
        </TouchableOpacity>
      </View>
      {!!confirmErr && <Text style={styles.errText}>{confirmErr}</Text>}

      {/* Terms */}
      <TouchableOpacity style={styles.termsRow} onPress={() => setAgreed(!agreed)} activeOpacity={0.8}>
        <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
          {agreed && <Ionicons name="checkmark" size={12} color="#fff" />}
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
        style={[styles.signUpBtn, loading && styles.signUpBtnDisabled]}
        onPress={handleSignUp}
        activeOpacity={0.88}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={styles.signUpText}>Create Account</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </>
        )}
      </TouchableOpacity>

      {/* Login link */}
      <TouchableOpacity style={styles.loginRow} onPress={() => router.push('/login')} activeOpacity={0.8}>
        <Text style={styles.loginText}>
          Already have an account? <Text style={styles.loginLink}>Sign in</Text>
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  content: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 48 },

  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center', marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },

  appName: { fontSize: 28, fontWeight: '900', color: DARK, letterSpacing: -0.5, marginBottom: 4 },
  title: { fontSize: 18, fontWeight: '700', color: DARK, marginBottom: 4 },
  subtitle: { fontSize: 13, color: MUTED, marginBottom: 28, lineHeight: 18 },

  avatarWrap: { alignSelf: 'center', marginBottom: 6, position: 'relative' },
  avatarImg: { width: 86, height: 86, borderRadius: 43, borderWidth: 3, borderColor: AMBER },
  avatarPlaceholder: { width: 86, height: 86, borderRadius: 43, backgroundColor: CATBG, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#DDD9CF', borderStyle: 'dashed' },
  cameraBadge: { position: 'absolute', bottom: 2, right: 2, width: 26, height: 26, borderRadius: 13, backgroundColor: AMBER, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: BG },
  avatarHint: { textAlign: 'center', fontSize: 11, color: MUTED, marginBottom: 24 },

  label: { fontSize: 12, fontWeight: '700', color: DARK, marginBottom: 8, marginTop: 14 },
  req: { color: RED },
  opt: { color: MUTED, fontWeight: '400' },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#E5E1D8' },
  inputErr: { borderColor: RED },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 13, color: DARK },
  dialCode: { fontSize: 13, fontWeight: '700', color: DARK, marginRight: 10 },
  dialSep: { width: 1, height: 18, backgroundColor: '#E5E1D8', marginRight: 10 },
  errText: { fontSize: 11, color: RED, marginTop: 4 },

  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 20, marginBottom: 24 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: '#D1D5DB', backgroundColor: CARD, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxChecked: { backgroundColor: AMBER, borderColor: AMBER },
  termsText: { flex: 1, fontSize: 12, color: MUTED, lineHeight: 18 },
  termsLink: { color: AMBER, fontWeight: '700' },

  signUpBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: AMBER, borderRadius: 14, paddingVertical: 14, shadowColor: AMBER, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  signUpBtnDisabled: { opacity: 0.65 },
  signUpText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  loginRow: { alignItems: 'center', marginTop: 20 },
  loginText: { fontSize: 13, color: MUTED },
  loginLink: { color: AMBER, fontWeight: '700' },
});
