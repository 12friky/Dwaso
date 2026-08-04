import { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  forgotPasswordApi, verifyResetOtpApi, resetPasswordApi, resendResetOtpApi, type ApiError,
} from '../services/api';

const BG    = '#fff';
const DARK  = '#0D2B5C';
const AMBER = '#F2AA3B';
const TEAL  = '#00838F';
const MUTED = '#6B7280';
const BORDER= '#E5E7EB';
const RED   = '#D62828';
const GREEN = '#2E7D52';

const OTP_LENGTH  = 4;
const RESEND_SECS = 60;

// ── Step 1: Enter phone ────────────────────────────────────────────────────────
function StepPhone({
  onNext,
}: {
  onNext: (phone: string, requestId: string, prefix: string) => void;
}) {
  const [phone,   setPhone]   = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 9) {
      setError('Enter a valid phone number.'); return;
    }
    setLoading(true); setError('');
    const e164 = '+233' + (cleaned.startsWith('0') ? cleaned.slice(1) : cleaned);
    try {
      const res = await forgotPasswordApi(e164);
      onNext(e164, res.requestId, res.prefix);
    } catch (err) {
      setError((err as ApiError).message ?? 'Could not send OTP. Try again.');
    } finally { setLoading(false); }
  };

  return (
    <View style={styles.stepWrap}>
      <View style={styles.iconBox}>
        <Ionicons name="lock-open-outline" size={36} color={AMBER} />
      </View>
      <Text style={styles.stepTitle}>Forgot password?</Text>
      <Text style={styles.stepSubtitle}>
        Enter the phone number linked to your account. We'll send you a verification code.
      </Text>

      <Text style={styles.label}>Phone number</Text>
      <View style={[styles.inputRow, !!error && styles.inputErr]}>
        <Text style={styles.dialCode}>+233</Text>
        <View style={styles.dialSep} />
        <TextInput
          style={styles.input}
          placeholder="24 000 0000"
          placeholderTextColor={MUTED}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={(v) => { setPhone(v.replace(/\D/g, '').slice(0, 10)); setError(''); }}
        />
      </View>
      {!!error && <Text style={styles.errText}>{error}</Text>}

      <TouchableOpacity
        style={[styles.primaryBtn, loading && { opacity: 0.65 }]}
        onPress={handleSubmit}
        disabled={loading}
        activeOpacity={0.88}
      >
        {loading
          ? <ActivityIndicator color={DARK} />
          : <><Text style={styles.primaryBtnText}>Send Code</Text><Ionicons name="arrow-forward" size={18} color={DARK} /></>
        }
      </TouchableOpacity>
    </View>
  );
}

// ── Step 2: Enter OTP ─────────────────────────────────────────────────────────
function StepOtp({
  phone, requestId, prefix, onNext, onUpdateSession,
}: {
  phone: string;
  requestId: string;
  prefix: string;
  onNext: () => void;
  onUpdateSession: (requestId: string, prefix: string) => void;
}) {
  const [digits,    setDigits]    = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSec, setResendSec] = useState(RESEND_SECS);
  const inputs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (resendSec <= 0) return;
    const t = setTimeout(() => setResendSec((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendSec]);

  const handleChange = (value: string, idx: number) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next  = [...digits]; next[idx] = digit;
    setDigits(next); setError('');
    if (digit && idx < OTP_LENGTH - 1) inputs.current[idx + 1]?.focus();
    if (idx === OTP_LENGTH - 1 && digit) submitCode([...next]);
  };

  const handleKeyPress = (key: string, idx: number) => {
    if (key === 'Backspace' && !digits[idx] && idx > 0) inputs.current[idx - 1]?.focus();
  };

  const submitCode = async (d = digits) => {
    const code = d.join('');
    if (code.length < OTP_LENGTH) { setError(`Enter the full ${OTP_LENGTH}-digit code.`); return; }
    setLoading(true); setError('');
    try {
      // Verify the OTP with Hubtel NOW — wrong codes are rejected here
      await verifyResetOtpApi({ requestId, prefix, code });
      onNext();
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message ?? 'Incorrect code. Please try again.');
      setDigits(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendSec > 0) return;
    setResending(true); setDigits(Array(OTP_LENGTH).fill('')); setError('');
    try {
      const res = await resendResetOtpApi(requestId);
      onUpdateSession(res.requestId, res.prefix);
      setResendSec(RESEND_SECS);
      inputs.current[0]?.focus();
      Alert.alert('Code Sent', `A new code has been sent to ${phone}.`);
    } catch (err) {
      Alert.alert('Error', (err as ApiError).message ?? 'Could not resend. Try again.');
    } finally { setResending(false); }
  };

  return (
    <View style={styles.stepWrap}>
      <View style={styles.iconBox}>
        <Ionicons name="phone-portrait-outline" size={36} color={AMBER} />
      </View>
      <Text style={styles.stepTitle}>Enter the code</Text>
      <Text style={styles.stepSubtitle}>
        We sent a {OTP_LENGTH}-digit code to{'\n'}<Text style={{ fontWeight: '700', color: DARK }}>{phone}</Text>
      </Text>

      <View style={styles.otpRow}>
        {Array(OTP_LENGTH).fill(0).map((_, i) => (
          <TextInput
            key={i}
            ref={(r) => { inputs.current[i] = r; }}
            style={[styles.otpBox, digits[i] && styles.otpBoxFilled, !!error && styles.otpBoxErr]}
            value={digits[i]}
            onChangeText={(v) => handleChange(v, i)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
            keyboardType="number-pad"
            maxLength={1}
            textAlign="center"
            autoFocus={i === 0}
            selectTextOnFocus
            editable={!loading}
          />
        ))}
      </View>
      {!!error && <Text style={styles.errText}>{error}</Text>}

      <TouchableOpacity
        style={[styles.primaryBtn, (loading || digits.join('').length < OTP_LENGTH) && { opacity: 0.65 }]}
        onPress={() => submitCode()}
        disabled={loading || digits.join('').length < OTP_LENGTH}        activeOpacity={0.88}
      >
        {loading
          ? <ActivityIndicator color={DARK} />
          : <><Text style={styles.primaryBtnText}>Continue</Text><Ionicons name="arrow-forward" size={18} color={DARK} /></>
        }
      </TouchableOpacity>

      <View style={styles.resendRow}>
        <Text style={styles.resendText}>Didn't receive it? </Text>
        {resendSec > 0
          ? <Text style={styles.resendTimer}>Resend in {resendSec}s</Text>
          : resending
            ? <ActivityIndicator size="small" color={AMBER} />
            : <TouchableOpacity onPress={handleResend} hitSlop={8}><Text style={styles.resendLink}>Resend</Text></TouchableOpacity>
        }
      </View>
    </View>
  );
}

