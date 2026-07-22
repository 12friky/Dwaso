import { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { updateProfileApi } from '../services/api';
import { useAuth } from '../store/authStore';

const BG    = '#F2EFE6';
const CARD  = '#FFFFFF';
const DARK  = '#1B3A2D';
const AMBER = '#E8943A';
const MUTED = '#9CA3AF';
const GREEN = '#2E7D52';

export default function AllowLocationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state: { user, accessToken }, updateUser } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [permissionStatus, setPermissionStatus] = useState<'undetermined' | 'granted' | 'denied'>('undetermined');

  useEffect(() => {
    if (user?.lat != null && user?.lng != null) {
      router.replace('/home/feed');
    }
  }, [user, router]);

  const handleRequestLocation = async () => {
    if (!accessToken) {
      return router.replace('/home/feed');
    }

    setLoading(true);
    setError('');

    try {
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      let permission = existingStatus;

      if (permission !== 'granted') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        permission = status;
      }

      if (permission !== 'granted') {
        setPermissionStatus('denied');
        setError('Location permission is required to connect you with nearby sellers.');
        return;
      }

      const coords = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const res = await updateProfileApi(
        { lat: coords.coords.latitude, lng: coords.coords.longitude },
        accessToken
      );
      updateUser(res.data.user);
      router.replace('/home/feed');
    } catch (err) {
      console.warn('AllowLocation error', err);
      setError('Unable to save your location. Please try again.');
      setPermissionStatus('denied');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.replace('/home/feed');
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}> 
      <View style={styles.header}>
        <Text style={styles.title}>Allow Location</Text>
        <Text style={styles.subtitle}>Getting your location helps Dwaso match you with nearby sellers faster.</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.imageWrap}>
          <Image source={require('../../assets/images/banner.png')} style={styles.image} resizeMode="contain" />
        </View>
        <Text style={styles.stepTitle}>Enable location access</Text>
        <Text style={styles.stepText}>We only use your coordinates to show sellers and requests close to you. Your exact address is never shared.</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.allowBtn, loading && { opacity: 0.7 }]} onPress={handleRequestLocation} disabled={loading} activeOpacity={0.85}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.allowBtnText}>Allow Location</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.85}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {permissionStatus === 'denied' ? (
          <Text style={styles.helpText}>If you denied permission previously, open your device settings and allow location access for Dwaso.</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG, justifyContent: 'space-between' },
  header: { paddingHorizontal: 24, paddingTop: 24 },
  title: { fontSize: 26, fontWeight: '900', color: DARK, marginBottom: 10 },
  subtitle: { fontSize: 14, color: MUTED, lineHeight: 20 },
  card: { margin: 24, borderRadius: 24, backgroundColor: CARD, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  imageWrap: { width: 160, height: 160, borderRadius: 80, backgroundColor: '#F8F6EE', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  image: { width: 120, height: 120 },
  stepTitle: { fontSize: 18, fontWeight: '800', color: DARK, marginBottom: 10, textAlign: 'center' },
  stepText: { fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 20 },
  actions: { paddingHorizontal: 24, paddingBottom: 32 },
  allowBtn: { height: 54, borderRadius: 16, backgroundColor: AMBER, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  allowBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  skipBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  skipText: { fontSize: 14, color: DARK, fontWeight: '700' },
  errorText: { marginTop: 12, color: '#D32F2F', fontSize: 12, textAlign: 'center' },
  helpText: { marginTop: 8, color: MUTED, fontSize: 11, textAlign: 'center', lineHeight: 17 },
});
