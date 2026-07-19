import { Link, useRouter } from 'expo-router';
import {
  StyleSheet, View, Text, TextInput,
  TouchableOpacity, Pressable, ActivityIndicator,
} from 'react-native';
import { useState } from 'react';

import { loginApi, type ApiError } from '../services/api';
import { useAuth } from '../store/authStore';

export default function LoginScreen() {
  const router = useRouter();
  const { setUser } = useAuth();

  const [phoneNumber,   setPhoneNumber]   = useState('');
  const [password,      setPassword]      = useState('');
  const [showPassword,  setShowPassword]  = useState(false);
  const [error,         setError]         = useState('');
  const [loading,       setLoading]       = useState(false);

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    setPhoneNumber(digits.slice(0, 10));
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
      // Save user globally then go to feed
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
    <View style={styles.container}>
      <View>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoBox}>
            <View style={styles.logoDot} />
          </View>
          <Text style={styles.logoText}>Dwaso</Text>
        </View>

        {/* Heading */}
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>
          Log in to see new offers on the things you're looking for.
        </Text>

        {/* Phone */}
        <View style={styles.field}>
          <Text style={styles.label}>Phone number</Text>
          <View style={styles.input}>
            <Text style={styles.country}>+233</Text>
            <View style={styles.separator} />
            <TextInput
              placeholder="012 345 6789"
              placeholderTextColor="#B0B7C3"
              keyboardType="phone-pad"
              style={styles.textInput}
              value={phoneNumber}
              onChangeText={handlePhoneChange}
              maxLength={10}
            />
          </View>
        </View>

        {/* Password */}
        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <View style={[styles.input, styles.passwordInput]}>
            <TextInput
              placeholder="••••••••"
              placeholderTextColor="#B0B7C3"
              secureTextEntry={!showPassword}
              style={styles.textInput}
              value={password}
              onChangeText={(v) => { setPassword(v); setError(''); }}
            />
            <TouchableOpacity
              hitSlop={8}
              style={styles.eyeButton}
              onPress={() => setShowPassword((v) => !v)}
            >
              <Text style={styles.eyeIcon}>{showPassword ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity>
          <Text style={styles.forgot}>Forgot password?</Text>
        </TouchableOpacity>
      </View>

      <View>
        {/* Login button */}
        <Pressable
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0D2B5C" />
          ) : (
            <Text style={styles.loginText}>Log in</Text>
          )}
        </Pressable>

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>New to Dwaso?</Text>
          <View style={styles.line} />
        </View>

        {/* Create Account */}
        <Link href="/signup" asChild>
          <Pressable style={styles.createButton}>
            <Text style={styles.createText}>Create an account</Text>
          </Pressable>
        </Link>

        {/* Footer */}
        <Text style={styles.footer}>
          By continuing you agree to our{' '}
          <Text style={styles.link}>Terms</Text> &{' '}
          <Text style={styles.link}>Privacy Policy</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: 72,
    paddingBottom: 56,
  },

  logoContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  logoBox: { width: 32, height: 32, backgroundColor: '#F2AA3B', borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  logoDot: { width: 8, height: 8, backgroundColor: '#fff', borderRadius: 4 },
  logoText: { marginLeft: 10, fontSize: 16, fontWeight: '700', color: '#0D2B5C' },

  title: { fontSize: 28, fontWeight: '700', color: '#0D2B5C', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 36 },

  field: { marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 8 },

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },

  country: { color: '#4B5563', fontSize: 16, fontWeight: '600' },
  separator: { width: 1, height: 20, backgroundColor: '#E5E7EB', marginHorizontal: 12 },
  textInput: { flex: 1, fontSize: 15, color: '#111827' },

  passwordInput: { paddingRight: 60 },
  eyeButton: { position: 'absolute', right: 16 },
  eyeIcon: { fontSize: 13, fontWeight: '600', color: '#00838F' },

  forgot: { color: '#00838F', fontWeight: '600', alignSelf: 'flex-end', fontSize: 13, marginTop: 4 },

  errorText: { marginTop: 12, color: '#D62828', textAlign: 'center', fontSize: 13 },

  loginButton: { height: 52, borderRadius: 14, backgroundColor: '#F2AA3B', justifyContent: 'center', alignItems: 'center' },
  loginButtonDisabled: { opacity: 0.65 },
  loginText: { color: '#0D2B5C', fontSize: 16, fontWeight: '700' },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 28 },
  line: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { marginHorizontal: 12, color: '#9CA3AF', fontSize: 13 },

  createButton: { height: 52, width: '100%', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center', alignSelf: 'center' },
  createText: { color: '#0D2B5C', fontWeight: '700', fontSize: 14, textAlign: 'center' },

  footer: { marginTop: 28, textAlign: 'center', color: '#9CA3AF', fontSize: 12, lineHeight: 18 },
  link: { color: '#00838F', fontWeight: '600' },
});
