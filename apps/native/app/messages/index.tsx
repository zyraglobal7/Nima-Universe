import { useEffect } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Text } from "@/components/ui/Text";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ChevronLeft, MessageCircle, Sparkles } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import type { Id } from "@/convex/_generated/dataModel";

type Conversation = {
  otherUser: {
    _id: Id<"users">;
    firstName?: string;
    lastName?: string;
    username?: string;
    profileImageUrl?: string;
  };
  lastMessage: {
    lookId: Id<"looks">;
    lookPublicId: string;
    createdAt: number;
    isRead: boolean;
    sentByMe: boolean;
  } | null;
  unreadCount: number;
};

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function getDisplayName(user: Conversation["otherUser"]): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  if (user.firstName) return user.firstName;
  if (user.username) return user.username;
  return "User";
}

function getInitials(user: Conversation["otherUser"]): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  }
  if (user.firstName) return user.firstName[0].toUpperCase();
  if (user.username) return user.username[0].toUpperCase();
  return "U";
}

export default function MessagesScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const conversations = useQuery(api.directMessages.queries.getConversations);
  const isLoading = conversations === undefined;

  const renderConversation = ({
    item,
    index,
  }: {
    item: Conversation;
    index: number;
  }) => {
    const hasUnread = item.unreadCount > 0;
    const displayName = getDisplayName(item.otherUser);
    const initials = getInitials(item.otherUser);

    return (
      <Animated.View entering={FadeInDown.delay(index * 60).duration(350)}>
        <TouchableOpacity
          onPress={() => router.push(`/messages/${item.otherUser._id}` as any)}
          activeOpacity={0.7}
          className={`flex-row items-center px-4 py-3.5 ${
            hasUnread
              ? "bg-primary/5 dark:bg-primary-dark/5"
              : ""
          }`}
        >
          {/* Avatar */}
          <View className="w-12 h-12 rounded-full bg-surface-alt dark:bg-surface-alt-dark items-center justify-center overflow-hidden mr-3">
            {item.otherUser.profileImageUrl ? (
              <Image
                source={{ uri: item.otherUser.profileImageUrl }}
                style={{ width: 48, height: 48 }}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <Text className="text-base font-semibold text-secondary dark:text-secondary-dark">
                {initials}
              </Text>
            )}
          </View>

          {/* Content */}
          <View className="flex-1 mr-3">
            <Text
              className={`text-base text-foreground dark:text-foreground-dark ${
                hasUnread ? "font-semibold" : "font-medium"
              }`}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            <Text
              className={`text-sm mt-0.5 ${
                hasUnread
                  ? "text-foreground dark:text-foreground-dark font-medium"
                  : "text-muted-foreground dark:text-muted-dark-foreground"
              }`}
              numberOfLines={1}
            >
              {item.lastMessage
                ? item.lastMessage.sentByMe
                  ? "You shared a look"
                  : "Shared a look with you"
                : "No messages yet"}
            </Text>
          </View>

          {/* Right side: time + badge */}
          <View className="items-end gap-1.5">
            {item.lastMessage && (
              <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground">
                {formatTimeAgo(item.lastMessage.createdAt)}
              </Text>
            )}
            {hasUnread && (
              <View className="min-w-[20px] h-5 rounded-full bg-primary dark:bg-primary-dark items-center justify-center px-1.5">
                <Text className="text-[11px] font-bold text-primary-foreground dark:text-primary-dark-foreground">
                  {item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderSeparator = () => (
    <View className="h-px bg-border/30 dark:bg-border-dark/30 ml-[76px]" />
  );

  const renderEmpty = () => (
    <View className="flex-1 items-center justify-center px-8 py-20">
      <View className="w-16 h-16 rounded-full bg-surface-alt dark:bg-surface-alt-dark items-center justify-center mb-5">
        <MessageCircle size={28} color={isDark ? "#706B63" : "#9C948A"} />
      </View>
      <Text className="text-lg font-medium text-foreground dark:text-foreground-dark text-center">
        No messages yet
      </Text>
      <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground text-center mt-2 leading-5">
        When you share looks with friends, your conversations will appear here.
      </Text>
    </View>
  );

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      {/* Header */}
      <View
        style={{ paddingTop: insets.top }}
        className="bg-background dark:bg-background-dark border-b border-border/30 dark:border-border-dark/30"
      >
        <View className="flex-row items-center px-4 py-3">
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            className="w-9 h-9 rounded-full items-center justify-center mr-3"
          >
            <ChevronLeft size={22} color={isDark ? "#E0D8CC" : "#2D2926"} />
          </TouchableOpacity>
          <Text className="text-xl font-serif font-semibold text-foreground dark:text-foreground-dark flex-1">
            Messages
          </Text>
        </View>
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
          data={conversations}
          keyExtractor={(item) => item.otherUser._id}
          renderItem={renderConversation}
          ItemSeparatorComponent={renderSeparator}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: insets.bottom + 20,
          }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
