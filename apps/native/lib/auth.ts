import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import * as AppleAuthentication from 'expo-apple-authentication';
import {
  getAccessToken,
  setAccessToken,
  getRefreshToken,
  setRefreshToken,
  getUserInfo,
  setUserInfo,
  clearAllTokens,
  setPKCEVerifier,
  clearPKCEVerifier,
  getAuthProvider,
  setAuthProvider,
  getAppleUserId,
  setAppleUserId,
  type StoredUserInfo,
  type AuthProvider,
} from './auth-storage';

// Complete any pending auth sessions on app start
WebBrowser.maybeCompleteAuthSession();

// ---------- Constants ----------

const WORKOS_CLIENT_ID = process.env.EXPO_PUBLIC_WORKOS_CLIENT_ID!;

// In Expo Go, custom schemes (shopnima://) aren't registered, so the env var
// is ignored and makeRedirectUri() generates the correct exp://... URL
// automatically (LAN or tunnel, whichever the dev server is using).
// In real builds the env var wins, preserving shopnima://callback in production.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const REDIRECT_URI = (!isExpoGo && process.env.EXPO_PUBLIC_WORKOS_REDIRECT_URI) ||
  AuthSession.makeRedirectUri({ scheme: 'shopnima', path: 'callback' });
console.log('====================================');
console.log('[AUTH] Redirect URI:', REDIRECT_URI);
console.log('[AUTH] Source:', process.env.EXPO_PUBLIC_WORKOS_REDIRECT_URI ? 'env var' : 'auto-computed');
console.log('[AUTH] Client ID:', WORKOS_CLIENT_ID);
console.log('[AUTH] Platform:', Platform.OS);
console.log('====================================');
console.log('[AUTH] ⬆️  Make sure this Redirect URI is registered in your WorkOS Dashboard!');

const WORKOS_AUTH_URL = 'https://api.workos.com/user_management/authorize';
const WORKOS_TOKEN_URL = 'https://api.workos.com/user_management/authenticate';

// ---------- Native Google config ----------

const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

let googleConfigured = false;

/**
 * Lazily load + configure the native Google Sign-In module. Loaded on demand so
 * the web bundle never pulls in the native-only package.
 */
async function getGoogleSignin() {
  const { GoogleSignin } = await import(
    '@react-native-google-signin/google-signin'
  );
  if (!googleConfigured) {
    GoogleSignin.configure({
      iosClientId: GOOGLE_IOS_CLIENT_ID,
      webClientId: GOOGLE_WEB_CLIENT_ID,
    });
    googleConfigured = true;
  }
  return GoogleSignin;
}

// ---------- PKCE Helpers ----------

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const randomValues = new Uint8Array(length);
  // Use Math.random as a fallback; expo-crypto is used for the challenge
  for (let i = 0; i < length; i++) {
    randomValues[i] = Math.floor(Math.random() * chars.length);
  }
  return Array.from(randomValues, (v) => chars[v % chars.length]).join('');
}

async function createCodeChallenge(verifier: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
    { encoding: Crypto.CryptoEncoding.BASE64 }
  );
  // Convert standard base64 to base64url
  return digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ---------- Token Refresh (with mutex to prevent concurrent calls) ----------

// WorkOS invalidates refresh tokens after a single use, so we must ensure only
// one refresh request is in-flight at a time. Subsequent callers reuse the result.
let refreshPromise: Promise<{ accessToken: string; refreshToken: string } | null> | null = null;

async function doRefreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> {
  try {
    // Use Convex action to refresh token (avoids CORS)
    const convex = new ConvexHttpClient(process.env.EXPO_PUBLIC_CONVEX_URL!);
    
    // Call the action defined in convex/auth.ts
    const data = await convex.action(api.auth.refreshWorkOSToken, {
        refreshToken,
    });

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
  } catch (error) {
    console.error('[AUTH] Token refresh error:', error);
    return null;
  }
}

