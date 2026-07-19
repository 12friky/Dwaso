import { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, TextInput,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../store/authStore';
import { getMeApi, updateProfileApi, type Address } from '../../services/api';

const BG    = '#F2EFE6';
const CARD  = '#FFFFFF';
const DARK  = '#1B3A2D';
const AMBER = '#E8943A';
const MUTED = '#9CA3AF';
const CATBG = '#EDEAE1';
const GREEN  = '#2E7D52';

export default function SavedAddressesScreen() {
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const { state: { user, accessToken }, updateUser } = useAuth();
  const [items, setItems] = useState<Address[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    getMeApi(accessToken)
      .then((res) => {
        updateUser(res.data.user);
        setItems(res.data.user.addresses ?? []);
      })
      .catch(() => {});
  }, [accessToken, updateUser]);

  useEffect(() => {
    setItems(user?.addresses ?? []);
  }, [user]);

  const setDefault = async (id: string) => {
    const updated = items.map((a) => ({ ...a, default: a._id === id }));
    setItems(updated);

    if (!accessToken) return;
    try {
      const res = await updateProfileApi({ addresses: updated }, accessToken);
      updateUser(res.data.user);
    } catch {
      Alert.alert('Update failed', 'Unable to save default address.');
    }
  };

  const handleSaveAddress = async () => {
    const trimmedLabel = newLabel.trim();
    const trimmedAddress = newAddress.trim();
    if (!trimmedLabel || !trimmedAddress) {
      return Alert.alert('Missing fields', 'Please enter a label and address.');
    }
    if (!accessToken) return;

    setIsSavingAddress(true);
    try {
      const nextAddress: Omit<Address, '_id'> = {
        label: trimmedLabel,
        address: trimmedAddress,
        default: items.length === 0,
      };
      const updatedAddresses = [...items, nextAddress as Address];
      const res = await updateProfileApi({ addresses: updatedAddresses }, accessToken);
      updateUser(res.data.user);
      setItems(res.data.user.addresses ?? []);
      setNewLabel('');
      setNewAddress('');
      setIsAdding(false);
    } catch {
      Alert.alert('Save failed', 'Unable to save address. Please try again.');
    } finally {
      setIsSavingAddress(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/home/profile')} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Addresses</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
      >
        <View style={styles.card}>
          {items.map((item, i) => (
            <View key={item._id}>
              <View style={styles.addressRow}>
                <View style={[styles.iconBox, { backgroundColor: item.default ? '#FEF3E2' : CATBG }]}>
                  <Ionicons
                    name={item.label === 'Home' ? 'home-outline' : item.label === 'Office' ? 'business-outline' : 'location-outline'}
                    size={18}
                    color={item.default ? AMBER : DARK}
                  />
                </View>
                <View style={styles.addressInfo}>
                  <View style={styles.addressLabelRow}>
                    <Text style={styles.addressLabel}>{item.label}</Text>
                    {item.default && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>Default</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.addressText}>{item.address}</Text>
                  {!item.default && (
                    <TouchableOpacity onPress={() => setDefault(item._id)} hitSlop={6}>
                      <Text style={styles.setDefaultText}>Set as default</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity hitSlop={8}>
                  <Ionicons name="create-outline" size={18} color={MUTED} />
                </TouchableOpacity>
              </View>
              {i < items.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {isAdding ? (
          <View style={styles.addForm}>
            <TextInput
              style={styles.formInput}
              placeholder="Label (Home, Office, etc.)"
              placeholderTextColor={MUTED}
              value={newLabel}
              onChangeText={setNewLabel}
            />
            <TextInput
              style={[styles.formInput, styles.formTextarea]}
              placeholder="Address"
              placeholderTextColor={MUTED}
              value={newAddress}
              onChangeText={setNewAddress}
              multiline
            />
            <View style={styles.addFormActions}>
              <TouchableOpacity
                style={[styles.saveAddressBtn, !newLabel.trim() || !newAddress.trim() ? styles.disabledButton : null]}
                onPress={handleSaveAddress}
                disabled={isSavingAddress || !newLabel.trim() || !newAddress.trim()}
              >
                <Text style={styles.saveAddressBtnText}>{isSavingAddress ? 'Saving...' : 'Save Address'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelAddressBtn} onPress={() => setIsAdding(false)} disabled={isSavingAddress}>
                <Text style={styles.cancelAddressBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.addBtn} activeOpacity={0.85} onPress={() => setIsAdding(true)}>
            <Ionicons name="add-circle-outline" size={20} color={AMBER} />
            <Text style={styles.addBtnText}>Add New Address</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: CATBG, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: DARK },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  card: { backgroundColor: CARD, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2, marginBottom: 16 },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  addressInfo: { flex: 1, gap: 3 },
  addressLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addressLabel: { fontSize: 13, fontWeight: '700', color: DARK },
  defaultBadge: { backgroundColor: '#FEF3E2', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  defaultBadgeText: { fontSize: 9, fontWeight: '700', color: AMBER },
  addressText: { fontSize: 12, color: MUTED, lineHeight: 17 },
  setDefaultText: { fontSize: 11, color: AMBER, fontWeight: '600', marginTop: 2 },
  divider: { height: 1, backgroundColor: CATBG, marginLeft: 68 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: CARD, borderRadius: 14, paddingVertical: 14, borderWidth: 1.5, borderColor: '#F5E0C8', borderStyle: 'dashed' },
  addBtnText: { fontSize: 13, fontWeight: '700', color: AMBER },
  addForm: { backgroundColor: CARD, borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  formInput: { borderWidth: 1, borderColor: '#E5E1D8', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12, color: DARK, backgroundColor: BG },
  formTextarea: { minHeight: 80, textAlignVertical: 'top' },
  addFormActions: { flexDirection: 'row', gap: 10 },
  saveAddressBtn: { flex: 1, backgroundColor: AMBER, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveAddressBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  cancelAddressBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#F8F8F8' },
  cancelAddressBtnText: { fontSize: 13, fontWeight: '700', color: DARK },
  disabledButton: { opacity: 0.5 },
});
