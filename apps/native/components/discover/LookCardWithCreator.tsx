import { useState, useCallback } from "react";
import {
  View,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Text } from "@/components/ui/Text";
import {
  Heart,
  Sparkles,
  AlertCircle,
  UserPlus,
  Check,
  Loader2,
} from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { formatPrice } from "@/lib/utils/format";
import type { Look, Product } from "./LookCard";

/* ─── Types ─── */

export interface LookWithCreator extends Look {
  isGenerating?: boolean;
  generationFailed?: boolean;
  creator?: {
    _id: Id<"users">;
    firstName?: string;
    username?: string;
    profileImageUrl?: string;
  } | null;
  isFriend?: boolean;
  hasPendingRequest?: boolean;
  loveCount?: number;
  saveCount?: number;
  isLovedByUser?: boolean;
}

/* ─── Height map ─── */

const heightMap: Record<string, number> = {
  short: 200,
  medium: 280,
  tall: 340,
  "extra-tall": 400,
};

/* ─── Component ─── */

interface LookCardWithCreatorProps {
  look: LookWithCreator;
  index: number;
}

export function LookCardWithCreator({ look, index }: LookCardWithCreatorProps) {
  const router = useRouter();
  const hasImage = look.imageUrl && look.imageUrl.length > 0;
  const isGenerating =
    look.isGenerating || (!hasImage && !look.generationFailed);
  const generationFailed = look.generationFailed;
  const h = heightMap[look.height] ?? 280;

  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [requestSent, setRequestSent] = useState(
    look.hasPendingRequest || false,
  );
  const [isTogglingLove, setIsTogglingLove] = useState(false);

  const sendFriendRequest = useMutation(
    api.friends.mutations.sendFriendRequest,
  );
  const toggleLoveMutation = useMutation(
    api.lookInteractions.mutations.toggleLove,
  );

  const handlePress = () => {
    router.push(`/look/${look.id}` as any);
  };

  const handleToggleLove = useCallback(async () => {
    if (isTogglingLove) return;
    setIsTogglingLove(true);
    try {
      await toggleLoveMutation({ lookId: look.id as Id<"looks"> });
    } catch (error) {
      console.error("Failed to toggle love:", error);
    } finally {
      setIsTogglingLove(false);
    }
  }, [isTogglingLove, toggleLoveMutation, look.id]);

  const handleAddFriend = useCallback(async () => {
    if (!look.creator || look.isFriend || requestSent || isSendingRequest)
      return;
    setIsSendingRequest(true);
    try {
      await sendFriendRequest({ addresseeId: look.creator._id });
      setRequestSent(true);
    } catch (error) {
      console.error("Failed to send friend request:", error);
    } finally {
      setIsSendingRequest(false);
    }
  }, [
    look.creator,
    look.isFriend,
    requestSent,
    isSendingRequest,
    sendFriendRequest,
  ]);

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).duration(500)}
      style={{ marginBottom: 16 }}
    >
      <View className="rounded-2xl bg-surface dark:bg-surface-dark border border-border/30 dark:border-border-dark/30 overflow-hidden">
        {/* Creator header */}
        {look.creator && (
          <View className="flex-row items-center justify-between px-3 py-2 border-b border-border/30 dark:border-border-dark/30">
            <View className="flex-row items-center gap-2 flex-1">
              {/* Avatar */}
              <View className="w-8 h-8 rounded-full overflow-hidden bg-primary dark:bg-primary-dark">
                {look.creator.profileImageUrl ? (
                  <Image
                    source={{ uri: look.creator.profileImageUrl }}
                    style={{ width: 32, height: 32 }}
                    contentFit="cover"
                  />
                ) : (
                  <View className="flex-1 items-center justify-center">
                    <Text className="text-xs font-medium text-primary-foreground dark:text-primary-dark-foreground">
                      {(look.creator.firstName || look.creator.username || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <View className="flex-1">
                <Text
                  className="text-sm font-medium text-foreground dark:text-foreground-dark"
                  numberOfLines={1}
                >
                  {look.creator.firstName || look.creator.username || "User"}
                </Text>
                {look.isFriend && (
                  <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground">
                    Friend
                  </Text>
                )}
              </View>
            </View>

            {/* Add Friend button */}
            {!look.isFriend && (
              <TouchableOpacity
                onPress={handleAddFriend}
                disabled={isSendingRequest || requestSent}
                className={`flex-row items-center gap-1 px-2.5 py-1 rounded-full ${
                  requestSent
                    ? "bg-surface-alt dark:bg-surface-alt-dark"
                    : "bg-primary/10 dark:bg-primary-dark/10"
                }`}
              >
                {isSendingRequest ? (
                  <ActivityIndicator size="small" color="#A67C52" />
                ) : requestSent ? (
                  <>
                    <Check size={12} color="#9C948A" />
                    <Text className="text-xs font-medium text-muted-foreground dark:text-muted-dark-foreground">
                      Requested
                    </Text>
                  </>
                ) : (
                  <>
                    <UserPlus size={12} color="#A67C52" />
                    <Text className="text-xs font-medium text-primary dark:text-primary-dark">
                      Add
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Image / Generating / Failed / Fallback */}
        <Pressable onPress={handlePress}>
          <View style={{ height: h, position: "relative" }}>
            {hasImage ? (
              <Image
                source={{ uri: look.imageUrl }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={300}
                priority={index < 2 ? "high" : "low"}
              />
            ) : isGenerating ? (
              <View className="flex-1 bg-surface-alt dark:bg-surface-alt-dark items-center justify-center">
                <ActivityIndicator size="large" color="#A67C52" />
                <View className="flex-row items-center gap-2 mt-3">
                  <Sparkles size={14} color="#A67C52" />
                  <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground">
                    Generating look...
                  </Text>
                </View>
              </View>
            ) : generationFailed ? (
              <View className="flex-1 bg-surface-alt dark:bg-surface-alt-dark items-center justify-center">
                <AlertCircle size={32} color="#9C948A" />
                <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground mt-2">
                  Generation failed
                </Text>
                <Text className="text-xs text-muted-foreground/70 dark:text-muted-dark-foreground/70 mt-1">
                  Tap to retry
                </Text>
              </View>
            ) : (
              <View className="flex-1 bg-surface-alt dark:bg-surface-alt-dark items-center justify-center px-4">
                <View className="flex-row flex-wrap gap-1 justify-center mb-2">
                  {look.products.slice(0, 3).map((p) => (
                    <View
                      key={p.id}
                      className="w-12 h-12 rounded-lg bg-surface dark:bg-surface-dark border border-border/50 dark:border-border-dark/50 overflow-hidden"
                    >
                      {p.imageUrl ? (
                        <Image
                          source={{ uri: p.imageUrl }}
                          style={{ width: "100%", height: "100%" }}
                          contentFit="cover"
                        />
                      ) : (
                        <View className="flex-1 items-center justify-center">
                          <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground">
                            {p.category.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
                <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground">
                  {look.products.length} items
                </Text>
              </View>
            )}

            {/* Love button */}
            {hasImage && (
              <TouchableOpacity
                onPress={handleToggleLove}
                disabled={isTogglingLove}
                className="absolute top-3 left-3 p-2 bg-background/90 dark:bg-background-dark/90 rounded-full border border-border/50 dark:border-border-dark/50"
              >
                {isTogglingLove ? (
                  <ActivityIndicator size="small" color="#9C948A" />
                ) : (
                  <Heart
                    size={16}
                    color={look.isLovedByUser ? "#DC2626" : "#3B3530"}
                    fill={look.isLovedByUser ? "#DC2626" : "transparent"}
                  />
                )}
              </TouchableOpacity>
            )}

            {/* Love count badge */}
            {hasImage && look.loveCount !== undefined && look.loveCount > 0 && (
              <View className="absolute top-3 right-3 flex-row items-center gap-1 px-2 py-1 bg-background/90 dark:bg-background-dark/90 rounded-full">
                <Heart size={12} color="#DC2626" fill="#DC2626" />
                <Text className="text-xs font-medium text-foreground dark:text-foreground-dark">
                  {look.loveCount}
                </Text>
              </View>
            )}

            {/* Style tags */}
            {hasImage && look.styleTags.length > 0 && (
              <View className="absolute bottom-3 left-3 flex-row gap-1">
                {look.styleTags.slice(0, 2).map((tag) => (
                  <View
                    key={tag}
                    className="px-2 py-0.5 bg-background/90 dark:bg-background-dark/90 rounded-full"
                  >
                    <Text className="text-xs font-medium text-foreground dark:text-foreground-dark">
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </Pressable>

        {/* Footer */}
        <View className="p-3">
          <Text className="text-xs text-muted-foreground dark:text-muted-dark-foreground">
            {look.occasion} • {look.products.length} items
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}
