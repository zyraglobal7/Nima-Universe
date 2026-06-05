import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { Camera, User, Zap } from "lucide-react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCredits } from "@/lib/hooks/useCredits";
import { CreditsModal } from "@/components/credits/CreditsModal";
import { useTheme } from "@/lib/contexts/ThemeContext";

interface ProfileHeaderProps {
  onEdit: () => void;
}

export function ProfileHeader({ onEdit }: ProfileHeaderProps) {
  const currentUser = useQuery(api.users.queries.getCurrentUser);
  const { total, freeRemaining, freePerWeek, isLow } = useCredits();
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const { isDark } = useTheme();

  if (!currentUser) return null;

  return (
    <>
      <View className="flex-row items-center gap-4 mb-4">
        <View className="relative">
          <View className="w-20 h-20 rounded-full bg-surface dark:bg-surface-dark overflow-hidden items-center justify-center">
            {currentUser.profileImageUrl ? (
              <Image
                source={{ uri: currentUser.profileImageUrl }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
            ) : (
              <User size={40} color={isDark ? "#8C8078" : "#9CA3AF"} />
            )}
          </View>
          <TouchableOpacity
            onPress={onEdit}
            className="absolute bottom-0 right-0 w-7 h-7 bg-background dark:bg-surface-dark border border-border dark:border-border-dark rounded-full items-center justify-center shadow-sm"
          >
            <Camera size={14} color={isDark ? "#C4B8A8" : "#6B7280"} />
          </TouchableOpacity>
        </View>

        <View className="flex-1">
          <Text className="text-2xl font-serif text-foreground dark:text-foreground-dark">
            {currentUser.firstName || currentUser.email?.split("@")[0] || "User"}
            {currentUser.lastName ? ` ${currentUser.lastName}` : ""}
          </Text>
          <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground">
            {currentUser.email}
          </Text>
          <View className="flex-row items-center gap-2 mt-2">
            {/* <View className="bg-secondary dark:bg-secondary-dark self-start px-3 py-1 rounded-full">
              <Text className="text-xs text-white dark:text-secondary-dark-foreground font-medium capitalize">
                {currentUser.subscriptionTier === "style_pass"
                  ? "Style Pass"
                  : currentUser.subscriptionTier === "vip"
                    ? "VIP"
                    : "Free Plan"}
              </Text>
            </View> */}
            {/* Credits Badge */}
            <TouchableOpacity
              onPress={() => setShowCreditsModal(true)}
              className="flex-row items-center gap-1 px-3 py-1 rounded-full"
              style={{
                backgroundColor: isLow
                  ? (isDark ? "#3B1C1C" : "#FEF2F2")
                  : (isDark ? "#1C3B2A" : "#F0FDF4"),
                borderWidth: 1,
                borderColor: isLow
                  ? (isDark ? "#7F1D1D" : "#FECACA")
                  : (isDark ? "#14532D" : "#BBF7D0"),
              }}
            >
              <Zap size={12} color={isLow ? "#EF4444" : "#22C55E"} />
              <Text
                className="text-xs font-semibold"
                style={{ color: isLow ? "#EF4444" : "#22C55E" }}
              >
                {total}
              </Text>
              <Text
                className="text-[10px]"
                style={{ color: isLow ? "#F87171" : "#4ADE80" }}
              >
                credits
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <CreditsModal
        visible={showCreditsModal}
        onClose={() => setShowCreditsModal(false)}
      />
    </>
  );
}
