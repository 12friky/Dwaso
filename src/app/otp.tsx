import { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { verifyOtpApi, resendOtpApi, type ApiError } from '../services/api';
import { useAuth } from '../store/authStore';

const BG    = '#F2EFE6';
const CARD  = '#FFFFFF';
const DARK  = '#1B3A2D';
const AMBER = '#E8943A';
const MUTED = '#9CA3AF';
const CATBG = '#EDEAE1';
const RED   = '#E53935';
const GREEN = '#2E7D52';

const OTP_LENGTH  = 4;  // Hubtel sends 4-digit codes
const RESEND_SECS = 60;

export default function OtpScreen() {
  const insets = useSafeAreaInsets();
  const { updateUser, setUser } = useAuth();

  // Params from signup screen
  const {
    phone,
    requestId: initialRequestId,
    prefix:    initialPrefix,
    from:      initialFrom,
  } = useLocalSearchParams<{
    phone: string;
    requestId: string;
    prefix: string;
    from?: string;
  }>();

  // requestId + prefix may be updated on resend
  const [requestId, setRequestId] = useState(initialRequestId ?? '');
  const [prefix,    setPrefix]    = useState(initialPrefix    ?? '');
  const [from,      setFrom]      = useState(initialFrom ?? '');

  const [digits,    setDigits]    = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error,     setError]     = useState('');
  const [verified,  setVerified]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSec, setResendSec] = useState(RESEND_SECS);

  const inputs = useRef<(TextInput | null)[]>([]);

  // Countdown
  useEffect(() => {
    if (resendSec <= 0) return;
    const t = setTimeout(() => setResendSec((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendSec]);

  const handleChange = (value: string, idx: number) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next  = [...digits];
    next[idx]   = digit;
    setDigits(next);
    setError('');
    if (digit && idx < OTP_LENGTH - 1) inputs.current[idx + 1]?.focus();
    if (idx === OTP_LENGTH - 1 && digit) submitCode([...next]);
  };

  const handleKeyPress = (key: string, idx: number) => {
    if (key === 'Backspace' && !digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const getOtpErrorMessage = (message?: string) => {
    if (!message) return 'Unable to verify your code right now. Please try again in a moment.';

    const lowered = message.toLowerCase();
    if (lowered.includes('network')) {
      return 'Unable to verify your code right now. Check your internet connection and try again.';
    }
    if (lowered.includes('expired')) {
      return 'Your code has expired. Please request a new one.';
    }
    if (lowered.includes('no longer valid')) {
      return 'Your verification session is no longer valid. Please request a new code.';
    }
    if (lowered.includes('incorrect code')) {
      return 'The code you entered is incorrect. Please try again.';
    }
    if (lowered.includes('sign up details') || lowered.includes('signup details')) {
      return 'We could not continue verification. Please go back and start registration again.';
    }
    if (lowered.includes('password')) {
      return 'We could not complete verification because your signup details are invalid. Please sign up again.';
    }
    if (lowered.includes('send your verification code')) {
      return 'We could not send your verification code. Please try again.';
    }
    return message;
  };

  const submitCode = async (d = digits) => {
    const code = d.join('');
    if (code.length < OTP_LENGTH) {
      setError(`Please enter the full ${OTP_LENGTH}-digit code.`);
      return;
    }
    if (!requestId || !prefix) {
      setError('We could not continue verification. Please go back and try again.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await verifyOtpApi({ phone: phone ?? '', requestId, prefix, code });
      setUser(res.data.user, res.data.accessToken);
      setVerified(true);

      setTimeout(() => {
        router.replace('/home/feed');
      }, 700);
    } catch (err) {
      const apiErr = err as ApiError;
      setError(getOtpErrorMessage(apiErr.message));
      setDigits(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendSec > 0 || !requestId) return;
    setResending(true);
    setDigits(Array(OTP_LENGTH).fill(''));
    setError('');

    try {
      const res = await resendOtpApi(requestId);
      // Update session with potentially new requestId + prefix
      setRequestId(res.requestId);
      setPrefix(res.prefix);
      setResendSec(RESEND_SECS);
      inputs.current[0]?.focus();
      Alert.alert('Code Sent', `A new verification code has been sent to ${phone}. Please check your messages.`);
    } catch (err) {
      const apiErr = err as ApiError;
      const message = apiErr.message?.toLowerCase().includes('network')
        ? 'Unable to resend the code right now. Check your internet connection and try again.'
        : apiErr.message ?? 'We could not resend your code. Please try again.';
      Alert.alert('Unable to resend code', message);
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* No back button — user must complete OTP to proceed */}

      <View style={styles.body}>

        {/* Icon */}
        <View style={[styles.iconBox, verified && styles.iconBoxSuccess]}>
          <Ionicons
            name={verified ? 'checkmark-circle' : 'phone-portrait-outline'}
            size={40}
            color={verified ? GREEN : AMBER}
          />
        </View>

        <Text style={styles.title}>
          {verified ? 'Verified! 🎉' : 'Verify your number'}
        </Text>
        <Text style={styles.subtitle}>
          {verified
            ? 'Your phone number has been verified. Taking you in…'
            : `Enter the ${OTP_LENGTH}-digit code sent to\n${phone ?? 'your phone'}`
          }
        </Text>

        {!verified && (
          <>
            {/* OTP boxes */}
            <View style={styles.otpRow}>
              {Array(OTP_LENGTH).fill(0).map((_, i) => (
                <TextInput
                  key={i}
                  ref={(r) => { inputs.current[i] = r; }}
                  style={[
                    styles.otpBox,
                    digits[i] ? styles.otpBoxFilled : null,
                    error     ? styles.otpBoxError  : null,
                  ]}
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

            {/* Error */}
            {!!error && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={14} color={RED} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Verify button */}
            <TouchableOpacity
              style={[styles.verifyBtn, loading && { opacity: 0.65 }]}
              onPress={() => submitCode()}
              activeOpacity={0.88}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <>
                    <Text style={styles.verifyBtnText}>Verify & Continue</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </>
              }
            </TouchableOpacity>

            {/* Resend */}
            <View style={styles.resendRow}>
              <Text style={styles.resendText}>Didn't receive the code? </Text>
              {resendSec > 0 ? (
                <Text style={styles.resendTimer}>Resend in {resendSec}s</Text>
              ) : resending ? (
                <ActivityIndicator size="small" color={AMBER} />
              ) : (
                <TouchableOpacity onPress={handleResend} hitSlop={8}>
                  <Text style={styles.resendLink}>Resend Code</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Info */}
            <View style={styles.infoCard}>
              <Ionicons name="shield-checkmark-outline" size={15} color={GREEN} />
              <Text style={styles.infoText}>
                Code expires in <Text style={{ fontWeight: '700', color: DARK }}>10 minutes</Text>. Do not share it with anyone.
              </Text>
            </View>
          </>
        )}

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: BG },
  backBtn: { margin: 20, width: 38, height: 38, borderRadius: 19, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  body:    { flex: 1, alignItems: 'center', paddingHorizontal: 32, paddingTop: 12 },

  iconBox:        { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FEF3E2', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  iconBoxSuccess: { backgroundColor: '#E8F4EC' },

  title:    { fontSize: 22, fontWeight: '900', color: DARK, marginBottom: 8,  textAlign: 'center' },
  subtitle: { fontSize: 13, color: MUTED,  textAlign: 'center', lineHeight: 20, marginBottom: 32 },

  otpRow: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  otpBox: {
    width: 62, height: 68, borderRadius: 14,
    backgroundColor: CARD, borderWidth: 1.5, borderColor: '#E5E1D8',
    fontSize: 26, fontWeight: '900', color: DARK,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  otpBoxFilled: { borderColor: AMBER, backgroundColor: '#FFFAF5' },
  otpBoxError:  { borderColor: RED,   backgroundColor: '#FFF5F5' },

  errorRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  errorText: { fontSize: 12, color: RED },

  verifyBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: AMBER, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40, width: '100%', shadowColor: AMBER, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6, marginBottom: 20 },
  verifyBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  resendRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 24, minHeight: 24 },
  resendText:  { fontSize: 13, color: MUTED },
  resendTimer: { fontSize: 13, color: MUTED, fontWeight: '600' },
  resendLink:  { fontSize: 13, color: AMBER, fontWeight: '700' },

  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#E8F4EC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#C7E4D4' },
  infoText: { flex: 1, fontSize: 12, color: MUTED, lineHeight: 18 },
});
