import { useEffect, useCallback } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Image } from "expo-image";
import {
  Heart,
  Bookmark,
  Sparkles,
  ThumbsDown,
  Bell,
} from "lucide-react-native";
import { formatRelativeTime } from "@/lib/utils/format";

type InteractionType = "love" | "dislike" | "save" | "recreate";

interface ActivityItem {
  _id: Id<"look_interactions">;
  interactionType: InteractionType;
  createdAt: number;
  seenByOwner: boolean;
  look: {
    _id: Id<"looks">;
    publicId: string;
    occasion?: string;
  };
  user: {
    _id: Id<"users">;
    firstName?: string;
    username?: string;
    profileImageUrl?: string;
  };
}

function getInteractionIcon(type: InteractionType, isDark: boolean) {
  const size = 16;
  switch (type) {
    case "love":
      return <Heart size={size} color="#EF4444" fill="#EF4444" />;
    case "save":
      return <Bookmark size={size} color={isDark ? "#C9A07A" : "#A67C52"} fill={isDark ? "#C9A07A" : "#A67C52"} />;
    case "recreate":
      return <Sparkles size={size} color={isDark ? "#C9A07A" : "#A67C52"} />;
    case "dislike":
      return <ThumbsDown size={size} color={isDark ? "#9C948A" : "#706B63"} />;
    default:
      return <Heart size={size} color={isDark ? "#9C948A" : "#706B63"} />;
  }
}

function getInteractionLabel(type: InteractionType): string {
  switch (type) {
    case "love":
      return "loved your look";
    case "save":
      return "saved your look";
    case "recreate":
      return "recreated your look";
    case "dislike":
      return "passed on your look";
    default:
      return "interacted with your look";
  }
}

export default function ActivityScreen() {
  const router = useRouter();
  const { isDark } = useTheme();

  const activity = useQuery(
    api.lookInteractions.queries.getActivityNotifications,
    { limit: 50 },
  );
  const markAsSeen = useMutation(
    api.lookInteractions.mutations.markActivityAsSeen,
  );

  // Mark all unseen notifications as seen when the page loads
  useEffect(() => {
    if (!activity || activity.length === 0) return;
    const unseenIds = activity
      .filter((item: ActivityItem) => !item.seenByOwner)
      .map((item: ActivityItem) => item._id);
    if (unseenIds.length > 0) {
      markAsSeen({ interactionIds: unseenIds }).catch(() => {
        // silently ignore
      });
    }
  }, [activity, markAsSeen]);

  const handlePressItem = useCallback(
    (lookPublicId: string) => {
      router.push(`/look/${lookPublicId}`);
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: ActivityItem }) => {
      const displayName =
        item.user.firstName || item.user.username || "Someone";

      return (
        <TouchableOpacity
          onPress={() => handlePressItem(item.look.publicId)}
          activeOpacity={0.7}
          className="flex-row items-center px-4 py-3"
          style={{
            backgroundColor: !item.seenByOwner
              ? isDark
                ? "rgba(201, 160, 122, 0.08)"
                : "rgba(166, 124, 82, 0.06)"
              : "transparent",
          }}
        >
          {/* Avatar */}
          <View className="mr-3">
            {item.user.profileImageUrl ? (
              <Image
                source={{ uri: item.user.profileImageUrl }}
                style={{ width: 44, height: 44, borderRadius: 22 }}
                contentFit="cover"
              />
            ) : (
              <View
                className="items-center justify-center"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: isDark ? "#302B28" : "#EDE6DC",
                }}
              >
                <Text className="text-base font-semibold text-foreground dark:text-foreground-dark">
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            {/* Interaction type badge */}
            <View
              style={{
                position: "absolute",
                bottom: -2,
                right: -2,
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: isDark ? "#1A1614" : "#FAF8F5",
                borderWidth: 2,
                borderColor: isDark ? "#1A1614" : "#FAF8F5",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {getInteractionIcon(item.interactionType, isDark)}
            </View>
          </View>

          {/* Content */}
          <View className="flex-1 mr-3">
            <Text className="text-sm text-foreground dark:text-foreground-dark leading-5">
              <Text className="font-semibold">{displayName}</Text>{" "}
              {getInteractionLabel(item.interactionType)}
            </Text>
            {item.look.occasion && (
              <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground mt-0.5">
                {item.look.occasion}
              </Text>
            )}
          </View>

          {/* Timestamp */}
          <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground">
            {formatRelativeTime(item.createdAt)}
          </Text>

          {/* Unseen dot */}
          {!item.seenByOwner && (
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: isDark ? "#C9A07A" : "#A67C52",
                marginLeft: 8,
              }}
            />
          )}
        </TouchableOpacity>
      );
    },
    [isDark, handlePressItem],
  );

  // Loading
  if (activity === undefined) {
    return (
      <SafeAreaView
        edges={[]}
        className="flex-1 bg-background dark:bg-background-dark items-center justify-center"
      >
        <ActivityIndicator
          size="large"
          color={isDark ? "#C9A07A" : "#A67C52"}
        />
      </SafeAreaView>
    );
  }

  // Empty state
  if (activity.length === 0) {
    return (
      <SafeAreaView
        edges={[]}
        className="flex-1 bg-background dark:bg-background-dark items-center justify-center px-8"
      >
        <View
          className="items-center justify-center mb-4"
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: isDark ? "#302B28" : "#EDE6DC",
          }}
        >
          <Bell size={32} color={isDark ? "#706B63" : "#9C948A"} />
        </View>
        <Text className="text-xl font-semibold text-foreground dark:text-foreground-dark mb-2">
          No activity yet
        </Text>
        <Text className="text-center text-muted-foreground dark:text-muted-dark-foreground leading-5">
          When people interact with your looks, you'll see their activity here.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <FlatList
        data={activity}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => (
          <View
            style={{
              height: 1,
              backgroundColor: isDark ? "#2A2522" : "#EDE6DC",
              marginLeft: 64,
            }}
          />
        )}
      />
    </View>
  );
}
