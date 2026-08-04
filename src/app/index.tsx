/**
 * index.tsx — App entry point
 *
 * Routing logic:
 *  - First ever launch (no 'hasLaunched' flag) → /account-type
 *  - Returning user (has launched before, but logged out) → /login
 *  - Logged-in user (access token exists) → /home/feed  (handled by _layout.tsx)
 */

import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

const LAUNCHED_KEY = 'dwaso_has_launched';

export default function Index() {
  // null = still checking, true = first launch, false = returning user
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const value = await SecureStore.getItemAsync(LAUNCHED_KEY);
        if (value === null) {
          // First time ever — mark it and show account-type
          await SecureStore.setItemAsync(LAUNCHED_KEY, 'true');
          setIsFirstLaunch(true);
        } else {
          setIsFirstLaunch(false);
        }
      } catch {
        // If SecureStore fails for any reason, default to login
        setIsFirstLaunch(false);
      }
    })();
  }, []);

  // Still checking storage — show a brief loading state
  if (isFirstLaunch === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2EFE6' }}>
        <ActivityIndicator size="large" color="#E8943A" />
      </View>
    );
  }

  return <Redirect href={isFirstLaunch ? '/account-type' : '/login'} />;
}
