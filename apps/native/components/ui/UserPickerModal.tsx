import React, { useState, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  Pressable,
  Modal,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Text } from "@/components/ui/Text";
import { Image } from "expo-image";
import {
  X,
  Search,
  Send,
  User as UserIcon,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface UserPickerModalProps {
  visible: boolean;
  onClose: () => void;
  lookId: Id<"looks">;
}

export function UserPickerModal({
  visible,
  onClose,
  lookId,
}: UserPickerModalProps) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSending, setIsSending] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());

  // Search users (only when there is a query)
  const searchResults = useQuery(
    api.users.queries.searchUsers,
    searchQuery.trim().length >= 2
      ? { query: searchQuery.trim(), limit: 15 }
      : "skip",
  );

  // Direct message mutation
  const sendDirectMessage = useMutation(api.directMessages.mutations.sendDirectMessage);

  const handleSendDM = useCallback(
    async (recipientId: Id<"users">, recipientName: string) => {
      if (sentTo.has(recipientId)) return;

      setIsSending(recipientId);
      try {
        const result = await sendDirectMessage({
          recipientId,
          lookId,
        });

        if (result.success) {
          setSentTo((prev) => new Set(prev).add(recipientId));
          // Don't close — user may want to send to multiple people
        } else {
          Alert.alert("Error", result.error || "Failed to send");
        }
      } catch (error) {
        Alert.alert("Error", "Failed to send direct message");
      } finally {
        setIsSending(null);
      }
    },
    [lookId, sendDirectMessage, sentTo],
  );

  const handleClose = () => {
    setSearchQuery("");
    setSentTo(new Set());
    onClose();
  };

  const renderUserItem = ({
    item,
  }: {
    item: {
      _id: Id<"users">;
      username?: string;
      firstName?: string;
      lastName?: string;
      email: string;
      profileImageUrl?: string;
    };
  }) => {
    const isSent = sentTo.has(item._id);
    const isSendingThis = isSending === item._id;
    const displayName = item.firstName
      ? `${item.firstName}${item.lastName ? ` ${item.lastName}` : ""}`
      : item.username || item.email;

    return (
      <TouchableOpacity
        onPress={() => handleSendDM(item._id, displayName)}
        disabled={isSent || isSendingThis}
        activeOpacity={0.7}
        className="flex-row items-center gap-3 py-3 px-4 rounded-xl mb-1"
        style={{
          backgroundColor: isSent
            ? isDark
              ? "rgba(34,197,94,0.1)"
              : "rgba(34,197,94,0.08)"
            : "transparent",
        }}
      >
        {/* Avatar */}
        <View className="w-11 h-11 rounded-full overflow-hidden bg-surface-alt dark:bg-surface-alt-dark items-center justify-center">
          {item.profileImageUrl ? (
            <Image
              source={{ uri: item.profileImageUrl }}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
            />
          ) : (
            <UserIcon size={20} color={isDark ? "#706B63" : "#9C948A"} />
          )}
        </View>

        {/* Name & info */}
        <View className="flex-1">
          <Text className="text-base font-medium text-foreground dark:text-foreground-dark">
            {displayName}
          </Text>
          {item.username && (
            <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground">
              @{item.username}
            </Text>
          )}
        </View>

        {/* Send / Sent indicator */}
        {isSendingThis ? (
          <ActivityIndicator
            size="small"
            color={isDark ? "#C9A07A" : "#A67C52"}
          />
        ) : isSent ? (
          <View className="flex-row items-center gap-1">
            <Text className="text-xs text-green-500 font-medium">Sent</Text>
          </View>
        ) : (
          <View
            className="w-9 h-9 rounded-full items-center justify-center"
            style={{ backgroundColor: isDark ? "#302B28" : "#EDE6DC" }}
          >
            <Send size={16} color={isDark ? "#C9A07A" : "#A67C52"} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <Pressable
        onPress={handleClose}
        className="flex-1 bg-black/60 justify-end"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: isDark ? "#1A1614" : "#FAF8F5",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingBottom: insets.bottom + 16,
            maxHeight: "80%",
          }}
        >
          {/* Handle indicator */}
          <View className="items-center pt-3 pb-2">
            <View
              className="w-10 h-1 rounded-full"
              style={{ backgroundColor: isDark ? "#3D3835" : "#E0D8CC" }}
            />
          </View>

          {/* Header */}
          <View className="flex-row items-center justify-between px-6 pb-4">
            <Text className="text-lg font-semibold text-foreground dark:text-foreground-dark">
              Send via DM
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              className="w-8 h-8 rounded-full items-center justify-center"
              style={{ backgroundColor: isDark ? "#302B28" : "#EDE6DC" }}
            >
              <X size={18} color={isDark ? "#C4B8A8" : "#6B635B"} />
            </TouchableOpacity>
          </View>

          {/* Search input */}
          <View className="px-6 mb-4">
            <View
              className="flex-row items-center gap-3 rounded-xl px-4 h-12 border"
              style={{
                backgroundColor: isDark ? "#251F1C" : "#F0EBE4",
                borderColor: isDark ? "#3D3835" : "#E0D8CC",
              }}
            >
              <Search size={18} color={isDark ? "#706B63" : "#9C948A"} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by name, username, or email..."
                placeholderTextColor={isDark ? "#706B63" : "#9C948A"}
                className="flex-1 text-foreground dark:text-foreground-dark"
                style={{ fontFamily: "DMSans", fontSize: 15 }}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <X size={16} color={isDark ? "#706B63" : "#9C948A"} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Results */}
          <View style={{ minHeight: 200, maxHeight: 400 }}>
            {searchQuery.trim().length < 2 ? (
              <View className="items-center py-10">
                <Search
                  size={32}
                  color={isDark ? "#706B63" : "#9C948A"}
                />
                <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground mt-3 text-center px-8">
                  Type at least 2 characters to search for users
                </Text>
              </View>
            ) : searchResults === undefined ? (
              <View className="items-center py-10">
                <ActivityIndicator
                  size="large"
                  color={isDark ? "#C9A07A" : "#A67C52"}
                />
              </View>
            ) : searchResults.length === 0 ? (
              <View className="items-center py-10">
                <UserIcon
                  size={32}
                  color={isDark ? "#706B63" : "#9C948A"}
                />
                <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground mt-3 text-center px-8">
                  No users found for &ldquo;{searchQuery}&rdquo;
                </Text>
              </View>
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item._id}
                renderItem={renderUserItem}
                contentContainerStyle={{ paddingHorizontal: 8 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              />
            )}
          </View>

          {/* Sent count */}
          {sentTo.size > 0 && (
            <View className="px-6 pt-3 border-t" style={{ borderColor: isDark ? "#3D3835" : "#E0D8CC" }}>
              <Text className="text-sm text-green-500 text-center font-medium">
                Sent to {sentTo.size} {sentTo.size === 1 ? "person" : "people"}
              </Text>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

