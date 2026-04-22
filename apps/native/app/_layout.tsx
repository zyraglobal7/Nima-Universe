import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import "../global.css";
import Toast from "react-native-toast-message";

import { useEffect, useCallback } from "react";
import { View, ActivityIndicator } from "react-native";

import { Stack, usePathname, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ConvexReactClient, ConvexProviderWithAuth } from "convex/react";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import {
  CormorantGaramond_400Regular,
  CormorantGaramond_500Medium,
  CormorantGaramond_600SemiBold,
  CormorantGaramond_700Bold,
} from "@expo-google-fonts/cormorant-garamond";
import { ThemeProvider, useTheme } from "@/lib/contexts/ThemeContext";
import { UserProvider } from "@/lib/contexts/UserContext";
import { SelectionProvider } from "@/lib/contexts/SelectionContext";
import { useAuthFromWorkOS } from "@/lib/auth";
import { UserDataSync } from "@/components/UserDataSync";
import { Header } from "@/components/ui/Header";
import { usePushNotifications } from "@/lib/hooks/usePushNotifications";
import { useConvexAuth } from "convex/react";
import {
  AppErrorBoundary,
  RouteErrorBoundary,
} from "@/components/ErrorBoundary";
import { NetworkProvider } from "@/lib/contexts/NetworkContext";
import { NoInternetBanner } from "@/components/ui/NoInternetBanner";

// Re-export as Expo Router's route-level ErrorBoundary
export { RouteErrorBoundary as ErrorBoundary } from "@/components/ErrorBoundary";

// Keep splash screen visible while fonts load
SplashScreen.preventAutoHideAsync();

// Create Convex client (single instance)
const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

// Routes that are accessible without authentication
const PUBLIC_PATHS = ["/", "/onboarding", "/callback"];

function LayoutContent() {
  const { isDark } = useTheme();
  const pathname = usePathname();
  const { isLoading, isAuthenticated } = useConvexAuth();

  // Register for push notifications and save token to Convex
  usePushNotifications();

  // Redirect unauthenticated users away from protected routes
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated && !PUBLIC_PATHS.includes(pathname)) {
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, pathname]);

  // Determine if we should show the global header
  const showHeader =
    pathname !== "/" &&
    pathname !== "/onboarding" &&
    !pathname.includes("/lookbook/") &&
    !pathname.includes("/look/") &&
    pathname !== "/cart" &&
    !pathname.startsWith("/messages") &&
    pathname !== "/callback" &&
    !pathname.includes("/fitting/") &&
    !pathname?.startsWith("/(auth)") &&
    !pathname?.includes("/category/");

  const backgroundColor = isDark ? "#1A1614" : "#FAF8F5";

  return (
    <UserProvider>
      <SelectionProvider>
        <UserDataSync />
        <StatusBar style={isDark ? "light" : "dark"} />

        {/* Offline Banner */}
        <NoInternetBanner />

        {/* Global Header */}
        {showHeader && <Header />}

        <Stack
          screenOptions={{
            headerShown: false, // Default to false since we have a custom header
            contentStyle: { backgroundColor },
            animation: "slide_from_right",
          }}
        >
          {/* Tab navigator */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

          {/* Onboarding — full screen, no back gesture */}
          <Stack.Screen
            name="onboarding"
            options={{
              headerShown: false, // Explicitly hidden
              gestureEnabled: false,
            }}
          />

          {/* Landing Page */}
          <Stack.Screen
            name="index"
            options={{
              headerShown: false,
            }}
          />

          {/* Detail screens */}
          <Stack.Screen name="product/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="look/[id]" options={{ headerShown: false }} />
          <Stack.Screen
            name="fitting/[sessionId]"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="lookbook/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="ask/[chatId]" options={{ headerShown: false }} />
          <Stack.Screen
            name="discover/category/[category]"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="discover/gender/[gender]"
            options={{ headerShown: false }}
          />

          {/* OAuth callback — handles web redirect from WorkOS */}
          <Stack.Screen
            name="callback"
            options={{
              headerShown: false,
              gestureEnabled: false,
            }}
          />

          {/* Utility screens */}
          <Stack.Screen name="cart" options={{ headerShown: false }} />
          {/* <Stack.Screen
            name="checkout"
            options={{ headerShown: true, title: "Checkout" }}
          /> */}
          <Stack.Screen name="orders/index" options={{ headerShown: false }} />
          <Stack.Screen name="orders/[id]" options={{ headerShown: false }} />
          <Stack.Screen
            name="messages/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="messages/[userId]"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="activity" options={{ headerShown: false }} />
          <Stack.Screen name="explore" options={{ headerShown: false }} />
        </Stack>
      </SelectionProvider>
    </UserProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    DMSans: DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    CormorantGaramond: CormorantGaramond_400Regular,
    CormorantGaramond_500Medium,
    CormorantGaramond_600SemiBold,
    CormorantGaramond_700Bold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    onLayoutRootView();
  }, [onLayoutRootView]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppErrorBoundary>
        <BottomSheetModalProvider>
          <SafeAreaProvider>
            <ThemeProvider>
              <NetworkProvider>
                <ConvexProviderWithAuth client={convex} useAuth={useAuthFromWorkOS}>
                  <LayoutContent />
                </ConvexProviderWithAuth>
              </NetworkProvider>
            </ThemeProvider>
          </SafeAreaProvider>
        </BottomSheetModalProvider>
        <Toast />
      </AppErrorBoundary>
    </GestureHandlerRootView>
  );
}
