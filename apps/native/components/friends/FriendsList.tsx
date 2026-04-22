import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image as RNImage,
} from "react-native";
import { Image } from "expo-image";
import { UserPlus, UserMinus, Check, X } from "lucide-react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Toast from "react-native-toast-message";

export function FriendsList() {
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

  if (friends === undefined || pendingRequests === undefined) {
    return <ActivityIndicator className="mt-4" />;
  }

  return (
    <View className="flex-1">
      {/* Pending Requests */}
      {(pendingRequests?.length || 0) > 0 && (
        <View className="mb-6">
          <Text className="text-lg font-serif font-medium text-foreground mb-3">
            Pending Requests ({pendingRequests.length})
          </Text>
          <View className="space-y-3">
            {pendingRequests.map((request) => (
              <View
                key={request._id}
                className="flex-row items-center p-3 bg-surface rounded-xl border border-border"
              >
                <View className="w-10 h-10 rounded-full bg-surface-alt overflow-hidden mr-3">
                  {request.requester.profileImageUrl ? (
                    <Image
                      source={{ uri: request.requester.profileImageUrl }}
                      className="w-full h-full"
                    />
                  ) : (
                    <View className="w-full h-full items-center justify-center">
                      <UserPlus size={20} className="text-muted-foreground" />
                    </View>
                  )}
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-foreground font-serif">
                    {request.requester.firstName ||
                      request.requester.username ||
                      "User"}
                  </Text>
                  <Text className="text-xs text-muted-foreground font-sans">
                    Wants to be friends
                  </Text>
                </View>
                <View className="flex-row space-x-2">
                  <TouchableOpacity
                    onPress={() => handleAccept(request._id)}
                    className="bg-primary p-2 rounded-full"
                  >
                    <Check size={16} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDecline(request._id)}
                    className="bg-surface-alt p-2 rounded-full"
                  >
                    <X size={16} className="text-muted-foreground" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Friends List */}
      <View>
        <Text className="text-lg font-serif font-medium text-foreground mb-3">
          Friends ({friends?.length || 0})
        </Text>
        {(friends?.length || 0) === 0 ? (
          <View className="items-center py-8">
            <View className="w-16 h-16 bg-surface-alt rounded-full items-center justify-center mb-3">
              <UserPlus size={32} className="text-muted-foreground" />
            </View>
            <Text className="text-muted-foreground font-sans">
              No friends yet
            </Text>
            <Text className="text-xs text-muted-foreground mt-1 font-sans">
              Add friends to see shared looks
            </Text>
          </View>
        ) : (
          <View className="space-y-3">
            {friends.map((friendship) => (
              <View
                key={friendship._id}
                className="flex-row items-center p-3 bg-surface rounded-xl border border-border"
              >
                <View className="w-10 h-10 rounded-full bg-surface-alt overflow-hidden mr-3">
                  {friendship.friend.profileImageUrl ? (
                    <Image
                      source={{ uri: friendship.friend.profileImageUrl }}
                      className="w-full h-full"
                    />
                  ) : (
                    <View className="w-full h-full items-center justify-center">
                      <UserPlus size={20} className="text-muted-foreground" />
                    </View>
                  )}
                </View>
                <View className="flex-1">
                  <Text className="font-medium text-foreground font-serif">
                    {friendship.friend.firstName ||
                      friendship.friend.username ||
                      "User"}
                  </Text>
                  <Text className="text-xs text-muted-foreground font-sans">
                    Friend
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemove(friendship._id)}
                  disabled={removingId === friendship._id}
                  className="p-2"
                >
                  {removingId === friendship._id ? (
                    <ActivityIndicator size="small" />
                  ) : (
                    <UserMinus size={20} className="text-muted-foreground" />
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
