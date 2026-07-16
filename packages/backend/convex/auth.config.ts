import { AuthConfig } from 'convex/server';

const clientId = process.env.WORKOS_CLIENT_ID;

// Native Sign in with Apple: `aud` of the identityToken is the iOS bundle id.
const appleBundleId = process.env.APPLE_BUNDLE_ID; // e.g. "ai.shopnima.app"

// Native Google: `aud` of the idToken is the OAuth client id that requested it.
// If the client obtains the idToken via `webClientId`, set this to the WEB
// client id; if via the iOS client id, set it to that. Must match the decoded
// token's `aud` exactly.
const googleClientId = process.env.GOOGLE_CLIENT_ID;

export default {
  providers: [
    // ── WorkOS (email/password + hosted flow) ──
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
    },
    // ── Native Sign in with Apple ──
    {
      type: 'customJwt',
      issuer: 'https://appleid.apple.com',
      algorithm: 'RS256',
      jwks: 'https://appleid.apple.com/auth/keys',
      applicationID: appleBundleId,
    },
    // ── Native Google ──
    {
      type: 'customJwt',
      issuer: 'https://accounts.google.com',
      algorithm: 'RS256',
      jwks: 'https://www.googleapis.com/oauth2/v3/certs',
      applicationID: googleClientId,
    },
  ],
} satisfies AuthConfig;
