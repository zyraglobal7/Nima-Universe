import { useEffect, useMemo } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Sparkles, ChevronLeft } from "lucide-react-native";
import { ModerationMenu } from "@/components/moderation/ModerationMenu";
import Animated, { FadeInUp } from "react-native-reanimated";
import type { Id } from "@/convex/_generated/dataModel";

type MessageItem = {
  _id: Id<"direct_messages">;
  lookId: Id<"looks">;
  lookPublicId: string;
  lookName?: string;
  lookImageUrl: string | null;
  sentByMe: boolean;
  createdAt: number;
  isRead: boolean;
};

type ListItem =
  | { type: "message"; data: MessageItem }
  | { type: "dateSeparator"; label: string; key: string };

function formatMessageTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDateLabel(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";
  return date.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function MessageDetailScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const otherUserId = userId as Id<"users">;

  const messages = useQuery(
    api.directMessages.queries.getConversationMessages,
    otherUserId ? { otherUserId } : "skip",
  );

  const markAsRead = useMutation(
    api.directMessages.mutations.markConversationAsRead,
  );

  // Mark as read when opening conversation
  useEffect(() => {
    if (
      otherUserId &&
      messages &&
      messages.some((m: { isRead: boolean; sentByMe: boolean }) => !m.isRead && !m.sentByMe)
    ) {
      markAsRead({ otherUserId }).catch(() => {
        // Ignore errors
      });
    }
  }, [otherUserId, messages]);

  // Build inverted list with date separators
  // Query returns oldest-first; we need newest-first for inverted FlatList
  const invertedData: ListItem[] = useMemo(() => {
    if (!messages || messages.length === 0) return [];

    // Messages are oldest-first from query. Reverse for inverted list.
    const reversed = [...messages].reverse();

    const items: ListItem[] = [];
    let lastDateLabel: string | null = null;

    // Since the list is inverted, we iterate newest-first.
    // Date separators should appear AFTER (visually ABOVE) the last message of that day.
    // In inverted list, items render bottom-to-top, so we insert separator after a day group ends.
    for (let i = 0; i < reversed.length; i++) {
      const msg = reversed[i];
      const dateLabel = getDateLabel(msg.createdAt);

      items.push({ type: "message", data: msg });

      // Check if next message (older) has a different date
      const nextMsg = reversed[i + 1];
      const nextDateLabel = nextMsg ? getDateLabel(nextMsg.createdAt) : null;

      if (dateLabel !== nextDateLabel) {
        // Insert date separator above this group (in inverted = after in array)
        items.push({
          type: "dateSeparator",
          label: dateLabel,
          key: `sep-${dateLabel}-${msg._id}`,
        });
      }
    }

    return items;
  }, [messages]);

  const isLoading = messages === undefined;

  const handleLookPress = (lookPublicId: string) => {
    router.push(`/look/${lookPublicId}` as any);
  };

  const renderItem = ({ item, index }: { item: ListItem; index: number }) => {
    if (item.type === "dateSeparator") {
      return (
        <View className="items-center py-3">
          <Text
            className="text-xs text-muted-foreground dark:text-muted-dark-foreground px-3 py-1"
          >
            {item.label}
          </Text>
        </View>
      );
    }

    const msg = item.data;
    const isMine = msg.sentByMe;

    return (
      <Animated.View
        entering={FadeInUp.delay(Math.min(index, 5) * 30).duration(250)}
        className={`px-4 mb-3 ${isMine ? "items-end" : "items-start"}`}
      >
        {/* Shared look card */}
        <TouchableOpacity
          onPress={() => handleLookPress(msg.lookPublicId)}
          activeOpacity={0.8}
          style={{
            maxWidth: 240,
            borderRadius: 18,
            overflow: "hidden",
            backgroundColor: isMine
              ? isDark ? "rgba(201,160,122,0.12)" : "rgba(166,124,82,0.08)"
              : isDark ? "#252220" : "#F5F0E8",
            borderWidth: 1,
            borderColor: isMine
              ? isDark ? "rgba(201,160,122,0.2)" : "rgba(166,124,82,0.15)"
              : isDark ? "rgba(61,56,53,0.5)" : "rgba(224,216,204,0.6)",
          }}
        >
          {/* Look image */}
          {msg.lookImageUrl ? (
            <View style={{ width: "100%", aspectRatio: 4 / 5 }}>
              <Image
                source={{ uri: msg.lookImageUrl }}
                style={{ width: "100%", height: "100%", borderTopLeftRadius: 17, borderTopRightRadius: 17 }}
                contentFit="cover"
                transition={200}
              />
            </View>
          ) : (
            <View
              style={{ width: "100%", aspectRatio: 4 / 5 }}
              className="bg-surface-alt dark:bg-surface-alt-dark items-center justify-center"
            >
              <Sparkles
                size={24}
                color={isDark ? "#706B63" : "#9C948A"}
              />
              <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground mt-2">
                Look image
              </Text>
            </View>
          )}

          {/* Look info */}
          <View className="px-3 py-2.5">
            <Text
              className="text-sm font-medium text-foreground dark:text-foreground-dark"
              numberOfLines={1}
            >
              {msg.lookName || "Shared Look"}
            </Text>
            <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground mt-0.5">
              {isMine ? "You shared this look" : "Shared a look with you"}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Time */}
        <Text className="text-[10px] text-muted-foreground dark:text-muted-dark-foreground mt-1 px-1">
          {formatMessageTime(msg.createdAt)}
        </Text>
      </Animated.View>
    );
  };

  const renderEmpty = () => (
    <View
      style={{ transform: [{ scaleY: -1 }] }}
      className="flex-1 items-center justify-center px-8 py-20"
    >
      <Sparkles size={28} color={isDark ? "#706B63" : "#9C948A"} />
      <Text className="text-base font-medium text-foreground dark:text-foreground-dark mt-4 text-center">
        No shared looks yet
      </Text>
      <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground text-center mt-2 leading-5">
        Looks shared between you will appear here.
      </Text>
    </View>
  );

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      {/* Header */}
      <View
        style={{ paddingTop: insets.top + 10 }}
        className="flex-row items-center justify-between px-4 pb-3 border-b border-border dark:border-border-dark"
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-background dark:bg-background-dark border border-border/50 dark:border-border-dark/50 items-center justify-center"
        >
          <ChevronLeft size={22} color={isDark ? "#E8E2DA" : "#2D2926"} />
        </TouchableOpacity>

        {otherUserId && (
          <ModerationMenu
            targetUserId={otherUserId}
            color={isDark ? "#8C8078" : "#9C948A"}
            onBlocked={() => router.back()}
          />
        )}
      </View>

      {/* Content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator
            size="large"
            color={isDark ? "#C9A07A" : "#A67C52"}
          />
        </View>
      ) : (
        <FlatList
          data={invertedData}
          inverted
          keyExtractor={(item) =>
            item.type === "dateSeparator" ? item.key : item.data._id
          }
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.bottom + 20,
            paddingBottom: 16,
          }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
