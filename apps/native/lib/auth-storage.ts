import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Secure token storage for WorkOS auth tokens.
 * 
 * Uses expo-secure-store with chunking to handle JWTs that may exceed
 * the 2KB value size limit on iOS/Android.
 * 
 * On Web, falls back to AsyncStorage (as SecureStore is not supported).
 */

const ACCESS_TOKEN_KEY = 'workos_access_token';
const REFRESH_TOKEN_KEY = 'workos_refresh_token';
const USER_INFO_KEY = 'workos_user_info';
const AUTH_PROVIDER_KEY = 'auth_provider';
const APPLE_USER_ID_KEY = 'apple_user_id';
const CHUNK_SIZE = 1800; // Below 2KB limit with key overhead

// Helper to determine storage engine
const isWeb = Platform.OS === 'web';

/**
 * Store a value that might exceed SecureStore's 2KB limit
 * by splitting into chunks.
 */
async function setLargeValue(key: string, value: string): Promise<void> {
  if (isWeb) {
    await AsyncStorage.setItem(key, value);
    return;
  }

  const chunks = Math.ceil(value.length / CHUNK_SIZE);

  // Store chunk count
  await SecureStore.setItemAsync(`${key}_chunks`, String(chunks));

  // Store each chunk
  for (let i = 0; i < chunks; i++) {
    const chunk = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    await SecureStore.setItemAsync(`${key}_${i}`, chunk);
  }
}

/**
 * Retrieve a value that was stored in chunks.
 */
async function getLargeValue(key: string): Promise<string | null> {
  if (isWeb) {
    return AsyncStorage.getItem(key);
  }

  const chunksStr = await SecureStore.getItemAsync(`${key}_chunks`);
  if (!chunksStr) return null;

  const chunks = parseInt(chunksStr, 10);
  if (isNaN(chunks) || chunks <= 0) return null;

  let value = '';
  for (let i = 0; i < chunks; i++) {
    const chunk = await SecureStore.getItemAsync(`${key}_${i}`);
    if (chunk === null) return null; // Incomplete data
    value += chunk;
  }

  return value;
}

/**
 * Delete a chunked value and all its chunks.
 */
async function deleteLargeValue(key: string): Promise<void> {
  if (isWeb) {
    await AsyncStorage.removeItem(key);
    return;
  }

  const chunksStr = await SecureStore.getItemAsync(`${key}_chunks`);
  if (chunksStr) {
    const chunks = parseInt(chunksStr, 10);
    for (let i = 0; i < chunks; i++) {
      await SecureStore.deleteItemAsync(`${key}_${i}`);
    }
    await SecureStore.deleteItemAsync(`${key}_chunks`);
  }
}

// ---------- Public API ----------

export interface StoredUserInfo {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profilePictureUrl?: string;
  emailVerified: boolean;
}

/** Which login provider issued the currently-active session token. */
export type AuthProvider = 'workos' | 'apple' | 'google';

async function getSmallValue(key: string): Promise<string | null> {
  if (isWeb) return AsyncStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function setSmallValue(key: string, value: string): Promise<void> {
  if (isWeb) {
    await AsyncStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function deleteSmallValue(key: string): Promise<void> {
  if (isWeb) {
    await AsyncStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

export async function getAuthProvider(): Promise<AuthProvider> {
  const v = await getSmallValue(AUTH_PROVIDER_KEY);
  return v === 'apple' || v === 'google' ? v : 'workos';
}

export async function setAuthProvider(provider: AuthProvider): Promise<void> {
  await setSmallValue(AUTH_PROVIDER_KEY, provider);
}

/**
 * Apple's stable per-app user id. Persisted so we can call
 * `getCredentialStateAsync` and silently re-authenticate (Apple identity tokens
 * are short-lived and cannot be refreshed).
 */
export async function getAppleUserId(): Promise<string | null> {
  return getSmallValue(APPLE_USER_ID_KEY);
}

export async function setAppleUserId(userId: string): Promise<void> {
  await setSmallValue(APPLE_USER_ID_KEY, userId);
}

export async function getAccessToken(): Promise<string | null> {
  return getLargeValue(ACCESS_TOKEN_KEY);
}

export async function setAccessToken(token: string): Promise<void> {
  return setLargeValue(ACCESS_TOKEN_KEY, token);
}

export async function getRefreshToken(): Promise<string | null> {
  return getLargeValue(REFRESH_TOKEN_KEY);
}

export async function setRefreshToken(token: string): Promise<void> {
  return setLargeValue(REFRESH_TOKEN_KEY, token);
}

export async function getUserInfo(): Promise<StoredUserInfo | null> {
  let raw: string | null = null;
  
  if (isWeb) {
    raw = await AsyncStorage.getItem(USER_INFO_KEY);
  } else {
    raw = await SecureStore.getItemAsync(USER_INFO_KEY);
  }

  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUserInfo;
  } catch {
    return null;
  }
}

export async function setUserInfo(info: StoredUserInfo): Promise<void> {
  const value = JSON.stringify(info);
  if (isWeb) {
    await AsyncStorage.setItem(USER_INFO_KEY, value);
  } else {
    await SecureStore.setItemAsync(USER_INFO_KEY, value);
  }
}

export async function clearAllTokens(): Promise<void> {
  await deleteLargeValue(ACCESS_TOKEN_KEY);
  await deleteLargeValue(REFRESH_TOKEN_KEY);
  await deleteSmallValue(AUTH_PROVIDER_KEY);
  await deleteSmallValue(APPLE_USER_ID_KEY);

  if (isWeb) {
    await AsyncStorage.removeItem(USER_INFO_KEY);
  } else {
    await SecureStore.deleteItemAsync(USER_INFO_KEY);
  }
}

// ---------- PKCE Storage ----------

const PKCE_VERIFIER_KEY = 'workos_pkce_verifier';

export async function getPKCEVerifier(): Promise<string | null> {
  if (isWeb) {
    return AsyncStorage.getItem(PKCE_VERIFIER_KEY);
  } else {
    return SecureStore.getItemAsync(PKCE_VERIFIER_KEY);
  }
}

export async function setPKCEVerifier(verifier: string): Promise<void> {
  if (isWeb) {
    await AsyncStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  } else {
    await SecureStore.setItemAsync(PKCE_VERIFIER_KEY, verifier);
  }
}

export async function clearPKCEVerifier(): Promise<void> {
  if (isWeb) {
    await AsyncStorage.removeItem(PKCE_VERIFIER_KEY);
  } else {
    await SecureStore.deleteItemAsync(PKCE_VERIFIER_KEY);
  }
}
