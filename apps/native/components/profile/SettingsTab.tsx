import React, { useState } from "react";
import { View, Text, Switch, TouchableOpacity, ScrollView, Alert, Platform } from "react-native";
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
  type LucideIcon,
} from "lucide-react-native";
import { router } from "expo-router";
import { callLogout } from "@/lib/auth";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import Constants from "expo-constants";
import { CreditsModal } from "@/components/credits/CreditsModal";

const isExpoGo = Constants.executionEnvironment === "storeClient";

export function SettingsTab() {
  const { isDark, setTheme } = useTheme();
  const [creditsModalVisible, setCreditsModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const currentUser = useQuery(api.users.queries.getCurrentUser);
  const removePushToken = useMutation(api.notifications.mutations.removePushToken);
  const deleteMyAccount = useAction(api.users.actions.deleteMyAccount);

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

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all your data — looks, try-ons, orders, and more. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteMyAccount({});
              await callLogout();
              router.replace("/");
            } catch {
              Alert.alert("Error", "Could not delete your account. Please try again.");
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-background-dark"
      showsVerticalScrollIndicator={false}
    >
      {/* Settings Sections */}
      <View style={{ gap: 28 }} className="pb-20">
        {/* Appearance */}
        <View>
          <SectionLabel>Appearance</SectionLabel>
          <View className="bg-surface dark:bg-surface-dark rounded-2xl overflow-hidden border border-border dark:border-border-dark">
            <View className="flex-row items-center justify-between px-4 py-3">
              <View className="flex-row items-center" style={{ gap: 12 }}>
                <IconTile isDark={isDark} variant="accent">
                  {isDark ? (
                    <Moon size={18} color={isDark ? "#C9A07A" : "#5C2A33"} />
                  ) : (
                    <Sun size={18} color={isDark ? "#C9A07A" : "#5C2A33"} />
                  )}
                </IconTile>
                <Text className="text-[15px] font-medium text-foreground dark:text-foreground-dark font-sans">
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
          <SectionLabel>Your Activity</SectionLabel>
          <View className="bg-surface dark:bg-surface-dark rounded-2xl overflow-hidden border border-border dark:border-border-dark divide-y divide-border dark:divide-border-dark">
            <SettingsRow
              isDark={isDark}
              icon={Trash2}
              title="Discarded Looks"
              subtitle="View and restore discarded looks"
              onPress={() => router.push("/discarded-looks")}
            />
            <SettingsRow
              isDark={isDark}
              icon={ShoppingBag}
              title="My Orders"
              subtitle="Track and manage your purchases"
              onPress={() => router.push("/orders")}
            />
          </View>
        </View>

        {/* Account Settings */}
        <View>
          <SectionLabel>Account Settings</SectionLabel>
          <View className="bg-surface dark:bg-surface-dark rounded-2xl overflow-hidden border border-border dark:border-border-dark divide-y divide-border dark:divide-border-dark">
            <SettingsRow
              isDark={isDark}
              icon={Mail}
              title="Change Email"
              subtitle={currentUser?.email || "No email set"}
            />
            <SettingsRow
              isDark={isDark}
              icon={Lock}
              title="Change Password"
              subtitle="Managed via Google Account"
            />
            <SettingsRow
              isDark={isDark}
              icon={LogOut}
              title="Log Out"
              subtitle="Sign out of your account"
              variant="destructive"
              onPress={handleSignOut}
            />
            <SettingsRow
              isDark={isDark}
              icon={Trash2}
              title={isDeleting ? "Deleting…" : "Delete Account"}
              subtitle="Permanently remove your account"
              variant="destructive"
              onPress={handleDeleteAccount}
              disabled={isDeleting}
            />
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
          {currentUser?.subscriptionTier === "free" && Platform.OS !== "ios" && (
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

/* ─── Settings primitives ─────────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      className="text-xs font-semibold uppercase text-muted-foreground dark:text-muted-dark-foreground font-sans mb-2.5 ml-1"
      style={{ letterSpacing: 0.6 }}
    >
      {children}
    </Text>
  );
}

function IconTile({
  isDark,
  variant = "default",
  children,
}: {
  isDark: boolean;
  variant?: "default" | "accent" | "destructive";
  children: React.ReactNode;
}) {
  const bg =
    variant === "destructive"
      ? isDark ? "rgba(212,128,122,0.14)" : "rgba(184,92,92,0.10)"
      : variant === "accent"
        ? isDark ? "rgba(201,160,122,0.16)" : "rgba(92,42,51,0.08)"
        : isDark ? "#302B28" : "#EDE6DC";
  return (
    <View
      style={{
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: bg,
      }}
    >
      {children}
    </View>
  );
}

function SettingsRow({
  isDark,
  icon: Icon,
  title,
  subtitle,
  onPress,
  variant = "default",
  disabled,
}: {
  isDark: boolean;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  onPress?: () => void;
  variant?: "default" | "destructive";
  disabled?: boolean;
}) {
  const destructive = variant === "destructive";
  const iconColor = destructive
    ? isDark ? "#D4807A" : "#B85C5C"
    : isDark ? "#8C8078" : "#9C948A";
  const titleColor = destructive
    ? isDark ? "#D4807A" : "#B85C5C"
    : isDark ? "#F5F0E8" : "#2D2926";

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || !onPress}
      activeOpacity={0.6}
      className="flex-row items-center justify-between px-4 py-3"
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <View className="flex-row items-center flex-1" style={{ gap: 12 }}>
        <IconTile isDark={isDark} variant={destructive ? "destructive" : "default"}>
          <Icon size={18} color={iconColor} />
        </IconTile>
        <View className="flex-1">
          <Text className="text-[15px] font-medium font-sans" style={{ color: titleColor }}>
            {title}
          </Text>
          <Text
            className="text-[13px] font-sans mt-0.5"
            numberOfLines={1}
            style={{ color: isDark ? "#8C8078" : "#9C948A" }}
          >
            {subtitle}
          </Text>
        </View>
      </View>
      <ChevronRight size={18} color={isDark ? "#5C554F" : "#C4BDB3"} />
    </TouchableOpacity>
  );
}
