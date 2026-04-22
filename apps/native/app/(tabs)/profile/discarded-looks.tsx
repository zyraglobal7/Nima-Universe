import React, { useState } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Text } from "@/components/ui/Text";
import { DiscardedLookCard } from "@/components/profile/DiscardedLookCard";
import { ArrowLeft, Trash2 } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/contexts/ThemeContext";

import Toast from "react-native-toast-message";

export default function DiscardedLooksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  const discardedLooks = useQuery(api.looks.queries.getDiscardedLooks, {
    limit: 50,
  });
  const restoreLook = useMutation(api.looks.mutations.restoreLook);

  const [restoringLookId, setRestoringLookId] = useState<Id<"looks"> | null>(
    null,
  );

  const iconColor = isDark ? "#C9A07A" : "#5C2A33";
  const mutedColor = isDark ? "#8C8078" : "#9C948A";

  const handleRestore = async (lookId: Id<"looks">) => {
    setRestoringLookId(lookId);
    try {
      const result = await restoreLook({ lookId });
      if (result.success) {
        Toast.show({
          type: "success",
          text1: "Look restored",
          text2: "Look restored to your lookbooks!",
        });
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: result.error || "Failed to restore look",
        });
      }
    } catch (error) {
      console.log("Restore error", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to restore look",
      });
    } finally {
      setRestoringLookId(null);
    }
  };

  const renderHeader = () => (
    <View
      style={{ paddingTop: insets.top }}
      className="bg-background/95 dark:bg-background-dark/95 border-b border-border dark:border-border-dark z-10"
    >
      <View className="px-4 py-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 -ml-2 rounded-full active:bg-surface-alt dark:active:bg-surface-alt-dark"
          >
            <ArrowLeft
              size={24}
              color={isDark ? "#F5EFE8" : "#2D2926"}
            />
          </TouchableOpacity>
          <Text className="text-lg font-serif font-medium text-foreground dark:text-foreground-dark">
            Discarded Looks
          </Text>
        </View>
        <Trash2 size={24} color={mutedColor} />
      </View>
    </View>
  );

  if (discardedLooks === undefined) {
    return (
      <View className="flex-1 bg-background dark:bg-background-dark">
        {renderHeader()}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={iconColor} />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <Stack.Screen options={{ headerShown: false }} />
      {renderHeader()}

      {discardedLooks.length === 0 ? (
        <View className="flex-1 items-center justify-center p-8">
          <View className="w-20 h-20 rounded-full bg-surface-alt dark:bg-surface-alt-dark items-center justify-center mb-6">
            <Trash2
              size={40}
              color={mutedColor}
            />
          </View>
          <Text className="text-xl font-medium text-foreground dark:text-foreground-dark mb-2">
            No Discarded Looks
          </Text>
          <Text className="text-center text-muted-foreground dark:text-muted-dark-foreground mb-8">
            When you discard a look, it will appear here. You can restore it
            back to your lookbooks anytime.
          </Text>
        </View>
      ) : (
        <FlatList
          data={discardedLooks}
          keyExtractor={(item) => item.look._id}
          renderItem={({ item }) => (
            <View style={{ flex: 1, padding: 4 }}>
              <DiscardedLookCard
                lookData={item}
                onRestore={handleRestore}
                isRestoring={restoringLookId === item.look._id}
              />
            </View>
          )}
          numColumns={2}
          contentContainerStyle={{ padding: 12 }}
        />
      )}
    </View>
  );
}
