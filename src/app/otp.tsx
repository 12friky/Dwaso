import { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity, Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BG    = '#F2EFE6';
const CARD  = '#FFFFFF';
const DARK  = '#1B3A2D';
const AMBER = '#E8943A';
const MUTED = '#9CA3AF';
const CATBG = '#EDEAE1';
const RED   = '#E53935';
const GREEN = '#2E7D52';

const CORRECT_OTP = '1234';
const OTP_LENGTH  = 4;

export default function OtpScreen() {
  const insets = useSafeAreaInsets();
  const { phone } = useLocalSearchParams<{ phone: string }>();

  const [digits,    setDigits]    = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error,     setError]     = useState('');
  const [verified,  setVerified]  = useState(false);
  const [resendSec, setResendSec] = useState(30);

  const inputs = useRef<(TextInput | null)[]>([]);

  // Countdown timer
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
    // Auto-verify when last digit entered
    if (idx === OTP_LENGTH - 1 && digit) {
      verifyCode([...next]);
    }
  };

  const handleKeyPress = (key: string, idx: number) => {
    if (key === 'Backspace' && !digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const verifyCode = (d = digits) => {
    const code = d.join('');
    if (code.length < OTP_LENGTH) { setError('Please enter the full 4-digit code.'); return; }
    if (code === CORRECT_OTP) {
      setVerified(true);
      setTimeout(() => router.replace('/home/feed'), 1400);
    } else {
      setError('Incorrect code. Please try again.');
      setDigits(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
    }
  };

  const resend = () => {
    setDigits(Array(OTP_LENGTH).fill(''));
    setError('');
    setResendSec(30);
    inputs.current[0]?.focus();
    Alert.alert('Code Sent', `A new verification code has been sent to ${phone}.`);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* Back */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={8}>
        <Ionicons name="arrow-back" size={20} color={DARK} />
      </TouchableOpacity>

      <View style={styles.body}>

        {/* Icon */}
        <View style={[styles.iconBox, verified && styles.iconBoxSuccess]}>
          <Ionicons
            name={verified ? 'checkmark-circle' : 'phone-portrait-outline'}
            size={40}
            color={verified ? GREEN : AMBER}
          />
        </View>

        <Text style={styles.title}>{verified ? 'Verified!' : 'Verify your number'}</Text>
        <Text style={styles.subtitle}>
          {verified
            ? 'Your account is all set. Taking you in…'
            : `Enter the 4-digit code we sent to\n${phone ?? 'your phone'}`}
        </Text>

        {/* OTP inputs */}
        {!verified && (
          <>
            <View style={styles.otpRow}>
              {Array(OTP_LENGTH).fill(0).map((_, i) => (
                <TextInput
                  key={i}
                  ref={(r) => { inputs.current[i] = r; }}
                  style={[
                    styles.otpBox,
                    digits[i] && styles.otpBoxFilled,
                    !!error && styles.otpBoxError,
                  ]}
                  value={digits[i]}
                  onChangeText={(v) => handleChange(v, i)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  textAlign="center"
                  autoFocus={i === 0}
                  selectTextOnFocus
                />
              ))}
            </View>

            {!!error && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={14} color={RED} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Verify button */}
            <TouchableOpacity style={styles.verifyBtn} onPress={() => verifyCode()} activeOpacity={0.88}>
              <Text style={styles.verifyBtnText}>Verify & Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>

            {/* Resend */}
            <View style={styles.resendRow}>
              <Text style={styles.resendText}>Didn't receive the code? </Text>
              {resendSec > 0 ? (
                <Text style={styles.resendTimer}>Resend in {resendSec}s</Text>
              ) : (
                <TouchableOpacity onPress={resend} hitSlop={8}>
                  <Text style={styles.resendLink}>Resend Code</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Dev hint */}
            <View style={styles.hintCard}>
              <Ionicons name="information-circle-outline" size={14} color={MUTED} />
              <Text style={styles.hintText}>For testing, use code: <Text style={{ fontWeight: '700', color: DARK }}>1234</Text></Text>
            </View>
          </>
        )}

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  backBtn: { margin: 20, width: 38, height: 38, borderRadius: 19, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  body: { flex: 1, alignItems: 'center', paddingHorizontal: 32, paddingTop: 20 },

  iconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FEF3E2', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  iconBoxSuccess: { backgroundColor: '#E8F4EC' },

  title: { fontSize: 22, fontWeight: '900', color: DARK, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 20, marginBottom: 32 },

  otpRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  otpBox: {
    width: 58, height: 64, borderRadius: 14,
    backgroundColor: CARD, borderWidth: 1.5, borderColor: '#E5E1D8',
    fontSize: 24, fontWeight: '800', color: DARK,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  otpBoxFilled: { borderColor: AMBER, backgroundColor: '#FFFAF5' },
  otpBoxError: { borderColor: RED, backgroundColor: '#FFF5F5' },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  errorText: { fontSize: 12, color: RED },

  verifyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: AMBER, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40, width: '100%', shadowColor: AMBER, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6, marginBottom: 20 },
  verifyBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },

  resendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  resendText: { fontSize: 13, color: MUTED },
  resendTimer: { fontSize: 13, color: MUTED, fontWeight: '600' },
  resendLink: { fontSize: 13, color: AMBER, fontWeight: '700' },

  hintCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: CATBG, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  hintText: { fontSize: 12, color: MUTED },
});
