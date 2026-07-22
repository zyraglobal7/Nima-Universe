import { useState, useCallback } from "react";
import { View, TouchableOpacity, ActivityIndicator } from "react-native";
import { Text } from "@/components/ui/Text";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { SettingsTab } from "@/components/profile/SettingsTab";
import { PhotosTab } from "@/components/profile/PhotosTab";
import { StyleFitTab } from "@/components/profile/StyleFitTab";
import { AccountTab } from "@/components/profile/AccountTab";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useTheme } from "@/lib/contexts/ThemeContext";

const TABS = ["Settings", "Photos", "Style & Fit", "Account"] as const;
type TabLabel = (typeof TABS)[number];

const TAB_VIEWS = [SettingsTab, PhotosTab, StyleFitTab, AccountTab];

export default function ProfileScreen() {
  const { isDark } = useTheme();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const [activeIndex, setActiveIndex] = useState(0);
  // Keep-alive: once a tab is visited it stays mounted (hidden via display:none).
  // This stops PhotosTab from remounting + re-querying + re-decoding images on
  // every tab switch — combined with expo-image's cache, photos stay instant.
  const [visited, setVisited] = useState<Set<number>>(() => new Set([0]));
  const currentUser = useQuery(api.users.queries.getCurrentUser);

  const goToPage = useCallback((index: number) => {
    setActiveIndex(index);
    setVisited((prev) => (prev.has(index) ? prev : new Set(prev).add(index)));
  }, []);

  if (isLoading || (isAuthenticated && currentUser === undefined)) {
    return (
      <SafeAreaView className="flex-1 bg-background dark:bg-background-dark items-center justify-center">
        <ActivityIndicator size="large" color="#A67C52" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-background-dark">
      <View className="flex-1 px-4 pt-4">
        <ProfileHeader />

        <View
          className="flex-row bg-surface dark:bg-surface-dark rounded-2xl mb-6"
          style={{ padding: 4, gap: 2 }}
        >
          {TABS.map((label, index) => (
            <TabButton
              key={label}
              active={activeIndex === index}
              onPress={() => goToPage(index)}
              label={label}
              isDark={isDark}
            />
          ))}
        </View>

        <View className="flex-1">
          {TAB_VIEWS.map((TabView, index) =>
            visited.has(index) ? (
              <View
                key={index}
                style={{ flex: 1, display: activeIndex === index ? "flex" : "none" }}
              >
                <TabView />
              </View>
            ) : null,
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

// Active styling driven by `style` (not a toggling className) — NativeWind v4's
// cssInterop throws "navigation context" if a className string changes on a
// re-render inside a navigation screen. Static className + style avoids it.
function TabButton({
  active,
  onPress,
  label,
  isDark,
}: {
  active: boolean;
  onPress: () => void;
  label: TabLabel;
  isDark: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="flex-1 items-center justify-center rounded-xl"
      style={{
        paddingVertical: 9,
        backgroundColor: active ? (isDark ? "#1A1614" : "#FFFFFF") : "transparent",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: active ? 0.06 : 0,
        shadowRadius: 2,
        elevation: active ? 1 : 0,
      }}
    >
      <Text
        className="text-[13px] font-sans"
        style={{
          fontWeight: active ? "600" : "500",
          color: active
            ? isDark ? "#F5F0E8" : "#2D2926"
            : isDark ? "#8C8078" : "#9C948A",
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