// ── Step 3: New password ───────────────────────────────────────────────────────
function StepNewPassword({
  requestId, onDone,
}: {
  requestId: string;
  onDone: () => void;
}) {
  const [password,    setPassword]    = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [showPwd,     setShowPwd]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);

  const handleSubmit = async () => {
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true); setError('');
    try {
      await resetPasswordApi({ requestId, newPassword: password });
      onDone();
    } catch (err) {
      setError((err as ApiError).message ?? 'Could not reset password. Try again.');
    } finally { setLoading(false); }
  };

  return (
    <View style={styles.stepWrap}>
      <View style={styles.iconBox}>
        <Ionicons name="lock-closed-outline" size={36} color={AMBER} />
      </View>
      <Text style={styles.stepTitle}>Create new password</Text>
      <Text style={styles.stepSubtitle}>Choose a strong password for your account.</Text>

      <Text style={styles.label}>New password</Text>
      <View style={[styles.inputRow, !!error && styles.inputErr]}>
        <TextInput
          style={styles.input}
          placeholder="Min. 6 characters"
          placeholderTextColor={MUTED}
          secureTextEntry={!showPwd}
          value={password}
          onChangeText={(v) => { setPassword(v); setError(''); }}
        />
        <TouchableOpacity onPress={() => setShowPwd(!showPwd)} hitSlop={8}>
          <Text style={styles.eyeText}>{showPwd ? 'Hide' : 'Show'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.label, { marginTop: 14 }]}>Confirm password</Text>
      <View style={[styles.inputRow, !!error && styles.inputErr]}>
        <TextInput
          style={styles.input}
          placeholder="Re-enter password"
          placeholderTextColor={MUTED}
          secureTextEntry={!showConfirm}
          value={confirm}
          onChangeText={(v) => { setConfirm(v); setError(''); }}
        />
        <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} hitSlop={8}>
          <Text style={styles.eyeText}>{showConfirm ? 'Hide' : 'Show'}</Text>
        </TouchableOpacity>
      </View>
      {!!error && <Text style={styles.errText}>{error}</Text>}

      <TouchableOpacity
        style={[styles.primaryBtn, loading && { opacity: 0.65 }]}
        onPress={handleSubmit}
        disabled={loading}
        activeOpacity={0.88}
      >
        {loading
          ? <ActivityIndicator color={DARK} />
          : <><Text style={styles.primaryBtnText}>Reset Password</Text><Ionicons name="arrow-forward" size={18} color={DARK} /></>
        }
      </TouchableOpacity>
    </View>
  );
}