async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> {
  // If a refresh is already in-flight, reuse its result
  if (refreshPromise) {
    console.log('[AUTH] Reusing in-flight token refresh');
    return refreshPromise;
  }

  refreshPromise = doRefreshAccessToken(refreshToken);
  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

/**
 * Provider-aware token refresh. Returns a fresh, valid session token for the
 * active provider (also persisting it), null if re-auth is required, or
 * 'cancelled' if the Apple system prompt was dismissed — a transient UI event,
 * not a real auth failure, so callers should keep the existing session.
 *
 * - workos: exchange the stored refresh token for a new access token.
 * - google: `signInSilently()` yields a fresh idToken with no UI.
 * - apple:  identity tokens are short-lived and non-refreshable, so we silently
 *           re-run `signInAsync` while the credential is still AUTHORIZED. This
 *           can surface Apple's system sheet in the background (e.g. on token
 *           expiry checks triggered by app foreground/reconnect); dismissing it
 *           throws ERR_REQUEST_CANCELED and must not be treated as a logout.
 */
async function refreshTokenForProvider(
  provider: AuthProvider
): Promise<string | null | 'cancelled'> {
  try {
    if (provider === 'workos') {
      const storedRefreshToken = await getRefreshToken();
      if (!storedRefreshToken) return null;
      const refreshed = await refreshAccessToken(storedRefreshToken);
      if (!refreshed) return null;
      await setAccessToken(refreshed.accessToken);
      await setRefreshToken(refreshed.refreshToken);
      return refreshed.accessToken;
    }

    if (provider === 'google') {
      const GoogleSignin = await getGoogleSignin();
      const res: any = await GoogleSignin.signInSilently();
      let idToken: string | undefined =
        res?.data?.idToken ?? res?.idToken ?? undefined;
      if (!idToken) {
        const tokens: any = await GoogleSignin.getTokens();
        idToken = tokens?.idToken;
      }
      if (!idToken) return null;
      await setAccessToken(idToken);
      return idToken;
    }

    if (provider === 'apple') {
      const appleUserId = await getAppleUserId();
      if (!appleUserId) return null;
      const state = await AppleAuthentication.getCredentialStateAsync(
        appleUserId
      );
      if (
        state !==
        AppleAuthentication.AppleAuthenticationCredentialState.AUTHORIZED
      ) {
        return null;
      }
      try {
        const cred = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });
        if (!cred.identityToken) return null;
        await setAccessToken(cred.identityToken);
        return cred.identityToken;
      } catch (error: any) {
        // Prompt dismissed (backgrounding, timeout, tap-outside) — not a real
        // auth failure. Let the caller keep the existing session and retry later.
        if (error?.code === 'ERR_REQUEST_CANCELED') {
          console.warn('[AUTH] apple token refresh prompt dismissed, keeping existing session');
          return 'cancelled';
        }
        throw error;
      }
    }
  } catch (error) {
    console.error(`[AUTH] ${provider} token refresh failed:`, error);
  }
  return null;
}

// ---------- JWT Helpers ----------

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000; // Convert to ms
    // Consider expired 60 seconds before actual expiry
    return Date.now() >= exp - 60_000;
  } catch {
    return true;
  }
}

// ---------- Module-level auth state updaters ----------
// Allow standalone functions (launchWorkOSAuth, callLogout) to update the
// hook's React state from outside the component tree.
let _loginFn: ((user: StoredUserInfo) => void) | null = null;
let _logoutFn: (() => Promise<void>) | null = null;

export function callLogin(user: StoredUserInfo): void {
  if (_loginFn) {
    _loginFn(user);
  }
}

export async function callLogout(): Promise<void> {
  if (_logoutFn) {
    await _logoutFn();
  } else {
    // Fallback: just clear tokens if hook isn't mounted yet
    await clearAllTokens();
  }
}

// ---------- Main Auth Hook ----------

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: StoredUserInfo | null;
}

/**
 * Main auth hook for Convex's ConvexProviderWithAuth.
 * 
 * Manages the full WorkOS OAuth PKCE flow:
 * 1. Loads persisted tokens from secure storage on mount
 * 2. Provides signIn/signUp to launch the WorkOS hosted login
 * 3. Handles the deep link callback with code exchange
 * 4. Provides fetchAccessToken for Convex's auth system
 * 5. Handles silent token refresh
 */
