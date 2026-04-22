import React, { useState } from "react";
import { View, Text, Switch, TouchableOpacity, ScrollView } from "react-native";
import { useTheme } from "@/lib/contexts/ThemeContext";
import {
  Moon,
  Sun,
  Trash2,
  ChevronRight,
  Mail,
  Lock,
  LogOut,
  ShoppingBag,
} from "lucide-react-native";
import { router } from "expo-router";
import { callLogout } from "@/lib/auth";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { CreditsModal } from "@/components/credits/CreditsModal";

const isExpoGo = Constants.executionEnvironment === "storeClient";

export function SettingsTab() {
  const { isDark, setTheme } = useTheme();
  const [creditsModalVisible, setCreditsModalVisible] = useState(false);
  const currentUser = useQuery(api.users.queries.getCurrentUser);
  const removePushToken = useMutation(api.notifications.mutations.removePushToken);

  const toggleTheme = () => setTheme(isDark ? "light" : "dark");

  const handleSignOut = async () => {
    // Remove push token from Convex so user stops receiving notifications
    if (!isExpoGo) {
      try {
        const Notifications = require("expo-notifications");
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId,
        });
        await removePushToken({ token: tokenData.data });
      } catch {
        // Non-critical — proceed with logout even if token removal fails
      }
    }

    await callLogout();

    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    } else {
      router.replace("/");
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-background-dark"
      showsVerticalScrollIndicator={false}
    >
      {/* Settings Sections */}
      <View className="gap-6 pb-20">
        {/* Appearance */}
        <View>
          <Text className="text-lg font-serif font-medium text-foreground dark:text-foreground-dark mb-3">
            Appearance
          </Text>
          <View className="bg-surface dark:bg-surface-dark rounded-xl overflow-hidden border border-border dark:border-border-dark">
            <View className="flex-row items-center justify-between p-4">
              <View className="flex-row items-center gap-3">
                {isDark ? (
                  <Moon size={20} color={isDark ? "#F5F0E8" : "#2D2926"} />
                ) : (
                  <Sun size={20} color={isDark ? "#F5F0E8" : "#2D2926"} />
                )}
                <Text className="text-base text-foreground dark:text-foreground-dark font-sans">
                  Dark Mode
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: "#E0D8CC", true: "#C9A07A" }}
                thumbColor={isDark ? "#1A1614" : "#f4f3f4"}
              />
            </View>
          </View>
        </View>

        {/* Your Activity */}
        <View>
          <Text className="text-lg font-serif font-medium text-foreground dark:text-foreground-dark mb-3">
            Your Activity
          </Text>
          <View className="bg-surface dark:bg-surface-dark rounded-xl overflow-hidden border border-border dark:border-border-dark divide-y divide-border dark:divide-border-dark">
            <TouchableOpacity
              onPress={() => router.push("/profile/discarded-looks")}
              className="flex-row items-center justify-between p-4"
            >
              <View className="flex-row items-center gap-3 flex-1">
                <Trash2 size={24} color={isDark ? "#F5F0E8" : "#2D2926"} />
                <View>
                  <Text className="text-base font-medium text-foreground dark:text-foreground-dark font-serif">
                    Discarded Looks
                  </Text>
                  <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground font-sans">
                    View and restore discarded looks
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color={isDark ? "#8C8078" : "#9C948A"} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/orders")}
              className="flex-row items-center justify-between p-4"
            >
              <View className="flex-row items-center gap-3 flex-1">
                <ShoppingBag size={24} color={isDark ? "#F5F0E8" : "#2D2926"} />
                <View>
                  <Text className="text-base font-medium text-foreground dark:text-foreground-dark font-serif">
                    My Orders
                  </Text>
                  <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground font-sans">
                    Track and manage your purchases
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color={isDark ? "#8C8078" : "#9C948A"} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Settings */}
        <View>
          <Text className="text-lg font-serif font-medium text-foreground dark:text-foreground-dark mb-3">
            Account Settings
          </Text>
          <View className="bg-surface dark:bg-surface-dark rounded-xl overflow-hidden border border-border dark:border-border-dark divide-y divide-border dark:divide-border-dark">
            <TouchableOpacity className="flex-row items-center justify-between p-4">
              <View className="flex-row items-center gap-3 flex-1">
                <Mail size={24} color={isDark ? "#F5F0E8" : "#2D2926"} />
                <View>
                  <Text className="text-base font-medium text-foreground dark:text-foreground-dark font-serif">
                    Change Email
                  </Text>
                  <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground font-sans">
                    {currentUser?.email || "No email set"}
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color={isDark ? "#8C8078" : "#9C948A"} />
            </TouchableOpacity>

            <TouchableOpacity className="flex-row items-center justify-between p-4">
              <View className="flex-row items-center gap-3 flex-1">
                <Lock size={24} color={isDark ? "#F5F0E8" : "#2D2926"} />
                <View>
                  <Text className="text-base font-medium text-foreground dark:text-foreground-dark font-serif">
                    Change Password
                  </Text>
                  <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground font-sans">
                    Managed via Google Account
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color={isDark ? "#8C8078" : "#9C948A"} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSignOut}
              className="flex-row items-center justify-between p-4"
            >
              <View className="flex-row items-center gap-3 flex-1">
                <LogOut size={24} color={isDark ? "#D4807A" : "#B85C5C"} />
                <View>
                  <Text className="text-base font-medium text-destructive dark:text-destructive-dark font-serif">
                    Log Out
                  </Text>
                  <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground font-sans">
                    Sign out of your account
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color={isDark ? "#8C8078" : "#9C948A"} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Limits / Usage */}
        <View className="bg-surface dark:bg-surface-dark p-4 rounded-xl border border-border dark:border-border-dark">
          <Text className="text-base font-medium text-foreground dark:text-foreground-dark mb-2 font-serif">
            Daily Try-Ons
          </Text>
          <View className="h-2 bg-surface-alt dark:bg-surface-alt-dark rounded-full overflow-hidden mb-2">
            <View
              style={{
                width: `${Math.min(((currentUser?.dailyTryOnCount || 0) / (currentUser?.subscriptionTier === "free" ? 5 : 100)) * 100, 100)}%`,
              }}
              className="h-full bg-primary dark:bg-primary-dark"
            />
          </View>
          <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground font-sans">
            {currentUser?.dailyTryOnCount || 0} /{" "}
            {currentUser?.subscriptionTier === "free" ? 5 : "Unlimited"} used
            today
          </Text>
          {currentUser?.subscriptionTier === "free" && (
            <TouchableOpacity
              onPress={() => setCreditsModalVisible(true)}
              className="mt-3 py-2 bg-background dark:bg-background-dark border border-primary dark:border-primary-dark rounded-lg items-center"
            >
              <Text className="text-primary dark:text-primary-dark font-medium font-sans">
                Upgrade to Style Pass
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <CreditsModal
        visible={creditsModalVisible}
        onClose={() => setCreditsModalVisible(false)}
      />
    </ScrollView>
  );
}
