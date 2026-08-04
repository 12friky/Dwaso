/**
 * tokenManager.ts
 *
 * Secure token storage + transparent refresh with request queuing.
 *
 * - Refresh token stored in expo-secure-store (encrypted, not plain AsyncStorage)
 * - When any request gets a 401, we:
 *   1. Call /auth/refresh ONCE (concurrent 401s are queued, not duplicated)
 *   2. Update the access token in authStore
 *   3. Retry every queued request with the new token
 * - If refresh itself fails → clear user → force login screen
 */

import * as SecureStore from 'expo-secure-store';

const REFRESH_TOKEN_KEY = 'dwaso_refresh_token';

// ─── Secure storage helpers ───────────────────────────────────────────────────

export async function saveRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function deleteRefreshToken(): Promise<void> {
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

// ─── Refresh state machine ────────────────────────────────────────────────────

type QueueItem = {
  resolve: (token: string) => void;
  reject:  (err: unknown)  => void;
};

let isRefreshing  = false;
let refreshQueue: QueueItem[] = [];

/**
 * Call this with the current BASE_URL and a callback to update the access token.
 * Returns the new access token if successful, throws if the refresh fails.
 */
export async function performTokenRefresh(
  baseUrl: string,
  onNewTokens: (accessToken: string, refreshToken: string) => void,
  onLogout: () => void,
): Promise<string> {
  // If already refreshing, queue this call and wait
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      refreshQueue.push({ resolve, reject });
    });
  }

  isRefreshing = true;

  try {
    const storedRefreshToken = await getRefreshToken();
    if (!storedRefreshToken) {
      throw new Error('No refresh token stored');
    }

    const res  = await fetch(`${baseUrl}/api/auth/refresh`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refreshToken: storedRefreshToken }),
    });

    if (!res.ok) {
      // Refresh failed — logout user
      await deleteRefreshToken();
      onLogout();
      const err = new Error('Session expired. Please log in again.');
      refreshQueue.forEach((q) => q.reject(err));
      refreshQueue = [];
      throw err;
    }

    const json = await res.json();
    const { accessToken: newAccess, refreshToken: newRefresh } = json.data;

    // Persist new refresh token
    await saveRefreshToken(newRefresh);

    // Update in-memory access token
    onNewTokens(newAccess, newRefresh);

    // Resolve all queued requests
    refreshQueue.forEach((q) => q.resolve(newAccess));
    refreshQueue = [];

    return newAccess;
  } catch (err) {
    refreshQueue.forEach((q) => q.reject(err));
    refreshQueue = [];
    throw err;
  } finally {
    isRefreshing = false;
  }
}
