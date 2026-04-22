import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  TouchableOpacity,
  Pressable,
  Modal,
  Alert,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Linking,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import { Text } from "@/components/ui/Text";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  X,
  Search,
  Send,
  Check,
  User as UserIcon,
  Link as LinkIcon,
  Globe,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface ShareOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  url: string;
  title: string;
  /** When provided, enables DM sharing via Convex */
  lookId?: Id<"looks">;
  /** @deprecated No longer needed - DM sharing is now integrated */
  onShareViaDM?: () => void;
}

/** Unified shape for any user displayed in the share grid */
type ShareableUser = {
  _id: Id<"users">;
  firstName?: string;
  lastName?: string;
  username?: string;
  profileImageUrl?: string;
};

export function ShareOptionsModal({
  visible,
  onClose,
  url,
  title,
  lookId,
}: ShareOptionsModalProps) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());

  // --- Data sources ---

  // 1. Recent conversations (frequently contacted users – sorted by most recent)
  const conversations = useQuery(
    api.directMessages.queries.getConversations,
    visible ? {} : "skip",
  );

  // 2. Friends
  const friends = useQuery(api.friends.queries.getFriends, visible ? {} : "skip");

  // 3. Search results (when the user types 2+ chars)
  const searchResults = useQuery(
    api.users.queries.searchUsers,
    visible && searchQuery.trim().length >= 2
      ? { query: searchQuery.trim(), limit: 20 }
      : "skip",
  );

  // DM mutation
  const sendDirectMessage = useMutation(api.directMessages.mutations.sendDirectMessage);

  // Share publicly mutation
  const shareLookPublicly = useMutation(api.looks.mutations.shareLookPublicly);

  // --- Merge & deduplicate users ---
  const mergedUsers = useMemo(() => {
    const seen = new Set<string>();
    const result: ShareableUser[] = [];

    const addUser = (u: ShareableUser) => {
      if (seen.has(u._id)) return;
      seen.add(u._id);
      result.push(u);
    };

    // When the user is actively searching, show search results first
    if (searchQuery.trim().length >= 2 && searchResults) {
      for (const u of searchResults) {
        addUser({
          _id: u._id,
          firstName: u.firstName,
          lastName: u.lastName,
          username: u.username,
          profileImageUrl: u.profileImageUrl,
        });
      }
    }

    // Recent conversations (already sorted by most recent)
    if (conversations) {
      for (const c of conversations) {
        addUser({
          _id: c.otherUser._id,
          firstName: c.otherUser.firstName,
          lastName: c.otherUser.lastName,
          username: c.otherUser.username,
          profileImageUrl: c.otherUser.profileImageUrl,
        });
      }
    }

    // Friends
    if (friends) {
      for (const f of friends) {
        addUser({
          _id: f.friend._id,
          firstName: f.friend.firstName,
          username: f.friend.username,
          profileImageUrl: f.friend.profileImageUrl,
        });
      }
    }

    return result;
  }, [conversations, friends, searchResults, searchQuery]);

  // Filter by local search query (for short queries < 2 chars, filter locally)
  const displayedUsers = useMemo(() => {
    if (!searchQuery.trim()) return mergedUsers;
    // If search is 2+ chars, we already have server-side results merged in
    if (searchQuery.trim().length >= 2) return mergedUsers;
    // For 1 char, filter locally
    const q = searchQuery.toLowerCase().trim();
    return mergedUsers.filter((u) => {
      const name = (u.firstName || "").toLowerCase();
      const uname = (u.username || "").toLowerCase();
      return name.includes(q) || uname.includes(q);
    });
  }, [mergedUsers, searchQuery]);

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleSendToSelected = useCallback(async () => {
    if (!lookId || selectedUserIds.size === 0 || isSending) return;
    setIsSending(true);

    try {
      const promises = Array.from(selectedUserIds).map((userId) =>
        sendDirectMessage({
          recipientId: userId as Id<"users">,
          lookId,
        }),
      );

      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.success).length;

      if (successCount > 0) {
        setSentTo((prev) => {
          const next = new Set(prev);
          selectedUserIds.forEach((id) => next.add(id));
          return next;
        });
        setSelectedUserIds(new Set());

        // Brief success message then close
        setTimeout(() => {
          handleClose();
        }, 1000);
      }

      if (successCount < selectedUserIds.size) {
        const failCount = selectedUserIds.size - successCount;
        Alert.alert("Partial Send", `Sent to ${successCount}, failed for ${failCount}.`);
      }
    } catch {
      Alert.alert("Error", "Failed to send. Please try again.");
    } finally {
      setIsSending(false);
    }
  }, [lookId, selectedUserIds, isSending, sendDirectMessage]);

  const handleWhatsAppShare = async () => {
    const message = `Check out this look on Nima!\n${url}`;
    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;

    try {
      const supported = await Linking.canOpenURL(whatsappUrl);
      if (supported) {
        await Linking.openURL(whatsappUrl);
      } else {
        // Fallback to web WhatsApp
        await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`);
      }
    } catch {
      Alert.alert("Error", "Unable to open WhatsApp");
    }
    onClose();
  };

  const handleCopyLink = async () => {
    try {
      await Clipboard.setStringAsync(url);
      Alert.alert("Copied", "Link copied to clipboard!");
    } catch {
      // Ignore
    }
    onClose();
  };

  const handleSharePublicly = async () => {
    if (!lookId) return;
    try {
      const result = await shareLookPublicly({ lookId });
      if (result.success) {
        Alert.alert("Shared!", result.message);
      } else {
        Alert.alert("Unable to Share", result.message);
      }
    } catch {
      Alert.alert("Error", "Failed to share publicly. Please try again.");
    }
    onClose();
  };

  const handleClose = () => {
    setSearchQuery("");
    setSelectedUserIds(new Set());
    setSentTo(new Set());
    onClose();
  };

  const hasSelectedUsers = selectedUserIds.size > 0;
  const hasSentSuccessfully = sentTo.size > 0;
  const isLoading =
    conversations === undefined && friends === undefined;

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
            maxHeight: "85%",
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
          <View className="flex-row items-center justify-between px-6 pb-3">
            <Text className="text-lg font-semibold text-foreground dark:text-foreground-dark">
              Share
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              className="w-8 h-8 rounded-full items-center justify-center"
              style={{ backgroundColor: isDark ? "#302B28" : "#EDE6DC" }}
            >
              <X size={18} color={isDark ? "#C4B8A8" : "#6B635B"} />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          {lookId && (
            <View className="px-6 mb-3">
              <View
                className="flex-row items-center gap-3 rounded-xl px-4 h-11 border"
                style={{
                  backgroundColor: isDark ? "#251F1C" : "#F0EBE4",
                  borderColor: isDark ? "#3D3835" : "#E0D8CC",
                }}
              >
                <Search size={16} color={isDark ? "#706B63" : "#9C948A"} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search people..."
                  placeholderTextColor={isDark ? "#706B63" : "#9C948A"}
                  className="flex-1 text-foreground dark:text-foreground-dark"
                  style={{ fontFamily: "DMSans", fontSize: 14 }}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <X size={14} color={isDark ? "#706B63" : "#9C948A"} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Users grid */}
          {lookId && (
            <View style={{ minHeight: 120 }}>
              {isLoading ? (
                <View className="items-center py-8">
                  <ActivityIndicator
                    size="small"
                    color={isDark ? "#C9A07A" : "#A67C52"}
                  />
                </View>
              ) : displayedUsers.length === 0 ? (
                <View className="items-center py-6 px-8">
                  <UserIcon size={24} color={isDark ? "#706B63" : "#9C948A"} />
                  <Text className="text-sm text-muted-foreground dark:text-muted-dark-foreground mt-2 text-center">
                    {searchQuery.trim()
                      ? `No people matching "${searchQuery}"`
                      : "No contacts yet. Start a conversation!"}
                  </Text>
                </View>
              ) : (
                <ScrollView
                  horizontal={false}
                  showsVerticalScrollIndicator={false}
                  style={{ maxHeight: 280 }}
                  contentContainerStyle={{ paddingHorizontal: 16 }}
                >
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                    {displayedUsers.map((user) => {
                      const userId = user._id;
                      const isSelected = selectedUserIds.has(userId);
                      const alreadySent = sentTo.has(userId);
                      const displayName =
                        user.firstName ||
                        user.username ||
                        "User";

                      return (
                        <TouchableOpacity
                          key={userId}
                          onPress={() =>
                            !alreadySent && toggleUserSelection(userId)
                          }
                          disabled={alreadySent}
                          activeOpacity={0.7}
                          style={{ width: 72, alignItems: "center", paddingVertical: 6 }}
                        >
                          {/* Avatar with checkmark overlay */}
                          <View style={{ position: "relative" }}>
                            <View
                              style={{
                                width: 52,
                                height: 52,
                                borderRadius: 26,
                                overflow: "hidden",
                                borderWidth: isSelected ? 2.5 : 0,
                                borderColor: isDark ? "#C9A07A" : "#A67C52",
                                backgroundColor: isDark ? "#302B28" : "#EDE6DC",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {user.profileImageUrl ? (
                                <Image
                                  source={{ uri: user.profileImageUrl }}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                  }}
                                  contentFit="cover"
                                />
                              ) : (
                                <UserIcon
                                  size={22}
                                  color={isDark ? "#706B63" : "#9C948A"}
                                />
                              )}
                            </View>

                            {/* Checkmark badge */}
                            {(isSelected || alreadySent) && (
                              <View
                                style={{
                                  position: "absolute",
                                  bottom: -1,
                                  right: -1,
                                  width: 20,
                                  height: 20,
                                  borderRadius: 10,
                                  backgroundColor: alreadySent
                                    ? "#22C55E"
                                    : isDark
                                      ? "#C9A07A"
                                      : "#A67C52",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  borderWidth: 2,
                                  borderColor: isDark ? "#1A1614" : "#FAF8F5",
                                }}
                              >
                                <Check size={11} color="#FFF" strokeWidth={3} />
                              </View>
                            )}
                          </View>

                          {/* Name */}
                          <Text
                            numberOfLines={1}
                            className="text-xs text-center mt-1.5"
                            style={{
                              color: isSelected
                                ? isDark
                                  ? "#C9A07A"
                                  : "#A67C52"
                                : isDark
                                  ? "#C4B8A8"
                                  : "#6B635B",
                              fontWeight: isSelected ? "600" : "400",
                            }}
                          >
                            {alreadySent ? "Sent!" : displayName}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              )}
            </View>
          )}

          {/* Send button — visible when users are selected */}
          {lookId && hasSelectedUsers && (
            <View className="px-6 pt-2 pb-3">
              <TouchableOpacity
                onPress={handleSendToSelected}
                disabled={isSending}
                activeOpacity={0.8}
                style={{
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: isDark ? "#C9A07A" : "#A67C52",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  opacity: isSending ? 0.6 : 1,
                }}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Send size={18} color="#FFF" />
                )}
                <Text style={{ color: "#FFF", fontWeight: "600", fontSize: 15 }}>
                  {isSending
                    ? "Sending..."
                    : `Send to ${selectedUserIds.size} ${selectedUserIds.size === 1 ? "person" : "people"}`}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Sent success message */}
          {hasSentSuccessfully && !hasSelectedUsers && (
            <View className="px-6 py-2">
              <Text className="text-sm text-green-500 text-center font-medium">
                Sent to {sentTo.size} {sentTo.size === 1 ? "person" : "people"}
              </Text>
            </View>
          )}

          {/* Divider + External share options — only when no users selected */}
          {!hasSelectedUsers && (
            <View>
              <View
                className="mx-6 my-2"
                style={{
                  height: 1,
                  backgroundColor: isDark ? "#3D3835" : "#E0D8CC",
                }}
              />

              <View
                className="px-6"
                style={{ flexDirection: "row", gap: 16, paddingVertical: 4 }}
              >
                {/* WhatsApp */}
                <TouchableOpacity
                  onPress={handleWhatsAppShare}
                  activeOpacity={0.7}
                  style={{ alignItems: "center", gap: 6 }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: "#25D366",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <FontAwesome name="whatsapp" size={22} color="#FFF" />
                  </View>
                  <Text
                    className="text-xs"
                    style={{ color: isDark ? "#C4B8A8" : "#6B635B" }}
                  >
                    WhatsApp
                  </Text>
                </TouchableOpacity>

                {/* Copy Link */}
                <TouchableOpacity
                  onPress={handleCopyLink}
                  activeOpacity={0.7}
                  style={{ alignItems: "center", gap: 6 }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: isDark ? "#302B28" : "#EDE6DC",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <LinkIcon
                      size={20}
                      color={isDark ? "#C9A07A" : "#A67C52"}
                    />
                  </View>
                  <Text
                    className="text-xs"
                    style={{ color: isDark ? "#C4B8A8" : "#6B635B" }}
                  >
                    Copy Link
                  </Text>
                </TouchableOpacity>

                {/* Share Publicly */}
                {lookId && (
                  <TouchableOpacity
                    onPress={handleSharePublicly}
                    activeOpacity={0.7}
                    style={{ alignItems: "center", gap: 6 }}
                  >
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: isDark ? "#302B28" : "#EDE6DC",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Globe
                        size={20}
                        color={isDark ? "#C9A07A" : "#A67C52"}
                      />
                    </View>
                    <Text
                      className="text-xs"
                      style={{ color: isDark ? "#C4B8A8" : "#6B635B" }}
                    >
                      Public
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