export function useAuthFromWorkOS() {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    user: null,
  });

  const codeVerifierRef = useRef<string | null>(null);

  // Load persisted auth state on mount
  useEffect(() => {
    let mounted = true;

    async function loadPersistedAuth() {
      try {
        const [token, userInfo] = await Promise.all([
          getAccessToken(),
          getUserInfo(),
        ]);

        if (mounted && token && userInfo) {
          // Check if token is expired
          if (isTokenExpired(token)) {
            const provider = await getAuthProvider();
            // Race the provider refresh against a timeout so a slow/offline
            // refresh can never hang `isLoading` forever (which would leave
            // the user stuck on the launch loader with no redirect to "/").
            const refreshed = await Promise.race([
              refreshTokenForProvider(provider),
              new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
            ]);
            if (refreshed) {
              // 'cancelled' means the Apple prompt was dismissed, not that
              // re-auth is required — keep the existing session either way.
              setState({
                isLoading: false,
                isAuthenticated: true,
                user: userInfo,
              });
              return;
            }
            // Refresh failed — clear everything
            await clearAllTokens();
            setState({ isLoading: false, isAuthenticated: false, user: null });
          } else {
            setState({
              isLoading: false,
              isAuthenticated: true,
              user: userInfo,
            });
          }
        } else {
          setState({ isLoading: false, isAuthenticated: false, user: null });
        }
      } catch (error) {
        console.error('[AUTH] Failed to load persisted auth:', error);
        if (mounted) {
          setState({ isLoading: false, isAuthenticated: false, user: null });
        }
      }
    }

    loadPersistedAuth();
    return () => { mounted = false; };
  }, []);

  // Fetch access token for Convex
  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken?: boolean } = {}): Promise<string | null> => {
      try {
        const token = await getAccessToken();
        if (!token) return null;

        // Force refresh if requested or token is expired
        if (forceRefreshToken || isTokenExpired(token)) {
          const provider = await getAuthProvider();
          const refreshed = await refreshTokenForProvider(provider);
          if (refreshed === 'cancelled') {
            // Apple prompt was dismissed, not a real auth failure — keep the
            // session and hand back the still-stored (possibly stale) token
            // rather than logging the user out.
            return token;
          }
          if (refreshed) {
            return refreshed;
          }

          // Refresh failed — sign out
          await clearAllTokens();
          setState({ isLoading: false, isAuthenticated: false, user: null });
          return null;
        }

        return token;
      } catch (error) {
        console.error('[AUTH] fetchAccessToken error:', error);
        return null;
      }
    },
    []
  );

  const logout = useCallback(async () => {
    await clearAllTokens();
    setState({ isLoading: false, isAuthenticated: false, user: null });
  }, []);

  // Register login/logout so callLogin/callLogout work from anywhere
  useEffect(() => {
    _loginFn = (user: StoredUserInfo) => {
      setState({ isLoading: false, isAuthenticated: true, user });
    };
    _logoutFn = logout;
    return () => {
      _loginFn = null;
      _logoutFn = null;
    };
  }, [logout]);

  return {
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
    user: state.user,
    fetchAccessToken,
    logout,
  };
}

// ---------- Auth Actions (used by sign-in/sign-up screens) ----------

/**
 * Launch the WorkOS AuthKit hosted login page.
 * Opens an in-app browser, and handles the OAuth PKCE flow.
 *
 * @param mode - 'sign-in' or 'sign-up'
 * @param provider - which WorkOS provider to send the user straight to.
 *   'authkit' shows WorkOS's hosted page listing every connection;
 *   'AppleOAuth' skips that page and opens Apple's own sign-in
 *   (appleid.apple.com) directly — required for App Store guideline 4.8.
 * @returns The auth result with tokens and user info, or null if cancelled/failed
 */
