import { AuthConfig } from 'convex/server';

const clientId = process.env.WORKOS_CLIENT_ID;

// Native Sign in with Apple: `aud` of the identityToken is the iOS bundle id.
const appleBundleId = process.env.APPLE_BUNDLE_ID; // e.g. "ai.shopnima.app"

// Native Google Sign-In: @react-native-google-signin issues idTokens audienced
// to the WEB client ID (configured as `webClientId` in lib/auth.ts's
// GoogleSignin.configure()) on both iOS and Android, not the iOS client ID.
const googleClientId = process.env.GOOGLE_CLIENT_ID;

// Each provider is only registered when its required env var is present.
// Convex rejects a deploy if a customJwt provider's `applicationID` is
// undefined, so guarding here lets the backend deploy even while a native
// provider (e.g. Google) hasn't had its client id configured yet. That
// provider's sign-in simply stays inactive until the env var is set.
const providers: AuthConfig['providers'] = [];

if (clientId) {
  // ── WorkOS (email/password + hosted flow) ──
  providers.push(
    {
      type: 'customJwt',
      issuer: 'https://api.workos.com/',
      algorithm: 'RS256',
      jwks: `https://api.workos.com/sso/jwks/${clientId}`,
      applicationID: clientId,
    },
    {
      type: 'customJwt',
      issuer: `https://api.workos.com/user_management/${clientId}`,
      algorithm: 'RS256',
      jwks: `https://api.workos.com/sso/jwks/${clientId}`,
    }
  );
}

if (appleBundleId) {
  // ── Native Sign in with Apple ──
  providers.push({
    type: 'customJwt',
    issuer: 'https://appleid.apple.com',
    algorithm: 'RS256',
    jwks: 'https://appleid.apple.com/auth/keys',
    applicationID: appleBundleId,
  });
}

if (googleClientId) {
  // ── Native Google ──
  providers.push({
    type: 'customJwt',
    issuer: 'https://accounts.google.com',
    algorithm: 'RS256',
    jwks: 'https://www.googleapis.com/oauth2/v3/certs',
    applicationID: googleClientId,
  });
}

export default { providers } satisfies AuthConfig;