// ── Step 4: Success ────────────────────────────────────────────────────────────
function StepSuccess() {
  useEffect(() => {
    const t = setTimeout(() => router.replace('/login'), 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={[styles.stepWrap, { alignItems: 'center' }]}>
      <View style={[styles.iconBox, { backgroundColor: '#E8F4EC' }]}>
        <Ionicons name="checkmark-circle" size={44} color={GREEN} />
      </View>
      <Text style={styles.stepTitle}>Password updated!</Text>
      <Text style={styles.stepSubtitle}>
        Your password has been reset successfully. Taking you to login…
      </Text>
      <ActivityIndicator color={AMBER} style={{ marginTop: 24 }} />
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
type Step = 'phone' | 'otp' | 'password' | 'success';

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();

  const [step,      setStep]      = useState<Step>('phone');
  const [phone,     setPhone]     = useState('');
  const [requestId, setRequestId] = useState('');
  const [prefix,    setPrefix]    = useState('');

  // Step labels for progress indicator
  const STEPS: Step[] = ['phone', 'otp', 'password', 'success'];
  const stepIdx = STEPS.indexOf(step);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.root, { paddingTop: insets.top }]}>

        {/* Header */}
        <View style={styles.header}>
          {step !== 'success' ? (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => {
                if (step === 'phone') router.back();
                else if (step === 'otp') setStep('phone');
                else if (step === 'password') setStep('otp');
              }}
              hitSlop={8}
            >
              <Ionicons name="arrow-back" size={20} color={DARK} />
            </TouchableOpacity>
          ) : <View style={{ width: 36 }} />}

          {/* Step dots */}
          <View style={styles.dotsRow}>
            {['phone', 'otp', 'password'].map((s, i) => (
              <View
                key={s}
                style={[
                  styles.dot,
                  i <= stepIdx && styles.dotActive,
                  i < stepIdx  && styles.dotDone,
                ]}
              />
            ))}
          </View>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 'phone' && (
            <StepPhone
              onNext={(ph, rId, pfx) => {
                setPhone(ph); setRequestId(rId); setPrefix(pfx);
                setStep('otp');
              }}
            />
          )}

          {step === 'otp' && (
            <StepOtp
              phone={phone}
              requestId={requestId}
              prefix={prefix}
              onNext={() => setStep('password')}
              onUpdateSession={(rId, pfx) => { setRequestId(rId); setPrefix(pfx); }}
            />
          )}

          {step === 'password' && (
            <StepNewPassword
              requestId={requestId}
              onDone={() => setStep('success')}
            />
          )}

          {step === 'success' && <StepSuccess />}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn:{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  dotsRow:{ flexDirection: 'row', gap: 6 },
  dot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5E7EB' },
  dotActive:{ backgroundColor: AMBER },
  dotDone:  { backgroundColor: GREEN },

  scroll:   { paddingHorizontal: 28, paddingTop: 8, paddingBottom: 48 },
  stepWrap: { paddingTop: 12 },

  iconBox:      { width: 76, height: 76, borderRadius: 38, backgroundColor: '#FFF8EB', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  stepTitle:    { fontSize: 24, fontWeight: '800', color: DARK, marginBottom: 8 },
  stepSubtitle: { fontSize: 13, color: MUTED, lineHeight: 20, marginBottom: 28 },

  label:    { fontSize: 12, fontWeight: '600', color: MUTED, marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', height: 52, borderWidth: 1, borderColor: BORDER, borderRadius: 14, paddingHorizontal: 16, backgroundColor: BG },
  inputErr: { borderColor: RED },
  input:    { flex: 1, fontSize: 15, color: DARK },
  dialCode: { fontSize: 15, fontWeight: '700', color: DARK, marginRight: 10 },
  dialSep:  { width: 1, height: 20, backgroundColor: BORDER, marginRight: 10 },
  eyeText:  { fontSize: 13, fontWeight: '600', color: TEAL },
  errText:  { fontSize: 12, color: RED, marginTop: 6, marginBottom: 4 },

  primaryBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: AMBER, borderRadius: 14, paddingVertical: 14, marginTop: 24, shadowColor: AMBER, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: DARK },

  otpRow:     { flexDirection: 'row', gap: 14, marginBottom: 16 },
  otpBox:     { width: 64, height: 70, borderRadius: 14, borderWidth: 1.5, borderColor: BORDER, backgroundColor: '#F9FAFB', fontSize: 26, fontWeight: '900', color: DARK, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  otpBoxFilled: { borderColor: AMBER, backgroundColor: '#FFFDF5' },
  otpBoxErr:    { borderColor: RED,   backgroundColor: '#FFF5F5' },

  resendRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, minHeight: 24 },
  resendText:  { fontSize: 13, color: MUTED },
  resendTimer: { fontSize: 13, color: MUTED, fontWeight: '600' },
  resendLink:  { fontSize: 13, color: TEAL,  fontWeight: '700' },
});