export async function launchWorkOSAuth(
  mode: 'sign-in' | 'sign-up' = 'sign-in',
  provider: 'authkit' | 'AppleOAuth' = 'authkit',
): Promise<{
  accessToken: string;
  refreshToken: string;
  user: StoredUserInfo;
} | null> {
  try {
    // Generate PKCE challenge
    const codeVerifier = generateRandomString(64);
    const codeChallenge = await createCodeChallenge(codeVerifier);

    // Build authorization URL
    console.log('[AUTH] ---- launchWorkOSAuth START ----');
    console.log('[AUTH] Mode:', mode);
    console.log('[AUTH] Provider:', provider);
    console.log('[AUTH] Redirect URI:', REDIRECT_URI);
    console.log('[AUTH] Client ID:', WORKOS_CLIENT_ID);

    const params = new URLSearchParams({
      client_id: WORKOS_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      provider,
      ...(mode === 'sign-up' ? { screen_hint: 'sign-up' } : {}),
    });

    const authUrl = `${WORKOS_AUTH_URL}?${params.toString()}`;
    console.log('[AUTH] Opening auth URL:', authUrl);

    // Persist the PKCE verifier so the /callback page can complete the exchange
    // if needed (web popup blocked, or native deep link redirect).
    await setPKCEVerifier(codeVerifier);

    // On web, persist the PKCE verifier to sessionStorage so the /callback
    // page can complete the exchange if the popup flow fails (e.g. popup blocked).
    if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('workos_pkce_verifier', codeVerifier);
      sessionStorage.setItem('workos_redirect_uri', REDIRECT_URI);
    }

    // Open in-app browser
    const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);

    console.log('[AUTH] Browser result type:', result.type);
    console.log('[AUTH] Browser result:', JSON.stringify(result, null, 2));

    if (result.type !== 'success' || !result.url) {
      console.warn('[AUTH] Auth session did not succeed. Type:', result.type);
      console.warn('[AUTH] Possible causes: user dismissed, redirect URI mismatch, or WorkOS rejected the URI.');
      console.warn('[AUTH] Expected redirect URI:', REDIRECT_URI);
      // Clean up persisted verifier on failure
      await clearPKCEVerifier();
      if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('workos_pkce_verifier');
        sessionStorage.removeItem('workos_redirect_uri');
      }
      return null;
    }

    // Extract authorization code from callback URL
    console.log('[AUTH] Callback URL received:', result.url);
    const url = new URL(result.url);
    const code = url.searchParams.get('code');
    const errorParam = url.searchParams.get('error');
    const errorDesc = url.searchParams.get('error_description');

    if (errorParam) {
      console.error('[AUTH] WorkOS returned error:', errorParam, '-', errorDesc);
      return null;
    }

    if (!code) {
      console.error('[AUTH] No authorization code in callback URL. Params:', url.searchParams.toString());
      return null;
    }
    console.log('[AUTH] Got authorization code, exchanging for tokens...');

    // Exchange code for tokens via Convex Action (avoids CORS)
    // We use a temporary ConvexHttpClient here since this is a standalone function
    // outside of the React component tree.
    const convex = new ConvexHttpClient(process.env.EXPO_PUBLIC_CONVEX_URL!);
    
    // Call the action defined in convex/auth.ts
    const tokenData = await convex.action(api.auth.exchangeWorkOSCode, {
      code,
      code_verifier: codeVerifier,
      redirect_uri: REDIRECT_URI,
    });

    const accessToken: string = tokenData.access_token;
    const refreshTokenValue: string = tokenData.refresh_token;
    const workosUser = tokenData.user;

    if (!accessToken || !workosUser) {
      console.error('[AUTH] Missing tokens or user in response');
      return null;
    }

    // Build user info
    const userInfo: StoredUserInfo = {
      id: workosUser.id,
      email: workosUser.email,
      firstName: workosUser.first_name || undefined,
      lastName: workosUser.last_name || undefined,
      profilePictureUrl: workosUser.profile_picture_url || undefined,
      emailVerified: workosUser.email_verified ?? false,
    };

    // Persist tokens and user info
    await Promise.all([
      setAccessToken(accessToken),
      setRefreshToken(refreshTokenValue),
      setUserInfo(userInfo),
      setAuthProvider('workos'),
    ]);

    // Clean up persisted verifier after successful popup flow
    await clearPKCEVerifier();
    if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('workos_pkce_verifier');
      sessionStorage.removeItem('workos_redirect_uri');
    }

    // Update the auth hook's React state immediately so Convex sees the user
    // as authenticated before any navigation happens.
    callLogin(userInfo);

    console.log('[AUTH] ---- launchWorkOSAuth SUCCESS ----');
    console.log('[AUTH] User:', userInfo.email);
    return { accessToken, refreshToken: refreshTokenValue, user: userInfo };
  } catch (error) {
    console.error('[AUTH] ---- launchWorkOSAuth FAILED ----');
    console.error('[AUTH] Error:', error);
    // Clean up verifier on error
    await clearPKCEVerifier();
    return null;
  }
}

