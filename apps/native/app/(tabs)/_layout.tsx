import { Tabs, Redirect, router } from "expo-router";
import { View, ActivityIndicator, StyleSheet, Pressable, Text } from "react-native";
import { useRef, useState, useContext } from "react";
import { NavigationContext } from "@react-navigation/core";
import { Sparkles, BookOpen, User, Camera, Home } from "lucide-react-native";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { useConvexAuth } from "convex/react";
import { RouteErrorBoundary } from "@/components/ErrorBoundary";
import { QuickTryOnModal } from "@/components/quick-try-on/QuickTryOnModal";
import { FloatingAskNimaButton } from "@/components/engine/FloatingAskNimaButton";
import { AskNimaSheet, type AskNimaSheetRef } from "@/components/ask/AskNimaSheet";

// Re-export as Expo Router's route-level ErrorBoundary for tab screens
export { RouteErrorBoundary as ErrorBoundary };

export default function TabLayout() {
  const { isDark } = useTheme();
  const { isLoading, isAuthenticated } = useConvexAuth();
  // Guard against the transient "Couldn't find a navigation context" error
  // that can fire during initial mount or Fast Refresh before Expo Router
  // has wired up the NavigationContainer.
  const navContext = useContext(NavigationContext);
  const askSheetRef = useRef<AskNimaSheetRef>(null);
  const [isQuickTryOnOpen, setIsQuickTryOnOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("discover");
  const [isAskSheetOpen, setIsAskSheetOpen] = useState(false);

  // Redirect only after loading is complete and user is not authenticated
  if (!isLoading && !isAuthenticated) {
    return <Redirect href="/" />;
  }

  if (!navContext) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: isDark ? "#1A1614" : "#FAF8F5",
        }}
      >
        <ActivityIndicator size="large" color="#A67C52" />
      </View>
    );
  }

  const showFloatingBtn = activeTab === "engine" && !isAskSheetOpen;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: isDark ? "#C9A07A" : "#5C2A33",
          tabBarInactiveTintColor: isDark ? "#8C8078" : "#6B635B",
          tabBarStyle: {
            backgroundColor: isDark ? "#1A1614" : "#FAF8F5",
            borderTopColor: isDark ? "#3D3835" : "#E0D8CC",
            borderTopWidth: 0.5,
            paddingBottom: 0,
            paddingTop: 5,
            height: 70,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "500",
          },
        }}
        screenListeners={{
          state: (e) => {
            const state = e.data?.state;
            if (state) {
              const route = state.routes[state.index];
              if (route) setActiveTab(route.name);
            }
          },
        }}
      >
        <Tabs.Screen
          name="discover"
          options={{
            title: "Discover",
            tabBarIcon: ({ color, size }) => (
              <Sparkles color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="engine"
          options={{
            title: "For You",
            tabBarIcon: ({ color, size }) => (
              <Home color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="ask"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="quick-try-on"
          options={{
            title: "Try-On",
            tabBarButton: () => {
              // Use brand palette: burgundy in light, rose gold in dark
              const btnBg = isDark ? "#C9A07A" : "#5C2A33";
              const iconColor = "#FAF8F5";
              const labelColor = isDark ? "#8C8078" : "#6B635B";
              return (
                <Pressable
                  onPress={() => setIsQuickTryOnOpen(true)}
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "flex-start",
                    paddingBottom: 14,
                  }}
                  accessibilityLabel="Quick Try-On"
                  accessibilityRole="button"
                >
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 26,
                      backgroundColor: btnBg,
                      alignItems: "center",
                      justifyContent: "center",
                      transform: [{ translateY: -16 }],
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: isDark ? 0.35 : 0.22,
                      shadowRadius: 6,
                      elevation: 8,
                    }}
                  >
                    <Camera size={22} color={iconColor} />
                  </View>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "500",
                      color: labelColor,
                      marginTop: -8,
                    }}
                  >
                    Try-On
                  </Text>
                </Pressable>
              );
            },
          }}
        />
        <Tabs.Screen
          name="lookbooks"
          options={{
            title: "Lookbooks",
            tabBarIcon: ({ color, size }) => (
              <BookOpen color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile/index"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="profile/discarded-looks"
          options={{
            href: null,
          }}
        />
      </Tabs>

      {/* Loading overlay — <Tabs> stays mounted so navigation context is always available */}
      {isLoading && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: isDark ? "#1A1614" : "#FAF8F5",
            },
          ]}
        >
          <ActivityIndicator size="large" color="#A67C52" />
        </View>
      )}

      <QuickTryOnModal
        isVisible={isQuickTryOnOpen}
        onClose={() => setIsQuickTryOnOpen(false)}
      />

      <FloatingAskNimaButton
        visible={showFloatingBtn}
        onPress={() => {
          setIsAskSheetOpen(true);
          askSheetRef.current?.open();
        }}
      />

      <AskNimaSheet ref={askSheetRef} onOpenChange={setIsAskSheetOpen} />
    </View>
  );
}
