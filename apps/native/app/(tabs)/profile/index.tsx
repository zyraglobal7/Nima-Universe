import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { SettingsTab } from "@/components/profile/SettingsTab";
import { PhotosTab } from "@/components/profile/PhotosTab";
import { StyleFitTab } from "@/components/profile/StyleFitTab";
import { AccountTab } from "@/components/profile/AccountTab";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";

const TABS = ["Settings", "Photos", "Style & Fit", "Account"] as const;
type TabLabel = (typeof TABS)[number];

export default function ProfileScreen() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const [activeIndex, setActiveIndex] = useState(0);
  const currentUser = useQuery(api.users.queries.getCurrentUser);

  const goToPage = useCallback((index: number) => {
    setActiveIndex(index);
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
        <ProfileHeader onEdit={() => goToPage(3)} />

        {/* Tab bar */}
        <View className="flex-row bg-surface dark:bg-surface-dark p-1 rounded-xl mb-6">
          {TABS.map((label, index) => (
            <TabButton
              key={label}
              active={activeIndex === index}
              onPress={() => goToPage(index)}
              label={label}
            />
          ))}
        </View>

        {/* Tab content */}
        <View className="flex-1">
          {activeIndex === 0 && <SettingsTab />}
          {activeIndex === 1 && <PhotosTab />}
          {activeIndex === 2 && <StyleFitTab />}
          {activeIndex === 3 && <AccountTab />}
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────

function TabButton({
  active,
  onPress,
  label,
}: {
  active: boolean;
  onPress: () => void;
  label: TabLabel;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-1 items-center justify-center py-2.5 rounded-lg ${
        active ? "bg-background dark:bg-background-dark shadow-sm" : ""
      }`}
    >
      <Text
        className={`text-sm font-medium ${
          active
            ? "text-foreground dark:text-foreground-dark"
            : "text-muted-foreground dark:text-muted-dark-foreground"
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
