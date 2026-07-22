import { renderHook, waitFor, act } from '@testing-library/react-native';

// ---------- Mocks ----------

jest.mock('./auth-storage', () => ({
  getAccessToken: jest.fn(),
  setAccessToken: jest.fn(),
  getRefreshToken: jest.fn(),
  setRefreshToken: jest.fn(),
  getUserInfo: jest.fn(),
  setUserInfo: jest.fn(),
  clearAllTokens: jest.fn(),
  setPKCEVerifier: jest.fn(),
  clearPKCEVerifier: jest.fn(),
  getAuthProvider: jest.fn(),
  setAuthProvider: jest.fn(),
  getAppleUserId: jest.fn(),
  setAppleUserId: jest.fn(),
}));

jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(() => 'shopnima://callback'),
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(() => Promise.resolve('deadbeef')),
  CryptoDigestAlgorithm: { SHA256: 'SHA256' },
  CryptoEncoding: { BASE64: 'BASE64' },
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'bare' },
  ExecutionEnvironment: { StoreClient: 'storeClient', Bare: 'bare' },
}));

jest.mock('expo-apple-authentication', () => ({
  signInAsync: jest.fn(),
  getCredentialStateAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
  AppleAuthenticationCredentialState: {
    AUTHORIZED: 1,
    REVOKED: 2,
    NOT_FOUND: 0,
  },
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(),
    signIn: jest.fn(),
    signInSilently: jest.fn(),
    getTokens: jest.fn(),
  },
}));

const mockConvexAction = jest.fn();
jest.mock('convex/browser', () => ({
  ConvexHttpClient: jest.fn().mockImplementation(() => ({
    action: mockConvexAction,
  })),
}));

jest.mock('@/convex/_generated/api', () => ({
  api: {
    auth: {
      refreshWorkOSToken: 'auth.refreshWorkOSToken',
      exchangeWorkOSCode: 'auth.exchangeWorkOSCode',
    },
  },
}));

import * as authStorage from './auth-storage';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import {
  useAuthFromWorkOS,
  launchWorkOSAuth,
  signInWithApple,
  signInWithGoogle,
  signOut,
} from './auth';

const mockAuthStorage = authStorage as jest.Mocked<typeof authStorage>;

function makeJwt(expiresInSeconds: number): string {
  const payload = { exp: Math.floor(Date.now() / 1000) + expiresInSeconds };
  const base64 = Buffer.from(JSON.stringify(payload)).toString('base64');
  return `header.${base64}.signature`;
}

describe('signOut', () => {
  it('clears all persisted tokens', async () => {
    await signOut();
    expect(mockAuthStorage.clearAllTokens).toHaveBeenCalled();
  });
});

