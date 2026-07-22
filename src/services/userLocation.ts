import * as Location from 'expo-location';
import { updateProfileApi, type User } from './api';

export type LocationSaveResult = {
  saved: boolean;
  canAskAgain: boolean;
  reason?: string;
};

const MAX_LOCATION_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2_000;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function getCurrentLocation() {
  return Promise.race([
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('location-timeout')), 20_000);
    }),
  ]);
}

const hasStoredCoordinates = (user: User) =>
  Number.isFinite(user.lat) && Number.isFinite(user.lng);

/**
 * Requests foreground location and persists it for users who do not yet have
 * coordinates. This is intentionally invoked after authentication, so the
 * location update always has a valid access token.
 */
export async function requestAndSaveUserLocation(
  user: User,
  accessToken: string,
  updateUser: (user: User) => void,
): Promise<LocationSaveResult> {
  if (hasStoredCoordinates(user)) {
    return { saved: true, canAskAgain: true };
  }

  let permission = await Location.getForegroundPermissionsAsync();
  console.log('Permission Status:', permission.status);
  if (permission.status !== 'granted') {
    permission = await Location.requestForegroundPermissionsAsync();
    console.log('Permission Status:', permission.status);
  }

  if (permission.status !== 'granted') {
    return {
      saved: false,
      canAskAgain: permission.canAskAgain,
      reason: permission.canAskAgain
        ? 'Location permission was not allowed. Please allow it so we can save your location.'
        : 'Location permission is turned off for Dwaso. Open your phone settings and allow location access.',
    };
  }

  let lastFailure = '';
  for (let attempt = 1; attempt <= MAX_LOCATION_ATTEMPTS; attempt += 1) {
    try {
      const location = await getCurrentLocation();
      const { latitude: lat, longitude: lng } = location.coords;

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new Error('invalid-location');
      }

      const profile = await updateProfileApi({ lat, lng }, accessToken);

      // Only report success after the server has returned valid stored values.
      if (!hasStoredCoordinates(profile.data.user)) {
        throw new Error('location-not-saved');
      }

      updateUser(profile.data.user);
      return { saved: true, canAskAgain: true };
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      lastFailure = code === 'location-timeout'
        ? 'We could not get your location in time.'
        : code === 'location-not-saved'
          ? 'We found your location but could not save it yet.'
          : 'We could not get your location right now.';

      if (attempt < MAX_LOCATION_ATTEMPTS) await wait(RETRY_DELAY_MS);
    }
  }

  return {
    saved: false,
    canAskAgain: true,
    reason: `${lastFailure} Check that your internet and phone location are on, then try again.`,
  };
}
