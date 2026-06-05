import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { UserPlus, UserMinus, Check, X, Users } from "lucide-react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Toast from "react-native-toast-message";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { ModerationMenu } from "@/components/moderation/ModerationMenu";

interface FriendPerson {
  _id: Id<"users">;
  firstName?: string;
  username?: string;
  profileImageUrl?: string;
}
interface PendingRequest {
  _id: Id<"friendships">;
  requester: FriendPerson;
}
interface Friendship {
  _id: Id<"friendships">;
  friend: FriendPerson;
  isRequester: boolean;
}

export function FriendsList() {
  const { isDark } = useTheme();
  const [removingId, setRemovingId] = useState<Id<"friendships"> | null>(null);

  const friends = useQuery(api.friends.queries.getFriends);
  const pendingRequests = useQuery(
    api.friends.queries.getPendingFriendRequests,
  );

  const removeFriend = useMutation(api.friends.mutations.removeFriend);
  const acceptRequest = useMutation(api.friends.mutations.acceptFriendRequest);
  const declineRequest = useMutation(
    api.friends.mutations.declineFriendRequest,
  );

  const handleRemove = async (id: Id<"friendships">) => {
    setRemovingId(id);
    try {
      await removeFriend({ friendshipId: id });
      Toast.show({ type: "success", text1: "Friend removed" });
    } catch (e) {
      Toast.show({ type: "error", text1: "Failed to remove" });
    } finally {
      setRemovingId(null);
    }
  };

  const handleAccept = async (id: Id<"friendships">) => {
    try {
      await acceptRequest({ friendshipId: id });
      Toast.show({ type: "success", text1: "Request accepted" });
    } catch (e) {
      Toast.show({ type: "error", text1: "Failed to accept" });
    }
  };

  const handleDecline = async (id: Id<"friendships">) => {
    try {
      await declineRequest({ friendshipId: id });
      Toast.show({ type: "success", text1: "Request declined" });
    } catch (e) {
      Toast.show({ type: "error", text1: "Failed to decline" });
    }
  };

  const muted = isDark ? "#8C8078" : "#9C948A";

  if (friends === undefined || pendingRequests === undefined) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={isDark ? "#C9A07A" : "#5C2A33"} />
      </View>
    );
  }

  return (
    <View className="flex-1">
      {/* Pending Requests */}
      {(pendingRequests?.length || 0) > 0 && (
        <View className="mb-7">
          <Text
            className="text-xs font-semibold uppercase font-sans mb-3 ml-1"
            style={{ letterSpacing: 0.6, color: muted }}
          >
            Requests · {pendingRequests.length}
          </Text>
          <View style={{ gap: 8 }}>
            {pendingRequests.map((request: PendingRequest) => (
              <View
                key={request._id}
                className="flex-row items-center p-3 bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark"
              >
                <Avatar
                  url={request.requester.profileImageUrl}
                  name={request.requester.firstName || request.requester.username}
                  isDark={isDark}
                />
                <View className="flex-1 ml-3">
                  <Text className="text-[15px] font-medium text-foreground dark:text-foreground-dark font-sans">
                    {request.requester.firstName ||
                      request.requester.username ||
                      "User"}
                  </Text>
                  <Text
                    className="text-xs font-sans mt-0.5"
                    style={{ color: muted }}
                  >
                    Wants to be friends
                  </Text>
                </View>
                <View className="flex-row" style={{ gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => handleAccept(request._id)}
                    activeOpacity={0.8}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isDark ? "#C9A07A" : "#5C2A33",
                    }}
                  >
                    <Check size={17} color={isDark ? "#1A1614" : "#FAF8F5"} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDecline(request._id)}
                    activeOpacity={0.8}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isDark ? "#302B28" : "#EDE6DC",
                    }}
                  >
                    <X size={17} color={muted} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Friends List */}
      <Text
        className="text-xs font-semibold uppercase font-sans mb-3 ml-1"
        style={{ letterSpacing: 0.6, color: muted }}
      >
        Friends · {friends?.length || 0}
      </Text>

      {(friends?.length || 0) === 0 ? (
        <View className="items-center py-12">
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isDark ? "#302B28" : "#EDE6DC",
              marginBottom: 14,
            }}
          >
            <Users size={28} color={muted} />
          </View>
          <Text className="text-[15px] font-medium text-foreground dark:text-foreground-dark font-sans">
            No friends yet
          </Text>
          <Text
            className="text-[13px] mt-1 font-sans text-center"
            style={{ color: muted, maxWidth: 240, lineHeight: 19 }}
          >
            Add friends to share looks and see what they're trying on.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {friends.map((friendship: Friendship) => (
            <View
              key={friendship._id}
              className="flex-row items-center p-3 bg-surface dark:bg-surface-dark rounded-2xl border border-border dark:border-border-dark"
            >
              <Avatar
                url={friendship.friend.profileImageUrl}
                name={friendship.friend.firstName || friendship.friend.username}
                isDark={isDark}
              />
              <View className="flex-1 ml-3">
                <Text className="text-[15px] font-medium text-foreground dark:text-foreground-dark font-sans">
                  {friendship.friend.firstName ||
                    friendship.friend.username ||
                    "User"}
                </Text>
                {friendship.friend.username &&
                  friendship.friend.firstName && (
                    <Text
                      className="text-xs font-sans mt-0.5"
                      style={{ color: muted }}
                    >
                      @{friendship.friend.username}
                    </Text>
                  )}
              </View>
              <View className="flex-row items-center" style={{ gap: 4 }}>
                <TouchableOpacity
                  onPress={() => handleRemove(friendship._id)}
                  disabled={removingId === friendship._id}
                  activeOpacity={0.7}
                  hitSlop={8}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {removingId === friendship._id ? (
                    <ActivityIndicator size="small" color={muted} />
                  ) : (
                    <UserMinus size={18} color={muted} />
                  )}
                </TouchableOpacity>
                <ModerationMenu
                  targetUserId={friendship.friend._id}
                  targetName={friendship.friend.firstName || friendship.friend.username}
                  color={muted}
                  size={20}
                />
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/* ─── Avatar with initials fallback ───────────────────────────────────────── */

function Avatar({
  url,
  name,
  isDark,
}: {
  url?: string;
  name?: string;
  isDark: boolean;
}) {
  const size = 44;
  const initial = (name || "U").trim().charAt(0).toUpperCase();

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: isDark
          ? "rgba(201,160,122,0.16)"
          : "rgba(92,42,51,0.08)",
      }}
    >
      {url ? (
        <Image
          source={{ uri: url }}
          style={{ width: size, height: size }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={150}
        />
      ) : (
        <Text
          className="font-serif"
          style={{
            fontSize: 18,
            fontWeight: "600",
            color: isDark ? "#C9A07A" : "#5C2A33",
          }}
        >
          {initial}
        </Text>
      )}
    </View>
  );
}
