/**
 * _layout.tsx (root)
 * Wraps the whole app in global providers.
 * - Connects/disconnects Socket.IO based on auth state.
 * - Fetches unread count immediately on login.
 * - Shows an in-app notification banner with sound + vibration on new notifications.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Animated, TouchableOpacity, View, Text, StyleSheet, Platform,
} from 'react-native';
import { Slot, useRouter }        from 'expo-router';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthProvider, useAuth }  from '../store/authStore';
import { SavedProvider, useSaved } from '../store/savedStore';
import { UnreadProvider, useUnread } from '../store/unreadStore';
import { NotificationProvider, useNotifications } from '../store/notificationStore';
import Ionicons                   from '@expo/vector-icons/Ionicons';
import * as Haptics               from 'expo-haptics';
import { useAudioPlayer }         from 'expo-audio';
import * as Notifications         from 'expo-notifications';
import * as Device                from 'expo-device';
import Constants                  from 'expo-constants';
import SocketService              from '../services/socket';
import { getMyConversationsApi, savePushTokenApi, type AppNotification } from '../services/api';

// ── Configure how notifications behave when app is foregrounded ───────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert:   false, // we show our own banner
    shouldPlaySound:   false, // we play our own sound
    shouldSetBadge:    true,
    shouldShowBanner:  false,
    shouldShowList:    true,
  }),
});

// ── In-app notification banner ────────────────────────────────────────────────
const BANNER_DURATION = 4000; // ms before auto-dismiss

function NotifBanner({
  notif,
  onDismiss,
  onPress,
}: {
  notif: AppNotification;
  onDismiss: () => void;
  onPress: () => void;
}) {
  const insets    = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 14, stiffness: 120 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    // Auto-dismiss
    timerRef.current = setTimeout(() => dismiss(), BANNER_DURATION);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const dismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.parallel([
      Animated.timing(translateY, { toValue: -120, duration: 250, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onDismiss());
  };

  const TYPE_ICON: Record<AppNotification['type'], React.ComponentProps<typeof Ionicons>['name']> = {
    new_request: 'bag-add-outline',
    new_message: 'chatbubble-ellipses-outline',
    offer:       'pricetag-outline',
    system:      'information-circle-outline',
  };

  return (
    <Animated.View
      style={[
        bannerStyles.container,
        { top: insets.top + 8, transform: [{ translateY }], opacity },
      ]}
    >
      <TouchableOpacity
        style={bannerStyles.inner}
        activeOpacity={0.9}
        onPress={() => { dismiss(); onPress(); }}
      >
        <View style={bannerStyles.iconBox}>
          <Ionicons name={TYPE_ICON[notif.type] ?? 'notifications-outline'} size={20} color="#E8943A" />
        </View>
        <View style={bannerStyles.textBox}>
          <Text style={bannerStyles.title} numberOfLines={1}>{notif.title}</Text>
          <Text style={bannerStyles.body}  numberOfLines={2}>{notif.body}</Text>
        </View>
        <TouchableOpacity onPress={dismiss} hitSlop={10} style={bannerStyles.closeBtn}>
          <Ionicons name="close" size={16} color="#9CA3AF" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const bannerStyles = StyleSheet.create({
  container: {
    position: 'absolute', left: 16, right: 16, zIndex: 9999,
  },
  inner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16, padding: 14, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.14,
    shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
    elevation: 12,
    borderWidth: 1, borderColor: '#F0EDE8',
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FEF3E2',
    alignItems: 'center', justifyContent: 'center',
  },
  textBox:  { flex: 1 },
  title:    { fontSize: 13, fontWeight: '700', color: '#1B3A2D', marginBottom: 2 },
  body:     { fontSize: 11, color: '#9CA3AF', lineHeight: 16 },
  closeBtn: { paddingLeft: 4 },
});

// ── Register device for push notifications ────────────────────────────────────
async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    console.log('[Push] Skipping — not a physical device');
    return null;
  }

  // Check / request permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Push] Permission not granted');
    return null;
  }

  // Android needs a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name:        'Default',
      importance:  Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor:  '#E8943A',
      sound:       'message tone.mp3',
    });
  }

  // Get the Expo push token
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.error('[Push] No projectId found in app.json');
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log('[Push] Expo push token:', tokenData.data);
    return tokenData.data;
  } catch (err) {
    console.warn('[Push] Failed to fetch Expo token:', err);
    return null;
  }
}

// ── AppBridge — socket/notification/sound/push logic ─────────────────────────
function AppBridge() {
  const router = useRouter();
  const { state: { accessToken, user } } = useAuth();
  const { setTotalUnread }               = useUnread();
  const { loadSaved }                    = useSaved();
  const { state: notificationState, loadNotifications, prependNotif, reset: resetNotifications } = useNotifications();

  const [bannerNotif, setBannerNotif] = useState<AppNotification | null>(null);

  // Load the notification sound (won't play until .play() is called)
  const player = useAudioPlayer(
    require('../../assets/sounds/message tone.mp3')
  );

  const playAlert = useCallback(async () => {
    try {
      // Rewind and play
      player.seekTo(0);
      player.play();
    } catch { /* non-fatal */ }

    // Short vibration
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch { /* non-fatal */ }
  }, [player]);

  const handleBannerPress = useCallback((notif: AppNotification) => {
    setBannerNotif(null);
    if (notif.data?.conversationId) {
      router.push({ pathname: '/home/conversation', params: { id: notif.data.conversationId } });
    } else {
      router.push('/home/notifications');
    }
  }, [router]);

  useEffect(() => {
    Notifications.setBadgeCountAsync(accessToken ? notificationState.unreadCount : 0).catch(() => {});
  }, [accessToken, notificationState.unreadCount]);

  useEffect(() => {
    if (!accessToken || !user?.isVerified) {
      SocketService.disconnect();
      setTotalUnread(0);
      resetNotifications();
      return;
    }

    // 1. Connect socket
    SocketService.connect(accessToken);

    // Do not let notifications from a previously signed-in account remain on
    // screen while this account's request is in flight.
    resetNotifications();

    // 2. Load saved posts
    loadSaved(accessToken);

    // 3. Load existing notifications (no sound — these are old)
    loadNotifications(accessToken);

    // 4. Register for push notifications & save token to backend
    registerForPushNotifications()
      .then((token) => {
        if (token) {
          savePushTokenApi(token, accessToken).catch(() => {});
        }
      })
      .catch((err) => {
        console.warn('[Push] registration failed', err);
      });

    // 5. Handle tap on a push notification (app was background/killed)
    const tapSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as any;
      if (data?.conversationId) {
        router.push({ pathname: '/home/conversation', params: { id: data.conversationId } });
      } else if (data?.postId) {
        const isService = data?.requestType === 'service';
        router.push({
          pathname: isService ? '/home/service-detail' : '/home/product-detail',
          params: { id: data.postId, from: '/home/notifications' },
        });
      } else {
        router.push('/home/notifications');
      }
    });

    // 6. Real-time new notification → sound + vibration + banner
    const unsubNotif = SocketService.on('new_notification', (notif: AppNotification) => {
      prependNotif(notif);    // update store + badge
      playAlert();            // sound + vibration
      setBannerNotif(notif);  // show banner
    });

    // Chat alerts are banner/push-only; they deliberately do not enter the
    // notification store or the Notifications screen.
    const unsubChatAlert = SocketService.on('new_chat_alert', (notif: AppNotification) => {
      playAlert();
      setBannerNotif(notif);
    });

    // 5. Fetch unread chat count
    getMyConversationsApi(accessToken)
      .then((res) => {
        const userId = user?._id ?? '';
        const count  = res.data.conversations.reduce((n, c) => {
          const isBuyer = c.buyer._id === userId;
          return n + (isBuyer ? c.unreadBuyer : c.unreadSeller);
        }, 0);
        setTotalUnread(count);
      })
      .catch(() => {});

    // 6. Real-time chat badge updates
    const unsubUpdated = SocketService.on('conversation_updated', () => {
      getMyConversationsApi(accessToken)
        .then((res) => {
          const userId = user?._id ?? '';
          const count  = res.data.conversations.reduce((n, c) => {
            const isBuyer = c.buyer._id === userId;
            return n + (isBuyer ? c.unreadBuyer : c.unreadSeller);
          }, 0);
          setTotalUnread(count);
        })
        .catch(() => {});
    });

    const unsubRead = SocketService.on('conversation_read', () => {
      getMyConversationsApi(accessToken)
        .then((res) => {
          const userId = user?._id ?? '';
          const count  = res.data.conversations.reduce((n, c) => {
            const isBuyer = c.buyer._id === userId;
            return n + (isBuyer ? c.unreadBuyer : c.unreadSeller);
          }, 0);
          setTotalUnread(count);
        })
        .catch(() => {});
    });

    return () => {
      unsubNotif();
      unsubChatAlert();
      unsubUpdated();
      unsubRead();
      tapSub.remove();
    };
  }, [accessToken, user?._id]);

  return (
    <>
      {bannerNotif && (
        <NotifBanner
          key={bannerNotif._id}
          notif={bannerNotif}
          onDismiss={() => setBannerNotif(null)}
          onPress={() => handleBannerPress(bannerNotif)}
        />
      )}
    </>
  );
}

// ── Root layout ───────────────────────────────────────────────────────────────
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SavedProvider>
          <UnreadProvider>
            <NotificationProvider>
              <AppBridge />
              <Slot />
            </NotificationProvider>
          </UnreadProvider>
        </SavedProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
