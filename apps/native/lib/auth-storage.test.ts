const mockSecureStore = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn((key: string, value: string) => {
    mockSecureStore.set(key, value);
    return Promise.resolve();
  }),
  getItemAsync: jest.fn((key: string) => {
    return Promise.resolve(mockSecureStore.has(key) ? mockSecureStore.get(key)! : null);
  }),
  deleteItemAsync: jest.fn((key: string) => {
    mockSecureStore.delete(key);
    return Promise.resolve();
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    setItem: jest.fn((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    getItem: jest.fn((key: string) => Promise.resolve(store.has(key) ? store.get(key)! : null)),
    removeItem: jest.fn((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
  };
});

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as authStorage from './auth-storage';

describe('auth-storage (native, SecureStore-backed)', () => {
  beforeEach(async () => {
    mockSecureStore.clear();
    jest.clearAllMocks();
  });

  it('round-trips a value larger than CHUNK_SIZE across multiple chunks', async () => {
    const big = 'x'.repeat(1800 * 3 + 500); // spans 4 chunks
    await authStorage.setAccessToken(big);

    // Confirm it was actually split into multiple SecureStore keys.
    expect(mockSecureStore.get('workos_access_token_chunks')).toBe('4');
    expect(mockSecureStore.has('workos_access_token_0')).toBe(true);
    expect(mockSecureStore.has('workos_access_token_3')).toBe(true);

    const result = await authStorage.getAccessToken();
    expect(result).toBe(big);
  });

  it('round-trips a small value using a single chunk', async () => {
    await authStorage.setRefreshToken('short-token');
    expect(await authStorage.getRefreshToken()).toBe('short-token');
  });

  it('returns null when no value was ever stored', async () => {
    expect(await authStorage.getAccessToken()).toBeNull();
  });

  it('returns null when chunk data is incomplete (partial write)', async () => {
    await authStorage.setAccessToken('y'.repeat(1800 * 2 + 100)); // 3 chunks
    // Simulate a crash mid-write: chunk 2 never landed.
    mockSecureStore.delete('workos_access_token_2');

    expect(await authStorage.getAccessToken()).toBeNull();
  });

  it('clearAllTokens deletes every chunk plus small values', async () => {
    await authStorage.setAccessToken('z'.repeat(1800 * 2));
    await authStorage.setRefreshToken('refresh');
    await authStorage.setUserInfo({
      id: '1',
      email: 'a@b.com',
      emailVerified: true,
    });
    await authStorage.setAuthProvider('apple');
    await authStorage.setAppleUserId('apple-id');

    await authStorage.clearAllTokens();

    expect(await authStorage.getAccessToken()).toBeNull();
    expect(await authStorage.getRefreshToken()).toBeNull();
    expect(await authStorage.getUserInfo()).toBeNull();
    // clearAllTokens does not clear provider/apple-id keys directly via
    // deleteSmallValue for provider — verify it was actually called.
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_provider');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('apple_user_id');
  });

  it('getAuthProvider defaults to workos for unset or garbage values', async () => {
    expect(await authStorage.getAuthProvider()).toBe('workos');

    mockSecureStore.set('auth_provider', 'not-a-real-provider');
    expect(await authStorage.getAuthProvider()).toBe('workos');
  });

  it('getAuthProvider round-trips apple and google', async () => {
    await authStorage.setAuthProvider('apple');
    expect(await authStorage.getAuthProvider()).toBe('apple');

    await authStorage.setAuthProvider('google');
    expect(await authStorage.getAuthProvider()).toBe('google');
  });

  it('getUserInfo returns null for corrupt JSON instead of throwing', async () => {
    mockSecureStore.set('workos_user_info', '{not valid json');
    expect(await authStorage.getUserInfo()).toBeNull();
  });
});

describe('auth-storage (web, AsyncStorage-backed)', () => {
  it('uses AsyncStorage instead of SecureStore on web', async () => {
    // Force a fresh module graph where 'react-native' reports Platform.OS
    // === 'web', so auth-storage's module-level `isWeb` const picks it up.
    let webAuthStorage: typeof authStorage;
    jest.isolateModules(() => {
      jest.doMock('react-native/Libraries/Utilities/Platform', () => ({
        __esModule: true,
        default: {
          OS: 'web',
          select: (obj: Record<string, unknown>) => obj.web ?? obj.default,
        },
      }));
      webAuthStorage = require('./auth-storage');
    });

    await webAuthStorage!.setAccessToken('web-token');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('workos_access_token', 'web-token');
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });
});
