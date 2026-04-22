import { useState } from "react";
import {
  View,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Text } from "@/components/ui/Text";
import { X, MessageCircle, Plus } from "lucide-react-native";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { formatRelativeTime } from "@/lib/mock-chat-data";

interface ChatHistoryDrawerProps {
  visible: boolean;
  onClose: () => void;
  onSelectThread: (threadId: Id<"threads">) => void;
  onNewChat: () => void;
  currentThreadId: Id<"threads"> | null;
}

export function ChatHistoryDrawer({
  visible,
  onClose,
  onSelectThread,
  onNewChat,
  currentThreadId,
}: ChatHistoryDrawerProps) {
  const { isDark } = useTheme();

  const threadsData = useQuery(
    api.threads.queries.listThreadsWithPreview,
    visible ? { limit: 30 } : "skip",
  );

  const isLoading = threadsData === undefined && visible;

  const handleSelectThread = (threadId: Id<"threads">) => {
    onSelectThread(threadId);
    onClose();
  };

  const handleNewChat = () => {
    onNewChat();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        className="flex-1"
        style={{ backgroundColor: isDark ? "#1A1614" : "#FAF8F5" }}
      >
        {/* Header */}
        <View
          className="flex-row items-center justify-between px-4 py-4 border-b"
          style={{ borderBottomColor: isDark ? "#3D3835" : "#E0D8CC" }}
        >
          <Text className="text-lg font-serif text-foreground dark:text-foreground-dark">
            Chat History
          </Text>
          <TouchableOpacity
            onPress={onClose}
            className="w-9 h-9 rounded-full items-center justify-center"
            style={{ backgroundColor: isDark ? "#302B28" : "#EDE6DC" }}
          >
            <X size={20} color={isDark ? "#C4B8A8" : "#6B635B"} />
          </TouchableOpacity>
        </View>

        {/* New Chat button */}
        <TouchableOpacity
          onPress={handleNewChat}
          activeOpacity={0.7}
          className="flex-row items-center gap-3 mx-4 mt-4 mb-2 px-4 py-3 rounded-xl"
          style={{
            backgroundColor: isDark ? "#252220" : "#F5F0E8",
            borderWidth: 1,
            borderColor: isDark ? "#3D3835" : "#E0D8CC",
          }}
        >
          <View
            className="w-8 h-8 rounded-full items-center justify-center"
            style={{ backgroundColor: isDark ? "#C9A07A" : "#A67C52" }}
          >
            <Plus size={16} color="#FAF8F5" />
          </View>
          <Text className="text-base font-medium text-foreground dark:text-foreground-dark">
            New conversation
          </Text>
        </TouchableOpacity>

        {/* Thread list */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#A67C52" />
          </View>
        ) : !threadsData || threadsData.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <MessageCircle
              size={40}
              color={isDark ? "#8C8078" : "#9C948A"}
            />
            <Text className="text-base text-muted-foreground dark:text-muted-dark-foreground mt-4 text-center">
              No conversations yet
            </Text>
            <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground mt-1 text-center">
              Start chatting with Nima to see your history here
            </Text>
          </View>
        ) : (
          <FlatList
            data={threadsData}
            keyExtractor={(item) => item.thread._id}
            contentContainerStyle={{ paddingVertical: 8 }}
            renderItem={({ item }) => {
              const isActive = item.thread._id === currentThreadId;
              const preview = item.lastMessage?.content ?? "No messages yet";
              const truncatedPreview =
                preview.length > 80
                  ? preview.substring(0, 80) + "..."
                  : preview;
              const time = formatRelativeTime(
                new Date(item.thread.lastMessageAt),
              );

              return (
                <Pressable
                  onPress={() => handleSelectThread(item.thread._id)}
                  className="mx-4 mb-1"
                  style={({ pressed }) => ({
                    backgroundColor: isActive
                      ? isDark
                        ? "#302B28"
                        : "#EDE6DC"
                      : pressed
                        ? isDark
                          ? "#252220"
                          : "#F5F0E8"
                        : "transparent",
                    borderRadius: 12,
                    padding: 12,
                  })}
                >
                  <View className="flex-row items-start gap-3">
                    <View
                      className="w-8 h-8 rounded-full items-center justify-center mt-0.5"
                      style={{
                        backgroundColor: isActive
                          ? isDark
                            ? "#C9A07A"
                            : "#A67C52"
                          : isDark
                            ? "#3D3835"
                            : "#E0D8CC",
                      }}
                    >
                      <MessageCircle
                        size={14}
                        color={isActive ? "#FAF8F5" : isDark ? "#8C8078" : "#6B635B"}
                      />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center justify-between mb-1">
                        <Text
                          className="text-sm font-medium text-foreground dark:text-foreground-dark"
                          numberOfLines={1}
                          style={{ flex: 1 }}
                        >
                          {item.thread.title || "Chat"}
                        </Text>
                        <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground ml-2">
                          {time}
                        </Text>
                      </View>
                      <Text
                        className="text-xs text-muted-foreground dark:text-muted-dark-foreground"
                        numberOfLines={2}
                      >
                        {truncatedPreview}
                      </Text>
                      <Text className="text-xs text-muted-foreground/60 dark:text-muted-dark-foreground/60 mt-1">
                        {item.thread.messageCount} message
                        {item.thread.messageCount !== 1 ? "s" : ""}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}

