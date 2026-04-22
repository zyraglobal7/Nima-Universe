import { useEffect, useState } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { View, Text, ActivityIndicator, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import {
  setAccessToken,
  setRefreshToken,
  setUserInfo,
  type StoredUserInfo,
} from "@/lib/auth-storage";
import { callLogin } from "@/lib/auth";

// This must be called at the module level so that when WorkOS redirects
// the browser to /callback?code=..., the auth session popup can detect
// the code and close itself, returning the result to openAuthSessionAsync.
WebBrowser.maybeCompleteAuthSession();

/**
 * OAuth callback screen.
 *
 * Primary path (popup flow): maybeCompleteAuthSession() above detects the code
 * in the URL and signals the opener window. The popup closes automatically.
 *
 * Fallback path (web same-window redirect): If the popup was blocked and the
 * browser navigated the main window instead, maybeCompleteAuthSession() is a
 * no-op. In that case the useEffect below handles the full code exchange,
 * token storage, and navigation.
 */
export default function CallbackScreen() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only run the fallback on web — on native the deep-link / popup flow works.
    if (Platform.OS !== "web") return;

    // Give maybeCompleteAuthSession a moment to do its thing (popup case).
    // If we're still mounted after a short delay, assume we're in the
    // same-window fallback and handle the exchange ourselves.
    const timer = setTimeout(() => {
      handleWebFallback();
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleWebFallback() {
    try {
      // 1. Extract the authorization code from the current URL
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (!code) {
        setError("No authorization code found in the URL.");
        return;
      }

      // 2. Retrieve the PKCE verifier that was persisted before navigation
      const codeVerifier = sessionStorage.getItem("workos_pkce_verifier");
      const redirectUri = sessionStorage.getItem("workos_redirect_uri");

      if (!codeVerifier) {
        setError(
          "Auth session expired. Please go back and try signing in again.",
        );
        return;
      }

      // 3. Exchange the code for tokens via the Convex action
      const convex = new ConvexHttpClient(
        process.env.EXPO_PUBLIC_CONVEX_URL!,
      );

      const tokenData = await convex.action(api.auth.exchangeWorkOSCode, {
        code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri || process.env.EXPO_PUBLIC_WORKOS_REDIRECT_URI!,
      });

      const accessToken: string = tokenData.access_token;
      const refreshTokenValue: string = tokenData.refresh_token;
      const workosUser = tokenData.user;

      if (!accessToken || !workosUser) {
        setError("Failed to retrieve tokens from the server.");
        return;
      }

      // 4. Build and persist user info + tokens
      const userInfo: StoredUserInfo = {
        id: workosUser.id,
        email: workosUser.email,
        firstName: workosUser.first_name || undefined,
        lastName: workosUser.last_name || undefined,
        profilePictureUrl: workosUser.profile_picture_url || undefined,
        emailVerified: workosUser.email_verified ?? false,
      };

      await Promise.all([
        setAccessToken(accessToken),
        setRefreshToken(refreshTokenValue),
        setUserInfo(userInfo),
      ]);

      // 5. Clean up sessionStorage
      sessionStorage.removeItem("workos_pkce_verifier");
      sessionStorage.removeItem("workos_redirect_uri");

      // 6. Update the auth hook's React state immediately so Convex sees the
      //    user as authenticated before navigation (root layout stays mounted,
      //    so the storage-load effect won't re-run on router.replace).
      callLogin(userInfo);

      // 7. Navigate to the app root
      router.replace("/");
    } catch (err) {
      console.error("[CALLBACK] Web fallback error:", err);
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
    }
  }

  // Error state — show message + retry button
  if (error) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#FAF8F5",
          gap: 16,
          paddingHorizontal: 32,
        }}
      >
        <Text
          style={{
            color: "#B85C5C",
            fontSize: 16,
            fontWeight: "600",
            textAlign: "center",
          }}
        >
          Sign-in failed
        </Text>
        <Text
          style={{
            color: "#6B635B",
            fontSize: 14,
            textAlign: "center",
            lineHeight: 20,
          }}
        >
          {error}
        </Text>
        <Pressable
          onPress={() => router.replace("/")}
          style={({ pressed }) => ({
            marginTop: 12,
            backgroundColor: "#5C2A33",
            paddingHorizontal: 32,
            paddingVertical: 14,
            borderRadius: 8,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ color: "#FAF8F5", fontSize: 14, fontWeight: "600" }}>
            Try Again
          </Text>
        </Pressable>
      </View>
    );
  }

  // Default loading state
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#FAF8F5",
        gap: 16,
      }}
    >
      <ActivityIndicator size="large" color="#5C2A33" />
      <Text style={{ color: "#6B635B", fontSize: 14 }}>
        Completing sign in...
      </Text>
    </View>
  );
}
