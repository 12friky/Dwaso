import { Tabs } from 'expo-router';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useUnread } from '../../store/unreadStore';

const AMBER = '#E8943A';
const DARK  = '#1B3A2D';
const MUTED = '#9CA3AF';

export default function HomeLayout() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 62 + insets.bottom;
  const { totalUnread } = useUnread();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FDFCF8',
          borderTopColor: '#EEEBE3',
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: insets.bottom + (Platform.OS === 'ios' ? 4 : 6),
          paddingTop: 6,
          elevation: 14,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.07,
          shadowRadius: 10,
        },
        tabBarActiveTintColor: DARK,
        tabBarInactiveTintColor: MUTED,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen name="index"           options={{ href: null }} />
      <Tabs.Screen name="browse"          options={{ href: null }} />
      <Tabs.Screen name="edit-profile"    options={{ href: null }} />
      <Tabs.Screen name="saved-addresses" options={{ href: null }} />
      <Tabs.Screen name="my-requests"     options={{ href: null }} />
      <Tabs.Screen name="help-support"    options={{ href: null }} />
      <Tabs.Screen name="terms"           options={{ href: null }} />
      <Tabs.Screen name="about"           options={{ href: null }} />
      <Tabs.Screen name="product-detail"  options={{ href: null }} />
      <Tabs.Screen name="service-detail"  options={{ href: null }} />
      <Tabs.Screen name="conversation"    options={{ href: null }} />
      <Tabs.Screen name="search"          options={{ href: null }} />
      <Tabs.Screen name="notifications"   options={{ href: null }} />
      <Tabs.Screen name="menu"            options={{ href: null }} />
      <Tabs.Screen name="become-seller"   options={{ href: null }} />
      <Tabs.Screen name="services"        options={{ href: null }} />

      {/* 1 — Home */}
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={focused ? AMBER : color} />
          ),
          tabBarActiveTintColor: AMBER,
        }}
      />

      {/* 2 — Chats */}
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chats',
          tabBarIcon: ({ focused, color }) => (
            <View>
              <Ionicons name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'} size={22} color={color} />
              {totalUnread > 0 && (
                <View style={styles.chatBadge}>
                  <Text style={styles.chatBadgeText}>
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />

      {/* 3 — Post (centre FAB) */}
      <Tabs.Screen
        name="my-post"
        options={{
          title: 'Post',
          tabBarLabel: ({ focused }) => (
            <Text style={{ fontSize: 10, fontWeight: '600', color: focused ? DARK : MUTED, marginTop: 2 }}>
              Post
            </Text>
          ),
          tabBarIcon: () => (
            <View style={styles.postBtn}>
              <Ionicons name="add" size={30} color="#fff" />
            </View>
          ),
        }}
      />

      {/* 4 — Saved */}
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'heart' : 'heart-outline'} size={22} color={color} />
          ),
        }}
      />

      {/* 5 — Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  chatBadge: {
    position: 'absolute', top: -3, right: -6,
    width: 15, height: 15, borderRadius: 8,
    backgroundColor: AMBER, alignItems: 'center', justifyContent: 'center',
  },
  chatBadgeText: { fontSize: 7, color: '#fff', fontWeight: '700' },
  postBtn: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: AMBER,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    shadowColor: AMBER,
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
