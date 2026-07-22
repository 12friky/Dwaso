import { Link, useRouter } from 'expo-router';
import {
  StyleSheet, View, Text, TextInput,
  TouchableOpacity, Pressable, ActivityIndicator,
  Image, ScrollView, KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { loginApi, type ApiError } from '../services/api';
import { useAuth } from '../store/authStore';

const { width: W, height: H } = Dimensions.get('window');
const IMAGE_H = H * 0.42;

const DARK  = '#1B3A2D';
const AMBER = '#E8943A';
const GREEN = '#2E7D52';
const MUTED = '#9CA3AF';
const CARD  = '#FFFFFF';
const BORDER= '#E5E1D8';
const RED   = '#D62828';

export default function LoginScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { setUser } = useAuth();

  const [phoneNumber,  setPhoneNumber]  = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);

  const handlePhoneChange = (value: string) => {
    setPhoneNumber(value.replace(/\D/g, '').slice(0, 10));
    setError('');
  };

  const handleLogin = async () => {
    if (!phoneNumber || !password) {
      setError('Please enter your phone number and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await loginApi({ phone: phoneNumber, password });
      setUser(res.data.user, res.data.accessToken);
      router.replace('/home/feed');
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? 'Invalid phone number or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── Hero image ── */}
      <View style={styles.heroWrap}>
        <Image
          source={require('../../assets/images/login image.png')}
          style={styles.heroImage}
          resizeMode="cover"
        />
        {/* App name on image */}
        <View style={[styles.heroTop, { paddingTop: insets.top + 16 }]}>
          <View style={styles.logoBadge}>
            <View style={styles.logoDot} />
          </View>
          <Text style={styles.appName}>Dwaso</Text>
        </View>
      </View>

      {/* ── White card sheet ── */}
      <ScrollView
        style={styles.sheet}
        contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Handle bar */}
        <View style={styles.handleBar} />

        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>
          Log in to see new offers on the things you're looking for.
        </Text>

        {/* Phone */}
        <Text style={styles.label}>Phone number</Text>
        <View style={[styles.inputBox, !!error && !password && styles.inputErr]}>
          <Text style={styles.dialCode}>+233</Text>
          <View style={styles.dialSep} />
          <TextInput
            style={styles.textInput}
            placeholder="024 000 0000"
            placeholderTextColor={MUTED}
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={handlePhoneChange}
            maxLength={10}
          />
          {phoneNumber.length > 0 && (
            <Ionicons name="checkmark-circle" size={18} color={GREEN} />
          )}
        </View>

        {/* Password */}
        <Text style={[styles.label, { marginTop: 16 }]}>Password</Text>
        <View style={[styles.inputBox, !!error && styles.inputErr]}>
          <Ionicons name="lock-closed-outline" size={16} color={MUTED} style={{ marginRight: 10 }} />
          <TextInput
            style={styles.textInput}
            placeholder="Enter your password"
            placeholderTextColor={MUTED}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={(v) => { setPassword(v); setError(''); }}
          />
          <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={MUTED}
            />
          </TouchableOpacity>
        </View>

        {/* Error */}
        {!!error && (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle-outline" size={14} color={RED} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Forgot password */}
        <TouchableOpacity
          style={styles.forgotRow}
          onPress={() => router.push('/forgot-password')}
          hitSlop={8}
        >
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        {/* Login button */}
        <TouchableOpacity
          style={[styles.loginBtn, loading && { opacity: 0.65 }]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.88}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.loginBtnText}>Log In</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>New to Dwaso?</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Create account */}
        <Link href="/signup" asChild>
          <Pressable style={styles.createBtn}>
            <Ionicons name="person-add-outline" size={16} color={DARK} />
            <Text style={styles.createBtnText}>Create an account</Text>
          </Pressable>
        </Link>

        <Text style={styles.footer}>
          By continuing you agree to our{' '}
          <Text style={styles.footerLink}>Terms</Text>
          {' '}&amp;{' '}
          <Text style={styles.footerLink}>Privacy Policy</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DARK },

  // ── Hero ──
  heroWrap: {
    width: W,
    height: IMAGE_H,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroTop: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 10,
  },
  logoBadge: {
    width: 32, height: 32,
    borderRadius: 10,
    backgroundColor: AMBER,
    alignItems: 'center', justifyContent: 'center',
  },
  logoDot:  { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' },
  appName:  { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: -0.3 },

  // ── Sheet ──
  sheet: {
    flex: 1,
    backgroundColor: CARD,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
  },
  sheetContent: {
    paddingHorizontal: 28,
    paddingTop: 8,
  },
  handleBar: {
    width: 40, height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E1D8',
    alignSelf: 'center',
    marginBottom: 24,
    marginTop: 8,
  },

  title:    { fontSize: 26, fontWeight: '900', color: DARK, marginBottom: 6 },
  subtitle: { fontSize: 13, color: MUTED, lineHeight: 20, marginBottom: 24 },

  label:    { fontSize: 12, fontWeight: '700', color: DARK, marginBottom: 8 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    height: 52, borderWidth: 1.5, borderColor: BORDER,
    borderRadius: 14, paddingHorizontal: 14,
    backgroundColor: '#FAFAF8',
  },
  inputErr: { borderColor: RED },
  textInput:{ flex: 1, fontSize: 14, color: DARK },
  dialCode: { fontSize: 14, fontWeight: '700', color: DARK, marginRight: 10 },
  dialSep:  { width: 1, height: 20, backgroundColor: BORDER, marginRight: 10 },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  errorText:{ fontSize: 12, color: RED, flex: 1 },

  forgotRow:  { alignItems: 'flex-end', marginTop: 10, marginBottom: 4 },
  forgotText: { fontSize: 13, fontWeight: '700', color: AMBER },

  loginBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 52, borderRadius: 14, backgroundColor: AMBER,
    marginTop: 20,
    shadowColor: AMBER, shadowOpacity: 0.35,
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  loginBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },

  divider:     { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: BORDER },
  dividerText: { marginHorizontal: 12, fontSize: 12, color: MUTED },

  createBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 52, borderRadius: 14,
    borderWidth: 1.5, borderColor: BORDER,
    backgroundColor: CARD,
  },
  createBtnText: { fontSize: 14, fontWeight: '700', color: DARK },

  footer:     { marginTop: 20, textAlign: 'center', fontSize: 12, color: MUTED, lineHeight: 18 },
  footerLink: { color: GREEN, fontWeight: '700' },
});