/**
 * Native Sign in with Apple (AuthenticationServices via expo-apple-authentication).
 *
 * The returned `identityToken` is a JWT that Convex validates directly (see
 * `auth.config.ts` Apple provider). Apple only returns the user's name/email on
 * the FIRST authorization, so we persist them for UserDataSync to upsert.
 */
export async function signInWithApple(): Promise<{
  user: StoredUserInfo;
} | null> {
  try {
    const cred = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!cred.identityToken) {
      console.warn('[AUTH] Apple sign-in returned no identityToken');
      return null;
    }

    // Preserve previously-stored profile bits (name/email only arrive once).
    const existing = await getUserInfo();
    const userInfo: StoredUserInfo = {
      id: cred.user, // stable per-app Apple user id
      email: cred.email || existing?.email || '',
      firstName: cred.fullName?.givenName || existing?.firstName || undefined,
      lastName: cred.fullName?.familyName || existing?.lastName || undefined,
      profilePictureUrl: existing?.profilePictureUrl,
      emailVerified: true,
    };

    await Promise.all([
      setAccessToken(cred.identityToken),
      setAuthProvider('apple'),
      setAppleUserId(cred.user),
      setUserInfo(userInfo),
    ]);

    callLogin(userInfo);
    console.log('[AUTH] ---- Apple sign-in SUCCESS ----');
    return { user: userInfo };
  } catch (error: any) {
    // User cancelled the native sheet → not an error.
    if (error?.code === 'ERR_REQUEST_CANCELED') return null;
    console.error('[AUTH] Apple sign-in failed:', error);
    return null;
  }
}

/**
 * Native Continue with Google (@react-native-google-signin).
 * Returns a Google idToken that Convex validates directly (see the Google
 * provider in `auth.config.ts`).
 */
export async function signInWithGoogle(): Promise<{
  user: StoredUserInfo;
} | null> {
  try {
    const GoogleSignin = await getGoogleSignin();
    await GoogleSignin.hasPlayServices?.({
      showPlayServicesUpdateDialog: true,
    });
    const result: any = await GoogleSignin.signIn();

    // Support both the modern `{ data }` shape and the legacy flat shape.
    const info = result?.data ?? result;
    let idToken: string | undefined = info?.idToken;
    if (!idToken) {
      const tokens: any = await GoogleSignin.getTokens();
      idToken = tokens?.idToken;
    }
    if (!idToken) {
      console.warn('[AUTH] Google sign-in returned no idToken');
      return null;
    }

    const gUser = info?.user ?? {};
    const userInfo: StoredUserInfo = {
      id: gUser.id || '',
      email: gUser.email || '',
      firstName: gUser.givenName || undefined,
      lastName: gUser.familyName || undefined,
      profilePictureUrl: gUser.photo || undefined,
      emailVerified: true,
    };

    await Promise.all([
      setAccessToken(idToken),
      setAuthProvider('google'),
      setUserInfo(userInfo),
    ]);

    callLogin(userInfo);
    console.log('[AUTH] ---- Google sign-in SUCCESS ----');
    return { user: userInfo };
  } catch (error: any) {
    // Cancellation codes across library versions.
    if (
      error?.code === '-5' ||
      error?.code === 'SIGN_IN_CANCELLED' ||
      error?.code === '12501'
    ) {
      return null;
    }
    console.error('[AUTH] Google sign-in failed:', error);
    return null;
  }
}

/**
 * Sign out — clear all persisted tokens.
 */
export async function signOut(): Promise<void> {
  await clearAllTokens();
}