describe('useAuthFromWorkOS', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts unauthenticated when no token is stored', async () => {
    mockAuthStorage.getAccessToken.mockResolvedValue(null);
    mockAuthStorage.getUserInfo.mockResolvedValue(null);

    const { result } = await renderHook(() => useAuthFromWorkOS());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('is authenticated immediately when a valid (non-expired) token is stored', async () => {
    const token = makeJwt(3600);
    const user = { id: '1', email: 'a@b.com', emailVerified: true };
    mockAuthStorage.getAccessToken.mockResolvedValue(token);
    mockAuthStorage.getUserInfo.mockResolvedValue(user);

    const { result } = await renderHook(() => useAuthFromWorkOS());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(user);
  });

  it('refreshes an expired token on load and stays authenticated on success', async () => {
    const expiredToken = makeJwt(-3600);
    const user = { id: '1', email: 'a@b.com', emailVerified: true };
    mockAuthStorage.getAccessToken.mockResolvedValue(expiredToken);
    mockAuthStorage.getUserInfo.mockResolvedValue(user);
    mockAuthStorage.getAuthProvider.mockResolvedValue('workos');
    mockAuthStorage.getRefreshToken.mockResolvedValue('stored-refresh');
    mockConvexAction.mockResolvedValue({
      access_token: makeJwt(3600),
      refresh_token: 'new-refresh',
    });

    const { result } = await renderHook(() => useAuthFromWorkOS());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(true);
    expect(mockAuthStorage.clearAllTokens).not.toHaveBeenCalled();
  });

  it('clears tokens and logs out when refresh fails on load', async () => {
    const expiredToken = makeJwt(-3600);
    const user = { id: '1', email: 'a@b.com', emailVerified: true };
    mockAuthStorage.getAccessToken.mockResolvedValue(expiredToken);
    mockAuthStorage.getUserInfo.mockResolvedValue(user);
    mockAuthStorage.getAuthProvider.mockResolvedValue('workos');
    mockAuthStorage.getRefreshToken.mockResolvedValue(null); // nothing to refresh with

    const { result } = await renderHook(() => useAuthFromWorkOS());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(mockAuthStorage.clearAllTokens).toHaveBeenCalled();
  });

  describe('fetchAccessToken', () => {
    it('returns the cached token without refreshing when it is not expired', async () => {
      const token = makeJwt(3600);
      mockAuthStorage.getAccessToken.mockResolvedValue(token);
      mockAuthStorage.getUserInfo.mockResolvedValue({
        id: '1',
        email: 'a@b.com',
        emailVerified: true,
      });

      const { result } = await renderHook(() => useAuthFromWorkOS());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let fetched: string | null = null;
      await act(async () => {
        fetched = await result.current.fetchAccessToken({});
      });

      expect(fetched).toBe(token);
      expect(mockConvexAction).not.toHaveBeenCalled();
    });

    it('keeps the existing session when Apple refresh returns cancelled instead of logging out', async () => {
      const staleToken = makeJwt(-3600);
      mockAuthStorage.getAccessToken.mockResolvedValue(staleToken);
      mockAuthStorage.getUserInfo.mockResolvedValue({
        id: '1',
        email: 'a@b.com',
        emailVerified: true,
      });
      mockAuthStorage.getAuthProvider.mockResolvedValue('apple');
      mockAuthStorage.getAppleUserId.mockResolvedValue('apple-user-id');
      (AppleAuthentication.getCredentialStateAsync as jest.Mock).mockResolvedValue(
        AppleAuthentication.AppleAuthenticationCredentialState.AUTHORIZED,
      );
      const cancelError: any = new Error('cancelled');
      cancelError.code = 'ERR_REQUEST_CANCELED';
      (AppleAuthentication.signInAsync as jest.Mock).mockRejectedValue(cancelError);

      const { result } = await renderHook(() => useAuthFromWorkOS());
      // Initial mount will itself try to refresh the expired token (and hit the
      // same 'cancelled' path) — wait for that settle first.
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let fetched: string | null = null;
      await act(async () => {
        fetched = await result.current.fetchAccessToken({ forceRefreshToken: true });
      });

      expect(fetched).toBe(staleToken);
      expect(mockAuthStorage.clearAllTokens).not.toHaveBeenCalled();
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('signs the user out when refresh genuinely fails (not a cancellation)', async () => {
      const staleToken = makeJwt(-3600);
      mockAuthStorage.getAccessToken.mockResolvedValue(staleToken);
      mockAuthStorage.getUserInfo.mockResolvedValue({
        id: '1',
        email: 'a@b.com',
        emailVerified: true,
      });
      mockAuthStorage.getAuthProvider.mockResolvedValue('google');
      (GoogleSignin.signInSilently as jest.Mock).mockResolvedValue({});
      (GoogleSignin.getTokens as jest.Mock).mockResolvedValue({});

      const { result } = await renderHook(() => useAuthFromWorkOS());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let fetched: string | null = null;
      await act(async () => {
        fetched = await result.current.fetchAccessToken({ forceRefreshToken: true });
      });

      expect(fetched).toBeNull();
      expect(mockAuthStorage.clearAllTokens).toHaveBeenCalled();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });
});

describe('launchWorkOSAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null and cleans up the PKCE verifier when the browser session is dismissed', async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({ type: 'dismiss' });

    const result = await launchWorkOSAuth('sign-in');

    expect(result).toBeNull();
    expect(mockAuthStorage.clearPKCEVerifier).toHaveBeenCalled();
    expect(mockConvexAction).not.toHaveBeenCalled();
  });

  it('returns null when WorkOS redirects back with an error param', async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
      type: 'success',
      url: 'shopnima://callback?error=access_denied&error_description=nope',
    });

    const result = await launchWorkOSAuth('sign-in');

    expect(result).toBeNull();
  });

  it('returns null when the callback URL has no authorization code', async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
      type: 'success',
      url: 'shopnima://callback',
    });

    const result = await launchWorkOSAuth('sign-in');

    expect(result).toBeNull();
  });

  it('exchanges the code and persists tokens on success', async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({
      type: 'success',
      url: 'shopnima://callback?code=abc123',
    });
    mockConvexAction.mockResolvedValue({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      user: {
        id: 'user-1',
        email: 'a@b.com',
        first_name: 'A',
        last_name: 'B',
        email_verified: true,
      },
    });

    const result = await launchWorkOSAuth('sign-in');

    expect(result).not.toBeNull();
    expect(result?.accessToken).toBe('access-token');
    expect(mockAuthStorage.setAccessToken).toHaveBeenCalledWith('access-token');
    expect(mockAuthStorage.setAuthProvider).toHaveBeenCalledWith('workos');
    expect(mockAuthStorage.clearPKCEVerifier).toHaveBeenCalled();
  });
});

describe('signInWithApple', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when the user cancels the native sheet', async () => {
    const cancelError: any = new Error('cancelled');
    cancelError.code = 'ERR_REQUEST_CANCELED';
    (AppleAuthentication.signInAsync as jest.Mock).mockRejectedValue(cancelError);

    const result = await signInWithApple();

    expect(result).toBeNull();
  });

  it('persists tokens and returns the user on success', async () => {
    mockAuthStorage.getUserInfo.mockResolvedValue(null);
    (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValue({
      identityToken: 'apple-jwt',
      user: 'apple-stable-id',
      email: 'apple@b.com',
      fullName: { givenName: 'Ap', familyName: 'Ple' },
    });

    const result = await signInWithApple();

    expect(result?.user.email).toBe('apple@b.com');
    expect(mockAuthStorage.setAccessToken).toHaveBeenCalledWith('apple-jwt');
    expect(mockAuthStorage.setAuthProvider).toHaveBeenCalledWith('apple');
  });
});

describe('signInWithGoogle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(['-5', 'SIGN_IN_CANCELLED', '12501'])(
    'returns null for cancellation code %s instead of throwing',
    async (code) => {
      const err: any = new Error('cancelled');
      err.code = code;
      (GoogleSignin.signIn as jest.Mock).mockRejectedValue(err);

      const result = await signInWithGoogle();

      expect(result).toBeNull();
    },
  );

  it('persists tokens and returns the user on success', async () => {
    (GoogleSignin.hasPlayServices as jest.Mock).mockResolvedValue(true);
    (GoogleSignin.signIn as jest.Mock).mockResolvedValue({
      data: {
        idToken: 'google-id-token',
        user: { id: 'g1', email: 'g@b.com', givenName: 'G', familyName: 'B' },
      },
    });

    const result = await signInWithGoogle();

    expect(result?.user.email).toBe('g@b.com');
    expect(mockAuthStorage.setAccessToken).toHaveBeenCalledWith('google-id-token');
    expect(mockAuthStorage.setAuthProvider).toHaveBeenCalledWith('google');
  });
});
